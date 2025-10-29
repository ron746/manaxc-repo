#!/usr/bin/env python3
"""
Extract school IDs from a meet page
"""

import json
import time
import re
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


def extract_schools_from_meet(meet_id: str):
    """Extract all school IDs and names from a meet"""

    driver = create_driver()
    schools = {}

    try:
        # Go to teams page to get all schools
        teams_url = f"https://www.athletic.net/CrossCountry/meet/{meet_id}/teams"
        print(f"Loading teams page for meet {meet_id}...")
        driver.get(teams_url)

        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(3)

        print(f"Page title: {driver.title}")

        # Get page text for debugging
        body_text = driver.find_element(By.TAG_NAME, "body").text
        print(f"Page has {len(body_text)} characters")

        # Find all school links on the teams page
        all_links = driver.find_elements(By.TAG_NAME, "a")
        print(f"Found {len(all_links)} total links")

        # Count links with School in href
        school_link_count = 0
        for link in all_links:
            try:
                href = link.get_attribute('href') or ""
                if 'School' in href:
                    school_link_count += 1
                    if school_link_count <= 5:  # Show first 5 for debugging
                        print(f"  Sample link: {href[:100]}")

                if 'School.aspx?SchoolID=' in href:
                    match = re.search(r'SchoolID=(\d+)', href)
                    if match:
                        school_id = match.group(1)
                        school_name = link.text.strip()

                        if school_name and school_id not in schools:
                            schools[school_id] = school_name
                            print(f"  Found: {school_name} (ID: {school_id})")
            except:
                pass

        print(f"Total links with 'School': {school_link_count}")

    finally:
        driver.quit()

    return schools


if __name__ == '__main__':
    import sys

    # Can provide meet IDs as command line arguments
    meet_ids = sys.argv[1:] if len(sys.argv) > 1 else ["236799"]  # Default to CCS meet

    all_schools = {}

    for meet_id in meet_ids:
        print("="*60)
        print(f"EXTRACTING SCHOOL IDs FROM MEET {meet_id}")
        print("="*60)

        schools = extract_schools_from_meet(meet_id)
        all_schools.update(schools)

        print(f"\nFound {len(schools)} schools in meet {meet_id}\n")

    print(f"\n{'='*60}")
    print(f"TOTAL: {len(all_schools)} UNIQUE SCHOOLS")
    print("="*60)

    # Sort by school name
    sorted_schools = sorted(all_schools.items(), key=lambda x: x[1])

    for school_id, school_name in sorted_schools:
        print(f"{school_name}: {school_id}")

    # Save to file
    output = {school_name: school_id for school_id, school_name in sorted_schools}

    with open('extracted_school_ids.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ Saved to extracted_school_ids.json")
