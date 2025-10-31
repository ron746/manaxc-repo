#!/usr/bin/env python3
"""
Final verification of meet 255929 count.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet
meet = supabase.table('meets').select('id, name, result_count').eq('athletic_net_id', '255929').execute()
if not meet.data:
    print("Meet not found")
    exit(1)

meet_id = meet.data[0]['id']
meet_name = meet.data[0]['name']
cached_count = meet.data[0].get('result_count')

print(f"Meet 255929: {meet_name}")
print(f"ID: {meet_id}")
print(f"Cached result_count: {cached_count}")

# Count actual results in DB
actual = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
actual_count = actual.count

print(f"\nActual results in DB: {actual_count}")
print(f"CSV should have: 1658 results (including 1 header = 1657 data rows)")

# Count CSV
csv_file = 'to-be-processed/meet_255929_1761716332/results.csv'
import csv as csv_module
with open(csv_file, 'r') as f:
    reader = csv_module.DictReader(f)
    csv_count = sum(1 for row in reader)

print(f"CSV data rows: {csv_count}")

if actual_count < csv_count:
    print(f"\n❌ Missing {csv_count - actual_count} results!")
    print(f"Running comparison to find missing times...")

    # Read CSV times
    csv_times = []
    with open(csv_file, 'r') as f:
        reader = csv_module.DictReader(f)
        for row in reader:
            csv_times.append(int(row['time_cs']))

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

    # Compare
    missing_times = sorted(set(csv_times) - set(db_times))

    print(f"\nMissing {len(missing_times)} unique times:")
    for time in missing_times[:10]:  # Show first 10
        print(f"  {time} cs ({time/100:.2f} sec)")

    if len(missing_times) > 10:
        print(f"  ... and {len(missing_times) - 10} more")
else:
    print(f"\n✓ All results present!")

# Update cached count if needed
if cached_count != actual_count:
    print(f"\nUpdating cached count from {cached_count} to {actual_count}...")
    result = supabase.table('meets').update({'result_count': actual_count}).eq('id', meet_id).execute()
    if result.data:
        print(f"✓ Updated")
