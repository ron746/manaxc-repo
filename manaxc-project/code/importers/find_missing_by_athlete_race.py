#!/usr/bin/env python3
"""
Find missing results by comparing athlete+race+time combinations.
This handles duplicate times correctly (same time, different athletes = ties, which is normal).
"""

import os
import csv
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

meet_ids = ['254332', '255929', '254378']

for meet_an_id in meet_ids:
    print(f"\n{'='*80}")
    print(f"MEET {meet_an_id}")
    print(f"{'='*80}")

    # Get meet
    meet = supabase.table('meets').select('id, name').eq('athletic_net_id', meet_an_id).execute()
    if not meet.data:
        print(f"✗ Meet not found")
        continue

    meet_id = meet.data[0]['id']
    meet_name = meet.data[0]['name']
    print(f"{meet_name}")

    # Get CSV
    import glob
    csv_pattern = f'to-be-processed/meet_{meet_an_id}_*/results.csv'
    csv_files = glob.glob(csv_pattern)
    if not csv_files:
        print(f"✗ CSV not found")
        continue

    csv_file = csv_files[0]

    # Get DB count
    db_count = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute().count

    # Get CSV count
    with open(csv_file, 'r') as f:
        csv_count = sum(1 for line in f) - 1

    print(f"CSV: {csv_count} | DB: {db_count} | Missing: {csv_count - db_count}")

    if csv_count == db_count:
        print(f"✅ MATCH - No action needed")
        continue

    # For missing results, check a sample to understand the pattern
    print(f"\n🔍 Checking first few CSV rows for missing results...")

    missing_count = 0
    sample_missing = []

    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if missing_count >= (csv_count - db_count) + 5:  # Check a few extra
                break

            athlete_school_id = row['athlete_school_id']
            athlete_name = row['athlete_name']
            time_cs = int(row['time_cs'])
            race_an_id = row['athletic_net_race_id']

            # Get school
            school = supabase.table('schools').select('id').eq('athletic_net_id', athlete_school_id).limit(1).execute()
            if not school.data:
                continue

            school_id = school.data[0]['id']

            # Get athlete
            athlete = supabase.table('athletes').select('id').eq('name', athlete_name).eq('school_id', school_id).limit(1).execute()
            if not athlete.data:
                if missing_count < 10:
                    sample_missing.append(f"  • {athlete_name} ({time_cs/100:.2f}s) - athlete not in DB")
                missing_count += 1
                continue

            athlete_id = athlete.data[0]['id']

            # Get race
            race = supabase.table('races').select('id').eq('meet_id', meet_id).or_(f'athletic_net_id.eq.{race_an_id},athletic_net_race_id.eq.{race_an_id}').limit(1).execute()
            if not race.data:
                continue

            race_id = race.data[0]['id']

            # Check if result exists
            result = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).limit(10).execute()

            if not result.data:
                # No result at all - simple missing
                if missing_count < 10:
                    sample_missing.append(f"  • {athlete_name} ({time_cs/100:.2f}s) - no result in DB")
                missing_count += 1
            elif not any(r['time_cs'] == time_cs for r in result.data):
                # Has result but different time - DUPLICATE TIME SITUATION
                existing_times = [r['time_cs'] for r in result.data]
                if missing_count < 10:
                    sample_missing.append(f"  • {athlete_name} - CSV: {time_cs/100:.2f}s, DB: {[t/100 for t in existing_times]} - DUPLICATE TIME")
                missing_count += 1

    print(f"\nSample missing results ({len(sample_missing)}):")
    for m in sample_missing:
        print(m)

print(f"\n{'='*80}")
