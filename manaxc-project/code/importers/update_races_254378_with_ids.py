#!/usr/bin/env python3
"""
Update races for meet 254378 with their Athletic.net IDs
"""

import os
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../website/.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

MEET_DIR = "/Users/ron/manaxc/manaxc-project/code/importers/to-be-processed/meet_254378_1761786641"

def main():
    print("="*80)
    print("UPDATE RACES FOR MEET 254378 WITH ATHLETIC.NET IDS")
    print("="*80)

    # Get meet
    response = supabase.table('meets')\
        .select('id, name')\
        .eq('athletic_net_id', '254378')\
        .execute()

    if not response.data:
        print("❌ Meet not found")
        return

    meet = response.data[0]
    meet_id = meet['id']
    print(f"✓ Found meet: {meet['name']}")
    print(f"  Meet ID: {meet_id}")

    # Load races from CSV
    races_file = os.path.join(MEET_DIR, 'races.csv')
    with open(races_file, 'r') as f:
        reader = csv.DictReader(f)
        csv_races = list(reader)

    print(f"\n✓ Loaded {len(csv_races)} races from CSV")

    # Get existing races from database
    db_races_response = supabase.table('races')\
        .select('id, name')\
        .eq('meet_id', meet_id)\
        .execute()

    print(f"✓ Found {len(db_races_response.data)} races in database")

    # Match races by name and update with athletic_net_id
    updated = 0
    not_found = 0

    for csv_race in csv_races:
        race_name = csv_race['name']
        athletic_net_id = csv_race['athletic_net_race_id']

        # Find matching race in database
        matching_race = None
        for db_race in db_races_response.data:
            if db_race['name'] == race_name:
                matching_race = db_race
                break

        if matching_race:
            # Update race with athletic_net_id
            update_response = supabase.table('races')\
                .update({'athletic_net_id': athletic_net_id})\
                .eq('id', matching_race['id'])\
                .execute()

            print(f"  ✓ Updated: {race_name} -> {athletic_net_id}")
            updated += 1
        else:
            print(f"  ⚠️  Not found in DB: {race_name}")
            not_found += 1

    print("\n" + "="*80)
    print(f"✅ Updated {updated} races")
    if not_found > 0:
        print(f"⚠️  {not_found} races not found in database")
    print("="*80)

if __name__ == '__main__':
    main()
