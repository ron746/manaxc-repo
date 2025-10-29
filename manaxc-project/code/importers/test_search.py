#!/usr/bin/env python3
"""Quick test to debug Athletic.net search"""

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

# Test search for Westmont High School
search_term = "Westmont High School CA"
print(f"Searching for: {search_term}")

search_url = f"https://www.athletic.net/Search.aspx?search={search_term.replace(' ', '+')}"
print(f"URL: {search_url}")

driver.get(search_url)

try:
    # Wait for page to load
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    time.sleep(3)

    # Get page HTML
    print("\n=== PAGE TITLE ===")
    print(driver.title)

    # Get page text
    print("\n=== PAGE TEXT (first 500 chars) ===")
    body_text = driver.find_element(By.TAG_NAME, "body").text
    print(body_text[:500])

    # Look for any links
    print("\n=== ALL LINKS (first 20) ===")
    all_links = driver.find_elements(By.TAG_NAME, "a")
    print(f"Total links found: {len(all_links)}")

    for i, link in enumerate(all_links[:20]):
        href = link.get_attribute('href')
        text = link.text.strip()
        if text or 'school' in href.lower():
            print(f"{i+1}. '{text}' -> {href}")

    # Try different selectors
    print("\n=== LOOKING FOR SCHOOL LINKS ===")

    # Try 1: CSS selector for SchoolID
    links1 = driver.find_elements(By.CSS_SELECTOR, "a[href*='SchoolID']")
    print(f"Found {len(links1)} links with 'SchoolID'")

    # Try 2: CSS selector for School.aspx
    links2 = driver.find_elements(By.CSS_SELECTOR, "a[href*='School.aspx']")
    print(f"Found {len(links2)} links with 'School.aspx'")

    # Try 3: XPath
    links3 = driver.find_elements(By.XPATH, "//a[contains(@href, 'School')]")
    print(f"Found {len(links3)} links with 'School' (XPath)")

    if links2:
        print("\n=== FIRST FEW School.aspx LINKS ===")
        for link in links2[:5]:
            print(f"{link.text.strip()} -> {link.get_attribute('href')}")

finally:
    driver.quit()

print("\nDone!")
