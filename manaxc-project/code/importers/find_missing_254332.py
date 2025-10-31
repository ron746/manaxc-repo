#!/usr/bin/env python3
"""
Find the 1 missing result in meet 254332.
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

print("Checking meet 254332 (22nd Golden Eagle Invitational)")

# Get meet
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']

print(f"Meet ID: {meet_id}")

# Get all results from DB
print("Getting DB results...")
all_results = []
offset = 0
while True:
    page = supabase.table('results').select('athlete_id, race_id, time_cs').eq('meet_id', meet_id).range(offset, offset + 999).execute()
    if not page.data:
        break
    all_results.extend(page.data)
    offset += 1000
    if len(page.data) < 1000:
        break

print(f"DB has {len(all_results)} results")

# Create lookup set
db_set = set()
db_athlete_race = {}
for r in all_results:
    db_set.add((r['athlete_id'], r['race_id'], r['time_cs']))
    key = (r['athlete_id'], r['race_id'])
    if key not in db_athlete_race:
        db_athlete_race[key] = []
    db_athlete_race[key].append(r['time_cs'])

# Read CSV
csv_file = 'to-be-processed/meet_254332_1761787149/results.csv'
print(f"\nReading CSV: {csv_file}")

# Cache
school_cache = {}
athlete_cache = {}
race_cache = {}

with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader, 1):
        athlete_name = row['athlete_name']
        school_an_id = row['athlete_school_id']
        race_an_id = row['athletic_net_race_id']
        time_cs = int(row['time_cs'])

        # Get school
        if school_an_id not in school_cache:
            school = supabase.table('schools').select('id, name').eq('athletic_net_id', school_an_id).limit(1).execute()
            if school.data:
                school_cache[school_an_id] = {'id': school.data[0]['id'], 'name': school.data[0]['name']}
            else:
                school_cache[school_an_id] = None

        if not school_cache[school_an_id]:
            continue

        school_id = school_cache[school_an_id]['id']
        school_name = school_cache[school_an_id]['name']

        # Get athlete
        athlete_key = (athlete_name, school_id)
        if athlete_key not in athlete_cache:
            athlete = supabase.table('athletes').select('id').eq('name', athlete_name).eq('school_id', school_id).limit(1).execute()
            athlete_cache[athlete_key] = athlete.data[0]['id'] if athlete.data else None

        if not athlete_cache[athlete_key]:
            continue

        athlete_id = athlete_cache[athlete_key]

        # Get race
        if race_an_id not in race_cache:
            race = supabase.table('races').select('id, name').eq('meet_id', meet_id).or_(f'athletic_net_id.eq.{race_an_id},athletic_net_race_id.eq.{race_an_id}').limit(1).execute()
            if race.data:
                race_cache[race_an_id] = {'id': race.data[0]['id'], 'name': race.data[0]['name']}
            else:
                race_cache[race_an_id] = None

        if not race_cache[race_an_id]:
            continue

        race_id = race_cache[race_an_id]['id']
        race_name = race_cache[race_an_id]['name']

        # Check if exists
        if (athlete_id, race_id, time_cs) not in db_set:
            # Check for duplicate time situation
            athlete_race_key = (athlete_id, race_id)
            existing_times = db_athlete_race.get(athlete_race_key, [])

            print(f"\n🔍 FOUND MISSING RESULT:")
            print(f"  Athlete: {athlete_name}")
            print(f"  School: {school_name}")
            print(f"  Race: {race_name}")
            print(f"  CSV time: {time_cs} cs ({time_cs/100:.2f} sec)")

            if existing_times:
                print(f"  ⚠ DUPLICATE TIME SITUATION")
                print(f"  Existing time(s) in DB: {existing_times} cs")
                for et in existing_times:
                    print(f"    - {et} cs ({et/100:.2f} sec)")
                    print(f"    - Difference: {abs(time_cs - et)} cs ({abs(time_cs - et)/100:.2f} sec)")
                print(f"\n  IDs:")
                print(f"    Athlete ID: {athlete_id}")
                print(f"    Meet ID: {meet_id}")
                print(f"    Race ID: {race_id}")
            else:
                print(f"  ✓ Simple missing result (no existing time)")
                print(f"\n  IDs:")
                print(f"    Athlete ID: {athlete_id}")
                print(f"    Meet ID: {meet_id}")
                print(f"    Race ID: {race_id}")

            # Found it, we're done
            break

print("\n✓ Done")
