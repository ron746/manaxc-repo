#!/usr/bin/env python3
"""
Generate Crystal Springs 2.95 Mile Predictions
- Separate male/female rankings
- Predict race time at Crystal Springs 2.95 mile based on adjusted per-mile pace
- Show year-over-year improvement
"""
import csv
from collections import defaultdict
from supabase import create_client
import re

SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

# Crystal Springs 2.95 mile course constants
CRYSTAL_SPRINGS_DISTANCE = 2.95
CRYSTAL_SPRINGS_DIFFICULTY = 1.17716303700

def format_time_cs(cs):
    """Format centiseconds to MM:SS.ss"""
    if not cs:
        return "N/A"
    total_seconds = cs / 100
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:05.2f}"

def extract_distance_from_race_name(race_name):
    """Extract distance in miles from race name"""
    match = re.search(r'(\d+\.?\d*)\s*Mile', race_name, re.IGNORECASE)
    if match:
        return float(match.group(1))
    match = re.search(r'(\d+\.?\d*)\s*K', race_name, re.IGNORECASE)
    if match:
        return float(match.group(1)) * 0.621371
    return None

def calculate_adjusted_time(time_cs, difficulty):
    """Adjust time to standard course"""
    if not time_cs or not difficulty or difficulty == 0:
        return time_cs
    return int(int(time_cs) / difficulty)

def load_athlete_genders(year):
    """Load athlete gender data from athletes CSV"""
    csv_file = f'/Users/ron/manaxc/{year}-westmont/athletic-net-1076-{year}-athletes.csv'

    gender_map = {}
    try:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['school_name'] == 'Westmont':
                    name = row['full_name'].strip('"')
                    gender = row['gender']
                    gender_map[name] = gender
    except FileNotFoundError:
        print(f"   ⚠️  Athletes CSV not found for {year}, will use race name inference")

    return gender_map

def determine_gender(race_name, athlete_name, grad_year, gender_map=None):
    """Determine athlete gender from gender map or race name patterns"""
    # First try gender map
    if gender_map and athlete_name in gender_map:
        return gender_map[athlete_name]

    race_lower = race_name.lower()

    # Check for explicit gender markers
    if 'boys' in race_lower or '(m)' in race_lower:
        return 'M'
    if 'girls' in race_lower or '(f)' in race_lower:
        return 'F'

    # Known female athletes from the data
    female_names = {'Hannah Crowley', 'Sara Chaudoin', 'Madelyn Wu', 'Perri Kaiser', 'Ariel Hung',
                   'Paula Gelabert', 'Allison Matadamas', 'Polina Chistyakova', 'Emily Ha'}
    if athlete_name in female_names:
        return 'F'

    # Default to male (most of team)
    return 'M'

def load_results_from_csv(year, gender_map):
    """Load results from Athletic.net CSV for given year"""
    csv_file = f'/Users/ron/manaxc/{year}-westmont/athletic-net-1076-{year}-results.csv'

    results = []
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['school_name'] != 'Westmont':
                continue

            distance_miles = extract_distance_from_race_name(row['race_name'])
            gender = determine_gender(row['race_name'], row['athlete_full_name'], row['graduation_year'], gender_map)

            results.append({
                'athlete_name': row['athlete_full_name'],
                'grad_year': int(row['graduation_year']),
                'time_cs': int(row['time_cs']),
                'race_name': row['race_name'],
                'season_year': int(row['season_year']),
                'distance_miles': distance_miles,
                'gender': gender
            })

    return results

def main():
    # Open output file
    output_file = '/Users/ron/manaxc/manaxc-project/code/importers/crystal_springs_report.txt'
    with open(output_file, 'w') as f:
        # Helper function to print to both console and file
        def output(text=""):
            print(text)
            f.write(text + "\n")

        output("=" * 120)
        output("WESTMONT XC - CRYSTAL SPRINGS 2.95 MILE PREDICTIONS")
        output("=" * 120)

    # Load course difficulty ratings
    print("\n1. Loading course difficulty ratings from database...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    courses_result = supabase.table('courses').select('name, distance_meters, difficulty_rating').execute()

    course_ratings_by_distance = {}
    for course in courses_result.data:
        if course['difficulty_rating'] and course['distance_meters']:
            key = course['distance_meters']
            if key not in course_ratings_by_distance:
                course_ratings_by_distance[key] = []
            course_ratings_by_distance[key].append({
                'name': course['name'],
                'rating': course['difficulty_rating']
            })

    print(f"   ✅ Loaded {len(courses_result.data)} course ratings")

    # Load gender data
    print("\n2. Loading athlete gender data...")
    gender_map_2024 = load_athlete_genders(2024)
    gender_map_2025 = load_athlete_genders(2025)
    print(f"   ✅ Loaded gender data for {len(gender_map_2024)} athletes (2024) and {len(gender_map_2025)} athletes (2025)")

    # Load results
    print("\n3. Loading Athletic.net CSV data...")
    results_2024 = load_results_from_csv(2024, gender_map_2024)
    results_2025 = load_results_from_csv(2025, gender_map_2025)

    print(f"   ✅ 2024 Season: {len(results_2024)} Westmont results")
    print(f"   ✅ 2025 Season: {len(results_2025)} Westmont results")

    # Process results
    athletes_data = defaultdict(lambda: defaultdict(list))
    all_results = results_2024 + results_2025
    unmatched_races = set()

    for result in all_results:
        athlete_name = result['athlete_name']
        season = result['season_year']
        distance_miles = result['distance_miles']

        if not distance_miles:
            unmatched_races.add(result['race_name'])
            continue

        # Convert to meters for lookup
        distance_m = int(distance_miles * 1609.344)

        # Find matching difficulty rating
        difficulty = 1.0
        for dm in range(distance_m - 10, distance_m + 11):
            if dm in course_ratings_by_distance:
                difficulty = course_ratings_by_distance[dm][0]['rating']
                break

        # Calculate per-mile pace, then adjust for difficulty
        per_mile_pace_cs = int(result['time_cs'] / distance_miles) if distance_miles > 0 else result['time_cs']
        adjusted_per_mile_pace_cs = calculate_adjusted_time(per_mile_pace_cs, difficulty)

        # Predict Crystal Springs 2.95 mile time
        # Formula: adjusted_pace * Crystal_Springs_difficulty * distance
        predicted_cs_time = int(adjusted_per_mile_pace_cs * CRYSTAL_SPRINGS_DIFFICULTY * CRYSTAL_SPRINGS_DISTANCE)

        # Track if this is a Montgomery Hill 2.74 mile race
        is_montgomery_hill = '2.74 Miles' in result['race_name'] or distance_miles == 2.74

        athletes_data[athlete_name][season].append({
            'race_name': result['race_name'],
            'time_cs': result['time_cs'],
            'adjusted_per_mile_pace_cs': adjusted_per_mile_pace_cs,
            'predicted_cs_time': predicted_cs_time,
            'difficulty': difficulty,
            'distance_miles': distance_miles,
            'grad_year': result['grad_year'],
            'gender': result['gender'],
            'is_montgomery_hill': is_montgomery_hill
        })

    if unmatched_races:
        print(f"\n   ⚠️  Could not extract distance from {len(unmatched_races)} race names")

    # Calculate best predictions and improvement
    print("\n4. Calculating Crystal Springs predictions...")
    report_data = []

    for athlete_name, seasons in athletes_data.items():
        best_cs_2024 = min([r['predicted_cs_time'] for r in seasons[2024]], default=None) if seasons[2024] else None
        best_cs_2025 = min([r['predicted_cs_time'] for r in seasons[2025]], default=None) if seasons[2025] else None

        # Find best Montgomery Hill 2.74 mile time
        montgomery_hill_times = [r['time_cs'] for r in seasons[2025] if r.get('is_montgomery_hill', False)] if seasons[2025] else []
        best_mh_2025 = min(montgomery_hill_times) if montgomery_hill_times else None

        improvement_cs = None
        improvement_pct = None

        if best_cs_2024 and best_cs_2025:
            improvement_cs = best_cs_2024 - best_cs_2025
            improvement_pct = (improvement_cs / best_cs_2024) * 100

        grad_year = seasons[2025][0]['grad_year'] if seasons[2025] else (seasons[2024][0]['grad_year'] if seasons[2024] else 'N/A')
        gender = seasons[2025][0]['gender'] if seasons[2025] else (seasons[2024][0]['gender'] if seasons[2024] else 'M')

        report_data.append({
            'name': athlete_name,
            'grad_year': grad_year,
            'gender': gender,
            'best_cs_2024': best_cs_2024,
            'best_cs_2025': best_cs_2025,
            'best_mh_2025': best_mh_2025,
            'improvement_cs': improvement_cs,
            'improvement_pct': improvement_pct,
            'races_2024': len(seasons[2024]),
            'races_2025': len(seasons[2025])
        })

    # Separate male and female
    male_athletes = [a for a in report_data if a['gender'] == 'M']
    female_athletes = [a for a in report_data if a['gender'] == 'F']

    # Sort by 2025 performance
    male_athletes.sort(key=lambda x: x['best_cs_2025'] if x['best_cs_2025'] else 999999)
    female_athletes.sort(key=lambda x: x['best_cs_2025'] if x['best_cs_2025'] else 999999)

    # Print Male Report
    print("\n" + "=" * 135)
    print("ALL MALE ATHLETES - PREDICTED CRYSTAL SPRINGS 2.95 MILE (2025 SEASON)")
    print("=" * 135)
    print(f"{'Rank':<6}{'Athlete':<30}{'Class':<8}{'CS 2.95 Pred':<13}{'MH 2.74 Best':<13}{'2024 Pred':<12}{'Improvement':<15}{'%':<8}{'Races':<8}")
    print("-" * 135)

    rank = 0
    for athlete in male_athletes:
        if not athlete['best_cs_2025']:
            continue

        rank += 1

        improvement_str = ""
        pct_str = ""

        if athlete['improvement_cs'] is not None:
            if athlete['improvement_cs'] > 0:
                improvement_str = f"-{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"{athlete['improvement_pct']:.1f}%"
            else:
                improvement_str = f"+{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"-{abs(athlete['improvement_pct']):.1f}%"

        races = f"{athlete['races_2025']}/{athlete['races_2024']}"
        mh_time = format_time_cs(athlete['best_mh_2025']) if athlete['best_mh_2025'] else 'N/A'

        print(f"{rank:<6}{athlete['name']:<30}{athlete['grad_year']:<8}"
              f"{format_time_cs(athlete['best_cs_2025']):<13}"
              f"{mh_time:<13}"
              f"{format_time_cs(athlete['best_cs_2024']) if athlete['best_cs_2024'] else 'N/A':<12}"
              f"{improvement_str:<15}{pct_str:<8}{races:<8}")

    # Print Female Report
    print("\n" + "=" * 135)
    print("ALL FEMALE ATHLETES - PREDICTED CRYSTAL SPRINGS 2.95 MILE (2025 SEASON)")
    print("=" * 135)
    print(f"{'Rank':<6}{'Athlete':<30}{'Class':<8}{'CS 2.95 Pred':<13}{'MH 2.74 Best':<13}{'2024 Pred':<12}{'Improvement':<15}{'%':<8}{'Races':<8}")
    print("-" * 135)

    rank = 0
    for athlete in female_athletes:
        if not athlete['best_cs_2025']:
            continue

        rank += 1

        improvement_str = ""
        pct_str = ""

        if athlete['improvement_cs'] is not None:
            if athlete['improvement_cs'] > 0:
                improvement_str = f"-{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"{athlete['improvement_pct']:.1f}%"
            else:
                improvement_str = f"+{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"-{abs(athlete['improvement_pct']):.1f}%"

        races = f"{athlete['races_2025']}/{athlete['races_2024']}"
        mh_time = format_time_cs(athlete['best_mh_2025']) if athlete['best_mh_2025'] else 'N/A'

        print(f"{rank:<6}{athlete['name']:<30}{athlete['grad_year']:<8}"
              f"{format_time_cs(athlete['best_cs_2025']):<13}"
              f"{mh_time:<13}"
              f"{format_time_cs(athlete['best_cs_2024']) if athlete['best_cs_2024'] else 'N/A':<12}"
              f"{improvement_str:<15}{pct_str:<8}{races:<8}")

    # Most Improved - Male
    print("\n" + "=" * 120)
    print("TOP 5 MOST IMPROVED MALE ATHLETES (2024 → 2025)")
    print("=" * 120)

    improved_male = [a for a in male_athletes if a['improvement_cs'] and a['improvement_cs'] > 0]
    improved_male.sort(key=lambda x: x['improvement_cs'], reverse=True)

    print(f"{'Rank':<6}{'Athlete':<30}{'Class':<8}{'2024 Pred':<12}{'2025 Pred':<12}{'Improved':<15}{'%':<8}")
    print("-" * 120)

    for idx, athlete in enumerate(improved_male[:5], 1):
        print(f"{idx:<6}{athlete['name']:<30}{athlete['grad_year']:<8}"
              f"{format_time_cs(athlete['best_cs_2024']):<12}"
              f"{format_time_cs(athlete['best_cs_2025']):<12}"
              f"-{format_time_cs(athlete['improvement_cs']):<15}"
              f"{athlete['improvement_pct']:.1f}%")

    # Most Improved - Female
    print("\n" + "=" * 120)
    print("TOP 5 MOST IMPROVED FEMALE ATHLETES (2024 → 2025)")
    print("=" * 120)

    improved_female = [a for a in female_athletes if a['improvement_cs'] and a['improvement_cs'] > 0]
    improved_female.sort(key=lambda x: x['improvement_cs'], reverse=True)

    print(f"{'Rank':<6}{'Athlete':<30}{'Class':<8}{'2024 Pred':<12}{'2025 Pred':<12}{'Improved':<15}{'%':<8}")
    print("-" * 120)

    for idx, athlete in enumerate(improved_female[:5], 1):
        print(f"{idx:<6}{athlete['name']:<30}{athlete['grad_year']:<8}"
              f"{format_time_cs(athlete['best_cs_2024']):<12}"
              f"{format_time_cs(athlete['best_cs_2025']):<12}"
              f"-{format_time_cs(athlete['improvement_cs']):<15}"
              f"{athlete['improvement_pct']:.1f}%")

    print("\n" + "=" * 120)
    print(f"\nNote: Predictions based on adjusted per-mile pace converted to Crystal Springs 2.95 mile course")
    print(f"Crystal Springs difficulty: {CRYSTAL_SPRINGS_DIFFICULTY:.3f} (17.7% harder than track)")

if __name__ == '__main__':
    main()
