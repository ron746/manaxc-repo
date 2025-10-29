#!/usr/bin/env python3
"""
Import ONLY results from a processed meet directory.
This is useful for re-importing meets where everything else (venues, courses, schools, athletes, meets, races)
already exists in the database.

Usage:
    python import_results_only.py <directory_path>
"""

import os
import sys
import csv
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)

def get_supabase_client():
    """Create Supabase client"""
    return create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    )

def load_csv(file_path):
    """Load CSV file and return list of dictionaries"""
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def import_results(directory):
    """Import only results from a processed directory"""
    supabase = get_supabase_client()

    print(f"📊 Importing RESULTS ONLY from {directory}")
    print("=" * 70)

    # Load CSVs
    results_path = os.path.join(directory, 'results.csv')
    athletes_path = os.path.join(directory, 'athletes.csv')
    races_path = os.path.join(directory, 'races.csv')
    schools_path = os.path.join(directory, 'schools.csv')
    meets_path = os.path.join(directory, 'meets.csv')

    if not os.path.exists(results_path):
        print(f"❌ Results file not found: {results_path}")
        return

    print(f"Loading data files...")
    results = load_csv(results_path)
    athletes = load_csv(athletes_path)
    races = load_csv(races_path)
    schools = load_csv(schools_path)
    meets = load_csv(meets_path)

    print(f"  Results: {len(results)}")
    print(f"  Athletes: {len(athletes)}")
    print(f"  Races: {len(races)}")
    print(f"  Schools: {len(schools)}")
    print(f"  Meets: {len(meets)}")

    # Build lookup maps from database
    print(f"\nBuilding lookup maps from database...")

    # 1. Map school athletic_net_id to database ID
    school_id_map = {}
    for school in schools:
        athletic_net_id = school['athletic_net_id']
        response = supabase.table('schools').select('id').eq('athletic_net_id', athletic_net_id).execute()
        if response.data:
            school_id_map[athletic_net_id] = response.data[0]['id']
    print(f"  Mapped {len(school_id_map)} schools")

    # 2. Map athlete (name, school) to database ID
    athlete_map = {}
    for athlete in athletes:
        school_db_id = school_id_map.get(athlete['school_athletic_net_id'])
        if not school_db_id:
            continue

        response = supabase.table('athletes').select('id').eq(
            'first_name', athlete['first_name']
        ).eq('last_name', athlete['last_name']).eq('school_id', school_db_id).execute()

        if response.data:
            athlete_map[(athlete['name'], athlete['school_athletic_net_id'])] = response.data[0]['id']
    print(f"  Mapped {len(athlete_map)} athletes")

    # 3. Map race athletic_net_race_id to database ID and meet ID
    race_id_map = {}
    race_to_meet_map = {}
    for race in races:
        athletic_net_race_id = race['athletic_net_race_id']
        response = supabase.table('races').select('id, meet_id').eq(
            'athletic_net_race_id', athletic_net_race_id
        ).execute()
        if response.data:
            race_id_map[athletic_net_race_id] = response.data[0]['id']
            race_to_meet_map[athletic_net_race_id] = response.data[0]['meet_id']
    print(f"  Mapped {len(race_id_map)} races")

    # 4. Import results
    print(f"\n📊 Importing {len(results)} results...")

    created_count = 0
    skipped_count = 0
    error_count = 0
    batch = []
    BATCH_SIZE = 100

    for i, result in enumerate(results, 1):
        if i % 100 == 0:
            print(f"  Progress: {i}/{len(results)} results processed...")

        # Get database IDs
        race_db_id = race_id_map.get(result['race_athletic_net_race_id'])
        athlete_db_id = athlete_map.get((result['athlete_name'], result['school_athletic_net_id']))
        meet_db_id = race_to_meet_map.get(result['race_athletic_net_race_id'])

        if not race_db_id:
            print(f"  ⚠️  Skipping result - race not found: {result['race_athletic_net_race_id']}")
            skipped_count += 1
            continue

        if not athlete_db_id:
            print(f"  ⚠️  Skipping result - athlete not found: {result['athlete_name']}")
            skipped_count += 1
            continue

        if not meet_db_id:
            print(f"  ⚠️  Skipping result - meet not found for race: {result['race_athletic_net_race_id']}")
            skipped_count += 1
            continue

        # Check if result already exists
        existing = supabase.table('results').select('id').eq(
            'race_id', race_db_id
        ).eq('athlete_id', athlete_db_id).execute()

        if existing.data:
            skipped_count += 1
            continue

        # Prepare result data
        result_data = {
            'race_id': race_db_id,
            'athlete_id': athlete_db_id,
            'meet_id': meet_db_id,
            'place': int(result['place']) if result['place'] else None,
            'time_cs': int(result['time_cs']) if result['time_cs'] else None,
            'is_disqualified': result.get('is_disqualified', 'FALSE').upper() == 'TRUE',
            'notes': result.get('notes', '')
        }

        batch.append(result_data)

        # Insert batch when full
        if len(batch) >= BATCH_SIZE:
            try:
                supabase.table('results').insert(batch).execute()
                created_count += len(batch)
                batch = []
            except Exception as e:
                print(f"  ⚠️  Batch insert failed, inserting individually...")
                for item in batch:
                    try:
                        supabase.table('results').insert(item).execute()
                        created_count += 1
                    except Exception as e2:
                        print(f"  ❌ Error inserting result: {e2}")
                        error_count += 1
                batch = []

    # Insert remaining batch
    if batch:
        try:
            supabase.table('results').insert(batch).execute()
            created_count += len(batch)
        except Exception as e:
            print(f"  ⚠️  Batch insert failed, inserting individually...")
            for item in batch:
                try:
                    supabase.table('results').insert(item).execute()
                    created_count += 1
                except Exception as e2:
                    print(f"  ❌ Error inserting result: {e2}")
                    error_count += 1

    print(f"\n" + "=" * 70)
    print(f"✅ Import complete!")
    print(f"\n📊 Summary:")
    print(f"  Created: {created_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    print("=" * 70)

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_results_only.py <directory_path>")
        sys.exit(1)

    directory = sys.argv[1]

    if not os.path.exists(directory):
        print(f"❌ Directory not found: {directory}")
        sys.exit(1)

    import_results(directory)

if __name__ == "__main__":
    main()
