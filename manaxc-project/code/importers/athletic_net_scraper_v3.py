#!/usr/bin/env python3
"""
Athletic.net Scraper V3 - Fixed Gender Detection and All Races Capture
Scrapes individual race pages to get accurate gender and complete race list
"""

import re
import time
import csv
import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Optional, Callable
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from nameparser import HumanName

# Import all data structures and helper functions from v2
from athletic_net_scraper_v2 import (
    ScrapedVenue, ScrapedCourse, ScrapedSchool, ScrapedAthlete,
    ScrapedMeet, ScrapedRace, ScrapedResult, ScrapeResult,
    create_driver, parse_distance_from_name, time_to_centiseconds,
    parse_athlete_name, calculate_grad_year, parse_meet_date,
    write_csv_files
)


def scrape_by_meet_v3(
    meet_id: str,
    progress_callback: Optional[Callable[[str], None]] = None
) -> ScrapeResult:
    """
    Scrape all data for a single meet - V3 with individual race page scraping.

    Fixes:
    - Gender detection: Scrapes each race page individually to get "Mens" or "Womens" from race title
    - Missing races: Extracts ALL race IDs from meet page links

    Args:
        meet_id: Athletic.net meet ID
        progress_callback: Optional callback for progress updates

    Returns:
        ScrapeResult with all entities
    """
    if progress_callback:
        progress_callback(f"Starting scrape for meet {meet_id}...")

    driver = create_driver()

    # Storage for all entities
    venues = []
    courses = []
    schools = []
    athletes = []
    meets = []
    races = []
    results = []

    try:
        # Load meet page
        meet_url = f'https://www.athletic.net/CrossCountry/meet/{meet_id}/results'
        if progress_callback:
            progress_callback(f"Loading meet page...")

        driver.get(meet_url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(3)

        # Extract meet metadata from main page
        meet_name = driver.title.split(" - ")[0] if " - " in driver.title else driver.title
        body_text = driver.find_element(By.TAG_NAME, "body").text

        # Extract meet date
        meet_date = None
        date_match = re.search(r'\w{3},?\s+\w{3}\s+\d{1,2},\s+\d{4}', body_text)
        if date_match:
            meet_date = parse_meet_date(date_match.group(0))

        # Extract season year from date or use current year
        season_year = int(meet_date.split('-')[0]) if meet_date else datetime.now().year

        # Extract venue information from body text
        venue_name = "Unknown Venue"
        venue_state = ""

        lines = [line.strip() for line in body_text.splitlines() if line.strip()]

        # Try to find venue in page text
        # Look for patterns like "Montgomery Hill Park, CA US"
        for line in lines[:30]:
            if re.search(r'[A-Z][a-z]+ [A-Z][a-z]+.*(Park|Course|Field|Center)', line, re.IGNORECASE):
                # Extract state if present
                state_match = re.search(r'\b([A-Z]{2})\b', line)
                if state_match:
                    venue_state = state_match.group(1)
                    # Remove state and "US" from venue name
                    venue_name = re.sub(r',?\s*[A-Z]{2}\s*US.*$', '', line).strip()
                else:
                    venue_name = line.strip()
                break

        if progress_callback:
            progress_callback(f"Meet: {meet_name} at {venue_name}, {venue_state}")

        # STEP 1: Extract all unique race IDs from meet page links
        if progress_callback:
            progress_callback(f"Finding all races...")

        race_links = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/results/"]')
        race_ids_found = set()
        for link in race_links:
            href = link.get_attribute('href')
            match = re.search(r'/results/(\d+)', href)
            if match:
                race_ids_found.add(match.group(1))

        race_ids = sorted(race_ids_found)
        if progress_callback:
            progress_callback(f"Found {len(race_ids)} races")

        # STEP 2: Scrape each race individually
        for race_id in race_ids:
            race_url = f"https://www.athletic.net/CrossCountry/meet/{meet_id}/results/{race_id}"
            if progress_callback:
                progress_callback(f"Scraping race {race_id}...")

            driver.get(race_url)
            time.sleep(4)  # Increased wait for page to fully load

            race_body_text = driver.find_element(By.TAG_NAME, "body").text
            race_lines = [line.strip() for line in race_body_text.splitlines() if line.strip()]

            # Extract race name (includes "Mens" or "Womens")
            # Typically appears as "Mens 2.74 Miles Varsity" or "Womens 2.74 Miles Junior Varsity"
            race_name = None
            race_gender = None

            for line in race_lines[:40]:  # Check first 40 lines
                # Look for gender + distance + race type pattern
                # Include common race types: Varsity, JV, Junior Varsity, Frosh, Freshman, Reserves
                if re.search(r'\b(Mens?|Womens?)\s+[\d.]+\s+(?:Miles?|km|Kilometers?|m)\s+(Varsity|JV|Junior Varsity|Frosh|Freshman|Reserves?)\b', line, re.IGNORECASE):
                    race_name = line
                    # Extract gender
                    if re.search(r'\bmens?\b', line, re.IGNORECASE):
                        race_gender = 'M'
                    elif re.search(r'\bwomens?\b', line, re.IGNORECASE):
                        race_gender = 'F'
                    break

            if not race_name or not race_gender:
                if progress_callback:
                    progress_callback(f"WARNING: Could not extract race name/gender from race {race_id}, skipping")
                continue

            # Determine race type
            if re.search(r'\bvarsity\b', race_name, re.IGNORECASE) and not re.search(r'\bjunior\b', race_name, re.IGNORECASE):
                race_type = 'Varsity'
            elif re.search(r'\b(jv|junior varsity)\b', race_name, re.IGNORECASE):
                race_type = 'JV'
            elif re.search(r'\b(frosh|freshman)\b', race_name, re.IGNORECASE):
                race_type = 'Frosh'
            elif re.search(r'\breserves?\b', race_name, re.IGNORECASE):
                race_type = 'Reserves'
            else:
                race_type = 'Other'

            # Parse distance from race name
            distance_meters = parse_distance_from_name(race_name)

            # Add race
            race = ScrapedRace(
                athletic_net_race_id=race_id,
                meet_athletic_net_id=meet_id,
                name=race_name,
                gender=race_gender,
                distance_meters=distance_meters,
                race_type=race_type
            )
            races.append(race)

            if progress_callback:
                progress_callback(f"  → {race_name} ({race_gender})")

            # STEP 3: Parse results from this race page using DOM parsing
            # Results are in div[class*="result-row"] elements with structure:
            # Place / Name / School / Time / Year info on separate lines
            results_for_this_race = 0
            result_rows = driver.find_elements(By.CSS_SELECTOR, 'div[class*="result-row"]')

            for row in result_rows:
                row_text = row.text.strip()
                if not row_text:
                    continue

                row_lines = [line.strip() for line in row_text.split('\n') if line.strip()]
                if len(row_lines) < 4:
                    continue  # Need at least: place, name, school, time

                # Extract components
                # Format can be:
                # Line 0: place
                # Line 1: initials (optional, 2-3 uppercase letters)
                # Line 2: athlete name (or line 1 if no initials)
                # Line 3: school name (or line 2 if no initials)
                # Line 4: time (or line 3 if no initials)
                # Line 5+: PR • Yr: 12 • +1pts

                try:
                    place = int(row_lines[0])
                except ValueError:
                    continue

                # Check if line 1 is initials (2-3 uppercase letters)
                offset = 0
                if len(row_lines) >= 5 and re.match(r'^[A-Z]{2,3}$', row_lines[1]):
                    offset = 1  # Skip initials line

                athlete_name = row_lines[1 + offset]
                school_name = row_lines[2 + offset]
                time_str = row_lines[3 + offset]

                # Extract grade from remaining lines
                grade = None
                for line in row_lines[4 + offset:]:
                    yr_match = re.search(r'Yr:\s*(\d+)', line)
                    if yr_match:
                        grade = int(yr_match.group(1))
                        break

                # Parse athlete name
                first_name, last_name = parse_athlete_name(athlete_name)

                # Convert time
                time_cs = time_to_centiseconds(time_str)
                if not time_cs:
                    continue

                # Calculate grad year
                if grade:
                    try:
                        grad_year = calculate_grad_year(grade, season_year)
                    except ValueError:
                        grad_year = season_year + 1
                else:
                    grad_year = season_year + 1

                # Generate school ID
                school_id = f"school_{school_name.replace(' ', '_').lower()}"

                # Add school (if not already added)
                if not any(s.name == school_name for s in schools):
                    school = ScrapedSchool(
                        athletic_net_id=school_id,
                        name=school_name,
                        short_name=school_name.replace(' High School', '').replace(' HS', ''),
                        city="",
                        state="",
                        league=""
                    )
                    schools.append(school)

                # Add athlete (if not already added)
                athlete_key = (athlete_name, school_id)
                if not any((a.name, a.school_athletic_net_id) == athlete_key for a in athletes):
                    athlete = ScrapedAthlete(
                        athletic_net_id=None,
                        name=athlete_name,
                        first_name=first_name,
                        last_name=last_name,
                        school_athletic_net_id=school_id,
                        grad_year=grad_year,
                        gender=race_gender,
                        needs_review=False
                    )
                    athletes.append(athlete)

                # Add result
                result = ScrapedResult(
                    athletic_net_race_id=race_id,
                    athlete_name=athlete_name,
                    athlete_first_name=first_name,
                    athlete_last_name=last_name,
                    athlete_school_id=school_id,
                    time_cs=time_cs,
                    place_overall=place,
                    grade=grade or 12,  # Default to senior if grade not found
                    needs_review=False
                )
                results.append(result)
                results_for_this_race += 1

            if progress_callback and results_for_this_race > 0:
                progress_callback(f"    Parsed {results_for_this_race} results")

        # Add meet
        meet = ScrapedMeet(
            athletic_net_id=meet_id,
            name=meet_name,
            meet_date=meet_date or f"{season_year}-01-01",
            venue_name=venue_name,
            season_year=season_year,
            meet_type=""  # Admin will select
        )
        meets.append(meet)

        # Create venue
        venue = ScrapedVenue(
            athletic_net_id=None,
            name=venue_name,
            city="",
            state=venue_state,
            notes=f"Auto-generated for meet {meet_id}"
        )
        venues.append(venue)

        # Create course
        if races:
            first_race_name = races[0].name
            distance_display = "Unknown Distance"

            # Extract distance with unit
            distance_match = re.search(r'([\d.]+\s+(?:Miles?|Kilometers?|km|m)\b)', first_race_name, re.IGNORECASE)
            if distance_match:
                distance_display = distance_match.group(1)

            distance_meters = races[0].distance_meters
            course_name = f"{venue_name}, {distance_display}"

            course = ScrapedCourse(
                athletic_net_id=None,
                name=course_name,
                venue_name=venue_name,
                distance_meters=distance_meters,
                distance_display=distance_display,
                difficulty_rating=5.0,
                needs_review=True,
                needs_records_scraping=False
            )
            courses.append(course)

        if progress_callback:
            progress_callback(f"Complete: {len(results)} results from {len(races)} races")

        metadata = {
            'scrape_type': 'meet',
            'entity_id': meet_id,
            'scraped_at': datetime.now().isoformat(),
            'season_year': season_year,
            'total_results': len(results),
            'total_races': len(races),
            'total_schools': len(schools),
            'total_athletes': len(athletes)
        }

        return ScrapeResult(
            venues=venues,
            courses=courses,
            schools=schools,
            athletes=athletes,
            meets=meets,
            races=races,
            results=results,
            metadata=metadata
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3 or sys.argv[1] != 'meet':
        print("Usage: python3 athletic_net_scraper_v3.py meet <meet_id>")
        sys.exit(1)

    meet_id = sys.argv[2]

    def progress(msg):
        print(f"  {msg}")

    print(f"🏃 Scraping meet {meet_id} with V3 scraper...")
    result = scrape_by_meet_v3(meet_id, progress_callback=progress)

    # Save to CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_folder = f"to-be-processed/meet_{meet_id}_{timestamp}"
    os.makedirs(output_folder, exist_ok=True)

    write_csv_files(result, output_folder)
    print(f"\n💾 Saved to: {output_folder}")
    print(f"📊 Stats: {result.metadata['total_results']} results, {result.metadata['total_races']} races")
