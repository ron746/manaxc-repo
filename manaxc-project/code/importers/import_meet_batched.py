#!/usr/bin/env python3
"""
Import a meet folder with automatic batching for large files.
Files with >2000 rows are automatically split and imported in batches.
"""
import sys
import csv
import os
import math
from dotenv import load_dotenv
from supabase import create_client
import time

load_dotenv('.env')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

BATCH_SIZE = 2000

def count_csv_rows(filepath):
    """Count rows in CSV file (excluding header)"""
    with open(filepath, 'r') as f:
        return sum(1 for line in f) - 1  # -1 for header

def import_venues(folder):
    """Import venues"""
    print("\n📍 STEP 1/7: Importing Venues")
    filepath = os.path.join(folder, 'venues.csv')

    if not os.path.exists(filepath):
        print("  ⚠️  No venues.csv found, skipping")
        return {}

    venue_id_map = {}
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            venue_name = row['name']
            existing = supabase.table('venues').select('id').eq('name', venue_name).execute()

            if existing.data:
                venue_id_map[venue_name] = existing.data[0]['id']
                print(f"  ✓ {venue_name}")
            else:
                venue_data = {
                    'name': venue_name,
                    'athletic_net_id': row.get('athletic_net_id', ''),
                    'city': row.get('city'),
                    'state': row.get('state')
                }
                result = supabase.table('venues').insert(venue_data).execute()
                venue_id_map[venue_name] = result.data[0]['id']
                print(f"  + Created: {venue_name}")

    print(f"  ✅ {len(venue_id_map)} venues ready")
    return venue_id_map

def import_courses(folder, venue_id_map):
    """Import courses"""
    print("\n🏃 STEP 2/7: Importing Courses")
    filepath = os.path.join(folder, 'courses.csv')

    if not os.path.exists(filepath):
        print("  ⚠️  No courses.csv found, skipping")
        return {}

    course_id_map = {}
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            course_name = row['name']
            venue_name = row['venue_name']

            if venue_name not in venue_id_map:
                print(f"  ⚠️  Venue not found: {venue_name}")
                continue

            venue_id = venue_id_map[venue_name]
            existing = supabase.table('courses').select('id').eq('name', course_name).eq('venue_id', venue_id).execute()

            if existing.data:
                course_id_map[course_name] = existing.data[0]['id']
                print(f"  ✓ {course_name}")
            else:
                course_data = {
                    'name': course_name,
                    'venue_id': venue_id,
                    'distance_label': row.get('distance_label', ''),
                    'athletic_net_id': row.get('athletic_net_id', '')
                }
                result = supabase.table('courses').insert(course_data).execute()
                course_id_map[course_name] = result.data[0]['id']
                print(f"  + Created: {course_name}")

    print(f"  ✅ {len(course_id_map)} courses ready")
    return course_id_map

def import_schools_batched(folder):
    """Import schools in batches"""
    print("\n🏫 STEP 3/7: Importing Schools")
    filepath = os.path.join(folder, 'schools.csv')

    if not os.path.exists(filepath):
        print("  ⚠️  No schools.csv found, skipping")
        return {}

    row_count = count_csv_rows(filepath)
    print(f"  Found {row_count} schools")

    school_id_map = {}
    imported = 0
    skipped = 0

    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        batch_num = 0
        batch = []

        for row in reader:
            batch.append(row)

            if len(batch) >= BATCH_SIZE:
                batch_num += 1
                print(f"  Batch {batch_num}: Processing {len(batch)} schools...")

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

                print(f"    Progress: {imported} created, {skipped} existed")
                batch = []
                time.sleep(0.5)  # Small pause between batches

        # Process remaining
        if batch:
            batch_num += 1
            print(f"  Batch {batch_num}: Processing {len(batch)} schools...")
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

    print(f"  ✅ {imported} created, {skipped} existed")
    return school_id_map

def import_meet(folder, venue_id_map):
    """Import meet"""
    print("\n📅 STEP 4/7: Importing Meet")
    filepath = os.path.join(folder, 'meets.csv')

    if not os.path.exists(filepath):
        print("  ⚠️  No meets.csv found, skipping")
        return None

    with open(filepath, 'r') as f:
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
        existing = supabase.table('meets').select('id').eq('athletic_net_id', athletic_net_id).execute()

        if existing.data:
            meet_id = existing.data[0]['id']
            print(f"  ✓ {meet_name}")
        else:
            meet_data = {
                'name': meet_name,
                'athletic_net_id': athletic_net_id,
                'venue_id': venue_id,
                'meet_date': meet_date,
                'season_year': season_year,
                'result_count': 0
            }
            result = supabase.table('meets').insert(meet_data).execute()
            meet_id = result.data[0]['id']
            print(f"  + Created: {meet_name}")

    print(f"  ✅ Meet ready (ID: {meet_id})")
    return meet_id

def import_races(folder, meet_id, course_id_map):
    """Import races"""
    print("\n🏁 STEP 5/7: Importing Races")
    filepath = os.path.join(folder, 'races.csv')

    if not os.path.exists(filepath):
        print("  ⚠️  No races.csv found, skipping")
        return {}

    race_id_map = {}
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            race_name = row['name']
            athletic_net_race_id = row['athletic_net_race_id']
            course_name = row.get('course_name', '')

            course_id = course_id_map.get(course_name) if course_name else None
            existing = supabase.table('races').select('id').eq('athletic_net_id', athletic_net_race_id).execute()

            if existing.data:
                race_id_map[athletic_net_race_id] = existing.data[0]['id']
                print(f"  ✓ {race_name}")
            else:
                try:
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
                    print(f"  + Created: {race_name}")
                except Exception as e:
                    # Race might exist from previous attempt, look it up
                    existing2 = supabase.table('races').select('id').eq('athletic_net_id', athletic_net_race_id).execute()
                    if existing2.data:
                        race_id_map[athletic_net_race_id] = existing2.data[0]['id']
                        print(f"  ✓ {race_name} (recovered)")
                    else:
                        print(f"  ⚠️  Skipped: {race_name} - {str(e)[:50]}")

    print(f"  ✅ {len(race_id_map)} races ready")
    return race_id_map

def import_athletes_batched(folder, school_id_map):
    """Import athletes in batches"""
    print("\n👤 STEP 6/7: Importing Athletes")
    filepath = os.path.join(folder, 'athletes.csv')

    if not os.path.exists(filepath):
        print("  ⚠️  No athletes.csv found, skipping")
        return {}

    row_count = count_csv_rows(filepath)
    num_batches = math.ceil(row_count / BATCH_SIZE)
    print(f"  Found {row_count} athletes → {num_batches} batches")

    athlete_id_map = {}
    imported = 0
    skipped = 0
    errors = 0

    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        batch_num = 0
        batch = []

        for row in reader:
            batch.append(row)

            if len(batch) >= BATCH_SIZE:
                batch_num += 1
                print(f"  Batch {batch_num}/{num_batches}: Processing {len(batch)} athletes...")

                for athlete_row in batch:
                    school_name = athlete_row['school_name']

                    if school_name not in school_id_map:
                        errors += 1
                        continue

                    school_id = school_id_map[school_name]
                    first_name = athlete_row.get('first_name', '')
                    last_name = athlete_row.get('last_name', '')

                    # Check if exists
                    existing = supabase.table('athletes').select('id').eq('first_name', first_name).eq('last_name', last_name).eq('school_id', school_id).execute()

                    if existing.data:
                        athlete_id_map[f"{first_name}_{last_name}_{school_name}"] = existing.data[0]['id']
                        skipped += 1
                    else:
                        try:
                            athlete_data = {
                                'first_name': first_name,
                                'last_name': last_name,
                                'school_id': school_id,
                                'gender': athlete_row.get('gender'),
                                'grad_year': int(athlete_row['grad_year']) if athlete_row.get('grad_year') else None
                            }
                            result = supabase.table('athletes').insert(athlete_data).execute()
                            athlete_id_map[f"{first_name}_{last_name}_{school_name}"] = result.data[0]['id']
                            imported += 1
                        except Exception as e:
                            # Skip duplicate slugs or other errors
                            errors += 1

                print(f"    Progress: {imported} created, {skipped} existed, {errors} skipped")
                batch = []
                time.sleep(0.5)

        # Process remaining
        if batch:
            batch_num += 1
            print(f"  Batch {batch_num}/{num_batches}: Processing {len(batch)} athletes...")
            for athlete_row in batch:
                school_name = athlete_row['school_name']

                if school_name not in school_id_map:
                    errors += 1
                    continue

                school_id = school_id_map[school_name]
                first_name = athlete_row.get('first_name', '')
                last_name = athlete_row.get('last_name', '')

                existing = supabase.table('athletes').select('id').eq('first_name', first_name).eq('last_name', last_name).eq('school_id', school_id).execute()

                if existing.data:
                    athlete_id_map[f"{first_name}_{last_name}_{school_name}"] = existing.data[0]['id']
                    skipped += 1
                else:
                    try:
                        athlete_data = {
                            'first_name': first_name,
                            'last_name': last_name,
                            'school_id': school_id,
                            'gender': athlete_row.get('gender'),
                            'grad_year': int(athlete_row['grad_year']) if athlete_row.get('grad_year') else None
                        }
                        result = supabase.table('athletes').insert(athlete_data).execute()
                        athlete_id_map[f"{first_name}_{last_name}_{school_name}"] = result.data[0]['id']
                        imported += 1
                    except Exception as e:
                        errors += 1

    print(f"  ✅ {imported} created, {skipped} existed, {errors} skipped")
    return athlete_id_map

def import_results_batched(folder, meet_id, race_id_map, athlete_id_map, school_id_map):
    """Import results in batches"""
    print("\n📊 STEP 7/7: Importing Results")
    filepath = os.path.join(folder, 'results.csv')

    if not os.path.exists(filepath):
        print("  ⚠️  No results.csv found, skipping")
        return 0

    row_count = count_csv_rows(filepath)
    num_batches = math.ceil(row_count / BATCH_SIZE)
    print(f"  Found {row_count} results → {num_batches} batches")

    imported = 0
    skipped = 0
    errors = 0

    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        batch_num = 0
        batch = []

        for row in reader:
            batch.append(row)

            if len(batch) >= BATCH_SIZE:
                batch_num += 1
                print(f"  Batch {batch_num}/{num_batches}: Processing {len(batch)} results...")

                for result_row in batch:
                    athletic_net_race_id = result_row['athletic_net_race_id']
                    school_name = result_row['school_name']
                    first_name = result_row.get('first_name', '')
                    last_name = result_row.get('last_name', '')

                    if athletic_net_race_id not in race_id_map:
                        errors += 1
                        continue

                    if school_name not in school_id_map:
                        errors += 1
                        continue

                    race_id = race_id_map[athletic_net_race_id]
                    school_id = school_id_map[school_name]
                    athlete_key = f"{first_name}_{last_name}_{school_name}"

                    if athlete_key not in athlete_id_map:
                        errors += 1
                        continue

                    athlete_id = athlete_id_map[athlete_key]

                    # Check if exists
                    existing = supabase.table('results').select('id').eq('race_id', race_id).eq('athlete_id', athlete_id).execute()

                    if existing.data:
                        skipped += 1
                    else:
                        try:
                            result_data = {
                                'meet_id': meet_id,
                                'race_id': race_id,
                                'athlete_id': athlete_id,
                                'school_id': school_id,
                                'time_in_seconds': float(result_row['time_in_seconds']) if result_row.get('time_in_seconds') else None,
                                'place': int(result_row['place']) if result_row.get('place') else None,
                                'grade': int(result_row['grade']) if result_row.get('grade') else None
                            }
                            supabase.table('results').insert(result_data).execute()
                            imported += 1
                        except Exception as e:
                            errors += 1

                print(f"    Progress: {imported} created, {skipped} existed, {errors} skipped")
                batch = []
                time.sleep(0.5)

        # Process remaining
        if batch:
            batch_num += 1
            print(f"  Batch {batch_num}/{num_batches}: Processing {len(batch)} results...")
            for result_row in batch:
                athletic_net_race_id = result_row['athletic_net_race_id']
                school_name = result_row['school_name']
                first_name = result_row.get('first_name', '')
                last_name = result_row.get('last_name', '')

                if athletic_net_race_id not in race_id_map:
                    errors += 1
                    continue

                if school_name not in school_id_map:
                    errors += 1
                    continue

                race_id = race_id_map[athletic_net_race_id]
                school_id = school_id_map[school_name]
                athlete_key = f"{first_name}_{last_name}_{school_name}"

                if athlete_key not in athlete_id_map:
                    errors += 1
                    continue

                athlete_id = athlete_id_map[athlete_key]

                existing = supabase.table('results').select('id').eq('race_id', race_id).eq('athlete_id', athlete_id).execute()

                if existing.data:
                    skipped += 1
                else:
                    try:
                        result_data = {
                            'meet_id': meet_id,
                            'race_id': race_id,
                            'athlete_id': athlete_id,
                            'school_id': school_id,
                            'time_in_seconds': float(result_row['time_in_seconds']) if result_row.get('time_in_seconds') else None,
                            'place': int(result_row['place']) if result_row.get('place') else None,
                            'grade': int(result_row['grade']) if result_row.get('grade') else None
                        }
                        supabase.table('results').insert(result_data).execute()
                        imported += 1
                    except Exception as e:
                        errors += 1

    print(f"  ✅ {imported} created, {skipped} existed, {errors} skipped")
    return imported

def run_housekeeping(meet_id):
    """Update result_count for the meet"""
    print("\n🧹 Housekeeping: Updating result_count")

    # Get actual count
    results = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).limit(1).execute()
    count = results.count or 0

    # Update meet
    supabase.table('meets').update({'result_count': count}).eq('id', meet_id).execute()
    print(f"  ✅ Updated result_count to {count}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 import_meet_batched.py <folder>")
        print("Example: python3 import_meet_batched.py to-be-processed/meet_256230_1761716889")
        sys.exit(1)

    folder = sys.argv[1]

    print("=" * 80)
    print("BATCHED MEET IMPORT")
    print("=" * 80)
    print(f"\nFolder: {folder}")
    print(f"Batch size: {BATCH_SIZE} rows")
    print("\nImport order:")
    print("  1. Venues (small)")
    print("  2. Courses (small)")
    print("  3. Schools (batched if >2000)")
    print("  4. Meet (1 record)")
    print("  5. Races (small)")
    print("  6. Athletes (batched if >2000)")
    print("  7. Results (batched if >2000)")
    print()

    start_time = time.time()

    # Import in order
    venue_id_map = import_venues(folder)
    course_id_map = import_courses(folder, venue_id_map)
    school_id_map = import_schools_batched(folder)
    meet_id = import_meet(folder, venue_id_map)

    if not meet_id:
        print("\n❌ Failed to import meet")
        sys.exit(1)

    race_id_map = import_races(folder, meet_id, course_id_map)
    athlete_id_map = import_athletes_batched(folder, school_id_map)
    result_count = import_results_batched(folder, meet_id, race_id_map, athlete_id_map, school_id_map)

    run_housekeeping(meet_id)

    elapsed = time.time() - start_time
    print("\n" + "=" * 80)
    print("IMPORT COMPLETE")
    print("=" * 80)
    print(f"\nTotal time: {elapsed:.1f} seconds")
    print(f"Results imported: {result_count}")
    print("\nNext: Run batch operations to rebuild derived tables")
    print("  → http://localhost:3000/admin/batch")
