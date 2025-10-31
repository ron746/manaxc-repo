#!/usr/bin/env python3
"""Copy athletic_net_race_id to athletic_net_id for meet 270614 races."""

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
meet_response = supabase.table('meets').select('id').eq('athletic_net_id', '270614').execute()
if not meet_response.data:
    print("Meet 270614 not found!")
    exit(1)

meet_id = meet_response.data[0]['id']
print(f"Meet ID: {meet_id}")

# Get all races for this meet
races_response = supabase.table('races').select('id, name, athletic_net_id, athletic_net_race_id').eq('meet_id', meet_id).execute()
races = races_response.data

print(f"\nFound {len(races)} races for meet 270614")

# Update each race
updated = 0
for race in races:
    if race['athletic_net_id'] is None and race['athletic_net_race_id']:
        print(f"\nUpdating: {race['name']}")
        print(f"  Setting athletic_net_id = {race['athletic_net_race_id']}")

        result = supabase.table('races').update({
            'athletic_net_id': race['athletic_net_race_id']
        }).eq('id', race['id']).execute()

        if result.data:
            print(f"  ✓ Updated successfully")
            updated += 1
        else:
            print(f"  ✗ Update failed")
    else:
        print(f"\nSkipping: {race['name']} (already has athletic_net_id or no athletic_net_race_id)")

print(f"\n✓ Updated {updated} races")
