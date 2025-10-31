#!/usr/bin/env python3
"""
Import result batches for a meet
This processes results in small batches to avoid HTTP/2 connection limits
Requires athletes to be imported first
"""
import os
import sys
import csv
import time
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/Users/ron/manaxc/manaxc-project/code/importers/.env')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

def import_result_batch(batch_file, meet_id, race_id_map, athlete_lookup_cache):
    """Import a single result batch"""
    print(f"  Processing {batch_file}...")

    imported = 0
    skipped = 0
    errors = 0

    with open(batch_file, 'r') as f:
        reader = csv.DictReader(f)

        for row in reader:
            try:
                # Get race ID
                race_athletic_net_id = row['athletic_net_race_id']
                if race_athletic_net_id not in race_id_map:
                    print(f"    ⚠️  Race not found: {race_athletic_net_id}")
                    skipped += 1
                    continue

                race_db_id = race_id_map[race_athletic_net_id]

                # Get athlete ID (with caching to reduce lookups)
                athlete_key = (row['athlete_name'], row['school_name'])

                if athlete_key not in athlete_lookup_cache:
                    # Lookup athlete by name and school
                    # This requires first getting school ID
                    school_result = supabase.table('schools').select('id').eq('name', row['school_name']).execute()
                    if not school_result.data:
                        print(f"    ⚠️  School not found: {row['school_name']}")
                        skipped += 1
                        continue

                    school_id = school_result.data[0]['id']

                    # Now lookup athlete
                    parts = row['athlete_name'].split(' ', 1)
                    first_name = parts[0] if len(parts) > 0 else ''
                    last_name = parts[1] if len(parts) > 1 else ''

                    athlete_result = supabase.table('athletes').select('id').eq('first_name', first_name).eq('last_name', last_name).eq('school_id', school_id).execute()

                    if not athlete_result.data:
                        print(f"    ⚠️  Athlete not found: {row['athlete_name']} from {row['school_name']}")
                        skipped += 1
                        continue

                    athlete_lookup_cache[athlete_key] = athlete_result.data[0]['id']

                athlete_db_id = athlete_lookup_cache[athlete_key]

                # Check for duplicate (time_cs, place_overall)
                time_cs = int(row['time_cs'])
                place = int(row['place_overall'])

                existing = supabase.table('results').select('id').eq('meet_id', meet_id).eq('time_cs', time_cs).eq('place_overall', place).execute()

                if existing.data:
                    skipped += 1
                    continue

                # Insert result
                result_data = {
                    'meet_id': meet_id,
                    'race_id': race_db_id,
                    'athlete_id': athlete_db_id,
                    'time_cs': time_cs,
                    'place_overall': place,
                    'place_gender': int(row['place_gender']) if row.get('place_gender') else None,
                    'athletic_net_id': row['athletic_net_id']
                }

                supabase.table('results').insert(result_data).execute()
                imported += 1

            except Exception as e:
                print(f"    ❌ Error importing result: {e}")
                errors += 1

    return imported, skipped, errors

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 import_batched_results.py <folder>")
        print("Example: python3 import_batched_results.py to-be-processed/meet_256230_1761716889")
        sys.exit(1)

    folder = sys.argv[1]
    meet_athletic_net_id = folder.split('_')[1]  # Extract meet ID from folder name

    print("=" * 80)
    print(f"IMPORTING RESULT BATCHES FOR MEET {meet_athletic_net_id}")
    print("=" * 80)
    print()

    # Get meet ID
    print("Loading meet...")
    meet_result = supabase.table('meets').select('id, name').eq('athletic_net_id', meet_athletic_net_id).execute()
    if not meet_result.data:
        print(f"❌ Meet {meet_athletic_net_id} not found in database")
        print("   Ensure you've run the standard import for venues, courses, meets, and races first")
        sys.exit(1)

    meet_id = meet_result.data[0]['id']
    meet_name = meet_result.data[0]['name']
    print(f"  Meet: {meet_name}")
    print(f"  UUID: {meet_id}")
    print()

    # Load race mappings
    print("Loading races...")
    race_id_map = {}
    races_file = os.path.join(folder, 'races.csv')

    with open(races_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            athletic_net_id = row['athletic_net_id']
            race_result = supabase.table('races').select('id').eq('athletic_net_id', athletic_net_id).execute()

            if race_result.data:
                race_id_map[athletic_net_id] = race_result.data[0]['id']

    print(f"  Loaded {len(race_id_map)} races")
    print()

    # Process each result batch
    results_dir = os.path.join(folder, 'results_batches')

    if not os.path.exists(results_dir):
        print(f"❌ Results batches directory not found: {results_dir}")
        print("   Run split_csv_for_batched_import.py first")
        sys.exit(1)

    batch_files = sorted([f for f in os.listdir(results_dir) if f.endswith('.csv')])

    print(f"Found {len(batch_files)} result batches")
    print()

    total_imported = 0
    total_skipped = 0
    total_errors = 0
    athlete_lookup_cache = {}  # Cache athlete lookups across batches

    for i, batch_file in enumerate(batch_files, 1):
        batch_path = os.path.join(results_dir, batch_file)
        print(f"[{i}/{len(batch_files)}] Processing {batch_file}...")

        start_time = time.time()
        imported, skipped, errors = import_result_batch(batch_path, meet_id, race_id_map, athlete_lookup_cache)
        elapsed = time.time() - start_time

        print(f"  ✅ Imported: {imported}, Skipped: {skipped}, Errors: {errors} ({elapsed:.1f}s)")
        print(f"  Athlete cache size: {len(athlete_lookup_cache)}")
        print()

        total_imported += imported
        total_skipped += skipped
        total_errors += errors

        # Brief pause between batches
        if i < len(batch_files):
            time.sleep(2)

    print("=" * 80)
    print("RESULT IMPORT COMPLETE")
    print("=" * 80)
    print(f"Total imported: {total_imported}")
    print(f"Total skipped: {total_skipped}")
    print(f"Total errors: {total_errors}")
    print()
    print("Next: Run housekeeping tasks with housekeeping_after_import.py")
