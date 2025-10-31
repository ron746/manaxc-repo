#!/usr/bin/env python3
"""
Analyze Duncan Lorang's results to identify course difficulty outliers
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='../../website/.env.local')

# Database connection
supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

def main():
    print("\n=== Analyzing Duncan Lorang's Results ===\n")

    # Find Duncan Lorang
    athlete_result = supabase.table('athletes').select('*').ilike('name', '%duncan%lorang%').execute()

    if not athlete_result.data:
        print("Could not find Duncan Lorang")
        return

    athlete = athlete_result.data[0]
    print(f"Found: {athlete['name']} (ID: {athlete['id']})")
    print(f"School ID: {athlete['school_id']}, Grad Year: {athlete['grad_year']}\n")

    # Get all their results with course info
    results_query = supabase.table('results').select('''
        *,
        races!inner(
            *,
            courses!inner(*)
        ),
        meets!inner(name)
    ''').eq('athlete_id', athlete['id']).order('time_cs').execute()

    if not results_query.data:
        print("No results found")
        return

    print(f"Found {len(results_query.data)} results\n")
    print("=" * 120)
    print(f"{'Meet':<40} {'Course':<35} {'Distance':<10} {'Diff':<12} {'Time':<10} {'Norm Mile':<12}")
    print("=" * 120)

    METERS_PER_MILE = 1609.344

    for result in results_query.data:
        course = result['races']['courses']
        meet = result['meets']

        time_cs = result['time_cs']
        distance_m = course['distance_meters']
        difficulty = course['difficulty_rating']

        # Calculate normalized mile time
        # Formula: (time_cs * (1609.344 / distance_meters)) / difficulty_rating
        norm_mile_cs = (time_cs * METERS_PER_MILE / distance_m) / difficulty

        # Format times
        def format_time(cs):
            total_sec = cs // 100
            minutes = total_sec // 60
            seconds = total_sec % 60
            centiseconds = cs % 100
            return f"{minutes}:{seconds:02d}.{centiseconds:02d}"

        time_str = format_time(time_cs)
        norm_str = format_time(int(norm_mile_cs))

        print(f"{meet['name'][:39]:<40} {course['name'][:34]:<35} {distance_m:<10.1f} {difficulty:<12.9f} {time_str:<10} {norm_str:<12}")

    print("=" * 120)

    # Find North Monterey County course specifically
    print("\n=== North Monterey County Course Analysis ===\n")

    nmc_courses = supabase.table('courses').select('*').ilike('name', '%north%monterey%').execute()

    if nmc_courses.data:
        for course in nmc_courses.data:
            print(f"Course: {course['name']}")
            print(f"Distance: {course['distance_meters']}m")
            print(f"Current Difficulty: {course['difficulty_rating']:.9f}")

            # Get all results for this course
            course_results = supabase.table('results').select('''
                time_cs,
                normalized_time_cs,
                athletes!inner(name)
            ''').eq('race_id', supabase.table('races').select('id').eq('course_id', course['id']).execute().data[0]['id'] if supabase.table('races').select('id').eq('course_id', course['id']).execute().data else None).execute()

            # Simpler approach - get via races
            races = supabase.table('races').select('id').eq('course_id', course['id']).execute()
            if races.data:
                all_results = []
                for race in races.data:
                    race_results = supabase.table('results').select('time_cs, normalized_time_cs').eq('race_id', race['id']).not_('time_cs', 'is', None).execute()
                    if race_results.data:
                        all_results.extend(race_results.data)

                if all_results:
                    times = [r['time_cs'] for r in all_results]
                    norm_times = [r['normalized_time_cs'] for r in all_results if r.get('normalized_time_cs')]

                    avg_time = sum(times) / len(times)
                    avg_norm = sum(norm_times) / len(norm_times) if norm_times else 0

                    print(f"\nTotal Results: {len(all_results)}")
                    print(f"Average Time: {format_time(int(avg_time))}")
                    if avg_norm:
                        print(f"Average Normalized: {format_time(int(avg_norm))}")

                        # Calculate implied difficulty
                        # implied = (avg_time * 1609.344) / (avg_norm * distance)
                        implied_diff = (avg_time * METERS_PER_MILE) / (avg_norm * course['distance_meters'])
                        print(f"Implied Difficulty: {implied_diff:.9f}")
                        print(f"Difference: {implied_diff - course['difficulty_rating']:.9f}")
            print()

if __name__ == '__main__':
    main()
