#!/usr/bin/env python3
"""
Compare meet 254378 CSV times to DB times (Tristan Scott method).
CSV: 4655 lines (1 header + 4654 data rows)
DB: 4651 results (missing 4 according to user, though might be 3)
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

# Get meet ID
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254378').execute()
meet_id = meet.data[0]['id']

print(f"Meet 254378 (Clovis Invitational) ID: {meet_id}")

# Read CSV times
csv_file = 'to-be-processed/meet_254378_1761786641/results.csv'
csv_times = []
csv_rows = {}  # time_cs -> full row for investigation
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        time_cs = int(row['time_cs'])
        csv_times.append(time_cs)
        if time_cs not in csv_rows:
            csv_rows[time_cs] = []
        csv_rows[time_cs].append(row)

print(f"\nCSV has {len(csv_times)} result times")

# Get DB times with pagination
print(f"Fetching DB times...")
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

print(f"DB has {len(db_times)} results")

# Compare sets
db_set = set(db_times)
csv_set = set(csv_times)

missing_times = sorted(csv_set - db_set)

if missing_times:
    print(f"\n❌ MISSING {len(missing_times)} unique times in DB:")
    for time in missing_times:
        print(f"\n  Time: {time} cs ({time/100:.2f} sec)")
        print(f"  Athletes with this time in CSV:")
        for row in csv_rows[time]:
            print(f"    - {row['athlete_first_name']} {row['athlete_last_name']} ({row['athlete_school_id']}) - Race {row['athletic_net_race_id']}")
else:
    print(f"\n✅ Perfect match! All {len(set(csv_times))} unique times are in DB")

# Also check for count discrepancy vs unique times
print(f"\n--- Count Analysis ---")
print(f"CSV total times: {len(csv_times)}")
print(f"CSV unique times: {len(csv_set)}")
print(f"DB total results: {len(db_times)}")
print(f"DB unique times: {len(db_set)}")
print(f"\nTotal missing: {len(csv_times) - len(db_times)} results")
print(f"Unique missing: {len(missing_times)} times")
