#!/usr/bin/env python3
"""
Check meets with proper pagination to get all results.
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

    # Get exact count first
    count_result = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
    total_count = count_result.count

    print(f"\n✓ Database: {total_count} results (total)")

    # Fetch all results with pagination
    all_db_times = []
    page_size = 1000
    offset = 0

    while offset < total_count:
        page_results = supabase.table('results').select('time_cs').eq('meet_id', meet_id).range(offset, offset + page_size - 1).execute()
        all_db_times.extend([r['time_cs'] for r in page_results.data])
        offset += page_size
        if offset < total_count:
            print(f"  Fetched {offset}/{total_count} results...", end='\r')

    if total_count > 1000:
        print(f"  Fetched all {len(all_db_times)} results    ")

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
    db_times_set = set(all_db_times)
    csv_times_set = set(csv_times)

    missing_times = csv_times_set - db_times_set
    extra_times = db_times_set - csv_times_set

    print(f"\n📊 Comparison:")
    print(f"  CSV: {len(csv_times)} results")
    print(f"  Database: {len(all_db_times)} results")
    print(f"  Missing from DB: {len(missing_times)} results")
    print(f"  Extra in DB: {len(extra_times)} results")

    if missing_times:
        print(f"\n🔍 Missing times (first 10):")
        for i, time_cs in enumerate(sorted(missing_times)[:10]):
            matching_rows = [r for r in csv_rows if int(r['time_cs']) == time_cs]
            if matching_rows:
                row = matching_rows[0]
                print(f"  {i+1}. {time_cs} cs ({time_cs/100:.2f} sec) - {row.get('athlete_name', 'Unknown')}")
        if len(missing_times) > 10:
            print(f"  ... and {len(missing_times) - 10} more")

    if extra_times:
        print(f"\n⚠ Extra times in DB (not in CSV): {len(extra_times)}")

    if not missing_times and not extra_times:
        print(f"\n✅ Database and CSV match perfectly!")

print(f"\n{'='*80}")
print("SUMMARY")
print(f"{'='*80}")
