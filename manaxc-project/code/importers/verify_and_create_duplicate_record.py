#!/usr/bin/env python3
"""
Verify both Ariel Hung results exist and create the potential duplicate record.
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

race = supabase.table('races').select('id').eq('athletic_net_id', '1077801').execute()
race_id = race.data[0]['id']

school = supabase.table('schools').select('id').eq('athletic_net_id', 'school_westmont').execute()
school_id = school.data[0]['id']

athlete = supabase.table('athletes').select('id, name').eq('name', 'Ariel Hung').eq('school_id', school_id).execute()
athlete_id = athlete.data[0]['id']
athlete_name = athlete.data[0]['name']

print(f"✓ Athlete: {athlete_name} (ID: {athlete_id})")

# Get all results for this athlete in this race
print("\nChecking results...")
results = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).order('time_cs').execute()

print(f"✓ Found {len(results.data)} results:")
for i, r in enumerate(results.data, 1):
    print(f"  Result {i}: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec) - ID: {r['id']}")

if len(results.data) < 2:
    print(f"\n✗ Need at least 2 results to create a duplicate record")
    exit(1)

result_1 = results.data[0]  # First time (should be 158420)
result_2 = results.data[1]  # Second time (should be 207460)

# Check if potential duplicate already exists
print("\nChecking for existing potential duplicate record...")
existing_dup = supabase.table('potential_duplicates').select('*').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()

if existing_dup.data:
    print(f"✓ Potential duplicate already exists:")
    dup = existing_dup.data[0]
    print(f"  ID: {dup['id']}")
    print(f"  Time 1: {dup['time_1_cs']} cs ({dup['time_1_cs']/100:.2f} sec)")
    print(f"  Time 2: {dup['time_2_cs']} cs ({dup['time_2_cs']/100:.2f} sec)")
    print(f"  Difference: {dup['time_difference_cs']} cs ({dup['time_difference_cs']/100:.2f} sec)")
    print(f"  Status: {dup['status']}")
    print(f"\n✓ Everything is already set up correctly!")
    exit(0)

# Create the potential duplicate record
print("\n🚩 Creating potential duplicate record...")
duplicate_data = {
    'result_id_1': result_1['id'],
    'result_id_2': result_2['id'],
    'athlete_id': athlete_id,
    'meet_id': meet_id,
    'race_id': race_id,
    'conflict_type': 'different_times_same_athlete_race',
    'time_1_cs': result_1['time_cs'],
    'time_2_cs': result_2['time_cs'],
    'time_difference_cs': abs(result_2['time_cs'] - result_1['time_cs']),
    'status': 'pending'
}

try:
    dup_result = supabase.table('potential_duplicates').insert(duplicate_data).execute()
    if dup_result.data:
        print(f"✓ Potential duplicate created successfully!")
        print(f"  Duplicate ID: {dup_result.data[0]['id']}")
        print(f"\n📊 Summary:")
        print(f"  Athlete: {athlete_name}")
        print(f"  Meet: 270614")
        print(f"  Race: 1077801")
        print(f"  Time 1: {result_1['time_cs']} cs ({result_1['time_cs']/100:.2f} sec)")
        print(f"  Time 2: {result_2['time_cs']} cs ({result_2['time_cs']/100:.2f} sec)")
        print(f"  Difference: {abs(result_2['time_cs'] - result_1['time_cs'])} cs ({abs(result_2['time_cs'] - result_1['time_cs'])/100:.2f} sec)")
        print(f"\n✓ Flagged for admin review!")
    else:
        print(f"✗ Failed to create duplicate record")
except Exception as e:
    print(f"✗ Error: {e}")
