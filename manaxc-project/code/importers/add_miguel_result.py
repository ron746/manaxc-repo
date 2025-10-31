#!/usr/bin/env python3
"""
Add Miguel Rodriguez's result using his existing athlete ID.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Known IDs
athlete_id = 'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'  # Miguel A. Rodriguez

# Get meet and race
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']

race = supabase.table('races').select('id, name').eq('meet_id', meet_id).or_('athletic_net_id.eq.1015487,athletic_net_race_id.eq.1015487').execute()
race_id = race.data[0]['id']
race_name = race.data[0]['name']

print(f"Athlete ID: {athlete_id}")
print(f"Meet ID: {meet_id}")
print(f"Race: {race_name} (ID: {race_id})")

# Check if result exists
existing = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()

if existing.data:
    print(f"\n✓ Result already exists:")
    for r in existing.data:
        print(f"  ID: {r['id']}, Time: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
else:
    # Add result
    print(f"\nAdding result...")
    result_data = {
        'meet_id': meet_id,
        'race_id': race_id,
        'athlete_id': athlete_id,
        'time_cs': 124551,
        'place_overall': 85,
        'data_source': 'athletic_net'
    }

    result = supabase.table('results').insert(result_data).execute()
    if result.data:
        print(f"✓ Result added:")
        print(f"  ID: {result.data[0]['id']}")
        print(f"  Time: 124551 cs (20:45.51)")
        print(f"  Place: 85")
    else:
        print(f"✗ Failed to add result")
