from selenium import webdriver
from selenium.webdriver.common.by import By
import time

# Start Chrome using Selenium Manager (no need for chromedriver path)
driver = webdriver.Chrome()

# Go to Westmont's 2025 season page
driver.get('https://www.athletic.net/team/1076/cross-country/2025')
time.sleep(5)  # Wait for page to load

# Find all meet links on the page
meet_links = []
meets = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/CrossCountry/meet/"]')
for meet in meets:
    url = meet.get_attribute('href')
    # Only add unique meet links
    if url and '/CrossCountry/meet/' in url and url not in meet_links:
        meet_links.append(url)

print("Found meet links for Westmont 2025 season:")
for link in meet_links:
    print(link)

input("Press Enter to close the browser...")
driver.quit()