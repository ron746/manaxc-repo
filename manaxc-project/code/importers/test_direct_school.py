#!/usr/bin/env python3
"""Test accessing school page directly"""

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

driver = create_driver()

# Test with Westmont school ID 1076 (from folder name)
school_id = "1076"
school_url = f"https://www.athletic.net/CrossCountry/School.aspx?SchoolID={school_id}"

print(f"Accessing: {school_url}")
driver.get(school_url)

try:
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    time.sleep(3)

    print(f"\nTitle: {driver.title}")

    # Get school name
    body_text = driver.find_element(By.TAG_NAME, "body").text
    print(f"\nFirst 300 chars:\n{body_text[:300]}")

    # Look for meet links - they're usually in tables or specific sections
    all_links = driver.find_elements(By.TAG_NAME, "a")
    print(f"  Total links on page: {len(all_links)}")

    # Find all elements that might contain meet information
    # Athletic.net often puts meets in table rows
    tables = driver.find_elements(By.TAG_NAME, "table")
    print(f"  Found {len(tables)} tables")

    meets_data = []
    seen_ids = set()

    # Look through all links for meet links
    for link in all_links:
        try:
            href = link.get_attribute('href') or ""
            if '/CrossCountry/meet/' in href:
                match = re.search(r'/meet/(\d+)', href)
                if match:
                    meet_id = match.group(1)
                    if meet_id not in seen_ids:
                        seen_ids.add(meet_id)

                        # Try to get meet name from:
                        # 1. Link text
                        # 2. Parent row
                        # 3. Nearby elements
                        meet_name = link.text.strip()

                        if not meet_name:
                            # Check if link is in a table row
                            try:
                                parent = link.find_element(By.XPATH, "..")
                                row = parent.find_element(By.XPATH, "ancestor::tr[1]")
                                row_text = row.text.strip()
                                # Extract just the meet name part (usually first cell or specific pattern)
                                meet_name = row_text.split('\n')[0] if '\n' in row_text else row_text
                            except:
                                pass

                        meets_data.append({
                            'id': meet_id,
                            'name': meet_name if meet_name else f"Meet {meet_id}"
                        })
        except Exception as e:
            pass

    print(f"\nFound {len(meets_data)} unique meets:")
    for meet in meets_data:
        print(f"  {meet['id']}: {meet['name']}")

finally:
    driver.quit()

print("\nDone!")
