#!/usr/bin/env python3
"""
Import the 11 missing athletes for meet 254378.

Strategy:
1. Read athlete data from athletes.csv
2. Try to create each athlete
3. If slug collision, force creation with alternate slug
4. Flag all as potential duplicates for admin review
"""

import os
import csv
import json
from supabase import create_client, Client
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

MEET_ID = '3f6daf82-5a37-419f-802d-f648bb97d6ff'
CSV_PATH = 'to-be-processed/meet_254378_1761786641'

# The 11 missing athletes (from analysis)
MISSING_ATHLETES = [
    "DANIEL SANTANA",
    "Dane DeMille",
    "JT Kaplan",
    "Ashton Casalins-DeBoskey",
    "Mario Fernandez DuFur",
    "Marc DeQuiroz",
    "Cassandra Casalins-DeBoskey",
    "Grace DeCicco",
    "Eva Casalins-DeBoskey",
    "Violette D'Ambrosia",
    "Hailee LLamas"
]

print("=" * 100)
print("IMPORTING 11 MISSING ATHLETES FOR MEET 254378")
print("=" * 100)
print()

# Step 1: Load athletes from CSV
print("Step 1: Reading athletes.csv...")
athletes_data = {}
with open(f'{CSV_PATH}/athletes.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        athletes_data[row['name']] = row

print(f"  Loaded {len(athletes_data)} athletes from CSV")

# Step 2: Load schools mapping
print("\nStep 2: Loading schools from schools.csv...")
schools_mapping = {}  # school_slug -> school_uuid
with open(f'{CSV_PATH}/schools.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Get the actual school UUID from database
        school_check = supabase.table('schools')\
            .select('id')\
            .eq('athletic_net_id', row['athletic_net_id'])\
            .execute()

        if school_check.data:
            schools_mapping[row['athletic_net_id']] = school_check.data[0]['id']

print(f"  Loaded {len(schools_mapping)} schools")

# Step 3: Import each missing athlete
print("\nStep 3: Importing missing athletes...")
print("-" * 100)

imported = []
flagged = []
failed = []

for athlete_name in MISSING_ATHLETES:
    print(f"\nProcessing: {athlete_name}")

    # Get athlete data from CSV
    csv_athlete = athletes_data.get(athlete_name)
    if not csv_athlete:
        print(f"  ERROR: Not found in athletes.csv")
        failed.append({'name': athlete_name, 'reason': 'Not in CSV'})
        continue

    # Get school UUID
    school_uuid = schools_mapping.get(csv_athlete['school_athletic_net_id'])
    if not school_uuid:
        print(f"  ERROR: School {csv_athlete['school_athletic_net_id']} not found")
        failed.append({'name': athlete_name, 'reason': 'School not found'})
        continue

    # Prepare athlete data
    athlete_data = {
        'name': csv_athlete['name'],
        'first_name': csv_athlete['first_name'],
        'last_name': csv_athlete['last_name'],
        'grad_year': int(csv_athlete['grad_year']),
        'gender': csv_athlete['gender'],
        'school_id': school_uuid,
        'athletic_net_id': csv_athlete.get('athletic_net_id')
    }

    # Try to create athlete
    athlete_id = None
    slug_collision = False

    try:
        result = supabase.table('athletes').insert(athlete_data).execute()
        athlete_id = result.data[0]['id']
        print(f"  ✓ Created athlete: {athlete_id}")
        imported.append({
            'name': athlete_name,
            'id': athlete_id,
            'slug_collision': False
        })

    except Exception as e:
        error_msg = str(e)

        # Check if it's a slug collision
        if 'duplicate key' in error_msg and 'slug' in error_msg:
            print(f"  ! Slug collision detected")
            slug_collision = True

            # Try to find similar athlete
            similar = supabase.table('athletes')\
                .select('id, name, slug, school_id')\
                .eq('school_id', school_uuid)\
                .eq('grad_year', int(csv_athlete['grad_year']))\
                .eq('gender', csv_athlete['gender'])\
                .execute()

            if similar.data:
                # Use existing athlete
                athlete_id = similar.data[0]['id']
                print(f"  → Using existing similar athlete: {similar.data[0]['name']} ({athlete_id})")

                imported.append({
                    'name': athlete_name,
                    'id': athlete_id,
                    'slug_collision': True,
                    'matched_to': similar.data[0]['name']
                })
            else:
                # Force creation with modified slug
                # Add a numeric suffix to make slug unique
                import time
                athlete_data['slug'] = f"{re.sub(r'[^a-z0-9-]', '', csv_athlete['name'].lower().replace(' ', '-'))}-{int(time.time()) % 10000}"

                try:
                    result = supabase.table('athletes').insert(athlete_data).execute()
                    athlete_id = result.data[0]['id']
                    print(f"  ✓ Force created with custom slug: {athlete_id}")

                    imported.append({
                        'name': athlete_name,
                        'id': athlete_id,
                        'slug_collision': True,
                        'forced_slug': athlete_data['slug']
                    })
                except Exception as e2:
                    print(f"  ERROR: Failed to force create: {e2}")
                    failed.append({'name': athlete_name, 'reason': str(e2)})
                    continue
        else:
            print(f"  ERROR: {error_msg}")
            failed.append({'name': athlete_name, 'reason': error_msg})
            continue

    # Flag in potential_duplicate_athletes
    if athlete_id:
        try:
            duplicate_data = {
                'athlete_id_1': athlete_id,
                'athlete_id_2': None,
                'school_id': school_uuid,
                'meet_id': MEET_ID,
                'name_1': None if not slug_collision else imported[-1].get('matched_to'),
                'name_2': athlete_name,
                'conflict_type': 'slug_collision' if slug_collision else 'new_athlete_254378',
                'grad_year_1': None,
                'grad_year_2': int(csv_athlete['grad_year']),
                'gender_1': None,
                'gender_2': csv_athlete['gender'],
                'csv_data': json.dumps(csv_athlete),
                'status': 'pending'
            }

            supabase.table('potential_duplicate_athletes').insert(duplicate_data).execute()
            print(f"  ✓ Flagged in potential_duplicate_athletes")
            flagged.append(athlete_name)

        except Exception as e:
            print(f"  WARNING: Failed to flag as potential duplicate: {e}")

print("\n" + "=" * 100)
print("SUMMARY")
print("=" * 100)
print(f"\nSuccessfully imported: {len(imported)}")
print(f"Flagged as potential duplicates: {len(flagged)}")
print(f"Failed: {len(failed)}")

if imported:
    print("\n✓ IMPORTED:")
    for item in imported:
        status = " (slug collision - matched)" if item.get('matched_to') else \
                 " (slug collision - forced)" if item.get('forced_slug') else \
                 " (new)"
        print(f"  - {item['name']}{status}")

if failed:
    print("\n✗ FAILED:")
    for item in failed:
        print(f"  - {item['name']}: {item['reason']}")

print("\n" + "=" * 100)
print("NEXT STEPS")
print("=" * 100)
print(f"""
1. Review potential_duplicate_athletes table for the {len(flagged)} flagged athletes
2. Run script to add results for these {len(imported)} athletes
3. Also add results for the 15 athletes that already existed
4. Update meet result count
5. Rebuild derived tables

All athletes are flagged for admin review - they can merge duplicates later if needed.
""")
