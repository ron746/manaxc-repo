#!/usr/bin/env python3
"""
Import Athletic.net CSV data (2023 & 2024) and generate varsity report
Handles course mapping between Athletic.net format and our database
"""
import csv
import re
from collections import defaultdict
from supabase import create_client

SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def format_time_cs(cs):
    """Format centiseconds to MM:SS.ss"""
    if not cs:
        return "N/A"
    total_seconds = int(cs) / 100
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:05.2f}"

def extract_distance_from_race_name(race_name):
    """Extract distance in miles from race name like '2.95 Miles Junior Boys'"""
    match = re.search(r'(\d+\.?\d*)\s*Mile', race_name, re.IGNORECASE)
    if match:
        return float(match.group(1))
    match = re.search(r'(\d+\.?\d*)\s*K', race_name, re.IGNORECASE)
    if match:
        # Convert km to miles
        return float(match.group(1)) * 0.621371
    return None

def calculate_adjusted_time(time_cs, difficulty):
    """Adjust time to standard course"""
    if not time_cs or not difficulty or difficulty == 0:
        return time_cs
    return int(int(time_cs) / difficulty)

def load_results_from_csv(year):
    """Load results from Athletic.net CSV for given year"""
    csv_file = f'/Users/ron/manaxc/{year}-westmont/athletic-net-1076-{year}-results.csv'

    results = []
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only Westmont athletes
            if row['school_name'] != 'Westmont':
                continue

            # Extract distance from race name
            distance_miles = extract_distance_from_race_name(row['race_name'])

            results.append({
                'athlete_name': row['athlete_full_name'],
                'grad_year': int(row['graduation_year']),
                'time_cs': int(row['time_cs']),
                'race_name': row['race_name'],
                'season_year': int(row['season_year']),
                'distance_miles': distance_miles
            })

    return results

def load_course_map(year):
    """Load course/venue mapping from CSV"""
    csv_file = f'/Users/ron/manaxc/{year}-westmont/athletic-net-1076-{year}-courses.csv'

    courses = {}
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            venue = row['venue_name'].strip('"')
            distance_m = int(row['distance_meters'])
            courses[f"{venue}_{distance_m}"] = {
                'venue': venue,
                'distance_meters': distance_m
            }

    return courses

def main():
    print("=" * 120)
    print("WESTMONT XC - ATHLETIC.NET CSV IMPORT & VARSITY REPORT")
    print("=" * 120)

    # Load course difficulty ratings from database
    print("\n1. Loading course difficulty ratings from database...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    courses_result = supabase.table('courses').select('name, distance_meters, difficulty_rating').execute()

    # Create lookup by distance
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

    # Load results from both years
    print("\n2. Loading Athletic.net CSV data...")
    results_2024 = load_results_from_csv(2024)  # 2023-2024 season
    results_2025 = load_results_from_csv(2025)  # 2024-2025 season

    print(f"   ✅ 2024 Season (2023-2024): {len(results_2024)} Westmont results")
    print(f"   ✅ 2025 Season (2024-2025): {len(results_2025)} Westmont results")

    # Combine and organize by athlete
    athletes_data = defaultdict(lambda: defaultdict(list))

    all_results = results_2024 + results_2025
    unmatched_races = set()

    for result in all_results:
        athlete_name = result['athlete_name']
        season = result['season_year']

        # Extract distance from race name
        distance_miles = result['distance_miles']
        if not distance_miles:
            unmatched_races.add(result['race_name'])
            continue

        # Convert to meters for lookup
        distance_m = int(distance_miles * 1609.344)

        # Find matching difficulty rating (allow ±10m tolerance)
        difficulty = 1.0  # Default
        for dm in range(distance_m - 10, distance_m + 11):
            if dm in course_ratings_by_distance:
                # Use first match (or could average if multiple)
                difficulty = course_ratings_by_distance[dm][0]['rating']
                break

        # Step 1: Calculate per-mile pace from actual race time
        per_mile_pace_cs = int(result['time_cs'] / distance_miles) if distance_miles > 0 else result['time_cs']

        # Step 2: Apply difficulty adjustment to the per-mile pace
        # difficulty rating is normalized to 1609m (1 mile)
        adjusted_per_mile_pace_cs = calculate_adjusted_time(per_mile_pace_cs, difficulty)

        athletes_data[athlete_name][season].append({
            'race_name': result['race_name'],
            'time_cs': result['time_cs'],
            'per_mile_pace_cs': per_mile_pace_cs,
            'adjusted_per_mile_pace_cs': adjusted_per_mile_pace_cs,
            'difficulty': difficulty,
            'distance_miles': distance_miles,
            'grad_year': result['grad_year']
        })

    if unmatched_races:
        print(f"\n   ⚠️  Could not extract distance from {len(unmatched_races)} race names:")
        for race in list(unmatched_races)[:5]:
            print(f"      - {race}")

    # Calculate best times and improvement (using per-mile pace)
    print("\n3. Calculating athlete performance...")
    report_data = []

    for athlete_name, seasons in athletes_data.items():
        best_pace_2024 = min([r['adjusted_per_mile_pace_cs'] for r in seasons[2024]], default=None) if seasons[2024] else None
        best_pace_2025 = min([r['adjusted_per_mile_pace_cs'] for r in seasons[2025]], default=None) if seasons[2025] else None

        improvement_cs = None
        improvement_pct = None

        if best_pace_2024 and best_pace_2025:
            improvement_cs = best_pace_2024 - best_pace_2025  # Positive = faster pace
            improvement_pct = (improvement_cs / best_pace_2024) * 100

        grad_year = seasons[2025][0]['grad_year'] if seasons[2025] else (seasons[2024][0]['grad_year'] if seasons[2024] else 'N/A')

        report_data.append({
            'name': athlete_name,
            'grad_year': grad_year,
            'best_pace_2024': best_pace_2024,
            'best_pace_2025': best_pace_2025,
            'improvement_cs': improvement_cs,
            'improvement_pct': improvement_pct,
            'races_2024': len(seasons[2024]),
            'races_2025': len(seasons[2025])
        })

    # Sort by 2025 performance (best per-mile pace)
    report_data.sort(key=lambda x: x['best_pace_2025'] if x['best_pace_2025'] else 999999)

    # Print report
    print("\n" + "=" * 120)
    print("2025 SEASON VARSITY RANKINGS (Adjusted Per-Mile Pace)")
    print("=" * 120)
    print(f"{'Rank':<6}{'Athlete':<30}{'Class':<8}{'Best 2025':<12}{'Best 2024':<12}{'Improvement':<15}{'%':<8}{'Races':<8}")
    print("-" * 120)

    for idx, athlete in enumerate(report_data[:25], 1):
        if not athlete['best_pace_2025']:
            continue

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

        print(f"{idx:<6}{athlete['name']:<30}{athlete['grad_year']:<8}"
              f"{format_time_cs(athlete['best_pace_2025']):<12}"
              f"{format_time_cs(athlete['best_pace_2024']) if athlete['best_pace_2024'] else 'N/A':<12}"
              f"{improvement_str:<15}{pct_str:<8}{races:<8}")

    print("\n" + "=" * 120)
    print("MOST IMPROVED ATHLETES (2024 → 2025 Season)")
    print("=" * 120)

    improved = [a for a in report_data if a['improvement_cs'] and a['improvement_cs'] > 0]
    improved.sort(key=lambda x: x['improvement_cs'], reverse=True)

    print(f"{'Rank':<6}{'Athlete':<30}{'Class':<8}{'2024 Pace':<12}{'2025 Pace':<12}{'Improved':<15}{'%':<8}")
    print("-" * 120)

    for idx, athlete in enumerate(improved[:15], 1):
        print(f"{idx:<6}{athlete['name']:<30}{athlete['grad_year']:<8}"
              f"{format_time_cs(athlete['best_pace_2024']):<12}"
              f"{format_time_cs(athlete['best_pace_2025']):<12}"
              f"-{format_time_cs(athlete['improvement_cs']):<15}"
              f"{athlete['improvement_pct']:.1f}%")

    print("\n" + "=" * 120)

if __name__ == '__main__':
    main()
