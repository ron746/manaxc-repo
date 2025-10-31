#!/usr/bin/env python3
"""
Check if Miguel Rodriguez's result exists in meet 254332 with a different time.
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

# Get the CSV row for Miguel Rodriguez
csv_file = 'to-be-processed/meet_254332_1761787149/results.csv'
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if int(row['time_cs']) == 124551:
            athlete_name = row['athlete_name']
            school_id = row['athlete_school_id']
            race_id = row['athletic_net_race_id']
            print(f"CSV Data:")
            print(f"  Athlete: {athlete_name}")
            print(f"  School AN ID: {school_id}")
            print(f"  Race AN ID: {race_id}")
            print(f"  Time: 124551 cs (20:45.51)")
            break

# Get meet
meet = supabase.table('meets').select('id, name').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']
meet_name = meet.data[0]['name']

print(f"\nMeet: {meet_name} (ID: {meet_id})")

# Get school
school = supabase.table('schools').select('id, name').eq('athletic_net_id', school_id).execute()
if not school.data:
    print(f"\n✗ School {school_id} not found")
    exit(1)

school_db_id = school.data[0]['id']
school_name = school.data[0]['name']
print(f"School: {school_name}")

# Check for athlete
athletes = supabase.table('athletes').select('id, name').eq('name', athlete_name).eq('school_id', school_db_id).execute()

if not athletes.data:
    print(f"\n✗ Athlete '{athlete_name}' not found in database")
    print(f"  Need to verify athlete exists")
    exit(1)

athlete_id = athletes.data[0]['id']
print(f"Athlete: {athlete_name} (ID: {athlete_id})")

# Get race
races = supabase.table('races').select('id, name, athletic_net_id, athletic_net_race_id').eq('meet_id', meet_id).execute()

race_db_id = None
for r in races.data:
    if r.get('athletic_net_id') == race_id or r.get('athletic_net_race_id') == race_id:
        race_db_id = r['id']
        race_name = r['name']
        break

if not race_db_id:
    print(f"\n✗ Race {race_id} not found")
    exit(1)

print(f"Race: {race_name} (ID: {race_db_id})")

# Check for existing results
results = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).execute()

print(f"\n📊 Existing results for {athlete_name} in {meet_name}:")
if results.data:
    for r in results.data:
        print(f"  Time: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
        print(f"  Result ID: {r['id']}")

        # Check if same race
        race_check = supabase.table('results').select('race_id').eq('id', r['id']).execute()
        result_race_id = race_check.data[0]['race_id']

        if result_race_id == race_db_id:
            print(f"  ⚠ SAME RACE - duplicate time situation!")
            print(f"    Existing time: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
            print(f"    CSV time: 124551 cs (20:45.51)")
            print(f"    Difference: {abs(124551 - r['time_cs'])} cs ({abs(124551 - r['time_cs'])/100:.2f} sec)")
        else:
            print(f"  ✓ Different race (race_id: {result_race_id})")
else:
    print(f"  No existing results - this is a simple missing result")
    print(f"\n  Should insert:")
    print(f"    Athlete: {athlete_name}")
    print(f"    Meet: {meet_name}")
    print(f"    Race: {race_name}")
    print(f"    Time: 124551 cs (20:45.51)")
