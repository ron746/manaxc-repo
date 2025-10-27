import time
import csv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import re

def sanitize_filename(name):
    name = re.sub(r"[^a-zA-Z0-9 ]", "", name)
    return name.strip().replace(" ", "_")

def main():
    url = input("Paste the Athletic.net meet results URL: ").strip()
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    driver.get(url)
    time.sleep(5)  # Wait for JS to load

    # Try to get meet name and date from the page title or header
    meet_name = driver.title.split(" - ")[0]
    meet_date = "UNK"
    try:
        header = driver.find_element(By.TAG_NAME, "h1").text
        date_match = re.search(r"\b\w{3}, \w{3} \d{1,2}, \d{4}\b", header)
        if date_match:
            meet_date = date_match.group(0)
    except Exception:
        pass

    # Find the main results section (usually after "Official Results" or similar)
    # This may need to be adjusted if the page structure changes
    body = driver.find_element(By.TAG_NAME, "body")
    all_text = body.text

    # Split into lines, as if copy-pasted into Excel
    lines = all_text.splitlines()

    # Filter out empty lines
    lines = [line for line in lines if line.strip()]

    # Save as CSV (one line per row, no headers)
    date_part = re.sub(r"[^\d]", "", meet_date)[:8] if meet_date != "UNK" else "UNK"
    name_part = sanitize_filename(meet_name)
    output_file = f"{date_part}-{name_part}.csv"
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for line in lines:
            writer.writerow([line])

    driver.quit()
    print(f"Saved raw results to {output_file}")

if __name__ == "__main__":
    main()
