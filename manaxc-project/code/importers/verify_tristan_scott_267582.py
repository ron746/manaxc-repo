#!/usr/bin/env python3
"""
Verify Tristan Scott's duplicate times were added correctly.
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
meet = supabase.table('meets').select('id, name').eq('athletic_net_id', '267582').execute()
meet_id = meet.data[0]['id']
meet_name = meet.data[0]['name']

school = supabase.table('schools').select('id').eq('athletic_net_id', 'school_westmont').execute()
school_id = school.data[0]['id']

athlete = supabase.table('athletes').select('id, name').eq('name', 'Tristan Scott').eq('school_id', school_id).execute()
athlete_id = athlete.data[0]['id']
athlete_name = athlete.data[0]['name']

race = supabase.table('races').select('id, name').eq('id', '13b7d0e1-29f3-4d8d-acf5-ef0df8b40cfb').execute()
race_name = race.data[0]['name']

print(f"✓ Athlete: {athlete_name}")
print(f"✓ Meet: {meet_name}")
print(f"✓ Race: {race_name}")

# Get results
results = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).order('time_cs').execute()

print(f"\n✓ Found {len(results.data)} results:")
for i, r in enumerate(results.data, 1):
    print(f"  Result {i}: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec) - ID: {r['id']}")

# Get potential duplicate record
dup = supabase.table('potential_duplicates').select('*').eq('athlete_id', athlete_id).eq('meet_id', meet_id).execute()

if dup.data:
    print(f"\n✓ Potential duplicate flagged:")
    d = dup.data[0]
    print(f"  ID: {d['id']}")
    print(f"  Time 1: {d['time_1_cs']} cs ({d['time_1_cs']/100:.2f} sec)")
    print(f"  Time 2: {d['time_2_cs']} cs ({d['time_2_cs']/100:.2f} sec)")
    print(f"  Difference: {d['time_difference_cs']} cs ({d['time_difference_cs']/100:.2f} sec)")
    print(f"  Status: {d['status']}")
    print(f"\n✓ Everything set up correctly!")
else:
    print(f"\n✗ No potential duplicate record found")
