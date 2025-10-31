#!/usr/bin/env python3
"""
Find ALL missing results for meet 254378 by checking each CSV row against database.
Avoids Supabase pagination/fetch limits by checking existence row-by-row.
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

# Get meet
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254378').execute()
meet_id = meet.data[0]['id']

print(f"Checking meet 254378 (Clovis Invitational)")
print(f"Meet ID: {meet_id}\n")

csv_file = 'to-be-processed/meet_254378_1761786641/results.csv'

missing_results = []
checked = 0

with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        checked += 1
        if checked % 500 == 0:
            print(f"Checked {checked} rows...", end='\r')

        time_cs = int(row['time_cs'])

        # Check if this exact time exists in the database for this meet
        result = supabase.table('results').select('id').eq('meet_id', meet_id).eq('time_cs', time_cs).limit(1).execute()

        if not result.data:
            missing_results.append({
                'time_cs': time_cs,
                'athlete_name': row['athlete_name'],
                'race_id': row['athletic_net_race_id'],
                'school_id': row['athlete_school_id']
            })

print(f"Checked all {checked} rows        ")
print(f"\n📊 Found {len(missing_results)} missing results:\n")

for i, r in enumerate(missing_results[:20], 1):
    print(f"{i}. {r['athlete_name']}: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")

if len(missing_results) > 20:
    print(f"... and {len(missing_results) - 20} more")

print(f"\nTotal missing: {len(missing_results)}")
