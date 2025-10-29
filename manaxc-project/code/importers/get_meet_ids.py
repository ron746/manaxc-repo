#!/usr/bin/env python3
"""
Simple Meet ID Extractor for Athletic.net
Gets meet IDs from school pages - names can be seen when importing in admin UI
"""

import json
import time
import re
from typing import List, Dict
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


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


def get_meet_ids_for_school(driver, school_id: str, school_name: str) -> List[str]:
    """
    Get all meet IDs for a school.
    Returns list of meet ID strings.
    """
    print(f"  Getting meets for {school_name} (ID: {school_id})")

    school_url = f"https://www.athletic.net/CrossCountry/School.aspx?SchoolID={school_id}"
    driver.get(school_url)

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(2)

        # Find all meet links
        all_links = driver.find_elements(By.TAG_NAME, "a")
        meet_ids = []
        seen = set()

        for link in all_links:
            try:
                href = link.get_attribute('href') or ""
                if '/CrossCountry/meet/' in href:
                    match = re.search(r'/meet/(\d+)', href)
                    if match:
                        meet_id = match.group(1)
                        if meet_id not in seen:
                            seen.add(meet_id)
                            meet_ids.append(meet_id)
            except:
                pass

        print(f"    Found {len(meet_ids)} meets")
        return meet_ids

    except Exception as e:
        print(f"    ❌ Error: {e}")
        return []


def main():
    """Main extraction workflow"""

    # School IDs mapping
    # TO USE: Fill in the school IDs you know (manually looked up on athletic.net)
    # You can find a school ID by:
    # 1. Go to athletic.net
    # 2. Search for the school
    # 3. Click on it
    # 4. Copy the SchoolID= number from the URL
    school_ids = {
        # STAL Schools (6 schools) - Priority 1 for Monday's race
        "Andrew Hill": "1063",
        "Independence": "1065",
        "Mt. Pleasant": "1084",
        "Pioneer": "1080",
        "Silver Creek": "1082",
        "Westmont": "1076",

        # BVAL Additional (sample - add more as needed)
        "Branham": None,
        "Leland": None,

        # D2 Additional (sample - add more as needed)
        "Los Gatos": None,
        "Palo Alto": None,
        "Gunn": None,
    }

    # Filter to only schools with IDs
    schools_to_process = {name: school_id for name, school_id in school_ids.items() if school_id is not None}

    if not schools_to_process:
        print("❌ No school IDs provided!")
        print("\nPlease edit this script and add school IDs by:")
        print("1. Go to https://www.athletic.net")
        print("2. Search for each school")
        print("3. Click on the school")
        print("4. Copy the SchoolID= number from the URL")
        print("5. Add it to the school_ids dictionary in this script")
        return

    print(f"Processing {len(schools_to_process)} schools...")
    print("="*60)

    driver = create_driver()
    all_meet_ids = set()
    results = {}

    try:
        for school_name, school_id in schools_to_process.items():
            meet_ids = get_meet_ids_for_school(driver, school_id, school_name)
            results[school_name] = meet_ids
            all_meet_ids.update(meet_ids)
            time.sleep(1)  # Be nice to athletic.net

    finally:
        driver.quit()

    # Output results
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)

    for school_name, meet_ids in results.items():
        print(f"\n{school_name}:")
        for meet_id in meet_ids:
            print(f"  - https://www.athletic.net/CrossCountry/meet/{meet_id}")

    print("\n" + "="*60)
    print(f"UNIQUE MEET IDS TO IMPORT ({len(all_meet_ids)} total)")
    print("="*60)

    sorted_meet_ids = sorted(list(all_meet_ids))
    for meet_id in sorted_meet_ids:
        print(f"  {meet_id}: https://www.athletic.net/CrossCountry/meet/{meet_id}")

    # Save to file
    output = {
        'schools_processed': list(schools_to_process.keys()),
        'total_unique_meets': len(all_meet_ids),
        'meet_ids': sorted_meet_ids,
        'meet_urls': [f"https://www.athletic.net/CrossCountry/meet/{mid}" for mid in sorted_meet_ids],
        'results_by_school': results
    }

    with open('meet_ids_to_import.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ Saved results to: meet_ids_to_import.json")
    print(f"\nYou can now import these {len(all_meet_ids)} meets one at a time in your admin UI")


if __name__ == '__main__':
    main()
