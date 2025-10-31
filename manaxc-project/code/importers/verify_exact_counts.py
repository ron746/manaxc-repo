#!/usr/bin/env python3
"""
Get exact counts from database using SQL queries to avoid pagination issues.
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

print("\n" + "="*80)
print("EXACT COUNT VERIFICATION")
print("="*80)

for meet_an_id in meet_ids:
    print(f"\nMeet {meet_an_id}:")

    # Get meet
    meet_response = supabase.table('meets').select('id, name').eq('athletic_net_id', meet_an_id).execute()
    if not meet_response.data:
        print(f"  ✗ Not found in database")
        continue

    meet_id = meet_response.data[0]['id']
    meet_name = meet_response.data[0]['name']

    print(f"  Name: {meet_name}")

    # Get exact count from database using count='exact'
    db_count_result = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
    db_count = db_count_result.count

    print(f"  Database count (exact): {db_count}")

    # Get CSV count
    csv_pattern = f'to-be-processed/meet_{meet_an_id}_*/results.csv'
    csv_files = glob.glob(csv_pattern)

    if not csv_files:
        csv_pattern = f'processed/*/meet_{meet_an_id}_*/results.csv'
        csv_files = glob.glob(csv_pattern)

    if csv_files:
        csv_file = csv_files[0]
        with open(csv_file, 'r') as f:
            csv_count = sum(1 for line in f) - 1  # Subtract header

        print(f"  CSV count: {csv_count}")
        print(f"  Difference: {csv_count - db_count} (CSV - DB)")

        if csv_count == db_count:
            print(f"  ✅ MATCH")
        else:
            print(f"  ⚠ MISMATCH - missing {csv_count - db_count} results")
    else:
        print(f"  ✗ CSV not found")

print("\n" + "="*80)
