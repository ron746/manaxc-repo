#!/usr/bin/env python3
"""
Import a single result file - simple and immediate feedback
"""

import os
import sys
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../website/.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_meet_id(athletic_net_meet_id: str) -> str:
    response = supabase.table('meets').select('id').eq('athletic_net_id', athletic_net_meet_id).execute()
    return response.data[0]['id']

def get_race_id(athletic_net_race_id: str) -> str:
    response = supabase.table('races').select('id').eq('athletic_net_id', athletic_net_race_id).execute()
    if not response.data:
        return None
    return response.data[0]['id']

def find_athlete(name: str, athletic_net_school_id: str, grad_year: int) -> str:
    # First get school UUID from athletic_net_id
    school_response = supabase.table('schools').select('id').eq('athletic_net_id', athletic_net_school_id).execute()
    if not school_response.data:
        return None
    school_id = school_response.data[0]['id']

    # Then find athlete by name, school_id, and grad_year
    response = supabase.table('athletes').select('id').eq('name', name).eq('school_id', school_id).eq('grad_year', grad_year).execute()
    if not response.data:
        return None
    return response.data[0]['id']

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_single_result_file.py <file_name>")
        print("Example: python import_single_result_file.py results_001.csv")
        sys.exit(1)

    file_name = sys.argv[1]
    file_path = f"/Users/ron/manaxc/manaxc-project/code/importers/to-be-processed/meet_254378_1761786641/{file_name}"

    print(f"Importing {file_name}...")
    print(f"Getting meet ID...")
    meet_id = get_meet_id("254378")
    print(f"Meet ID: {meet_id}")

    # Load CSV
    print(f"Loading {file_name}...")
    with open(file_path, 'r') as f:
        results = list(csv.DictReader(f))

    print(f"Found {len(results)} results")

    success = 0
    missing_race = 0
    missing_athlete = 0
    other_error = 0

    for idx, result in enumerate(results, 1):
        if idx % 50 == 0:
            print(f"  Progress: {idx}/{len(results)} (Success: {success}, Missing race: {missing_race}, Missing athlete: {missing_athlete}, Errors: {other_error})")

        try:
            # Calculate grad year
            grade = int(result['grade'])
            grad_year = 2025 + (13 - grade)

            # Get race
            race_id = get_race_id(result['athletic_net_race_id'])
            if not race_id:
                missing_race += 1
                continue

            # Find athlete
            athlete_id = find_athlete(result['athlete_name'], result['athlete_school_id'], grad_year)
            if not athlete_id:
                missing_athlete += 1
                continue

            # Insert
            supabase.table('results').insert({
                'athlete_id': athlete_id,
                'race_id': race_id,
                'meet_id': meet_id,
                'time_cs': int(result['time_cs']),
                'place_overall': int(result['place_overall']),
                'data_source': 'athletic_net'
            }).execute()

            success += 1

        except Exception as e:
            other_error += 1
            if idx <= 5:  # Print first few errors
                print(f"    Error on row {idx}: {e}")

    print(f"\n=== SUMMARY ===")
    print(f"Total: {len(results)}")
    print(f"Success: {success}")
    print(f"Missing race: {missing_race}")
    print(f"Missing athlete: {missing_athlete}")
    print(f"Other errors: {other_error}")

if __name__ == '__main__':
    main()
