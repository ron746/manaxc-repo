from selenium import webdriver
from selenium.webdriver.common.by import By
import time
import csv
import re

def sanitize_filename(name):
    name = re.sub(r"[^a-zA-Z0-9 ]", "", name)
    return name.strip().replace(" ", "_")

def save_meet_results(driver, url):
    driver.get(url)
    time.sleep(5)  # Wait for JS to load

    # Get meet name and date
    meet_name = driver.title.split(" - ")[0]
    meet_date = "UNK"
    try:
        header = driver.find_element(By.TAG_NAME, "h1").text
        date_match = re.search(r"\b\w{3}, \w{3} \d{1,2}, \d{4}\b", header)
        if date_match:
            meet_date = date_match.group(0)
    except Exception:
        pass

    # Get all visible text
    body = driver.find_element(By.TAG_NAME, "body")
    all_text = body.text
    lines = [line for line in all_text.splitlines() if line.strip()]

    # Save as CSV
    date_part = re.sub(r"[^\d]", "", meet_date)[:8] if meet_date != "UNK" else "UNK"
    name_part = sanitize_filename(meet_name)
    output_file = f"{date_part}-{name_part}.csv"
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for line in lines:
            writer.writerow([line])
    print(f"Saved raw results to {output_file}")

def main():
    # Step 1: Get all meet links for Westmont 2025
    driver = webdriver.Chrome()
    driver.get('https://www.athletic.net/team/1076/cross-country/2025')
    time.sleep(5)
    meet_links = []
    meets = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/CrossCountry/meet/"]')
    for meet in meets:
        url = meet.get_attribute('href')
        if url and '/CrossCountry/meet/' in url and url not in meet_links:
            meet_links.append(url)
    print(f"Found {len(meet_links)} meet links.")

    # Step 2: Visit each meet's results page and save results
    for idx, url in enumerate(meet_links, 1):
        results_url = url.rstrip('/') + '/results/all'
        print(f"Processing meet {idx}/{len(meet_links)}: {results_url}")
        try:
            save_meet_results(driver, results_url)
        except Exception as e:
            print(f"Failed to process {results_url}: {e}")

    driver.quit()

if __name__ == "__main__":
    main()