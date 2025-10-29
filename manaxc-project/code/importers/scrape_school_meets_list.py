#!/usr/bin/env python3
"""
Scrape list of meets that schools competed in during 2025 season
Does NOT scrape full results - just creates a list of meets to import later
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json
import os
import sys
from datetime import datetime

def setup_driver():
    """Set up Chrome driver with options"""
    chrome_options = Options()
    # Comment out headless if you want to see what's happening
    # chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')

    driver = webdriver.Chrome(options=chrome_options)
    return driver

def scrape_school_meets(driver, school_id, season_year):
    """
    Scrape list of meets for a school in a given season
    Returns list of meet dictionaries with basic info
    """
    meets = []

    try:
        # Navigate to school's meet history page
        url = f"https://www.athletic.net/CrossCountry/School.aspx?SchoolID={school_id}"
        print(f"  📍 Loading: {url}")
        driver.get(url)

        # Wait for page to load
        time.sleep(2)

        # Look for season selector and select the year
        try:
            # Find the season dropdown (if it exists)
            season_select = driver.find_element(By.ID, "ctl00_Content_Main_ddlSeason")
            options = season_select.find_elements(By.TAG_NAME, "option")

            # Find and select the target season
            for option in options:
                if str(season_year) in option.text:
                    option.click()
                    time.sleep(2)
                    break
        except:
            print(f"  ⚠️  Could not find/select season dropdown, using default")

        # Find the meets table
        # Athletic.net typically shows meets in a table with class names like "meetResults"
        try:
            # Look for meet links - they typically contain "meet.aspx?Meet="
            meet_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='Meet.aspx?Meet=']")

            seen_meet_ids = set()

            for link in meet_links:
                try:
                    href = link.get_attribute('href')
                    meet_name = link.text.strip()

                    # Extract meet ID from URL
                    if 'Meet=' in href:
                        meet_id = href.split('Meet=')[1].split('&')[0]

                        # Avoid duplicates
                        if meet_id and meet_id not in seen_meet_ids and meet_name:
                            seen_meet_ids.add(meet_id)

                            # Try to find date (usually near the meet name)
                            parent = link.find_element(By.XPATH, './../..')
                            date_text = ''
                            try:
                                # Look for date in nearby cells
                                cells = parent.find_elements(By.TAG_NAME, 'td')
                                for cell in cells:
                                    text = cell.text.strip()
                                    # Check if it looks like a date
                                    if '/' in text or any(month in text.lower() for month in ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']):
                                        date_text = text
                                        break
                            except:
                                pass

                            meets.append({
                                'meet_id': meet_id,
                                'meet_name': meet_name,
                                'date': date_text,
                                'url': href
                            })

                            print(f"  ✓ {meet_name} ({date_text}) [ID: {meet_id}]")

                except Exception as e:
                    continue

            if not meets:
                print(f"  ⚠️  No meets found")

        except Exception as e:
            print(f"  ❌ Error finding meets table: {e}")

    except Exception as e:
        print(f"  ❌ Error loading page: {e}")

    return meets

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scrape_school_meets_list.py <data_file> [season_year]")
        print("\nData file format (JSON):")
        print('  {"School Name": {"id": 1076, "city": "San Jose"}}')
        print("\nSeason year defaults to 2025")
        sys.exit(1)

    data_file = sys.argv[1]
    season_year = int(sys.argv[2]) if len(sys.argv) > 2 else 2025

    # Load school data
    try:
        with open(data_file, 'r') as f:
            schools_data = json.load(f)
    except Exception as e:
        print(f"❌ Error loading data file: {e}")
        sys.exit(1)

    print(f"\n🏃 Scraping Meet Lists for {season_year} Season")
    print(f"Starting at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total schools: {len(schools_data)}")
    print("="*80)

    # Set up driver
    driver = setup_driver()

    results = {}
    stats = {'total': 0, 'success': 0, 'failed': 0, 'total_meets': 0}

    try:
        for school_name, info in schools_data.items():
            print(f"\n🏫 {school_name}")

            if not info.get('id'):
                print(f"  ⏭️  Skipping (no Athletic.net ID)")
                continue

            stats['total'] += 1

            # Scrape meets
            meets = scrape_school_meets(driver, info['id'], season_year)

            if meets:
                results[school_name] = {
                    'athletic_net_id': info['id'],
                    'city': info.get('city', ''),
                    'meets': meets,
                    'meet_count': len(meets)
                }
                stats['success'] += 1
                stats['total_meets'] += len(meets)
                print(f"  ✅ Found {len(meets)} meets")
            else:
                results[school_name] = {
                    'athletic_net_id': info['id'],
                    'city': info.get('city', ''),
                    'meets': [],
                    'meet_count': 0
                }
                stats['failed'] += 1
                print(f"  ❌ No meets found")

            # Brief pause between schools
            time.sleep(2)

    finally:
        driver.quit()

    # Save results
    output_dir = 'to-be-processed/meet-lists'
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f"{output_dir}/meets_{season_year}_{timestamp}.json"

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    # Print summary
    print("\n" + "="*80)
    print("📊 SUMMARY")
    print("="*80)
    print(f"Schools processed:  {stats['total']}")
    print(f"Successful:         {stats['success']}")
    print(f"Failed/No meets:    {stats['failed']}")
    print(f"Total meets found:  {stats['total_meets']}")
    print(f"\n📁 Results saved to: {output_file}")
    print(f"\nCompleted at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)

    # Print sample meets for verification
    if results:
        print("\n📋 SAMPLE MEETS (first 10):")
        count = 0
        for school, data in results.items():
            if data['meets']:
                for meet in data['meets'][:3]:
                    print(f"  • {meet['meet_name']} ({meet['date']}) - ID: {meet['meet_id']}")
                    count += 1
                    if count >= 10:
                        break
            if count >= 10:
                break

if __name__ == '__main__':
    main()
