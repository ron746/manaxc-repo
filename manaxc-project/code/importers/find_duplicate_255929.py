#!/usr/bin/env python3
"""
Find which time appears twice in CSV for meet 255929 but only once in DB.
"""

import os
import csv
from collections import Counter
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

# Read CSV and count time occurrences
csv_file = 'to-be-processed/meet_255929_1761716332/results.csv'
csv_times = []
csv_rows_by_time = {}

with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        time_cs = int(row['time_cs'])
        csv_times.append(time_cs)
        if time_cs not in csv_rows_by_time:
            csv_rows_by_time[time_cs] = []
        csv_rows_by_time[time_cs].append(row)

# Count CSV time occurrences
csv_time_counts = Counter(csv_times)

# Get DB times
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

# Count DB time occurrences
db_time_counts = Counter(db_times)

print(f"CSV total rows: {len(csv_times)}")
print(f"DB total results: {len(db_times)}")
print(f"\nLooking for times where CSV count > DB count...\n")

# Find times with different counts
for time_cs in sorted(set(list(csv_time_counts.keys()) + list(db_time_counts.keys()))):
    csv_count = csv_time_counts.get(time_cs, 0)
    db_count = db_time_counts.get(time_cs, 0)

    if csv_count != db_count:
        print(f"Time: {time_cs} cs ({time_cs/100:.2f} sec)")
        print(f"  CSV: {csv_count} occurrences")
        print(f"  DB: {db_count} occurrences")
        if csv_count > db_count:
            print(f"  Missing in DB: {csv_count - db_count}")
        else:
            print(f"  Extra in DB: {db_count - csv_count}")

        if time_cs in csv_rows_by_time:
            print(f"\n  Athletes with this time in CSV:")
            for row in csv_rows_by_time[time_cs]:
                print(f"    - {row['athlete_first_name']} {row['athlete_last_name']} ({row['athlete_school_id']}) - Race {row['athletic_net_race_id']}, Grade {row['grade']}")
        print()
