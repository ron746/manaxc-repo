#!/usr/bin/env python3
"""
Add the final 2 results: Mario Fernandez DuFur and Alexandra Himebauch
Both have time 113860 cs (tied time)
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

MEET_ID = '3f6daf82-5a37-419f-802d-f648bb97d6ff'

# Mario: race 1072461, Patrick Henry, Grade 11, Male
# Alexandra: race 1022024, Peninsula, Grade 12, Female

print("Adding final 2 results...")

# Get race for 1072461 (Mario - Mens JV Large)
race_mario = supabase.table('races')\
    .select('id')\
    .eq('meet_id', MEET_ID)\
    .eq('athletic_net_race_id', '1072461')\
    .execute()

# Get race for 1022024 (Alexandra - probably Womens race)
race_alex = supabase.table('races')\
    .select('id, name')\
    .eq('meet_id', MEET_ID)\
    .eq('athletic_net_race_id', '1022024')\
    .execute()

# Get Mario's athlete ID
mario = supabase.table('athletes')\
    .select('id, name')\
    .eq('name', 'Mario Nico Fernandez Dufur')\
    .execute()

# Get Alexandra's athlete ID
alex = supabase.table('athletes')\
    .select('id, name')\
    .ilike('name', '%alexandra%himebauch%')\
    .execute()

print("\nMario Fernandez DuFur:")
if mario.data:
    print(f"  Athlete: {mario.data[0]['name']} ({mario.data[0]['id']})")
    print(f"  Race: {race_mario.data[0]['id'] if race_mario.data else 'NOT FOUND'}")

    if race_mario.data:
        result = supabase.table('results').insert({
            'meet_id': MEET_ID,
            'race_id': race_mario.data[0]['id'],
            'athlete_id': mario.data[0]['id'],
            'time_cs': 113860,
            'place_overall': 63,
            'data_source': 'athletic_net'
        }).execute()
        print(f"  ✓ Added result: {result.data[0]['id']}")
else:
    print("  ERROR: Athlete not found")

print("\nAlexandra Himebauch:")
if alex.data:
    print(f"  Athlete: {alex.data[0]['name']} ({alex.data[0]['id']})")
    print(f"  Race: {race_alex.data[0]['name'] if race_alex.data else 'NOT FOUND'} ({race_alex.data[0]['id'] if race_alex.data else 'N/A'})")

    if race_alex.data:
        result = supabase.table('results').insert({
            'meet_id': MEET_ID,
            'race_id': race_alex.data[0]['id'],
            'athlete_id': alex.data[0]['id'],
            'time_cs': 113860,
            'place_overall': 11,
            'data_source': 'athletic_net'
        }).execute()
        print(f"  ✓ Added result: {result.data[0]['id']}")
else:
    print("  ERROR: Athlete not found")

# Verify final count
result_count = supabase.table('results')\
    .select('id', count='exact')\
    .eq('meet_id', MEET_ID)\
    .execute()

print(f"\n{'='*80}")
print(f"FINAL COUNT: {result_count.count}/4655 results")
print(f"{'='*80}")

if result_count.count == 4655:
    print("\n✓✓✓ MEET 254378 COMPLETE! ✓✓✓")
else:
    print(f"\n⚠️  Still missing {4655 - result_count.count} results")
