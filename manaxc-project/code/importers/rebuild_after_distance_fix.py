#!/usr/bin/env python3
"""
Rebuild derived tables after fixing distance_meters for 8 races.

These 8 races had distance_meters = 0, now corrected to 4000.
This script rebuilds athlete_best_times for all affected athletes.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# The 8 race IDs that were fixed
FIXED_RACE_IDS = [
    'c81c8281-39f3-4ce0-8943-262dc17c4dfe',  # Mens 4,000 Meters Freshmen
    '75941ccf-d59d-42c2-9ed1-13c2d2413875',  # Mens 4,000 Meters Sophomore
    '07a09763-086a-472c-aa0b-de8393d72912',  # Womens 4,000 Meters Freshmen
    '6cfde952-8a7a-446e-ad19-f7f13547d57b',  # Womens 4,000 Meters Sophomore
    'e3e546c5-1b9a-46b3-92de-5a0be3abbb93',  # Mens 4,000 Meters Junior
    '9910b8ee-e65b-4907-bc97-4fc8694e8134',  # Womens 4,000 Meters Junior
    '3c42b260-2868-4b32-a8e3-5ccb4d458678',  # Womens 4,000 Meters Senior
    '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'   # Mens 4,000 Meters Senior
]

def main():
    print("Finding all athletes affected by distance_meters fix...")

    # Get all unique athlete IDs from results in these 8 races
    affected_athletes = set()

    for race_id in FIXED_RACE_IDS:
        print(f"  Checking race {race_id}...")

        # Get all results for this race
        results = supabase.table('results')\
            .select('athlete_id, race_id')\
            .eq('race_id', race_id)\
            .execute()

        if results.data:
            for result in results.data:
                affected_athletes.add(result['athlete_id'])
            print(f"    Found {len(results.data)} results")

    print(f"\nTotal affected athletes: {len(affected_athletes)}")

    if not affected_athletes:
        print("No athletes found. Nothing to rebuild.")
        return

    # Rebuild athlete_best_times for each affected athlete
    print("\nRebuilding athlete_best_times...")
    success_count = 0
    error_count = 0

    for i, athlete_id in enumerate(affected_athletes, 1):
        try:
            # Call the batch rebuild function for this athlete
            result = supabase.rpc('batch_rebuild_athlete_best_times', {
                'athlete_ids': [athlete_id]
            }).execute()

            success_count += 1
            if i % 10 == 0:
                print(f"  Progress: {i}/{len(affected_athletes)} athletes processed")

        except Exception as e:
            error_count += 1
            print(f"  ERROR rebuilding athlete {athlete_id}: {e}")

    print(f"\nRebuild complete:")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")

    # Verify no orphaned records
    print("\nChecking for orphaned athlete_best_times records...")
    orphaned = supabase.rpc('find_orphaned_best_times').execute()

    if orphaned.data:
        orphan_count = len(orphaned.data)
        print(f"  WARNING: Found {orphan_count} orphaned records")
        print("  These need manual review (do not auto-delete)")
    else:
        print("  No orphaned records found")

if __name__ == '__main__':
    main()
