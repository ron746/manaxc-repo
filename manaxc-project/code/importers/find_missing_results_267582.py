#!/usr/bin/env python3
"""
Find missing results for meet 267582 by comparing CSV to database.
"""

import os
import csv
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet ID
print("Looking up meet 267582...")
meet_response = supabase.table('meets').select('id, name, meet_date').eq('athletic_net_id', '267582').execute()
if not meet_response.data:
    print("✗ Meet 267582 not found in database!")
    exit(1)

meet_id = meet_response.data[0]['id']
meet_name = meet_response.data[0]['name']
meet_date = meet_response.data[0]['meet_date']

print(f"✓ Meet: {meet_name}")
print(f"  Date: {meet_date}")
print(f"  ID: {meet_id}")

# Get all results from database for this meet
print("\nFetching database results...")
db_results = supabase.table('results').select('time_cs, athlete_id').eq('meet_id', meet_id).execute()
db_times = [r['time_cs'] for r in db_results.data]
print(f"✓ Found {len(db_times)} results in database")

# Find the CSV file for this meet
import glob
csv_pattern = 'to-be-processed/meet_267582_*/results.csv'
csv_files = glob.glob(csv_pattern)

if not csv_files:
    csv_pattern = 'processed/*/meet_267582_*/results.csv'
    csv_files = glob.glob(csv_pattern)

if not csv_files:
    print(f"\n✗ Could not find results.csv for meet 267582")
    print(f"  Searched: to-be-processed/meet_267582_*/results.csv")
    print(f"  Searched: processed/*/meet_267582_*/results.csv")
    exit(1)

csv_file = csv_files[0]
print(f"\n✓ Found CSV: {csv_file}")

# Read CSV and get all times
print("\nReading CSV file...")
csv_times = []
csv_rows = []
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        time_cs = int(row['time_cs'])
        csv_times.append(time_cs)
        csv_rows.append(row)

print(f"✓ Found {len(csv_times)} results in CSV")

# Compare
db_times_set = set(db_times)
csv_times_set = set(csv_times)

missing_times = csv_times_set - db_times_set
extra_times = db_times_set - csv_times_set

print(f"\n📊 Comparison:")
print(f"  CSV: {len(csv_times)} results")
print(f"  Database: {len(db_times)} results")
print(f"  Missing from DB: {len(missing_times)} results")
print(f"  Extra in DB: {len(extra_times)} results")

if missing_times:
    print(f"\n🔍 Missing times from database:")
    for time_cs in sorted(missing_times):
        # Find the athlete info from CSV
        matching_rows = [r for r in csv_rows if int(r['time_cs']) == time_cs]
        for row in matching_rows:
            print(f"\n  Time: {time_cs} cs ({time_cs/100:.2f} sec)")
            print(f"    Athlete AN ID: {row['athlete_athletic_net_id']}")
            print(f"    Race AN ID: {row['race_athletic_net_id']}")

            # Try to find this athlete in the database
            athlete_response = supabase.table('athletes').select('id, name, school_id').eq('athletic_net_id', row['athlete_athletic_net_id']).execute()
            if athlete_response.data:
                athlete = athlete_response.data[0]
                print(f"    ✓ Athlete in DB: {athlete['name']} (ID: {athlete['id']})")

                # Get school name
                school_response = supabase.table('schools').select('name').eq('id', athlete['school_id']).execute()
                if school_response.data:
                    print(f"    ✓ School: {school_response.data[0]['name']}")
            else:
                print(f"    ✗ Athlete NOT in database")

            # Check if race exists
            race_response = supabase.table('races').select('id, name, athletic_net_id, athletic_net_race_id').eq('meet_id', meet_id).execute()
            race_found = False
            for race in race_response.data:
                if race.get('athletic_net_id') == row['race_athletic_net_id'] or race.get('athletic_net_race_id') == row['race_athletic_net_id']:
                    print(f"    ✓ Race in DB: {race['name']} (ID: {race['id']})")
                    race_found = True
                    break
            if not race_found:
                print(f"    ✗ Race NOT in database with athletic_net_id={row['race_athletic_net_id']}")

if extra_times:
    print(f"\n⚠ Extra times in database (not in CSV):")
    for time_cs in sorted(extra_times):
        print(f"  {time_cs} cs ({time_cs/100:.2f} sec)")

if not missing_times and not extra_times:
    print(f"\n✓ Database and CSV match perfectly!")
