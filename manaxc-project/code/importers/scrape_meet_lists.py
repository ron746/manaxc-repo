#!/usr/bin/env python3
"""
Athletic.net Meet List Scraper
Generates a list of meets organized by priority sections for 2025 season.
"""

import json
import time
import re
from typing import List, Dict, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException


def create_driver():
    """Create and configure Chrome WebDriver"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

    driver = webdriver.Chrome(options=chrome_options)
    return driver


def search_school(driver, school_name: str) -> Optional[str]:
    """
    Search for a school on Athletic.net and return the school ID.

    Returns:
        School ID (string) or None if not found
    """
    # Try different search variations
    search_variations = [
        f"{school_name} High School CA",
        f"{school_name} High School California",
        f"{school_name} CA",
        school_name
    ]

    for search_term in search_variations:
        print(f"  Searching for: {search_term}")

        search_url = f"https://www.athletic.net/Search.aspx?search={search_term.replace(' ', '+')}"
        driver.get(search_url)

        try:
            # Wait for search results
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            time.sleep(2)

            # Look for school links in search results
            # Athletic.net school links follow pattern: /CrossCountry/School.aspx?SchoolID=XXXXX
            school_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='School.aspx?SchoolID=']")

            if school_links:
                # Get the first match (usually the most relevant)
                first_link = school_links[0]
                href = first_link.get_attribute('href')

                # Extract school ID from URL
                match = re.search(r'SchoolID=(\d+)', href)
                if match:
                    school_id = match.group(1)
                    school_display_name = first_link.text.strip()
                    print(f"    ✅ Found: {school_display_name} (ID: {school_id})")
                    return school_id

        except TimeoutException:
            print(f"    ⚠️  Timeout with: {search_term}")
            continue
        except Exception as e:
            print(f"    ⚠️  Error with {search_term}: {e}")
            continue

    print(f"    ❌ No school found after trying all variations")
    return None


def get_school_meets(driver, school_id: str, school_name: str, year: int = 2025) -> List[Dict]:
    """
    Get all cross country meets for a school in a given year.

    Returns:
        List of meet dictionaries with 'name' and 'id' keys
    """
    print(f"  Getting meets for: {school_name}")

    # Athletic.net school schedule URL
    # Note: Year might be in format YYYY or might need adjustment based on athletic.net's season handling
    school_url = f"https://www.athletic.net/CrossCountry/School.aspx?SchoolID={school_id}"

    driver.get(school_url)

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(2)

        meets = []

        # Look for meet links - Athletic.net meet links follow pattern: /CrossCountry/meet/XXXXX
        meet_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/CrossCountry/meet/']")

        seen_meet_ids = set()

        for link in meet_links:
            try:
                href = link.get_attribute('href')
                meet_name = link.text.strip()

                # Extract meet ID
                match = re.search(r'/meet/(\d+)', href)
                if not match:
                    continue

                meet_id = match.group(1)

                # Skip duplicates
                if meet_id in seen_meet_ids:
                    continue

                # Skip empty names
                if not meet_name:
                    continue

                # Check if this is a 2025 meet (might need to check date or season info)
                # For now, we'll get all meets and filter later if needed

                seen_meet_ids.add(meet_id)
                meets.append({
                    'name': meet_name,
                    'id': meet_id
                })

            except Exception as e:
                print(f"    ⚠️  Error processing meet link: {e}")
                continue

        print(f"    Found {len(meets)} meets")
        return meets

    except TimeoutException:
        print(f"    ❌ Timeout getting meets for: {school_name}")
        return []
    except Exception as e:
        print(f"    ❌ Error getting meets for {school_name}: {e}")
        return []


def scrape_section_meets(schools: List[str], section_name: str, year: int = 2025) -> Dict:
    """
    Scrape meets for a section of schools.

    Returns:
        Dictionary with school names as keys and list of meets as values
    """
    print(f"\n{'='*60}")
    print(f"SCRAPING SECTION: {section_name}")
    print(f"{'='*60}")

    driver = create_driver()
    section_data = {}

    try:
        for school_name in schools:
            print(f"\n[{schools.index(school_name) + 1}/{len(schools)}] Processing: {school_name}")

            # Search for school
            school_id = search_school(driver, school_name)
            if not school_id:
                section_data[school_name] = {
                    'status': 'not_found',
                    'meets': []
                }
                continue

            # Get meets for school
            meets = get_school_meets(driver, school_id, school_name, year)

            section_data[school_name] = {
                'status': 'success',
                'school_id': school_id,
                'meets': meets
            }

            # Small delay between schools
            time.sleep(2)

    finally:
        driver.quit()

    return section_data


def compile_meet_list(section_data: Dict) -> List[Dict]:
    """
    Compile a deduplicated list of meets from section data.

    Returns:
        List of meet dictionaries with 'name' and 'id' keys
    """
    seen_meet_ids = set()
    meet_list = []

    for school_name, school_data in section_data.items():
        if school_data['status'] != 'success':
            continue

        for meet in school_data['meets']:
            if meet['id'] not in seen_meet_ids:
                seen_meet_ids.add(meet['id'])
                meet_list.append(meet)

    # Sort by meet name
    meet_list.sort(key=lambda m: m['name'])

    return meet_list


def main():
    """Main scraping workflow"""

    # Load school sections
    print("Loading school sections...")
    with open('meet_scrape_sections.json', 'r') as f:
        sections = json.load(f)

    year = 2025
    results = {}

    # Scrape each section
    for section_key, schools in sections.items():
        section_name = {
            'stal_schools': 'STAL Schools',
            'bval_additional': 'Additional BVAL Schools',
            'd2_additional': 'Additional D2 Schools'
        }.get(section_key, section_key)

        section_data = scrape_section_meets(schools, section_name, year)
        results[section_key] = section_data

    # Save detailed results
    output_file = f'meet_scrape_results_{year}.json'
    print(f"\n{'='*60}")
    print(f"Saving detailed results to: {output_file}")
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    # Generate meet lists for each section
    print(f"\n{'='*60}")
    print("GENERATING MEET LISTS BY SECTION")
    print(f"{'='*60}")

    meet_lists = {}

    for section_key in ['stal_schools', 'bval_additional', 'd2_additional']:
        section_name = {
            'stal_schools': 'STAL Schools',
            'bval_additional': 'Additional BVAL Schools',
            'd2_additional': 'Additional D2 Schools'
        }.get(section_key)

        print(f"\n{section_name}:")
        meet_list = compile_meet_list(results[section_key])
        meet_lists[section_key] = meet_list
        print(f"  Total unique meets: {len(meet_list)}")

    # Save organized meet lists
    meet_list_file = f'meet_lists_{year}.json'
    print(f"\n{'='*60}")
    print(f"Saving organized meet lists to: {meet_list_file}")
    with open(meet_list_file, 'w') as f:
        json.dump(meet_lists, f, indent=2)

    # Print summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")

    for section_key, meet_list in meet_lists.items():
        section_name = {
            'stal_schools': 'Section 1: STAL',
            'bval_additional': 'Section 2: Additional BVAL',
            'd2_additional': 'Section 3: Additional D2'
        }.get(section_key)

        print(f"\n{section_name}:")
        print(f"  Meets to import: {len(meet_list)}")

        if meet_list:
            print(f"  Sample meets:")
            for meet in meet_list[:5]:
                print(f"    - {meet['name']} (ID: {meet['id']})")
            if len(meet_list) > 5:
                print(f"    ... and {len(meet_list) - 5} more")

    print(f"\n{'='*60}")
    print("SCRAPING COMPLETE!")
    print(f"{'='*60}")
    print(f"\nResults saved to:")
    print(f"  - {output_file} (detailed)")
    print(f"  - {meet_list_file} (organized meet lists)")


if __name__ == '__main__':
    main()
