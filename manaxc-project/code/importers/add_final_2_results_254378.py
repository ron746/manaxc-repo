#!/usr/bin/env python3
"""
Add the final 2 missing results for meet 254378:
1. Mario Fernandez DuFur (need to find correct athlete or create)
2. One more mystery result (need to find what's still missing)
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

MEET_ID = '3f6daf82-5a37-419f-802d-f648bb97d6ff'

print("=" * 80)
print("FINDING FINAL 2 MISSING RESULTS")
print("=" * 80)

# Step 1: Find Mario Fernandez DuFur
print("\nStep 1: Looking for Mario Fernandez DuFur...")
mario_search = supabase.table('athletes')\
    .select('id, name, school_id')\
    .ilike('name', '%mario%fernandez%')\
    .execute()

if mario_search.data:
    print(f"  Found {len(mario_search.data)} athletes with 'Mario Fernandez' in name:")
    for athlete in mario_search.data:
        print(f"    - {athlete['name']} ({athlete['id']})")
else:
    print("  No athletes found - need to create Mario Fernandez DuFur")

# Check Patrick Henry school
patrick_henry = supabase.table('schools')\
    .select('id, name')\
    .ilike('name', '%patrick%henry%')\
    .execute()

if patrick_henry.data:
    print(f"\n  Patrick Henry School: {patrick_henry.data[0]['name']} ({patrick_henry.data[0]['id']})")

# Step 2: Compare all CSV times vs all DB times to find the 2nd missing result
print("\n\nStep 2: Finding what's still missing...")
print("  Fetching all results from database...")

db_results = []
offset = 0
batch_size = 1000

while True:
    batch = supabase.table('results')\
        .select('time_cs, race_id')\
        .eq('meet_id', MEET_ID)\
        .range(offset, offset + batch_size - 1)\
        .execute()

    if not batch.data:
        break

    db_results.extend(batch.data)
    offset += batch_size

    if len(batch.data) < batch_size:
        break

print(f"  Database has {len(db_results)} results")

# Get race mapping
races = supabase.table('races')\
    .select('id, athletic_net_race_id, name')\
    .eq('meet_id', MEET_ID)\
    .execute()

race_map_reverse = {r['id']: r for r in races.data}

# Build DB time set by race
from collections import defaultdict
db_times_by_race = defaultdict(list)
for result in db_results:
    race_info = race_map_reverse.get(result['race_id'])
    if race_info:
        db_times_by_race[race_info['athletic_net_race_id']].append(result['time_cs'])

# Load CSV and compare
import csv
csv_times_by_race = defaultdict(list)
with open('to-be-processed/meet_254378_1761786641/results.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_times_by_race[row['athletic_net_race_id']].append({
            'time_cs': int(row['time_cs']),
            'athlete_name': row['athlete_name'],
            'race_id': row['athletic_net_race_id']
        })

print("\n  Comparing CSV vs DB by race...")
missing = []
for race_id, csv_times in csv_times_by_race.items():
    db_times = set(db_times_by_race.get(race_id, []))
    for item in csv_times:
        if item['time_cs'] not in db_times:
            missing.append(item)

print(f"\n  Found {len(missing)} missing results:")
for item in missing:
    race_info = next((r for r in races.data if r['athletic_net_race_id'] == item['race_id']), None)
    race_name = race_info['name'] if race_info else 'Unknown'
    print(f"    - {item['athlete_name']:30s} | Time: {item['time_cs']:6d} cs | Race: {race_name}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"""
Current status: 4653/4655 results (2 missing)

Missing results identified:
{len(missing)} total

Next steps:
1. Manually add Mario Fernandez DuFur if needed
2. Add the other missing result(s)
3. Update meet result count
4. Re-enable triggers
5. Rebuild derived tables
""")
