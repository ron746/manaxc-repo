#!/usr/bin/env python3
"""
Optimized import that assumes most athletes already exist.
Tries to insert results directly, catches FK violations, then imports only missing athletes.
"""

import os
import sys
import csv
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime

load_dotenv('.env')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))

def load_csv_to_dict(filepath):
    """Load CSV into list of dicts"""
    with open(filepath, 'r') as f:
        return list(csv.DictReader(f))

def main(import_dir):
    print(f"📥 Optimized import from {import_dir}")
    print("="*60)

    # Load CSVs
    print("📂 Loading CSV files...")
    meets = load_csv_to_dict(f"{import_dir}/meets.csv")
    races = load_csv_to_dict(f"{import_dir}/races.csv")
    results = load_csv_to_dict(f"{import_dir}/results.csv")
    athletes_csv = load_csv_to_dict(f"{import_dir}/athletes.csv")
    schools = load_csv_to_dict(f"{import_dir}/schools.csv")

    print(f"  {len(results)} results to import")
    print(f"  {len(athletes_csv)} athletes in CSV")

    # Get meet ID (should already exist from previous attempt)
    meet = supabase.table('meets').select('id').eq('athletic_net_id', meets[0]['athletic_net_id']).single().execute()
    meet_id = meet.data['id']
    print(f"\n✓ Meet exists: {meet_id}")

    # Build race map
    print("\n🏃 Building race map...")
    race_map = {}
    for race_csv in races:
        race_db = supabase.table('races').select('id').eq('meet_id', meet_id).eq('name', race_csv['name']).eq('gender', race_csv['gender']).single().execute()
        race_map[race_csv['athletic_net_race_id']] = race_db.data['id']
    print(f"  {len(race_map)} races mapped")

    # Build school map
    print("\n🏫 Building school map...")
    school_map = {}
    for school in schools:
        school_db = supabase.table('schools').select('id').eq('athletic_net_id', school['athletic_net_id']).single().execute()
        school_map[school['athletic_net_id']] = school_db.data['id']
    print(f"  {len(school_map)} schools mapped")

    # Build athlete name -> CSV data map for later
    athlete_csv_map = {a['name']: a for a in athletes_csv}

    # Build athlete map from existing athletes (bulk lookup by name)
    print("\n👤 Looking up existing athletes...")
    all_athlete_names = [a['name'] for a in athletes_csv]

    # Batch lookup in chunks of 1000
    athlete_map = {}  # name -> id
    chunk_size = 1000
    for i in range(0, len(all_athlete_names), chunk_size):
        chunk = all_athlete_names[i:i+chunk_size]
        existing = supabase.table('athletes').select('id, name').in_('name', chunk).execute()
        for athlete in existing.data:
            athlete_map[athlete['name']] = athlete['id']
        print(f"  Checked {min(i+chunk_size, len(all_athlete_names))}/{len(all_athlete_names)} athletes...")

    print(f"  ✓ {len(athlete_map)} athletes already exist")
    print(f"  ✗ {len(all_athlete_names) - len(athlete_map)} athletes need to be imported")

    # Import missing athletes
    missing_athletes = [a for a in athletes_csv if a['name'] not in athlete_map]
    if missing_athletes:
        print(f"\n👤 Importing {len(missing_athletes)} missing athletes...")
        athlete_batch = []
        for a in missing_athletes:
                # Calculate grade from grad_year
            grade = None
            if a.get('grad_year') and a['grad_year'].strip():
                current_year = datetime.now().year
                years_until_grad = int(a['grad_year']) - current_year
                grade = 12 - years_until_grad
                if grade < 9 or grade > 13:
                    grade = None

            athlete_batch.append({
                'name': a['name'],
                'athletic_net_id': a['athletic_net_id'],
                'school_id': school_map[a['school_athletic_net_id']],
                'gender': a['gender'],
                'grade': grade
            })

        # Insert in chunks to avoid timeout
        chunk_size = 500
        for i in range(0, len(athlete_batch), chunk_size):
            chunk = athlete_batch[i:i+chunk_size]
            result = supabase.table('athletes').insert(chunk).execute()
            for athlete in result.data:
                athlete_map[athlete['name']] = athlete['id']
            print(f"  Imported {min(i+chunk_size, len(athlete_batch))}/{len(athlete_batch)} athletes...")

    # Now insert results in batches
    print(f"\n📊 Importing {len(results)} results in batches...")
    result_batch = []
    failed_results = []

    for idx, r in enumerate(results):
        athlete_name = None
        for a in athletes_csv:
            if a['athletic_net_id'] == r['athlete_athletic_net_id']:
                athlete_name = a['name']
                break

        if not athlete_name:
            print(f"  ⚠️  Skipping result {idx}: Can't find athlete {r['athlete_athletic_net_id']}")
            continue

        if athlete_name not in athlete_map:
            print(f"  ⚠️  Skipping result {idx}: Athlete not in map: {athlete_name}")
            failed_results.append(r)
            continue

        result_batch.append({
            'race_id': race_map[r['race_athletic_net_id']],
            'athlete_id': athlete_map[athlete_name],
            'time_seconds': int(r['time_seconds']) if r['time_seconds'] else None,
            'place': int(r['place']) if r['place'] else None,
            'athletic_net_id': r['athletic_net_id']
        })

        # Insert in chunks of 2000
        if len(result_batch) >= 2000:
            try:
                supabase.table('results').insert(result_batch).execute()
                print(f"  ✓ Imported {idx+1}/{len(results)} results...")
                result_batch = []
            except Exception as e:
                print(f"  ⚠️  Batch failed at {idx}: {e}")
                failed_results.extend(result_batch)
                result_batch = []

    # Insert remaining
    if result_batch:
        try:
            supabase.table('results').insert(result_batch).execute()
            print(f"  ✓ Imported remaining results")
        except Exception as e:
            print(f"  ⚠️  Final batch failed: {e}")
            failed_results.extend(result_batch)

    # Check final count
    meet_check = supabase.table('meets').select('id, result_count').eq('id', meet_id).single().execute()
    print(f"\n✅ COMPLETE!")
    print(f"  Results in database: {meet_check.data['result_count']} / 10,870")
    if failed_results:
        print(f"  ⚠️  Failed results: {len(failed_results)}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 import_results_optimized.py <import_dir>")
        sys.exit(1)
    main(sys.argv[1])
