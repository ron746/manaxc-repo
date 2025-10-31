#!/usr/bin/env python3
"""
Add Ariel Hung's second time (34:34.60) and flag as potential duplicate.
This implements the new duplicate-allowing system.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get IDs
print("Looking up IDs...")
meet = supabase.table('meets').select('id').eq('athletic_net_id', '270614').execute()
meet_id = meet.data[0]['id']
print(f"✓ Meet ID: {meet_id}")

race = supabase.table('races').select('id').eq('athletic_net_id', '1077801').execute()
race_id = race.data[0]['id']
print(f"✓ Race ID: {race_id}")

school = supabase.table('schools').select('id').eq('athletic_net_id', 'school_westmont').execute()
school_id = school.data[0]['id']
print(f"✓ School ID: {school_id}")

athlete = supabase.table('athletes').select('id').eq('name', 'Ariel Hung').eq('school_id', school_id).execute()
athlete_id = athlete.data[0]['id']
print(f"✓ Athlete ID: {athlete_id}")

# Get existing results for this athlete in this race
print("\nChecking for existing results...")
existing = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()

if len(existing.data) == 0:
    print("✗ No existing result found - this script expects one to already exist")
    exit(1)

existing_result = existing.data[0]
existing_result_id = existing_result['id']
existing_time = existing_result['time_cs']

new_time = 207460  # 34:34.60 from CSV

print(f"✓ Found existing result:")
print(f"  Time: {existing_time} cs ({existing_time/100:.2f} sec)")
print(f"  Result ID: {existing_result_id}")
print(f"\n  New time from CSV: {new_time} cs ({new_time/100:.2f} sec)")
print(f"  Difference: {abs(new_time - existing_time)} cs ({abs(new_time - existing_time)/100:.2f} sec)")

# Check if the new time is the same as existing
if existing_time == new_time:
    print(f"\n⚠ Times are identical - this is a true duplicate, not adding")
    exit(0)

# Check if we already have both results
both_results = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()
if len(both_results.data) >= 2:
    print(f"\n⚠ Already have {len(both_results.data)} results for this athlete in this race")
    for i, r in enumerate(both_results.data, 1):
        print(f"  Result {i}: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
    print("\nChecking if potential duplicate already exists...")
    existing_dup = supabase.table('potential_duplicates').select('id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()
    if existing_dup.data:
        print(f"✓ Potential duplicate already flagged (ID: {existing_dup.data[0]['id']})")
    else:
        print("✗ No potential duplicate record found - may need to create one")
    exit(0)

# Insert the new result with the CSV time
new_result_data = {
    'meet_id': meet_id,
    'race_id': race_id,
    'athlete_id': athlete_id,
    'time_cs': new_time,
    'place_overall': None,
    'data_source': 'athletic_net'
}

print(f"\n📝 Inserting second result (CSV time: {new_time/100:.2f} sec)...")
try:
    new_result = supabase.table('results').insert(new_result_data).execute()
    if new_result.data:
        new_result_id = new_result.data[0]['id']
        print(f"✓ New result inserted: {new_result_id}")

        # Now create the potential duplicate record
        duplicate_data = {
            'result_id_1': existing_result_id,
            'result_id_2': new_result_id,
            'athlete_id': athlete_id,
            'meet_id': meet_id,
            'race_id': race_id,
            'conflict_type': 'different_times_same_athlete_race',
            'time_1_cs': existing_time,
            'time_2_cs': new_time,
            'time_difference_cs': abs(new_time - existing_time),
            'status': 'pending'
        }

        print(f"\n🚩 Creating potential duplicate record...")
        dup_result = supabase.table('potential_duplicates').insert(duplicate_data).execute()
        if dup_result.data:
            print(f"✓ Potential duplicate flagged for admin review")
            print(f"  Duplicate ID: {dup_result.data[0]['id']}")
            print(f"\n📊 Summary:")
            print(f"  Both times are now in the system:")
            print(f"    Result 1: {existing_time} cs ({existing_time/100:.2f} sec)")
            print(f"    Result 2: {new_time} cs ({new_time/100:.2f} sec)")
            print(f"    Difference: {abs(new_time - existing_time)} cs ({abs(new_time - existing_time)/100:.2f} sec)")
            print(f"\n✓ Admin can review in potential_duplicates table")
        else:
            print(f"✗ Failed to create duplicate record")
    else:
        print(f"✗ Failed to insert new result")
except Exception as e:
    if 'duplicate key value violates unique constraint' in str(e):
        print(f"\n⚠ Result already exists with this exact time")
        print(f"  This means the unique constraint is working correctly")
        print(f"  Both results should already be in the system")

        # Check if potential duplicate exists
        print(f"\nChecking for potential duplicate record...")
        existing_dup = supabase.table('potential_duplicates').select('id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()
        if existing_dup.data:
            print(f"✓ Potential duplicate already exists (ID: {existing_dup.data[0]['id']})")
        else:
            print(f"✗ No potential duplicate record found")
            print(f"  You may need to run the SQL file to properly set up the constraint")
    else:
        print(f"✗ Error: {e}")
