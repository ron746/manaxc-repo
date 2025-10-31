#!/usr/bin/env python3
"""
Compare meet 255929 CSV times to DB times (Tristan Scott method).
CSV: 1658 lines (1 header + 1657 data rows)
DB: 1657 results expected
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
meet = supabase.table('meets').select('id').eq('athletic_net_id', '255929').execute()
meet_id = meet.data[0]['id']

print(f"Meet 255929 ID: {meet_id}")

# Read CSV times
csv_file = 'to-be-processed/meet_255929_1761716332/results.csv'
csv_times = []
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_times.append(int(row['time_cs']))

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

missing_times = csv_set - db_set

if missing_times:
    print(f"\n❌ MISSING {len(missing_times)} times in DB:")
    for time in sorted(missing_times):
        print(f"  {time} cs ({time/100:.2f} sec)")
else:
    print(f"\n✅ Perfect match! All {len(csv_times)} results are in DB")
