#!/usr/bin/env python3
"""
Compare CSV times to DB times for meet 254332 - Tristan Scott method.
"""

import os
import csv
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']

print(f"Meet 254332 (ID: {meet_id})")

# Get ALL DB times with pagination
print("Fetching all DB times...")
db_times = []
offset = 0
while True:
    page = supabase.table('results').select('time_cs').eq('meet_id', meet_id).range(offset, offset + 999).execute()
    if not page.data:
        break
    db_times.extend([r['time_cs'] for r in page.data])
    offset += 1000
    if len(page.data) < 1000:
        break

print(f"DB has {len(db_times)} times")

# Get CSV times
csv_file = 'to-be-processed/meet_254332_1761787149/results.csv'
csv_times = []
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_times.append(int(row['time_cs']))

print(f"CSV has {len(csv_times)} times")

# Compare sets
db_set = set(db_times)
csv_set = set(csv_times)

missing_times = csv_set - db_set
extra_times = db_set - csv_set

print(f"\nMissing from DB: {len(missing_times)} unique times")
print(f"Extra in DB: {len(extra_times)} unique times")

if missing_times:
    print(f"\n🔍 Missing times:")
    for time_cs in sorted(missing_times):
        # Find athlete with this time
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if int(row['time_cs']) == time_cs:
                    print(f"  {time_cs} cs ({time_cs/100:.2f} sec) - {row['athlete_name']} ({row['athlete_school_id']})")
                    break

if extra_times:
    print(f"\n⚠ Extra times in DB:")
    for time_cs in sorted(extra_times)[:5]:
        print(f"  {time_cs} cs ({time_cs/100:.2f} sec)")
