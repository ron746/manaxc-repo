#!/usr/bin/env python3
"""
Check if Tristan Scott's result exists in meet 267582 with a different time.
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

# Get meet ID
meet = supabase.table('meets').select('id, name').eq('athletic_net_id', '267582').execute()
meet_id = meet.data[0]['id']
meet_name = meet.data[0]['name']

print(f"Meet: {meet_name} (ID: {meet_id})")

# Get school ID
school = supabase.table('schools').select('id, name').eq('athletic_net_id', 'school_westmont').execute()
school_id = school.data[0]['id']
school_name = school.data[0]['name']

print(f"School: {school_name} (ID: {school_id})")

# Get athlete
athlete = supabase.table('athletes').select('id, name').eq('name', 'Tristan Scott').eq('school_id', school_id).execute()

if not athlete.data:
    print(f"\n✗ Tristan Scott not found in database")
    print(f"  Need to create athlete first")
    exit(1)

athlete_id = athlete.data[0]['id']
athlete_name = athlete.data[0]['name']

print(f"Athlete: {athlete_name} (ID: {athlete_id})")

# Get race (race_id 1063223 from CSV)
race = supabase.table('races').select('id, name, athletic_net_id, athletic_net_race_id').eq('meet_id', meet_id).execute()

print(f"\nRaces in meet 267582:")
race_id = None
for r in race.data:
    print(f"  {r['name']}: athletic_net_id={r.get('athletic_net_id')}, athletic_net_race_id={r.get('athletic_net_race_id')}")
    if r.get('athletic_net_id') == '1063223' or r.get('athletic_net_race_id') == '1063223':
        race_id = r['id']
        race_name = r['name']

if not race_id:
    print(f"\n✗ Race 1063223 not found")
    print(f"  Need to fix race athletic_net_id first")
    exit(1)

print(f"\n✓ Found race: {race_name} (ID: {race_id})")

# Check if result exists for this athlete in this meet
results = supabase.table('results').select('id, time_cs, race_id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).execute()

print(f"\nExisting results for {athlete_name} in {meet_name}:")
if results.data:
    for r in results.data:
        print(f"  Time: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
        print(f"  Race ID: {r['race_id']}")
        print(f"  Result ID: {r['id']}")

        # Check if this is the same race
        if r['race_id'] == race_id:
            print(f"  ⚠ SAME RACE - this is a duplicate time situation!")
            print(f"\n  Existing time: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
            print(f"  CSV time: 129810 cs (1298.10 sec)")
            print(f"  Difference: {abs(129810 - r['time_cs'])} cs ({abs(129810 - r['time_cs'])/100:.2f} sec)")
        else:
            print(f"  ✓ Different race")
else:
    print(f"  No existing results - this is a simple missing result")
    print(f"\n  Need to insert:")
    print(f"    Athlete: {athlete_name}")
    print(f"    Meet: {meet_name}")
    print(f"    Race: {race_name}")
    print(f"    Time: 129810 cs (21:38.10)")
