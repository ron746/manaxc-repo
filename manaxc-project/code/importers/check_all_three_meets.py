#!/usr/bin/env python3
"""
Check meets 254332, 255929, and 254378 for missing results.
"""

import os
import csv
import glob
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

meet_ids = ['254332', '255929', '254378']

for meet_an_id in meet_ids:
    print(f"\n{'='*80}")
    print(f"MEET {meet_an_id}")
    print(f"{'='*80}")

    # Get meet from database
    meet_response = supabase.table('meets').select('id, name, meet_date').eq('athletic_net_id', meet_an_id).execute()
    if not meet_response.data:
        print(f"✗ Meet {meet_an_id} not found in database!")
        continue

    meet_id = meet_response.data[0]['id']
    meet_name = meet_response.data[0]['name']
    meet_date = meet_response.data[0]['meet_date']

    print(f"✓ Meet: {meet_name}")
    print(f"  Date: {meet_date}")
    print(f"  ID: {meet_id}")

    # Get database results count
    db_results = supabase.table('results').select('time_cs').eq('meet_id', meet_id).execute()
    db_times = [r['time_cs'] for r in db_results.data]
    print(f"\n✓ Database: {len(db_times)} results")

    # Find CSV file
    csv_pattern = f'to-be-processed/meet_{meet_an_id}_*/results.csv'
    csv_files = glob.glob(csv_pattern)

    if not csv_files:
        csv_pattern = f'processed/*/meet_{meet_an_id}_*/results.csv'
        csv_files = glob.glob(csv_pattern)

    if not csv_files:
        print(f"✗ Could not find results.csv for meet {meet_an_id}")
        continue

    csv_file = csv_files[0]
    print(f"✓ Found CSV: {csv_file}")

    # Read CSV
    csv_times = []
    csv_rows = []
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            time_cs = int(row['time_cs'])
            csv_times.append(time_cs)
            csv_rows.append(row)

    print(f"✓ CSV: {len(csv_times)} results")

    # Compare
    db_times_set = set(db_times)
    csv_times_set = set(csv_times)

    missing_times = csv_times_set - db_times_set
    extra_times = db_times_set - csv_times_set

    print(f"\n📊 Comparison:")
    print(f"  Missing from DB: {len(missing_times)} results")
    print(f"  Extra in DB: {len(extra_times)} results")

    if missing_times:
        print(f"\n🔍 Missing times:")
        for time_cs in sorted(missing_times)[:5]:  # Show first 5
            matching_rows = [r for r in csv_rows if int(r['time_cs']) == time_cs]
            if matching_rows:
                row = matching_rows[0]
                print(f"  • {time_cs} cs ({time_cs/100:.2f} sec) - {row.get('athlete_name', 'Unknown')}")
        if len(missing_times) > 5:
            print(f"  ... and {len(missing_times) - 5} more")

    if extra_times:
        print(f"\n⚠ Extra times in DB (not in CSV): {len(extra_times)}")
        for time_cs in sorted(extra_times)[:3]:  # Show first 3
            print(f"  • {time_cs} cs ({time_cs/100:.2f} sec)")
        if len(extra_times) > 3:
            print(f"  ... and {len(extra_times) - 3} more")

    if not missing_times and not extra_times:
        print(f"\n✅ Database and CSV match perfectly!")

print(f"\n{'='*80}")
print("SUMMARY")
print(f"{'='*80}")
