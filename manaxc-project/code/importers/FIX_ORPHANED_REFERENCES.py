#!/usr/bin/env python3
"""
Fix orphaned result references in athlete_best_times table.

This script finds and sets to NULL any foreign key references to results that no longer exist.
This is blocking result imports with error:
  "athlete_best_times_season_best_result_id_fkey" constraint violation

Run this BEFORE attempting to import more results.
"""

import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

print("=" * 70)
print("FIXING ORPHANED RESULT REFERENCES IN athlete_best_times")
print("=" * 70)

# Get all athlete_best_times records
print("\n🔍 Step 1: Loading all athlete_best_times records...")
all_records = supabase.table('athlete_best_times').select(
    'id, athlete_id, season_best_result_id, alltime_best_result_id'
).execute()

print(f"   Found {len(all_records.data)} records to check")

# Find orphaned references
print("\n🔍 Step 2: Checking for orphaned references...")
orphaned_season = []
orphaned_alltime = []

for i, record in enumerate(all_records.data, 1):
    if i % 100 == 0:
        print(f"   Progress: {i}/{len(all_records.data)} records checked...")

    # Check season_best_result_id
    season_id = record.get('season_best_result_id')
    if season_id:
        result = supabase.table('results').select('id').eq('id', season_id).execute()
        if not result.data:
            orphaned_season.append(record['id'])

    # Check alltime_best_result_id
    alltime_id = record.get('alltime_best_result_id')
    if alltime_id:
        result = supabase.table('results').select('id').eq('id', alltime_id).execute()
        if not result.data:
            orphaned_alltime.append(record['id'])

print(f"\n📊 Found orphaned references:")
print(f"   season_best_result_id: {len(orphaned_season)}")
print(f"   alltime_best_result_id: {len(orphaned_alltime)}")

if not orphaned_season and not orphaned_alltime:
    print("\n✅ No orphaned references found! Database is clean.")
    exit(0)

# Confirm before fixing
print(f"\n⚠️  This will NULL out {len(orphaned_season) + len(orphaned_alltime)} orphaned references.")
response = input("Continue? (yes/no): ")
if response.lower() != 'yes':
    print("Aborted.")
    exit(0)

# Fix season_best_result_id orphans
if orphaned_season:
    print(f"\n🔧 Step 3a: Fixing {len(orphaned_season)} orphaned season_best_result_id...")
    for i, record_id in enumerate(orphaned_season, 1):
        try:
            supabase.table('athlete_best_times').update({
                'season_best_result_id': None
            }).eq('id', record_id).execute()
            if i % 10 == 0 or i == len(orphaned_season):
                print(f"   Progress: {i}/{len(orphaned_season)} fixed...")
        except Exception as e:
            print(f"   ❌ Error fixing record {record_id}: {e}")
    print(f"   ✅ Done!")

# Fix alltime_best_result_id orphans
if orphaned_alltime:
    print(f"\n🔧 Step 3b: Fixing {len(orphaned_alltime)} orphaned alltime_best_result_id...")
    for i, record_id in enumerate(orphaned_alltime, 1):
        try:
            supabase.table('athlete_best_times').update({
                'alltime_best_result_id': None
            }).eq('id', record_id).execute()
            if i % 10 == 0 or i == len(orphaned_alltime):
                print(f"   Progress: {i}/{len(orphaned_alltime)} fixed...")
        except Exception as e:
            print(f"   ❌ Error fixing record {record_id}: {e}")
    print(f"   ✅ Done!")

print("\n" + "=" * 70)
print("✅ CLEANUP COMPLETE!")
print("=" * 70)
print("\nYou can now retry importing results.")
print("Note: Best times for affected athletes will be recalculated on next result import.")
