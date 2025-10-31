#!/usr/bin/env python3
"""Find missing results for meet 270614 by comparing CSV to database."""

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

# Get meet ID
meet_response = supabase.table('meets').select('id').eq('athletic_net_id', '270614').execute()
if not meet_response.data:
    print("Meet 270614 not found!")
    exit(1)

meet_id = meet_response.data[0]['id']
print(f"Meet ID: {meet_id}")

# Get all times from database for this meet
db_results = supabase.table('results').select('time_cs, athlete_id').eq('meet_id', meet_id).execute()
db_times = set(r['time_cs'] for r in db_results.data)
print(f"\nDatabase has {len(db_times)} unique times for meet 270614")

# Read CSV file for meet 270614
csv_file = 'to-be-processed/meet_270614_1761800484/results.csv'
if not os.path.exists(csv_file):
    print(f"CSV file not found: {csv_file}")
    exit(1)

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

csv_times_set = set(csv_times)
print(f"CSV has {len(csv_times)} total results for meet 270614")
print(f"CSV has {len(csv_times_set)} unique times for meet 270614")

# Find missing times
missing_times = csv_times_set - db_times
print(f"\n{len(missing_times)} times in CSV but not in database:")

for time_cs in sorted(missing_times):
    print(f"\n  Time: {time_cs} ({time_cs/100:.2f} seconds)")
    for row in csv_rows_by_time[time_cs]:
        print(f"    Athlete: {row['athlete_name']}")
        print(f"    School ID: {row['athlete_school_id']}")
        print(f"    Grade: {row['grade']}")
        print(f"    Race ID: {row['athletic_net_race_id']}")
        print()

# Also check for extra times in database
extra_times = db_times - csv_times_set
if extra_times:
    print(f"\n{len(extra_times)} times in database but not in CSV:")
    for time_cs in sorted(extra_times):
        print(f"  Time: {time_cs} ({time_cs/100:.2f} seconds)")
