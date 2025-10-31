#!/usr/bin/env python3
"""
Check what races exist for meet 254378
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../website/.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def main():
    # Get meet
    response = supabase.table('meets')\
        .select('id, name, athletic_net_id')\
        .eq('athletic_net_id', '254378')\
        .execute()

    if not response.data:
        print("❌ Meet not found")
        return

    meet = response.data[0]
    print(f"Meet: {meet['name']}")
    print(f"Meet ID: {meet['id']}")
    print(f"Athletic.net ID: {meet['athletic_net_id']}")

    # Get races for this meet
    races_response = supabase.table('races')\
        .select('id, name, athletic_net_id')\
        .eq('meet_id', meet['id'])\
        .execute()

    print(f"\nRaces found: {len(races_response.data)}")
    for race in races_response.data:
        print(f"  - {race['name']} (Athletic.net ID: {race['athletic_net_id']})")

    # Check results.csv for race IDs
    print("\n" + "="*80)
    print("Checking results.csv for race IDs...")

    import csv
    race_ids = set()
    with open('/Users/ron/manaxc/manaxc-project/code/importers/to-be-processed/meet_254378_1761786641/results.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            race_ids.add(row['athletic_net_race_id'])

    print(f"Unique race IDs in results.csv: {len(race_ids)}")
    print("Race IDs:")
    for race_id in sorted(race_ids):
        print(f"  - {race_id}")

if __name__ == '__main__':
    main()
