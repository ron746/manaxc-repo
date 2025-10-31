#!/usr/bin/env python3
"""
Find which of the 5 athletes with time 113200 is missing from DB.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet ID
meet = supabase.table('meets').select('id').eq('athletic_net_id', '255929').execute()
meet_id = meet.data[0]['id']

# The 5 athletes from CSV
athletes_to_check = [
    {'name': 'Beatrice Hatch', 'school': 'school_piedmont', 'race': '1027977'},
    {'name': 'Kevin Huynh', 'school': 'school_kipp_san_jose_collegiate', 'race': '1027979'},
    {'name': 'Madeleine Herzberg', 'school': 'school_healdsburg', 'race': '1027980'},
    {'name': 'Andrew Xu', 'school': 'school_castro_valley', 'race': '1028456'},
    {'name': 'Anthony Martinez', 'school': 'school_south_san_francisco', 'race': '1069409'}
]

print(f"Checking which athlete with time 113200 cs is missing...\n")

for athlete_info in athletes_to_check:
    name = athlete_info['name']
    school_net_id = athlete_info['school']
    race_net_id = athlete_info['race']

    # Get school ID
    school = supabase.table('schools').select('id').eq('athletic_net_id', school_net_id).execute()
    if not school.data:
        print(f"❌ {name}: School not found ({school_net_id})")
        continue

    school_id = school.data[0]['id']

    # Get athlete
    athlete = supabase.table('athletes').select('id').eq('name', name).eq('school_id', school_id).execute()
    if not athlete.data:
        print(f"❌ {name}: Athlete not found in DB")
        continue

    athlete_id = athlete.data[0]['id']

    # Get race ID
    race = supabase.table('races').select('id').eq('athletic_net_race_id', race_net_id).execute()
    if not race.data:
        print(f"❌ {name}: Race not found ({race_net_id})")
        continue

    race_id = race.data[0]['id']

    # Check if result exists
    result = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()

    if result.data:
        print(f"✓ {name}: Result EXISTS - {result.data[0]['time_cs']} cs")
    else:
        print(f"❌ {name}: Result MISSING")
        print(f"   School: {school_net_id}")
        print(f"   Race: {race_net_id}")
        print(f"   Expected time: 113200 cs")
        print(f"   Athlete ID: {athlete_id}")
        print(f"   Race ID: {race_id}")
