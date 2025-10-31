#!/usr/bin/env python3
"""
Import athlete batches for a meet
This processes athletes in small batches to avoid HTTP/2 connection limits
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

def import_athlete_batch(batch_file, school_id_map):
    """Import a single athlete batch"""
    print(f"  Processing {batch_file}...")

    imported = 0
    skipped = 0
    errors = 0

    with open(batch_file, 'r') as f:
        reader = csv.DictReader(f)

        for row in reader:
            try:
                # Get school ID from map
                school_name = row['school_name']
                if school_name not in school_id_map:
                    print(f"    ⚠️  School not found: {school_name}")
                    skipped += 1
                    continue

                school_db_id = school_id_map[school_name]

                # Check if athlete already exists
                existing = supabase.table('athletes').select('id').eq('first_name', row['first_name']).eq('last_name', row['last_name']).eq('school_id', school_db_id).execute()

                if existing.data:
                    skipped += 1
                    continue

                # Insert athlete
                athlete_data = {
                    'first_name': row['first_name'],
                    'last_name': row['last_name'],
                    'school_id': school_db_id,
                    'gender': row['gender'],
                    'grad_year': int(row['grad_year']) if row['grad_year'] else None,
                    'athletic_net_id': row['athletic_net_id']
                }

                supabase.table('athletes').insert(athlete_data).execute()
                imported += 1

            except Exception as e:
                print(f"    ❌ Error importing athlete: {e}")
                errors += 1

    return imported, skipped, errors

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 import_batched_athletes.py <folder>")
        print("Example: python3 import_batched_athletes.py to-be-processed/meet_256230_1761716889")
        sys.exit(1)

    folder = sys.argv[1]
    meet_id = folder.split('_')[1]  # Extract meet ID from folder name

    print("=" * 80)
    print(f"IMPORTING ATHLETE BATCHES FOR MEET {meet_id}")
    print("=" * 80)
    print()

    # First, ensure meet exists and get/create school mappings
    print("Loading schools...")
    schools_file = os.path.join(folder, 'schools.csv')
    school_id_map = {}

    with open(schools_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Check if school exists
            athletic_net_id = row['athletic_net_id']
            existing = supabase.table('schools').select('id').eq('athletic_net_id', athletic_net_id).execute()

            if existing.data:
                school_id_map[row['name']] = existing.data[0]['id']
            else:
                # Create school if it doesn't exist
                school_data = {
                    'name': row['name'],
                    'athletic_net_id': athletic_net_id
                }
                result = supabase.table('schools').insert(school_data).execute()
                school_id_map[row['name']] = result.data[0]['id']

    print(f"  Loaded {len(school_id_map)} schools")
    print()

    # Process each athlete batch
    athletes_dir = os.path.join(folder, 'athletes_batches')

    if not os.path.exists(athletes_dir):
        print(f"❌ Athletes batches directory not found: {athletes_dir}")
        print("   Run split_csv_for_batched_import.py first")
        sys.exit(1)

    batch_files = sorted([f for f in os.listdir(athletes_dir) if f.endswith('.csv')])

    print(f"Found {len(batch_files)} athlete batches")
    print()

    total_imported = 0
    total_skipped = 0
    total_errors = 0

    for i, batch_file in enumerate(batch_files, 1):
        batch_path = os.path.join(athletes_dir, batch_file)
        print(f"[{i}/{len(batch_files)}] Processing {batch_file}...")

        start_time = time.time()
        imported, skipped, errors = import_athlete_batch(batch_path, school_id_map)
        elapsed = time.time() - start_time

        print(f"  ✅ Imported: {imported}, Skipped: {skipped}, Errors: {errors} ({elapsed:.1f}s)")
        print()

        total_imported += imported
        total_skipped += skipped
        total_errors += errors

        # Brief pause between batches
        if i < len(batch_files):
            time.sleep(2)

    print("=" * 80)
    print("ATHLETE IMPORT COMPLETE")
    print("=" * 80)
    print(f"Total imported: {total_imported}")
    print(f"Total skipped: {total_skipped}")
    print(f"Total errors: {total_errors}")
    print()
    print("Next: Import result batches with import_batched_results.py")
