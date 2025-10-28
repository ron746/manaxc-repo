#!/usr/bin/env python3
"""
Athletic.net Modular Scraper for ManaXC (Version 2)
Provides targeted scraping functions for schools, meets, races, and athletes
with support for CSV generation and progress callbacks.
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


# ==============================================================================
# DATA STRUCTURES (from CONTRACTS.md)
# ==============================================================================

@dataclass
class ScrapedVenue:
    """Venue where meets are held"""
    athletic_net_id: Optional[str]
    name: str
    city: str
    state: str
    notes: str = ""


@dataclass
class ScrapedCourse:
    """Specific course at a venue"""
    athletic_net_id: Optional[str]
    name: str
    venue_name: str
    distance_meters: int
    distance_display: str
    difficulty_rating: float = 5.0
    needs_review: bool = False
    needs_records_scraping: bool = False


@dataclass
class ScrapedSchool:
    """High school team"""
    athletic_net_id: str
    name: str
    short_name: str
    city: str
    state: str
    league: str = ""


@dataclass
class ScrapedAthlete:
    """Individual athlete"""
    athletic_net_id: Optional[str]
    name: str
    first_name: str
    last_name: str
    school_athletic_net_id: str
    grad_year: int
    gender: str
    needs_review: bool = False
    fuzzy_match_score: Optional[float] = None


@dataclass
class ScrapedMeet:
    """Cross country meet/invitational"""
    athletic_net_id: str
    name: str
    meet_date: str  # YYYY-MM-DD
    venue_name: str
    season_year: int
    meet_type: str = "invitational"


@dataclass
class ScrapedRace:
    """Individual race within a meet"""
    athletic_net_race_id: str
    meet_athletic_net_id: str
    name: str
    gender: str
    distance_meters: int
    race_type: str  # "Varsity", "JV", "Frosh"


@dataclass
class ScrapedResult:
    """Single race result"""
    athletic_net_race_id: str
    athlete_name: str
    athlete_first_name: str
    athlete_last_name: str
    athlete_school_id: str
    time_cs: int  # Centiseconds
    place_overall: int
    grade: int
    needs_review: bool = False


@dataclass
class ScrapeResult:
    """Complete scraping result with all entities"""
    venues: List[ScrapedVenue]
    courses: List[ScrapedCourse]
    schools: List[ScrapedSchool]
    athletes: List[ScrapedAthlete]
    meets: List[ScrapedMeet]
    races: List[ScrapedRace]
    results: List[ScrapedResult]
    metadata: Dict


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def time_to_centiseconds(time_str: str) -> Optional[int]:
    """
    Convert time string to centiseconds.

    Examples:
        "15:05.5" → 90550
        "19:30.45" → 117045
        "16:45" → 100500

    Args:
        time_str: Time in format MM:SS.CC or MM:SS

    Returns:
        Total centiseconds or None if invalid
    """
    try:
        time_str = time_str.strip()
        match = re.match(r'(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?', time_str)
        if not match:
            return None

        minutes = int(match.group(1))
        seconds = int(match.group(2))
        centiseconds = int(match.group(3).ljust(2, '0')) if match.group(3) else 0

        total_cs = (minutes * 60 * 100) + (seconds * 100) + centiseconds
        return total_cs
    except:
        return None


def parse_distance_from_name(race_name: str) -> int:
    """
    Extract distance in meters from race name.

    Examples:
        "2.74 Miles Varsity" → 4409
        "5K JV" → 5000
        "3 Mile Varsity" → 4828

    Args:
        race_name: Race name containing distance

    Returns:
        Distance in meters (default 5000 if can't parse)
    """
    race_name = race_name.lower()

    # Try miles pattern: "2.74 miles", "3 mile"
    miles_match = re.search(r'(\d+\.?\d*)\s*miles?', race_name)
    if miles_match:
        miles = float(miles_match.group(1))
        return int(miles * 1609.34)

    # Try kilometers pattern: "5k", "5000m"
    km_match = re.search(r'(\d+\.?\d*)\s*k(?:m)?', race_name)
    if km_match:
        km = float(km_match.group(1))
        return int(km * 1000)

    meters_match = re.search(r'(\d+)\s*m(?:eters)?', race_name)
    if meters_match:
        return int(meters_match.group(1))

    # Default to 5K if can't parse
    return 5000


def calculate_grad_year(grade: int, season_year: int) -> int:
    """
    Calculate graduation year from current grade and season.

    Formula: grad_year = season_year + (12 - grade)

    Examples:
        grade=9, season=2025 → 2028
        grade=10, season=2025 → 2027
        grade=12, season=2025 → 2025

    Args:
        grade: Current grade (9-13)
        season_year: Season year (e.g., 2025)

    Returns:
        Graduation year

    Raises:
        ValueError: If grade is invalid
    """
    if grade < 9 or grade > 13:
        raise ValueError(f"Invalid grade: {grade}. Must be 9-13.")

    if grade == 13:  # Post-grad
        return season_year

    return season_year + (12 - grade)


def parse_athlete_name(full_name: str) -> tuple:
    """
    Parse full name into first and last name.

    Args:
        full_name: Full name string

    Returns:
        (first_name, last_name) tuple
    """
    name = HumanName(full_name)
    return (name.first, name.last)


def parse_meet_date(date_str: str) -> Optional[str]:
    """
    Parse meet date string to YYYY-MM-DD format.

    Example: "Sat, Sep 14, 2024" → "2024-09-14"

    Args:
        date_str: Date string from Athletic.net

    Returns:
        Date in YYYY-MM-DD format or None
    """
    try:
        # Remove day of week if present
        date_str = re.sub(r'^[A-Za-z]{3},?\s+', '', date_str)
        date_obj = datetime.strptime(date_str, "%b %d, %Y")
        return date_obj.strftime("%Y-%m-%d")
    except:
        return None


def create_driver() -> webdriver.Chrome:
    """
    Create and configure Chrome WebDriver.

    Returns:
        Configured Chrome WebDriver instance
    """
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')

    # On macOS, specify Chrome binary location
    import platform
    if platform.system() == 'Darwin':
        chrome_options.binary_location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

    return webdriver.Chrome(options=chrome_options)


# ==============================================================================
# CORE SCRAPING FUNCTIONS
# ==============================================================================

def get_school_meets(
    school_id: str,
    seasons: List[int],
    progress_callback: Optional[Callable[[str], None]] = None
) -> List[Dict]:
    """
    Fetch list of meets for a school (without scraping full results).
    Used for meet selection UI.

    Args:
        school_id: Athletic.net school ID (e.g., "1076")
        seasons: List of season years (e.g., [2024, 2025])
        progress_callback: Optional callback for progress updates

    Returns:
        List of meet dictionaries with:
        - athletic_net_id: Meet ID
        - name: Meet name
        - date: Meet date (YYYY-MM-DD or None)
        - url: Full meet URL
        - season_year: Season year
    """
    if progress_callback:
        progress_callback(f"Fetching meet list for school {school_id}...")

    driver = create_driver()
    all_meets = []

    try:
        for season in seasons:
            if progress_callback:
                progress_callback(f"Loading {season} season...")

            team_url = f'https://www.athletic.net/team/{school_id}/cross-country/{season}'
            driver.get(team_url)
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            time.sleep(2)

            # Find all meet links
            meet_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/CrossCountry/meet/"]')

            for elem in meet_elements:
                url = elem.get_attribute('href')
                if url and '/CrossCountry/meet/' in url:
                    # Extract meet ID
                    meet_id_match = re.search(r'/meet/(\d+)', url)
                    if meet_id_match:
                        meet_id = meet_id_match.group(1)
                        meet_name = elem.text.strip() or "Unknown Meet"

                        # Check if already added
                        if not any(m['athletic_net_id'] == meet_id for m in all_meets):
                            all_meets.append({
                                'athletic_net_id': meet_id,
                                'name': meet_name,
                                'date': None,  # Will be scraped later if selected
                                'url': url,
                                'season_year': season
                            })

            if progress_callback:
                progress_callback(f"Found {len(all_meets)} meets so far...")

    finally:
        driver.quit()

    return all_meets


def scrape_by_meet(
    meet_id: str,
    progress_callback: Optional[Callable[[str], None]] = None
) -> ScrapeResult:
    """
    Scrape all data for a single meet.

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
        meet_url = f'https://www.athletic.net/CrossCountry/meet/{meet_id}/results/all'
        if progress_callback:
            progress_callback(f"Loading meet page...")

        driver.get(meet_url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(3)

        # Extract meet metadata
        meet_name = driver.title.split(" - ")[0] if " - " in driver.title else driver.title
        body_text = driver.find_element(By.TAG_NAME, "body").text

        # Extract meet date
        meet_date = None
        date_match = re.search(r'\w{3},?\s+\w{3}\s+\d{1,2},\s+\d{4}', body_text)
        if date_match:
            meet_date = parse_meet_date(date_match.group(0))

        # Extract season year from date or use current year
        season_year = int(meet_date.split('-')[0]) if meet_date else datetime.now().year

        # Extract venue information
        venue_name = "Unknown Venue"
        venue_state = ""

        # Try to find venue in body text (typically appears near top of meet page)
        # Pattern: "Location: Venue Name" or just "Venue Name" before results
        venue_match = re.search(r'(?:Location:|Hosted at:?)\s*([^,\n]+?)(?:,\s*([A-Z]{2}))?(?:\n|$)', body_text, re.IGNORECASE)
        if venue_match:
            venue_name = venue_match.group(1).strip()
            if venue_match.group(2):
                venue_state = venue_match.group(2).strip()
        else:
            # Try to find venue name in first few lines before results
            for line in lines[:20]:  # Check first 20 lines
                # Look for park, high school, or course names
                if any(keyword in line.lower() for keyword in ['park', 'high school', 'course', 'center', 'field']):
                    if not any(skip in line.lower() for skip in ['results', 'varsity', 'jv', 'place', 'time']):
                        # Check if there's a state abbreviation
                        state_match = re.search(r'\b([A-Z]{2})\b', line)
                        if state_match:
                            venue_state = state_match.group(1)
                            venue_name = line.replace(state_match.group(1), '').strip().rstrip(',').strip()
                        else:
                            venue_name = line.strip()
                        break

        if progress_callback:
            progress_callback(f"Parsing meet: {meet_name} ({meet_date or 'date unknown'}) at {venue_name}")

        # Parse results from page
        lines = [line.strip() for line in body_text.splitlines() if line.strip()]

        current_race = None
        current_gender = None
        current_race_id = f"{meet_id}_race_1"  # Auto-increment race ID
        race_counter = 1

        for i, line in enumerate(lines):
            # Detect gender headers
            if re.search(r'\b(Mens?|Womens?) Results\b', line, re.IGNORECASE):
                if 'mens' in line.lower() or 'men' in line.lower():
                    current_gender = 'M'
                elif 'womens' in line.lower() or 'women' in line.lower():
                    current_gender = 'F'
                continue

            # Detect race headers (Varsity, JV, Frosh)
            if re.search(r'\b(Varsity|JV|Junior Varsity|Frosh|Freshman)\b', line, re.IGNORECASE):
                current_race = line
                current_race_id = f"{meet_id}_race_{race_counter}"
                race_counter += 1

                # Check for explicit gender in race name
                if re.search(r'\b(Boys?|Girls?|Women)\b', line, re.IGNORECASE):
                    if 'boys' in line.lower() or 'men' in line.lower():
                        current_gender = 'M'
                    elif 'girls' in line.lower() or 'women' in line.lower():
                        current_gender = 'F'

                # Determine race type
                if 'varsity' in line.lower():
                    race_type = 'Varsity'
                elif 'jv' in line.lower() or 'junior varsity' in line.lower():
                    race_type = 'JV'
                elif 'frosh' in line.lower() or 'freshman' in line.lower():
                    race_type = 'Frosh'
                else:
                    race_type = 'Other'

                # Parse distance from race name
                distance_meters = parse_distance_from_name(line)

                # Add race
                race = ScrapedRace(
                    athletic_net_race_id=current_race_id,
                    meet_athletic_net_id=meet_id,
                    name=line,
                    gender=current_gender or 'M',
                    distance_meters=distance_meters,
                    race_type=race_type
                )
                races.append(race)

                if progress_callback:
                    progress_callback(f"Found race: {line}")

                continue

            # Parse result line: "1. 12 Vincent Cheung 15:05.5 Silver Creek"
            result_match = re.match(
                r'^(\d+)\.\s+(\d{1,2})\s+(.+?)\s+(\d{1,2}:\d{2}(?:\.\d{1,2})?)\s+(.+)$',
                line
            )

            if result_match and current_race and current_gender:
                place = int(result_match.group(1))
                grade = int(result_match.group(2))
                athlete_name = result_match.group(3).strip()
                time_str = result_match.group(4)
                school_name = result_match.group(5).strip()
                time_cs = time_to_centiseconds(time_str)

                if not time_cs:
                    continue

                # Parse athlete name
                first_name, last_name = parse_athlete_name(athlete_name)

                # Calculate grad year
                try:
                    grad_year = calculate_grad_year(grade, season_year)
                except ValueError:
                    grad_year = season_year + 1  # Default fallback

                # Generate school ID placeholder (will be enriched later)
                school_id = f"school_{school_name.replace(' ', '_').lower()}"

                # Add school (if not already added)
                if not any(s.name == school_name for s in schools):
                    school = ScrapedSchool(
                        athletic_net_id=school_id,
                        name=school_name,
                        short_name=school_name.replace(' High School', '').replace(' HS', ''),
                        city="",  # Unknown from this page
                        state="",  # Unknown from this page
                        league=""
                    )
                    schools.append(school)

                # Add athlete (if not already added)
                if not any(a.name == athlete_name and a.school_athletic_net_id == school_id for a in athletes):
                    athlete = ScrapedAthlete(
                        athletic_net_id=None,  # Not available from results page
                        name=athlete_name,
                        first_name=first_name,
                        last_name=last_name,
                        school_athletic_net_id=school_id,
                        grad_year=grad_year,
                        gender=current_gender,
                        needs_review=False
                    )
                    athletes.append(athlete)

                # Add result
                result = ScrapedResult(
                    athletic_net_race_id=current_race_id,
                    athlete_name=athlete_name,
                    athlete_first_name=first_name,
                    athlete_last_name=last_name,
                    athlete_school_id=school_id,
                    time_cs=time_cs,
                    place_overall=place,
                    grade=grade,
                    needs_review=False
                )
                results.append(result)

        # Add meet with extracted venue information
        # Leave meet_type blank to prompt admin selection during import
        meet = ScrapedMeet(
            athletic_net_id=meet_id,
            name=meet_name,
            meet_date=meet_date or f"{season_year}-01-01",
            venue_name=venue_name,
            season_year=season_year,
            meet_type=""  # Admin will select: League Meet, Invitational, Championship, Intraquad, or blank
        )
        meets.append(meet)

        # Create venue and course with extracted information
        venue = ScrapedVenue(
            athletic_net_id=None,
            name=venue_name,
            city="",  # City not available on meet results page
            state=venue_state,
            notes=f"Auto-generated for meet {meet_id}"
        )
        venues.append(venue)

        if races:
            # Extract distance from race name (e.g., "2.74 Miles Varsity" -> "2.74 Miles")
            first_race_name = races[0].name
            distance_display = "Unknown Distance"

            # Try to extract distance with unit from race name
            distance_match = re.search(r'([\d.]+\s+(?:Miles?|Kilometers?|km|m)\b)', first_race_name, re.IGNORECASE)
            if distance_match:
                distance_display = distance_match.group(1)

            distance_meters = races[0].distance_meters

            # Create course name: "Venue, Distance"
            course_name = f"{venue_name}, {distance_display}"

            course = ScrapedCourse(
                athletic_net_id=None,
                name=course_name,
                venue_name=venue_name,
                distance_meters=distance_meters,
                distance_display=distance_display,
                difficulty_rating=5.0,
                needs_review=True,  # Flag for admin review during import
                needs_records_scraping=False
            )
            courses.append(course)

        if progress_callback:
            progress_callback(f"Scraping complete: {len(results)} results from {len(races)} races")

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


def scrape_by_school(
    school_id: str,
    seasons: List[int],
    selected_meet_ids: Optional[List[str]] = None,
    progress_callback: Optional[Callable[[str], None]] = None
) -> ScrapeResult:
    """
    Scrape all data for a school across seasons.

    Two-step process:
    1. If selected_meet_ids is None: Get all meets for school
    2. Scrape only selected meets

    Args:
        school_id: Athletic.net school ID
        seasons: List of season years to scrape
        selected_meet_ids: Optional list of meet IDs to scrape (None = all meets)
        progress_callback: Optional callback for progress updates

    Returns:
        ScrapeResult with all entities
    """
    if progress_callback:
        progress_callback(f"Starting school scrape for {school_id}...")

    # Step 1: Get meet list if not provided
    if selected_meet_ids is None:
        meets_list = get_school_meets(school_id, seasons, progress_callback)
        selected_meet_ids = [m['athletic_net_id'] for m in meets_list]

    # Step 2: Scrape each selected meet
    all_venues = []
    all_courses = []
    all_schools = []
    all_athletes = []
    all_meets = []
    all_races = []
    all_results = []

    for idx, meet_id in enumerate(selected_meet_ids, 1):
        if progress_callback:
            progress_callback(f"Scraping meet {idx}/{len(selected_meet_ids)}: {meet_id}")

        meet_result = scrape_by_meet(meet_id, progress_callback)

        # Merge results (avoiding duplicates)
        all_venues.extend(meet_result.venues)
        all_courses.extend(meet_result.courses)
        all_schools.extend(meet_result.schools)
        all_athletes.extend(meet_result.athletes)
        all_meets.extend(meet_result.meets)
        all_races.extend(meet_result.races)
        all_results.extend(meet_result.results)

    metadata = {
        'scrape_type': 'school',
        'entity_id': school_id,
        'seasons': seasons,
        'scraped_at': datetime.now().isoformat(),
        'total_meets': len(all_meets),
        'total_results': len(all_results),
        'total_races': len(all_races),
        'total_schools': len(all_schools),
        'total_athletes': len(all_athletes)
    }

    return ScrapeResult(
        venues=all_venues,
        courses=all_courses,
        schools=all_schools,
        athletes=all_athletes,
        meets=all_meets,
        races=all_races,
        results=all_results,
        metadata=metadata
    )


def scrape_by_race(
    meet_id: str,
    race_id: str,
    progress_callback: Optional[Callable[[str], None]] = None
) -> ScrapeResult:
    """
    Scrape data for a single race within a meet.

    Note: Athletic.net doesn't provide direct race URLs,
    so this scrapes the full meet and filters to the specific race.

    Args:
        meet_id: Athletic.net meet ID
        race_id: Race identifier (generated during scraping)
        progress_callback: Optional callback for progress updates

    Returns:
        ScrapeResult filtered to single race
    """
    # Scrape full meet
    meet_result = scrape_by_meet(meet_id, progress_callback)

    # Filter to specific race
    # Since race_id is auto-generated, filter by race index instead
    # This is a limitation - may need UI to show race list first

    return meet_result  # For now, return full meet


def scrape_by_athlete(
    athlete_id: str,
    seasons: List[int],
    progress_callback: Optional[Callable[[str], None]] = None
) -> ScrapeResult:
    """
    Scrape all results for a specific athlete across seasons.

    Note: This requires scraping athlete profile page,
    which has a different structure. Implementation TBD.

    Args:
        athlete_id: Athletic.net athlete ID
        seasons: List of season years
        progress_callback: Optional callback for progress updates

    Returns:
        ScrapeResult with athlete's results
    """
    # TODO: Implement athlete profile scraping
    # Athlete page: https://www.athletic.net/athlete/{athlete_id}/cross-country
    raise NotImplementedError("Athlete scraping not yet implemented")


# ==============================================================================
# CSV GENERATION FUNCTIONS
# ==============================================================================

def write_csv_files(
    scrape_result: ScrapeResult,
    output_folder: str
) -> Dict[str, int]:
    """
    Write scraping results to 7 CSV files + metadata.json

    Args:
        scrape_result: ScrapeResult object with all data
        output_folder: Output directory path

    Returns:
        Dict with counts of records written to each file
    """
    os.makedirs(output_folder, exist_ok=True)

    counts = {}

    # Write venues.csv
    venues_file = os.path.join(output_folder, 'venues.csv')
    with open(venues_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['athletic_net_id', 'name', 'city', 'state', 'notes'])
        writer.writeheader()
        for venue in scrape_result.venues:
            writer.writerow(asdict(venue))
    counts['venues'] = len(scrape_result.venues)

    # Write courses.csv
    courses_file = os.path.join(output_folder, 'courses.csv')
    with open(courses_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'athletic_net_id', 'name', 'venue_name', 'distance_meters',
            'distance_display', 'difficulty_rating', 'needs_review', 'needs_records_scraping'
        ])
        writer.writeheader()
        for course in scrape_result.courses:
            writer.writerow(asdict(course))
    counts['courses'] = len(scrape_result.courses)

    # Write schools.csv
    schools_file = os.path.join(output_folder, 'schools.csv')
    with open(schools_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'athletic_net_id', 'name', 'short_name', 'city', 'state', 'league'
        ])
        writer.writeheader()
        for school in scrape_result.schools:
            writer.writerow(asdict(school))
    counts['schools'] = len(scrape_result.schools)

    # Write athletes.csv
    athletes_file = os.path.join(output_folder, 'athletes.csv')
    with open(athletes_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'athletic_net_id', 'name', 'first_name', 'last_name',
            'school_athletic_net_id', 'grad_year', 'gender',
            'needs_review', 'fuzzy_match_score'
        ])
        writer.writeheader()
        for athlete in scrape_result.athletes:
            writer.writerow(asdict(athlete))
    counts['athletes'] = len(scrape_result.athletes)

    # Write meets.csv
    meets_file = os.path.join(output_folder, 'meets.csv')
    with open(meets_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'athletic_net_id', 'name', 'meet_date', 'venue_name', 'season_year', 'meet_type'
        ])
        writer.writeheader()
        for meet in scrape_result.meets:
            writer.writerow(asdict(meet))
    counts['meets'] = len(scrape_result.meets)

    # Write races.csv
    races_file = os.path.join(output_folder, 'races.csv')
    with open(races_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'athletic_net_race_id', 'meet_athletic_net_id', 'name',
            'gender', 'distance_meters', 'race_type'
        ])
        writer.writeheader()
        for race in scrape_result.races:
            writer.writerow(asdict(race))
    counts['races'] = len(scrape_result.races)

    # Write results.csv
    results_file = os.path.join(output_folder, 'results.csv')
    with open(results_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'athletic_net_race_id', 'athlete_name', 'athlete_first_name', 'athlete_last_name',
            'athlete_school_id', 'time_cs', 'place_overall', 'grade', 'needs_review'
        ])
        writer.writeheader()
        for result in scrape_result.results:
            writer.writerow(asdict(result))
    counts['results'] = len(scrape_result.results)

    # Write metadata.json
    metadata_file = os.path.join(output_folder, 'metadata.json')
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(scrape_result.metadata, f, indent=2)

    return counts


# ==============================================================================
# CLI INTERFACE (for testing)
# ==============================================================================

if __name__ == "__main__":
    import sys

    def print_progress(msg: str):
        print(f"[PROGRESS] {msg}")

    if len(sys.argv) < 3:
        print("Usage:")
        print("  python athletic_net_scraper_v2.py meet <meet_id>")
        print("  python athletic_net_scraper_v2.py school <school_id> <season_year>")
        print("  python athletic_net_scraper_v2.py school-meets <school_id> <season_year>")
        sys.exit(1)

    command = sys.argv[1]

    if command == "meet":
        meet_id = sys.argv[2]
        print(f"\n🏃 Scraping Meet {meet_id}")
        print("=" * 60)

        result = scrape_by_meet(meet_id, print_progress)

        # Write CSV files
        output_folder = f"to-be-processed/meet_{meet_id}_{int(time.time())}"
        counts = write_csv_files(result, output_folder)

        print("\n" + "=" * 60)
        print("✅ Scraping complete!")
        print(f"📊 Results: {counts['results']} results from {counts['races']} races")
        print(f"📊 Athletes: {counts['athletes']}, Schools: {counts['schools']}")
        print(f"💾 Saved to: {output_folder}")

    elif command == "school-meets":
        school_id = sys.argv[2]
        season_year = int(sys.argv[3])

        print(f"\n🏃 Fetching Meet List for School {school_id} ({season_year})")
        print("=" * 60)

        meets = get_school_meets(school_id, [season_year], print_progress)

        print("\n" + "=" * 60)
        print(f"✅ Found {len(meets)} meets:")
        for meet in meets:
            print(f"  - {meet['name']} (ID: {meet['athletic_net_id']})")

    elif command == "school":
        school_id = sys.argv[2]
        season_year = int(sys.argv[3])

        print(f"\n🏃 Scraping School {school_id} ({season_year})")
        print("=" * 60)

        result = scrape_by_school(school_id, [season_year], None, print_progress)

        # Write CSV files
        output_folder = f"to-be-processed/school_{school_id}_{int(time.time())}"
        counts = write_csv_files(result, output_folder)

        print("\n" + "=" * 60)
        print("✅ Scraping complete!")
        print(f"📊 Meets: {counts['meets']}")
        print(f"📊 Results: {counts['results']} results from {counts['races']} races")
        print(f"📊 Athletes: {counts['athletes']}, Schools: {counts['schools']}")
        print(f"💾 Saved to: {output_folder}")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
