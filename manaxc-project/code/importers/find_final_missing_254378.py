#!/usr/bin/env python3
"""
Find the final missing result by comparing CSV vs DB by athlete name
"""

import os
import csv
from collections import defaultdict
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

MEET_ID = '3f6daf82-5a37-419f-802d-f648bb97d6ff'

print("=" * 100)
print("FINDING FINAL MISSING RESULT - DETAILED COMPARISON")
print("=" * 100)

# Step 1: Load all CSV results
print("\nStep 1: Loading CSV results...")
csv_results = []
with open('to-be-processed/meet_254378_1761786641/results.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_results.append({
            'athlete_name': row['athlete_name'],
            'race_id': row['athletic_net_race_id'],
            'time_cs': int(row['time_cs']),
            'place': row.get('place_overall', 'N/A')
        })

print(f"  CSV has {len(csv_results)} results")

# Step 2: Get race mapping
print("\nStep 2: Loading race mapping...")
races = supabase.table('races')\
    .select('id, athletic_net_race_id, name')\
    .eq('meet_id', MEET_ID)\
    .execute()

race_map = {r['athletic_net_race_id']: r for r in races.data if r['athletic_net_race_id']}
race_map_reverse = {r['id']: r for r in races.data}
print(f"  Found {len(race_map)} races")

# Step 3: Load all DB results with athlete names
print("\nStep 3: Loading database results with athlete info...")
db_results = []
offset = 0
batch_size = 1000

while True:
    batch = supabase.table('results')\
        .select('id, athlete_id, race_id, time_cs, athletes(name)')\
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

# Step 4: Build DB set by (athlete_name, race_athletic_net_id, time_cs)
print("\nStep 4: Building comparison sets...")
db_set = set()
for result in db_results:
    race_info = race_map_reverse.get(result['race_id'])
    if race_info and result['athletes']:
        athlete_name = result['athletes']['name']
        race_athletic_net_id = race_info['athletic_net_race_id']
        time_cs = result['time_cs']
        db_set.add((athlete_name, race_athletic_net_id, time_cs))

print(f"  Database set has {len(db_set)} unique (athlete, race, time) tuples")

# Step 5: Find missing
print("\nStep 5: Finding missing results...")
missing = []
for csv_result in csv_results:
    key = (csv_result['athlete_name'], csv_result['race_id'], csv_result['time_cs'])
    if key not in db_set:
        missing.append(csv_result)

print(f"\n{'=' * 100}")
print(f"FOUND {len(missing)} MISSING RESULTS")
print(f"{'=' * 100}\n")

for item in missing:
    race_info = race_map.get(item['race_id'])
    race_name = race_info['name'] if race_info else 'Unknown'
    print(f"  Name: {item['athlete_name']:40s}")
    print(f"  Time: {item['time_cs']:6d} cs")
    print(f"  Place: {item['place']:4s}")
    print(f"  Race: {race_name}")
    print(f"  Race ID: {item['race_id']}")
    print()
