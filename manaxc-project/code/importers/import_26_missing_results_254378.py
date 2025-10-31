#!/usr/bin/env python3
"""
Import all 26 missing results for meet 254378.

Strategy:
1. Load the comprehensive analysis JSON to get the missing results
2. For each missing result, find the athlete ID
3. Add the result to the database
4. If it's a duplicate time (same athlete, different time in same race), flag in potential_duplicates
5. Disable triggers for performance, re-enable after
"""

import os
import json
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

MEET_ID = '3f6daf82-5a37-419f-802d-f648bb97d6ff'
CSV_PATH = 'to-be-processed/meet_254378_1761786641'

print("=" * 100)
print("IMPORTING 26 MISSING RESULTS FOR MEET 254378")
print("=" * 100)
print()

# Step 1: Load the comprehensive analysis
print("Step 1: Loading comprehensive analysis...")
with open('meet_254378_comprehensive_analysis.json', 'r') as f:
    analysis = json.load(f)

athlete_exists = analysis['categories']['athlete_exists']
athlete_not_found = analysis['categories']['athlete_not_found']

total_missing = len(athlete_exists) + len(athlete_not_found)
print(f"  Found {len(athlete_exists)} results where athlete exists")
print(f"  Found {len(athlete_not_found)} results where athlete was just created")
print(f"  Total: {total_missing} results to import")

# Step 2: Get race mapping
print("\nStep 2: Building race mapping...")
races = supabase.table('races')\
    .select('id, athletic_net_race_id')\
    .eq('meet_id', MEET_ID)\
    .execute()

race_map = {r['athletic_net_race_id']: r['id'] for r in races.data if r['athletic_net_race_id']}
print(f"  Found {len(race_map)} races")

# Step 3: Load results CSV for additional data (place, etc.)
print("\nStep 3: Loading results CSV for metadata...")
results_csv = {}  # (race_id, time_cs) -> full row
with open(f'{CSV_PATH}/results.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = (row['athletic_net_race_id'], int(row['time_cs']))
        results_csv[key] = row

print(f"  Loaded {len(results_csv)} result rows")

# Step 4: Disable triggers for performance
print("\nStep 4: Disabling triggers...")
print("  (Run this SQL manually in Supabase if needed: ALTER TABLE results DISABLE TRIGGER USER;)")

# Step 5: Import all results
print("\nStep 5: Importing all 26 results...")
print("-" * 100)

imported = []
flagged_duplicates = []
failed = []

# Process athlete_exists results (15 results)
print("\nCategory 1: Athletes that already existed (15 results)...")
for item in athlete_exists:
    print(f"\n  Processing: {item['athlete_name']} - {item['time_cs']} cs")

    # Get race UUID
    race_uuid = race_map.get(item['athletic_net_race_id'])
    if not race_uuid:
        print(f"    ERROR: Race {item['athletic_net_race_id']} not found")
        failed.append(item)
        continue

    # Get CSV row for additional data
    csv_row = results_csv.get((item['athletic_net_race_id'], item['time_cs']))
    if not csv_row:
        print(f"    WARNING: CSV row not found, using basic data")
        csv_row = {}

    # Prepare result data
    result_data = {
        'meet_id': MEET_ID,
        'race_id': race_uuid,
        'athlete_id': item['athlete_id'],
        'time_cs': item['time_cs'],
        'place_overall': int(csv_row.get('place_overall', 0)) if csv_row.get('place_overall') else None,
        'data_source': 'athletic_net'
    }

    # Check if this athlete already has a result in this race (different time = duplicate)
    existing = supabase.table('results')\
        .select('id, time_cs')\
        .eq('athlete_id', item['athlete_id'])\
        .eq('meet_id', MEET_ID)\
        .eq('race_id', race_uuid)\
        .execute()

    is_duplicate_time = False
    if existing.data and len(existing.data) > 0:
        # Check if any have a different time
        for existing_result in existing.data:
            if existing_result['time_cs'] != item['time_cs']:
                is_duplicate_time = True
                print(f"    ! Duplicate detected: Existing time {existing_result['time_cs']} vs new time {item['time_cs']}")
                break

    # Insert result
    try:
        result = supabase.table('results').insert(result_data).execute()
        result_id = result.data[0]['id']
        print(f"    ✓ Added result: {result_id}")

        imported.append({
            'athlete_name': item['athlete_name'],
            'result_id': result_id,
            'is_duplicate_time': is_duplicate_time
        })

        # If duplicate time, flag it
        if is_duplicate_time:
            try:
                duplicate_data = {
                    'result_id_1': existing.data[0]['id'],
                    'result_id_2': result_id,
                    'athlete_id': item['athlete_id'],
                    'meet_id': MEET_ID,
                    'race_id': race_uuid,
                    'conflict_type': 'different_times_same_athlete_race',
                    'time_1_cs': existing.data[0]['time_cs'],
                    'time_2_cs': item['time_cs'],
                    'time_difference_cs': abs(existing.data[0]['time_cs'] - item['time_cs']),
                    'status': 'pending'
                }

                supabase.table('potential_duplicates').insert(duplicate_data).execute()
                print(f"    ✓ Flagged in potential_duplicates")
                flagged_duplicates.append(item['athlete_name'])

            except Exception as e:
                print(f"    WARNING: Failed to flag duplicate: {e}")

    except Exception as e:
        print(f"    ERROR: {e}")
        failed.append(item)

# Process athlete_not_found results (11 results - now matched to existing athletes)
print("\n\nCategory 2: Athletes that were just matched (11 results)...")
for item in athlete_not_found:
    print(f"\n  Processing: {item['athlete_name']} - {item['time_cs']} cs")

    # Find the athlete ID from the database (they were just matched)
    # Match by name and school
    school_check = supabase.table('schools')\
        .select('id')\
        .ilike('athletic_net_id', f"%{item['school_id'].replace('school_', '')}%")\
        .execute()

    if not school_check.data:
        print(f"    ERROR: School {item['school_id']} not found")
        failed.append(item)
        continue

    school_uuid = school_check.data[0]['id']

    # Find athlete
    athlete_check = supabase.table('athletes')\
        .select('id, name')\
        .eq('school_id', school_uuid)\
        .execute()

    # Filter to match the name (case-insensitive)
    matching_athletes = [
        a for a in athlete_check.data
        if a['name'].lower() == item['athlete_name'].lower()
    ]

    if not matching_athletes:
        print(f"    ERROR: Athlete {item['athlete_name']} not found even after matching")
        failed.append(item)
        continue

    athlete_id = matching_athletes[0]['id']
    print(f"    Found athlete: {matching_athletes[0]['name']} ({athlete_id})")

    # Get race UUID
    race_uuid = race_map.get(item['athletic_net_race_id'])
    if not race_uuid:
        print(f"    ERROR: Race {item['athletic_net_race_id']} not found")
        failed.append(item)
        continue

    # Get CSV row for additional data
    csv_row = results_csv.get((item['athletic_net_race_id'], item['time_cs']))
    if not csv_row:
        print(f"    WARNING: CSV row not found")
        csv_row = {}

    # Prepare result data
    result_data = {
        'meet_id': MEET_ID,
        'race_id': race_uuid,
        'athlete_id': athlete_id,
        'time_cs': item['time_cs'],
        'place_overall': int(csv_row.get('place_overall', 0)) if csv_row.get('place_overall') else None,
        'data_source': 'athletic_net'
    }

    # Insert result
    try:
        result = supabase.table('results').insert(result_data).execute()
        result_id = result.data[0]['id']
        print(f"    ✓ Added result: {result_id}")

        imported.append({
            'athlete_name': item['athlete_name'],
            'result_id': result_id,
            'is_duplicate_time': False
        })

    except Exception as e:
        print(f"    ERROR: {e}")
        failed.append(item)

# Step 6: Re-enable triggers
print("\n\nStep 6: Re-enabling triggers...")
print("  (Run this SQL manually in Supabase: ALTER TABLE results ENABLE TRIGGER USER;)")

# Step 7: Summary
print("\n" + "=" * 100)
print("SUMMARY")
print("=" * 100)
print(f"\nSuccessfully imported: {len(imported)} results")
print(f"Flagged as duplicate times: {len(flagged_duplicates)}")
print(f"Failed: {len(failed)}")

if flagged_duplicates:
    print("\n! DUPLICATE TIMES FLAGGED:")
    for name in flagged_duplicates:
        print(f"  - {name}")

if failed:
    print("\n✗ FAILED:")
    for item in failed:
        print(f"  - {item.get('athlete_name', 'Unknown')}")

# Step 8: Verify count
print("\n" + "=" * 100)
print("VERIFICATION")
print("=" * 100)

result_count = supabase.table('results')\
    .select('id', count='exact')\
    .eq('meet_id', MEET_ID)\
    .execute()

print(f"\nMeet 254378 now has {result_count.count} results")
print(f"Expected: 4655 (from CSV)")
print(f"Difference: {4655 - result_count.count}")

print("\n" + "=" * 100)
print("NEXT STEPS")
print("=" * 100)
print("""
1. Manually re-enable triggers in Supabase:
   ALTER TABLE results ENABLE TRIGGER USER;

2. Update cached result count:
   UPDATE meets SET result_count = (
       SELECT COUNT(*) FROM results WHERE meet_id = '3f6daf82-5a37-419f-802d-f648bb97d6ff'
   ) WHERE id = '3f6daf82-5a37-419f-802d-f648bb97d6ff';

3. Rebuild derived tables (athlete_best_times, etc.)

4. Review potential_duplicates and potential_duplicate_athletes tables
""")

print("\nImport complete!")
