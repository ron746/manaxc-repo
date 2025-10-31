#!/usr/bin/env python3
"""
Import Miguel Rodriguez athlete and his result for meet 254332.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get school
school = supabase.table('schools').select('id, name').eq('athletic_net_id', 'school_redwood_(visalia)').execute()
school_id = school.data[0]['id']
school_name = school.data[0]['name']

print(f"School: {school_name} (ID: {school_id})")

# Check if athlete exists
existing = supabase.table('athletes').select('id').eq('name', 'Miguel Rodriguez').eq('school_id', school_id).execute()

if existing.data:
    print(f"✓ Athlete already exists: {existing.data[0]['id']}")
    athlete_id = existing.data[0]['id']
else:
    # Import athlete
    print("Importing athlete Miguel Rodriguez...")
    athlete_data = {
        'name': 'Miguel Rodriguez',
        'first_name': 'Miguel',
        'last_name': 'Rodriguez',
        'school_id': school_id,
        'grad_year': 2028,
        'gender': 'M'
    }

    athlete_result = supabase.table('athletes').insert(athlete_data).execute()
    if athlete_result.data:
        athlete_id = athlete_result.data[0]['id']
        print(f"✓ Athlete imported: {athlete_id}")
    else:
        print(f"✗ Failed to import athlete")
        exit(1)

# Get meet and race
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']

race = supabase.table('races').select('id, name').eq('meet_id', meet_id).or_('athletic_net_id.eq.1015487,athletic_net_race_id.eq.1015487').execute()
race_id = race.data[0]['id']
race_name = race.data[0]['name']

print(f"Race: {race_name} (ID: {race_id})")

# Check if result already exists
existing_result = supabase.table('results').select('id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()

if existing_result.data:
    print(f"✓ Result already exists: {existing_result.data[0]['id']}")
else:
    # Import result
    print("Importing result...")
    result_data = {
        'meet_id': meet_id,
        'race_id': race_id,
        'athlete_id': athlete_id,
        'time_cs': 124551,  # 20:45.51
        'place_overall': 85,
        'data_source': 'athletic_net'
    }

    result = supabase.table('results').insert(result_data).execute()
    if result.data:
        print(f"✓ Result imported: {result.data[0]['id']}")
        print(f"  Time: 124551 cs (20:45.51)")
        print(f"  Place: 85")
    else:
        print(f"✗ Failed to import result")

print("\n✓ Done")
