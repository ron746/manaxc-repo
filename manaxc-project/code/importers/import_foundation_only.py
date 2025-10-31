#!/usr/bin/env python3
"""
Import ONLY foundation tables for a meet: venues, courses, schools, meets, races
Stops before importing athletes to avoid HTTP/2 timeouts on large datasets
"""
import sys
import csv
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/Users/ron/manaxc/manaxc-project/code/importers/.env')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

def import_venues(folder):
    """Import venues"""
    print("📍 Stage 1/5: Importing Venues")
    venues_file = os.path.join(folder, 'venues.csv')
    venue_id_map = {}

    with open(venues_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            venue_name = row['name']
            athletic_net_id = row.get('athletic_net_id', '')

            # Check if exists
            existing = supabase.table('venues').select('id').eq('name', venue_name).execute()

            if existing.data:
                venue_id_map[venue_name] = existing.data[0]['id']
                print(f"  ✓ Venue exists: {venue_name}")
            else:
                # Insert
                venue_data = {
                    'name': venue_name,
                    'athletic_net_id': athletic_net_id,
                    'city': row.get('city'),
                    'state': row.get('state')
                }
                result = supabase.table('venues').insert(venue_data).execute()
                venue_id_map[venue_name] = result.data[0]['id']
                print(f"  + Created venue: {venue_name}")

    print(f"  ✅ Processed {len(venue_id_map)} venues")
    print()
    return venue_id_map

def import_courses(folder, venue_id_map):
    """Import courses"""
    print("🏃 Stage 2/5: Importing Courses")
    courses_file = os.path.join(folder, 'courses.csv')
    course_id_map = {}

    with open(courses_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            course_name = row['name']
            venue_name = row['venue_name']
            distance_label = row.get('distance_label', '')

            if venue_name not in venue_id_map:
                print(f"  ⚠️  Venue not found: {venue_name}")
                continue

            venue_id = venue_id_map[venue_name]

            # Check if exists by name and venue
            existing = supabase.table('courses').select('id').eq('name', course_name).eq('venue_id', venue_id).execute()

            if existing.data:
                course_id_map[course_name] = existing.data[0]['id']
                print(f"  ✓ Course exists: {course_name}")
            else:
                # Insert
                course_data = {
                    'name': course_name,
                    'venue_id': venue_id,
                    'distance_label': distance_label,
                    'athletic_net_id': row.get('athletic_net_id', '')
                }
                result = supabase.table('courses').insert(course_data).execute()
                course_id_map[course_name] = result.data[0]['id']
                print(f"  + Created course: {course_name}")

    print(f"  ✅ Processed {len(course_id_map)} courses")
    print()
    return course_id_map

def import_schools(folder):
    """Import schools in batches to avoid HTTP/2 timeout"""
    print("🏫 Stage 3/5: Importing Schools")
    schools_file = os.path.join(folder, 'schools.csv')
    school_id_map = {}
    imported = 0
    skipped = 0
    batch_count = 0
    batch_size = 100  # Process 100 schools per batch

    with open(schools_file, 'r') as f:
        reader = csv.DictReader(f)
        batch = []

        for row in reader:
            batch.append(row)

            if len(batch) >= batch_size:
                batch_count += 1
                print(f"  Batch {batch_count}: Processing {len(batch)} schools...")

                for school_row in batch:
                    school_name = school_row['name']
                    athletic_net_id = school_row['athletic_net_id']

                    # Check if exists by athletic_net_id
                    existing = supabase.table('schools').select('id').eq('athletic_net_id', athletic_net_id).execute()

                    if existing.data:
                        school_id_map[school_name] = existing.data[0]['id']
                        skipped += 1
                    else:
                        # Insert
                        school_data = {
                            'name': school_name,
                            'athletic_net_id': athletic_net_id
                        }
                        result = supabase.table('schools').insert(school_data).execute()
                        school_id_map[school_name] = result.data[0]['id']
                        imported += 1

                print(f"    Created: {imported}, Skipped: {skipped}")
                batch = []

                # Small pause between batches
                import time
                time.sleep(1)

        # Process remaining
        if batch:
            batch_count += 1
            print(f"  Batch {batch_count}: Processing {len(batch)} schools...")
            for school_row in batch:
                school_name = school_row['name']
                athletic_net_id = school_row['athletic_net_id']

                existing = supabase.table('schools').select('id').eq('athletic_net_id', athletic_net_id).execute()

                if existing.data:
                    school_id_map[school_name] = existing.data[0]['id']
                    skipped += 1
                else:
                    school_data = {
                        'name': school_name,
                        'athletic_net_id': athletic_net_id
                    }
                    result = supabase.table('schools').insert(school_data).execute()
                    school_id_map[school_name] = result.data[0]['id']
                    imported += 1

    print(f"  ✅ Created: {imported}, Skipped: {skipped} (already exist)")
    print()
    return school_id_map

def import_meet(folder, venue_id_map):
    """Import meet"""
    print("📅 Stage 4/5: Importing Meet")
    meets_file = os.path.join(folder, 'meets.csv')

    with open(meets_file, 'r') as f:
        reader = csv.DictReader(f)
        meet_row = next(reader)

        meet_name = meet_row['name']
        athletic_net_id = meet_row['athletic_net_id']
        venue_name = meet_row['venue_name']
        meet_date = meet_row.get('meet_date', '')
        season_year = int(meet_row.get('season_year', 2025))

        if venue_name not in venue_id_map:
            print(f"  ❌ Venue not found: {venue_name}")
            sys.exit(1)

        venue_id = venue_id_map[venue_name]

        # Check if exists
        existing = supabase.table('meets').select('id').eq('athletic_net_id', athletic_net_id).execute()

        if existing.data:
            meet_id = existing.data[0]['id']
            print(f"  ✓ Meet already exists: {meet_name}")
        else:
            # Insert
            meet_data = {
                'name': meet_name,
                'athletic_net_id': athletic_net_id,
                'venue_id': venue_id,
                'meet_date': meet_date,
                'season_year': season_year,
                'result_count': 0  # Will be updated after results import
            }
            result = supabase.table('meets').insert(meet_data).execute()
            meet_id = result.data[0]['id']
            print(f"  + Created meet: {meet_name}")

    print(f"  ✅ Meet ready (ID: {meet_id})")
    print()
    return meet_id

def import_races(folder, meet_id, course_id_map):
    """Import races"""
    print("🏁 Stage 5/5: Importing Races")
    races_file = os.path.join(folder, 'races.csv')
    race_id_map = {}

    with open(races_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            race_name = row['name']
            athletic_net_race_id = row['athletic_net_race_id']
            course_name = row.get('course_name', '')

            # Get course_id if available
            course_id = course_id_map.get(course_name) if course_name else None

            # Check if exists
            existing = supabase.table('races').select('id').eq('athletic_net_id', athletic_net_race_id).execute()

            if existing.data:
                race_id_map[athletic_net_race_id] = existing.data[0]['id']
                print(f"  ✓ Race exists: {race_name}")
            else:
                # Insert
                race_data = {
                    'name': race_name,
                    'athletic_net_id': athletic_net_race_id,
                    'meet_id': meet_id,
                    'gender': row.get('gender'),
                    'distance_meters': int(row['distance_meters']) if row.get('distance_meters') else None,
                    'course_id': course_id
                }
                result = supabase.table('races').insert(race_data).execute()
                race_id_map[athletic_net_race_id] = result.data[0]['id']
                print(f"  + Created race: {race_name}")

    print(f"  ✅ Processed {len(race_id_map)} races")
    print()
    return race_id_map

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 import_foundation_only.py <folder>")
        print("Example: python3 import_foundation_only.py to-be-processed/meet_256230_1761716889")
        sys.exit(1)

    folder = sys.argv[1]
    meet_athletic_net_id = folder.split('_')[1]

    print("=" * 80)
    print(f"FOUNDATION IMPORT FOR MEET {meet_athletic_net_id}")
    print("=" * 80)
    print()
    print("Importing: venues → courses → schools → meets → races")
    print("Skipping: athletes, results (will be imported in batches)")
    print()

    # Import in order
    venue_id_map = import_venues(folder)
    course_id_map = import_courses(folder, venue_id_map)
    school_id_map = import_schools(folder)
    meet_id = import_meet(folder, venue_id_map)
    race_id_map = import_races(folder, meet_id, course_id_map)

    print("=" * 80)
    print("FOUNDATION IMPORT COMPLETE")
    print("=" * 80)
    print()
    print(f"Summary:")
    print(f"  Venues: {len(venue_id_map)}")
    print(f"  Courses: {len(course_id_map)}")
    print(f"  Schools: {len(school_id_map)}")
    print(f"  Meet: Created")
    print(f"  Races: {len(race_id_map)}")
    print()
    print("Next steps:")
    print(f"  1. Split CSVs: venv/bin/python3 split_csv_for_batched_import.py {folder} 2000")
    print(f"  2. Import athletes: venv/bin/python3 import_batched_athletes.py {folder}")
    print(f"  3. Import results: venv/bin/python3 import_batched_results.py {folder}")
    print(f"  4. Housekeeping: venv/bin/python3 housekeeping_after_import.py {folder}")
