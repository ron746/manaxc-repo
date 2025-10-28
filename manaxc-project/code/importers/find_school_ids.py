#!/usr/bin/env python3
"""
Find Athletic.net school IDs by searching for school names
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import sys

# Schools to find
SCHOOLS = [
    'Andrew Hill High School',
    'Branham High School',
    'Christopher High School',
    'Del Mar High School',
    'Evergreen Valley High School',
    'Gilroy High School',
    'Gunderson High School',
    'Independence High School',
    'James Lick High School',
    'Leigh High School',
    'Leland High School',
    'Lincoln High School',
    'Live Oak High School',
    'Mt Pleasant High School',
    'Oak Grove High School',
    'Overfelt High School',
    'Piedmont Hills High School',
    'Pioneer High School',
    'Prospect High School',
    'San Jose High School',
    'Santa Teresa High School',
    'Silver Creek High School',
    'Sobrato High School',
    'Westmont High School',
    'Willow Glen High School',
    'Yerba Buena High School',
    'Archbishop Mitty High School',
    'Cupertino High School',
    'Everett Alvarez High School',
    'Fremont High School',
    'Gunn High School',
    'Junipero Serra High School',
    'Los Gatos High School',
    'Lynbrook High School',
    'Mountain View High School',
    'Palo Alto High School',
    'Rancho San Juan High School',
    'Saint Francis High School',
    'Santa Clara High School',
    'Sequoia High School',
]

def find_school_id(driver, school_name):
    """Search for a school and extract its ID"""
    try:
        # Go to Athletic.net cross country school search
        url = f"https://www.athletic.net/CrossCountry/search.aspx?S={school_name.replace(' ', '+')}"
        driver.get(url)
        time.sleep(2)

        # Look for school links in search results
        # Athletic.net school URLs look like: /CrossCountry/School.aspx?SchoolID=1076
        links = driver.find_elements(By.CSS_SELECTOR, "a[href*='SchoolID=']")

        if links:
            href = links[0].get_attribute('href')
            # Extract school ID from URL
            if 'SchoolID=' in href:
                school_id = href.split('SchoolID=')[1].split('&')[0]
                return school_id

        return None

    except Exception as e:
        print(f"  Error searching for {school_name}: {e}")
        return None

def main():
    # Set up Chrome driver
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in background
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    driver = webdriver.Chrome(options=chrome_options)

    print("🔍 Finding Athletic.net School IDs")
    print("=" * 60)

    results = {}

    for school_name in SCHOOLS:
        print(f"\nSearching: {school_name}")
        school_id = find_school_id(driver, school_name)

        if school_id:
            print(f"  ✅ Found: {school_id}")
            results[school_name] = school_id
        else:
            print(f"  ❌ Not found")
            results[school_name] = None

        time.sleep(1)  # Be nice to Athletic.net

    driver.quit()

    # Print results in Python dictionary format
    print("\n\n" + "=" * 60)
    print("📊 RESULTS (Copy this into batch_import_schools.py)")
    print("=" * 60)
    print("\nSCHOOL_IDS = {")
    for school, id in results.items():
        school_short = school.replace(' High School', '').strip()
        if id:
            print(f"    '{school_short}': {id},")
        else:
            print(f"    '{school_short}': None,  # NOT FOUND")
    print("}")

if __name__ == '__main__':
    main()
