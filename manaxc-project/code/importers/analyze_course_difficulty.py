#!/usr/bin/env python3
"""
Analyze Course Difficulty for Montgomery Hill 2.74 Mile and Baylands 4k
Compare athlete performances across multiple courses to estimate difficulty ratings
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
    total_seconds = cs / 100
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:05.2f}"

def extract_distance_from_race_name(race_name):
    """Extract distance in miles from race name"""
    match = re.search(r'(\d+\.?\d*)\s*Mile', race_name, re.IGNORECASE)
    if match:
        return float(match.group(1))
    # Match "4,000 Meters" or "5K" formats
    match = re.search(r'([\d,]+)\s*Meters', race_name, re.IGNORECASE)
    if match:
        meters = float(match.group(1).replace(',', ''))
        return meters * 0.000621371  # meters to miles
    match = re.search(r'(\d+\.?\d*)\s*K', race_name, re.IGNORECASE)
    if match:
        return float(match.group(1)) * 0.621371
    return None

def load_results_from_csv(year):
    """Load results from Athletic.net CSV for given year"""
    csv_file = f'/Users/ron/manaxc/{year}-westmont/athletic-net-1076-{year}-results.csv'

    results = []
    try:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['school_name'] != 'Westmont':
                    continue

                distance_miles = extract_distance_from_race_name(row['race_name'])

                results.append({
                    'athlete_name': row['athlete_full_name'],
                    'grad_year': int(row['graduation_year']),
                    'time_cs': int(row['time_cs']),
                    'race_name': row['race_name'],
                    'season_year': int(row['season_year']),
                    'distance_miles': distance_miles
                })
    except FileNotFoundError:
        print(f"   ⚠️  CSV not found for {year}")
        return []

    return results

def main():
    print("=" * 120)
    print("COURSE DIFFICULTY ANALYSIS - MONTGOMERY HILL & BAYLANDS 4K")
    print("=" * 120)

    # Load course difficulty ratings
    print("\n1. Loading current course difficulty ratings...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    courses_result = supabase.table('courses').select('name, distance_meters, difficulty_rating').execute()

    course_ratings = {}
    for course in courses_result.data:
        if course['difficulty_rating']:
            course_ratings[course['name']] = {
                'distance_m': course['distance_meters'],
                'difficulty': course['difficulty_rating']
            }

    print(f"   ✅ Loaded {len(course_ratings)} courses with difficulty ratings")

    # Show current ratings for key courses
    key_courses = ['Crystal Springs 2.95 Mile', 'Montgomery Hill 2.74 Mile', 'Baylands 4k', 'Toro Park 5k']
    print("\n   Current ratings for key courses:")
    for course_name in key_courses:
        if course_name in course_ratings:
            info = course_ratings[course_name]
            print(f"   - {course_name}: {info['difficulty']:.5f} ({info['distance_m']}m)")
        else:
            print(f"   - {course_name}: NOT FOUND")

    # Load results from multiple years
    print("\n2. Loading Athletic.net results...")
    all_results = []
    for year in [2022, 2023, 2024, 2025]:
        results = load_results_from_csv(year)
        all_results.extend(results)
        if results:
            print(f"   ✅ {year}: {len(results)} results")

    # Organize by athlete and course
    print("\n3. Analyzing athlete performances across courses...")
    athlete_data = defaultdict(lambda: defaultdict(list))

    for result in all_results:
        if not result['distance_miles']:
            continue

        athlete_name = result['athlete_name']
        race_name = result['race_name']

        # Identify the course type
        course_type = None
        if '2.95 Mile' in race_name or 'Crystal Springs' in race_name:
            course_type = 'Crystal Springs 2.95'
        elif '2.74 Mile' in race_name or 'Montgomery Hill' in race_name:
            course_type = 'Montgomery Hill 2.74'
        elif '4,000 Meters' in race_name or '4K' in race_name or '4k' in race_name:
            # 4,000 meters = 4K = ~2.48 miles (Baylands)
            course_type = 'Baylands 4K'
        elif '5K' in race_name or '5k' in race_name or '5,000 Meters' in race_name:
            if 'Toro' in race_name:
                course_type = 'Toro Park 5K'
            else:
                course_type = 'Other 5K'

        if course_type:
            # Calculate per-mile pace
            per_mile_pace = result['time_cs'] / result['distance_miles']

            athlete_data[athlete_name][course_type].append({
                'time_cs': result['time_cs'],
                'per_mile_pace': per_mile_pace,
                'race_name': race_name,
                'season_year': result['season_year'],
                'distance_miles': result['distance_miles']
            })

    # Find athletes who have run both Montgomery Hill and Crystal Springs
    print("\n4. Comparing Montgomery Hill 2.74 vs Crystal Springs 2.95...")
    print("=" * 120)
    print(f"{'Athlete':<30} {'CS Best':<12} {'MH Best':<12} {'CS/mile':<12} {'MH/mile':<12} {'Diff/mile':<12} {'Expected':<12}")
    print("-" * 120)

    mh_cs_comparisons = []
    for athlete, courses in athlete_data.items():
        if 'Montgomery Hill 2.74' in courses and 'Crystal Springs 2.95' in courses:
            cs_best = min(courses['Crystal Springs 2.95'], key=lambda x: x['time_cs'])
            mh_best = min(courses['Montgomery Hill 2.74'], key=lambda x: x['time_cs'])

            cs_per_mile = cs_best['per_mile_pace']
            mh_per_mile = mh_best['per_mile_pace']

            # Crystal Springs difficulty = 1.17716303700
            # If Montgomery Hill is easier, the per-mile pace should be faster
            # Expected MH per-mile = CS per-mile / 1.17716 (if both have same difficulty)
            cs_difficulty = course_ratings.get('Crystal Springs 2.95 Mile', {}).get('difficulty', 1.17716)
            expected_mh_per_mile = cs_per_mile / cs_difficulty

            diff_per_mile = mh_per_mile - expected_mh_per_mile

            mh_cs_comparisons.append({
                'athlete': athlete,
                'cs_best': cs_best['time_cs'],
                'mh_best': mh_best['time_cs'],
                'cs_per_mile': cs_per_mile,
                'mh_per_mile': mh_per_mile,
                'expected_mh_per_mile': expected_mh_per_mile,
                'diff_per_mile': diff_per_mile
            })

            print(f"{athlete[:30]:<30} {format_time_cs(cs_best['time_cs']):<12} {format_time_cs(mh_best['time_cs']):<12} "
                  f"{format_time_cs(cs_per_mile):<12} {format_time_cs(mh_per_mile):<12} "
                  f"{format_time_cs(diff_per_mile):<12} {format_time_cs(expected_mh_per_mile):<12}")

    if mh_cs_comparisons:
        # Calculate average difference
        avg_diff = sum(c['diff_per_mile'] for c in mh_cs_comparisons) / len(mh_cs_comparisons)

        # Estimated MH difficulty
        # If MH is easier, runners go faster, so mh_per_mile < expected
        # difficulty = mh_per_mile / (cs_per_mile / cs_difficulty)
        # Simplified: difficulty = (mh_per_mile * cs_difficulty) / cs_per_mile

        avg_mh_per_mile = sum(c['mh_per_mile'] for c in mh_cs_comparisons) / len(mh_cs_comparisons)
        avg_cs_per_mile = sum(c['cs_per_mile'] for c in mh_cs_comparisons) / len(mh_cs_comparisons)

        estimated_mh_difficulty = (avg_mh_per_mile / avg_cs_per_mile) * cs_difficulty

        print("\n" + "=" * 120)
        print(f"Montgomery Hill 2.74 Analysis ({len(mh_cs_comparisons)} athletes):")
        print(f"  Average per-mile pace difference: {format_time_cs(avg_diff)}")
        print(f"  Current difficulty rating: {course_ratings.get('Montgomery Hill 2.74 Mile', {}).get('difficulty', 'N/A')}")
        print(f"  ESTIMATED difficulty rating: {estimated_mh_difficulty:.5f}")
        print("=" * 120)

    # Find athletes who have run Baylands 4K and other known courses
    print("\n\n5. Analyzing Baylands 4K difficulty...")
    print("=" * 120)

    baylands_comparisons = []
    for athlete, courses in athlete_data.items():
        if 'Baylands 4K' in courses:
            baylands_best = min(courses['Baylands 4K'], key=lambda x: x['time_cs'])
            baylands_per_mile = baylands_best['per_mile_pace']

            # Compare to other courses if available
            comparison = {
                'athlete': athlete,
                'baylands_time': baylands_best['time_cs'],
                'baylands_per_mile': baylands_per_mile,
                'comparisons': {}
            }

            for ref_course in ['Crystal Springs 2.95', 'Montgomery Hill 2.74', 'Toro Park 5K']:
                if ref_course in courses:
                    ref_best = min(courses[ref_course], key=lambda x: x['time_cs'])
                    ref_per_mile = ref_best['per_mile_pace']
                    comparison['comparisons'][ref_course] = {
                        'time': ref_best['time_cs'],
                        'per_mile': ref_per_mile,
                        'diff': baylands_per_mile - ref_per_mile
                    }

            if comparison['comparisons']:
                baylands_comparisons.append(comparison)

    if baylands_comparisons:
        print(f"{'Athlete':<30} {'Baylands':<12} {'Bay/mile':<12} {'CS 2.95':<12} {'MH 2.74':<12} {'Toro 5K':<12}")
        print("-" * 120)

        for comp in baylands_comparisons[:20]:
            cs_time = format_time_cs(comp['comparisons'].get('Crystal Springs 2.95', {}).get('time', 0)) if 'Crystal Springs 2.95' in comp['comparisons'] else 'N/A'
            mh_time = format_time_cs(comp['comparisons'].get('Montgomery Hill 2.74', {}).get('time', 0)) if 'Montgomery Hill 2.74' in comp['comparisons'] else 'N/A'
            toro_time = format_time_cs(comp['comparisons'].get('Toro Park 5K', {}).get('time', 0)) if 'Toro Park 5K' in comp['comparisons'] else 'N/A'

            print(f"{comp['athlete'][:30]:<30} {format_time_cs(comp['baylands_time']):<12} "
                  f"{format_time_cs(comp['baylands_per_mile']):<12} {cs_time:<12} {mh_time:<12} {toro_time:<12}")

        # Estimate Baylands difficulty
        cs_comparisons = [c for c in baylands_comparisons if 'Crystal Springs 2.95' in c['comparisons']]
        if cs_comparisons:
            avg_baylands_per_mile = sum(c['baylands_per_mile'] for c in cs_comparisons) / len(cs_comparisons)
            avg_cs_per_mile = sum(c['comparisons']['Crystal Springs 2.95']['per_mile'] for c in cs_comparisons) / len(cs_comparisons)

            cs_difficulty = course_ratings.get('Crystal Springs 2.95 Mile', {}).get('difficulty', 1.17716)
            estimated_baylands_difficulty = (avg_baylands_per_mile / avg_cs_per_mile) * cs_difficulty

            print("\n" + "=" * 120)
            print(f"Baylands 4K Analysis ({len(cs_comparisons)} athletes with CS comparison):")
            print(f"  Average Baylands per-mile pace: {format_time_cs(avg_baylands_per_mile)}")
            print(f"  Average CS 2.95 per-mile pace: {format_time_cs(avg_cs_per_mile)}")
            print(f"  ESTIMATED difficulty rating: {estimated_baylands_difficulty:.5f}")
            print("=" * 120)
    else:
        print("   ⚠️  No athletes found with Baylands 4K results")

    print("\n" + "=" * 120)

if __name__ == '__main__':
    main()
