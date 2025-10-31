#!/usr/bin/env python3
"""
Find the 6 missing results across meets 254332, 255929, and 254378.
Strategy: Compare CSV athlete+race combinations with DB to find missing ones.
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

def find_missing_for_meet(meet_an_id, expected_missing):
    print(f"\n{'='*80}")
    print(f"MEET {meet_an_id} - Looking for {expected_missing} missing result(s)")
    print(f"{'='*80}")

    # Get meet
    meet = supabase.table('meets').select('id, name').eq('athletic_net_id', meet_an_id).execute()
    if not meet.data:
        print(f"✗ Meet not found")
        return []

    meet_id = meet.data[0]['id']
    meet_name = meet.data[0]['name']
    print(f"Meet: {meet_name}")

    # Get all results from DB for this meet
    print(f"Fetching all DB results...")
    all_results = []
    offset = 0
    page_size = 1000

    while True:
        page = supabase.table('results').select('athlete_id, race_id, time_cs').eq('meet_id', meet_id).range(offset, offset + page_size - 1).execute()
        if not page.data:
            break
        all_results.extend(page.data)
        offset += page_size
        if len(page.data) < page_size:
            break

    print(f"✓ Loaded {len(all_results)} results from DB")

    # Create a set of (athlete_id, race_id, time_cs) tuples
    db_set = set((r['athlete_id'], r['race_id'], r['time_cs']) for r in all_results)

    # Also create athlete+race set for checking duplicates
    db_athlete_race = {}  # (athlete_id, race_id) -> [time_cs, ...]
    for r in all_results:
        key = (r['athlete_id'], r['race_id'])
        if key not in db_athlete_race:
            db_athlete_race[key] = []
        db_athlete_race[key].append(r['time_cs'])

    # Read CSV and find missing
    import glob
    csv_pattern = f'to-be-processed/meet_{meet_an_id}_*/results.csv'
    csv_files = glob.glob(csv_pattern)
    if not csv_files:
        print(f"✗ CSV not found")
        return []

    csv_file = csv_files[0]
    print(f"Reading CSV: {csv_file}")

    # Cache for athlete/school/race lookups
    school_cache = {}
    athlete_cache = {}
    race_cache = {}

    missing = []

    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            athlete_name = row['athlete_name']
            school_an_id = row['athlete_school_id']
            race_an_id = row['athletic_net_race_id']
            time_cs = int(row['time_cs'])

            # Get school
            if school_an_id not in school_cache:
                school = supabase.table('schools').select('id').eq('athletic_net_id', school_an_id).limit(1).execute()
                school_cache[school_an_id] = school.data[0]['id'] if school.data else None

            school_id = school_cache[school_an_id]
            if not school_id:
                continue

            # Get athlete
            athlete_key = (athlete_name, school_id)
            if athlete_key not in athlete_cache:
                athlete = supabase.table('athletes').select('id').eq('name', athlete_name).eq('school_id', school_id).limit(1).execute()
                athlete_cache[athlete_key] = athlete.data[0]['id'] if athlete.data else None

            athlete_id = athlete_cache[athlete_key]
            if not athlete_id:
                continue

            # Get race
            if race_an_id not in race_cache:
                race = supabase.table('races').select('id').eq('meet_id', meet_id).or_(f'athletic_net_id.eq.{race_an_id},athletic_net_race_id.eq.{race_an_id}').limit(1).execute()
                race_cache[race_an_id] = race.data[0]['id'] if race.data else None

            race_id = race_cache[race_an_id]
            if not race_id:
                continue

            # Check if this exact result exists
            if (athlete_id, race_id, time_cs) not in db_set:
                # Check if athlete has a DIFFERENT time in this race
                athlete_race_key = (athlete_id, race_id)
                existing_times = db_athlete_race.get(athlete_race_key, [])

                if existing_times:
                    # DUPLICATE TIME SITUATION
                    missing.append({
                        'athlete_name': athlete_name,
                        'athlete_id': athlete_id,
                        'race_id': race_id,
                        'race_an_id': race_an_id,
                        'csv_time': time_cs,
                        'existing_times': existing_times,
                        'type': 'duplicate_time'
                    })
                else:
                    # Simple missing result
                    missing.append({
                        'athlete_name': athlete_name,
                        'athlete_id': athlete_id,
                        'race_id': race_id,
                        'race_an_id': race_an_id,
                        'csv_time': time_cs,
                        'existing_times': [],
                        'type': 'simple_missing'
                    })

                if len(missing) >= expected_missing:
                    break

    print(f"\n✓ Found {len(missing)} missing result(s):")
    for i, m in enumerate(missing, 1):
        if m['type'] == 'duplicate_time':
            print(f"\n{i}. {m['athlete_name']} - DUPLICATE TIME")
            print(f"   CSV time: {m['csv_time']} cs ({m['csv_time']/100:.2f} sec)")
            print(f"   Existing time(s): {m['existing_times']} cs ({[t/100 for t in m['existing_times']]})")
            print(f"   Difference: {abs(m['csv_time'] - m['existing_times'][0])} cs")
            print(f"   Athlete ID: {m['athlete_id']}")
            print(f"   Race ID: {m['race_id']}")
        else:
            print(f"\n{i}. {m['athlete_name']} - Simple missing")
            print(f"   Time: {m['csv_time']} cs ({m['csv_time']/100:.2f} sec)")

    return missing


# Find missing results for each meet
missing_254332 = find_missing_for_meet('254332', 1)
missing_255929 = find_missing_for_meet('255929', 1)
missing_254378 = find_missing_for_meet('254378', 4)

print(f"\n{'='*80}")
print(f"SUMMARY")
print(f"{'='*80}")
print(f"Meet 254332: {len(missing_254332)} missing")
print(f"Meet 255929: {len(missing_255929)} missing")
print(f"Meet 254378: {len(missing_254378)} missing")
print(f"Total: {len(missing_254332) + len(missing_255929) + len(missing_254378)} missing")
