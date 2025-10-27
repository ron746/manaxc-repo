#!/usr/bin/env python3
"""
Athletic.net Scraper for ManaXC
Scrapes cross country results for a school/season and outputs structured JSON
with times converted to centiseconds.
"""

import sys
import json
import re
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def time_to_centiseconds(time_str):
    """
    Convert time string to centiseconds.
    Examples: "16:45.3" -> 100530, "17:02.00" -> 102200
    """
    try:
        time_str = time_str.strip()

        # Match format MM:SS.CC or MM:SS
        match = re.match(r'(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?', time_str)
        if not match:
            return None

        minutes = int(match.group(1))
        seconds = int(match.group(2))
        centiseconds = int(match.group(3).ljust(2, '0')) if match.group(3) else 0

        total_centiseconds = (minutes * 60 * 100) + (seconds * 100) + centiseconds
        return total_centiseconds
    except:
        return None


def parse_meet_date(date_str):
    """
    Parse meet date string to YYYY-MM-DD format.
    Example: "Sat, Sep 14, 2024" -> "2024-09-14"
    """
    try:
        # Remove day of week if present
        date_str = re.sub(r'^[A-Za-z]{3},?\s+', '', date_str)

        # Try to parse the date
        date_obj = datetime.strptime(date_str, "%b %d, %Y")
        return date_obj.strftime("%Y-%m-%d")
    except:
        return None


def scrape_meet_results(driver, meet_url):
    """
    Scrape a single meet's results.
    Returns dict with meet info and results.
    """
    print(f"  Scraping: {meet_url}")

    try:
        driver.get(meet_url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(3)  # Additional wait for JavaScript

        # Extract meet name and date
        meet_name = driver.title.split(" - ")[0] if " - " in driver.title else driver.title
        meet_date = None

        # Get meet ID from URL
        meet_id_match = re.search(r'/meet/(\d+)', meet_url)
        athletic_net_meet_id = meet_id_match.group(1) if meet_id_match else None

        # Parse results from page text
        body_text = driver.find_element(By.TAG_NAME, "body").text

        # Try to find date in body text (format: "OFFICIAL Thu, Sep 11, 2025")
        date_match = re.search(r'\w{3},?\s+\w{3}\s+\d{1,2},\s+\d{4}', body_text)
        if date_match:
            meet_date = parse_meet_date(date_match.group(0))

        lines = [line.strip() for line in body_text.splitlines() if line.strip()]

        results = []
        current_race = None
        current_gender = None

        for i, line in enumerate(lines):
            # Special header detection for "Mens Results" / "Womens Results"
            if re.search(r'\b(Mens?|Womens?) Results\b', line, re.IGNORECASE):
                if 'mens' in line.lower() or 'men' in line.lower():
                    current_gender = 'M'
                elif 'womens' in line.lower() or 'women' in line.lower():
                    current_gender = 'F'
                continue

            # Detect race headers - look for Varsity/JV/Frosh/Freshman
            if re.search(r'\b(Varsity|JV|Junior Varsity|Frosh|Freshman)\b', line, re.IGNORECASE):
                # Set current race (will use gender from previous "Mens Results" or "Womens Results" header)
                current_race = line
                # Check if explicitly gendered in race name
                if re.search(r'\b(Boys?|Girls?|Women)\b', line, re.IGNORECASE):
                    if 'boys' in line.lower() or 'men' in line.lower():
                        current_gender = 'M'
                    elif 'girls' in line.lower() or 'women' in line.lower():
                        current_gender = 'F'
                continue

            # Parse result line: Place Grade Name Time School
            # Example: "1. 12 Vincent Cheung 15:05.5 Silver Creek"
            # Pattern: digit(s) [dot] [space] grade [space] name [space] time [space] school
            result_match = re.match(r'^(\d+)\.\s+(\d{1,2})\s+(.+?)\s+(\d{1,2}:\d{2}(?:\.\d{1,2})?)\s+(.+)$', line)
            if result_match and current_race and current_gender:
                place = int(result_match.group(1))
                grade = int(result_match.group(2))
                athlete_name = result_match.group(3).strip()
                time_str = result_match.group(4)
                school_name = result_match.group(5).strip()
                time_cs = time_to_centiseconds(time_str)

                if time_cs:
                    results.append({
                        'place': place,
                        'athlete_name': athlete_name,
                        'school_name': school_name,
                        'time_str': time_str,
                        'time_cs': time_cs,
                        'race_type': current_race,
                        'gender': current_gender,
                        'grade': grade
                    })

        return {
            'meet_name': meet_name,
            'meet_date': meet_date,
            'meet_url': meet_url,
            'athletic_net_meet_id': athletic_net_meet_id,
            'results_count': len(results),
            'results': results
        }

    except Exception as e:
        print(f"  Error scraping meet: {e}")
        return None


def scrape_school_season(athletic_net_id, season_year):
    """
    Scrape all meets for a school/season.
    athletic_net_id: The Athletic.net school ID (e.g., 1076)
    season_year: The season year (e.g., 2025)
    """
    print(f"\n🏃 Scraping Athletic.net for School ID {athletic_net_id}, Season {season_year}")
    print("=" * 60)

    # Setup Chrome driver
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in background
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')

    # On macOS, specify Chrome binary location
    import platform
    if platform.system() == 'Darwin':
        chrome_options.binary_location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

    driver = webdriver.Chrome(options=chrome_options)

    try:
        # Get school's meet list
        team_url = f'https://www.athletic.net/team/{athletic_net_id}/cross-country/{season_year}'
        print(f"\n📋 Loading team page: {team_url}")
        driver.get(team_url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(3)

        # Find all meet links
        meet_links = []
        meet_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/CrossCountry/meet/"]')

        for elem in meet_elements:
            url = elem.get_attribute('href')
            if url and '/CrossCountry/meet/' in url:
                # Append /results/all to get full results
                results_url = url.rstrip('/') + '/results/all'
                if results_url not in meet_links:
                    meet_links.append(results_url)

        print(f"\n✅ Found {len(meet_links)} meets")

        # Scrape each meet
        all_meets = []
        for idx, meet_url in enumerate(meet_links, 1):
            print(f"\n[{idx}/{len(meet_links)}]", end=" ")
            meet_data = scrape_meet_results(driver, meet_url)
            if meet_data:
                all_meets.append(meet_data)
                print(f"  ✅ {meet_data['results_count']} results")

        # Save to JSON
        output_data = {
            'athletic_net_school_id': athletic_net_id,
            'season_year': season_year,
            'scraped_at': datetime.now().isoformat(),
            'meets_count': len(all_meets),
            'total_results': sum(m['results_count'] for m in all_meets),
            'meets': all_meets
        }

        output_file = f'athletic_net_{athletic_net_id}_{season_year}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print(f"\n" + "=" * 60)
        print(f"✅ Scraping complete!")
        print(f"📊 Total meets: {len(all_meets)}")
        print(f"📊 Total results: {output_data['total_results']}")
        print(f"💾 Saved to: {output_file}")

        return output_file

    finally:
        driver.quit()


def main():
    if len(sys.argv) != 3:
        print("Usage: python athletic_net_scraper.py <athletic_net_school_id> <season_year>")
        print("Example: python athletic_net_scraper.py 1076 2025")
        sys.exit(1)

    athletic_net_id = sys.argv[1]
    season_year = sys.argv[2]

    try:
        output_file = scrape_school_season(athletic_net_id, season_year)
        print(f"\n✅ Success! Data saved to {output_file}")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
