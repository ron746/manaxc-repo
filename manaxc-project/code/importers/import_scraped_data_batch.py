#!/usr/bin/env python3
"""
Import scraped Athletic.net data to Supabase using BATCH operations
Processes data in 6 stages: schools, athletes, venues, courses, meets, races, results
"""

import sys
import json
import os
from supabase import create_client, Client
from datetime import datetime
from collections import defaultdict

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../../website/.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def parse_name(full_name):
    """Split full name into first and last name."""
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) == 2:
        return parts[0], parts[1]
    else:
        return " ".join(parts[:-1]), parts[-1]


def import_scraped_json_batch(json_file):
    """
    Import all data from scraped JSON file using batch operations.
    """
    print(f"\n📥 Importing data from {json_file}")
    print("=" * 60)

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    athletic_net_school_id = data.get('athletic_net_school_id') or data.get('school_id')
    season_year = int(data['season_year'])

    stats = {
        'athletes_created': 0,
        'venues_created': 0,
        'courses_created': 0,
        'meets_created': 0,
        'races_created': 0,
        'results_inserted': 0
    }

    # ========== STAGE 1: VERIFY SCHOOL ==========
    print(f"\n🔍 Stage 1/6: Verifying School")
    school_response = supabase.table('schools').select('id,name').eq('athletic_net_id', athletic_net_school_id).execute()
    if not school_response.data:
        print(f"❌ Error: School with Athletic.net ID {athletic_net_school_id} not found")
        return False

    school_id = school_response.data[0]['id']
    school_name = school_response.data[0]['name']
    print(f"  ✅ School: {school_name} (ID: {school_id})")

    # ========== STAGE 2: BATCH CREATE ATHLETES ==========
    print(f"\n👥 Stage 2/6: Creating Athletes")

    # Collect all unique athletes from results
    unique_athletes = {}
    for meet in data['meets']:
        for result in meet['results']:
            athlete_key = (result['athlete_name'], result['gender'])
            if athlete_key not in unique_athletes:
                first_name, last_name = parse_name(result['athlete_name'])
                unique_athletes[athlete_key] = {
                    'name': result['athlete_name'],
                    'first_name': first_name,
                    'last_name': last_name,
                    'gender': result['gender'],
                    'grade': result.get('grade')
                }

    # Check which athletes already exist
    existing_athletes = {}
    if unique_athletes:
        for (athlete_name, gender), athlete_info in unique_athletes.items():
            response = supabase.table('athletes').select('id,name,gender').eq('school_id', school_id).eq('first_name', athlete_info['first_name']).eq('last_name', athlete_info['last_name']).execute()
            if response.data:
                existing_athletes[(athlete_name, gender)] = response.data[0]['id']

    # Prepare athletes to create
    athletes_to_create = []
    for (athlete_name, gender), athlete_info in unique_athletes.items():
        if (athlete_name, gender) not in existing_athletes:
            # Calculate grad_year from grade if available
            if athlete_info['grade']:
                grad_year = season_year + (12 - athlete_info['grade'])
            else:
                grad_year = datetime.now().year + 1

            athletes_to_create.append({
                'school_id': school_id,
                'name': athlete_info['name'],
                'first_name': athlete_info['first_name'],
                'last_name': athlete_info['last_name'],
                'gender': athlete_info['gender'],
                'grad_year': grad_year,
                'is_active': True
            })

    # Batch insert athletes
    athlete_name_to_id = dict(existing_athletes)
    if athletes_to_create:
        print(f"  Creating {len(athletes_to_create)} new athletes...")
        response = supabase.table('athletes').insert(athletes_to_create).execute()
        if response.data:
            for athlete_data, athlete_result in zip(athletes_to_create, response.data):
                key = (athlete_data['name'], athlete_data['gender'])
                athlete_name_to_id[key] = athlete_result['id']
            stats['athletes_created'] = len(athletes_to_create)
            print(f"  ✅ Created {len(athletes_to_create)} athletes")
    else:
        print(f"  ℹ️ All athletes already exist")

    # ========== STAGE 3: BATCH CREATE VENUES ==========
    print(f"\n📍 Stage 3/6: Creating Venues")

    unique_venues = set()
    for meet in data['meets']:
        if meet['meet_date']:
            unique_venues.add(meet['meet_name'])

    # Check existing venues
    existing_venues = {}
    if unique_venues:
        response = supabase.table('venues').select('id,name').execute()
        for venue in response.data:
            if venue['name'] in unique_venues:
                existing_venues[venue['name']] = venue['id']

    # Prepare venues to create
    venues_to_create = []
    for venue_name in unique_venues:
        if venue_name not in existing_venues:
            venues_to_create.append({
                'name': venue_name,
                'city': 'Unknown',
                'state': 'CA'
            })

    # Batch insert venues
    venue_name_to_id = dict(existing_venues)
    if venues_to_create:
        print(f"  Creating {len(venues_to_create)} new venues...")
        response = supabase.table('venues').insert(venues_to_create).execute()
        if response.data:
            for venue_data, venue_result in zip(venues_to_create, response.data):
                venue_name_to_id[venue_data['name']] = venue_result['id']
            stats['venues_created'] = len(venues_to_create)
            print(f"  ✅ Created {len(venues_to_create)} venues")
    else:
        print(f"  ℹ️ All venues already exist")

    # ========== STAGE 4: BATCH CREATE COURSES ==========
    print(f"\n🏃 Stage 4/6: Creating Courses")

    # Check existing courses
    existing_courses = {}
    if unique_venues:
        response = supabase.table('courses').select('id,name,venue_id').execute()
        for course in response.data:
            key = (course['name'], course['venue_id'])
            existing_courses[key] = course['id']

    # Prepare courses to create
    courses_to_create = []
    course_key_to_id = dict(existing_courses)
    for venue_name in unique_venues:
        venue_id = venue_name_to_id.get(venue_name)
        if venue_id:
            key = (venue_name, venue_id)
            if key not in existing_courses:
                courses_to_create.append({
                    'name': venue_name,
                    'venue_id': venue_id,
                    'distance_meters': 5000,
                    'difficulty_rating': 5.0
                })

    # Batch insert courses
    if courses_to_create:
        print(f"  Creating {len(courses_to_create)} new courses...")
        response = supabase.table('courses').insert(courses_to_create).execute()
        if response.data:
            for course_data, course_result in zip(courses_to_create, response.data):
                key = (course_data['name'], course_data['venue_id'])
                course_key_to_id[key] = course_result['id']
            stats['courses_created'] = len(courses_to_create)
            print(f"  ✅ Created {len(courses_to_create)} courses")
    else:
        print(f"  ℹ️ All courses already exist")

    # ========== STAGE 5: BATCH CREATE MEETS ==========
    print(f"\n📅 Stage 5/6: Creating Meets")

    # Check existing meets
    existing_meets = {}
    meet_dates = [meet['meet_date'] for meet in data['meets'] if meet['meet_date']]
    if meet_dates:
        response = supabase.table('meets').select('id,name,meet_date').eq('season_year', season_year).execute()
        for meet in response.data:
            key = (meet['name'], meet['meet_date'])
            existing_meets[key] = meet['id']

    # Prepare meets to create
    meets_to_create = []
    meet_key_to_id = dict(existing_meets)
    for meet in data['meets']:
        if meet['meet_date']:
            key = (meet['meet_name'], meet['meet_date'])
            if key not in existing_meets:
                meets_to_create.append({
                    'name': meet['meet_name'],
                    'meet_date': meet['meet_date'],
                    'season_year': season_year
                })

    # Batch insert meets
    if meets_to_create:
        print(f"  Creating {len(meets_to_create)} new meets...")
        response = supabase.table('meets').insert(meets_to_create).execute()
        if response.data:
            for meet_data, meet_result in zip(meets_to_create, response.data):
                key = (meet_data['name'], meet_data['meet_date'])
                meet_key_to_id[key] = meet_result['id']
            stats['meets_created'] = len(meets_to_create)
            print(f"  ✅ Created {len(meets_to_create)} meets")
    else:
        print(f"  ℹ️ All meets already exist")

    # ========== STAGE 6: BATCH CREATE RACES & RESULTS ==========
    print(f"\n🏁 Stage 6/6: Creating Races and Results")

    # Process each meet
    for meet in data['meets']:
        if not meet['meet_date']:
            continue

        meet_key = (meet['meet_name'], meet['meet_date'])
        meet_id = meet_key_to_id.get(meet_key)
        if not meet_id:
            continue

        # Group results by race
        races = defaultdict(list)
        for result in meet['results']:
            race_key = (result['race_type'], result['gender'])
            races[race_key].append(result)

        # Process each race
        for (race_type, gender), results in races.items():
            # Check if race exists
            race_response = supabase.table('races').select('id').eq('meet_id', meet_id).eq('name', race_type).eq('gender', gender).execute()

            if race_response.data:
                race_id = race_response.data[0]['id']
            else:
                # Create race
                race_data = {
                    'meet_id': meet_id,
                    'name': race_type,
                    'gender': gender,
                    'distance_meters': 5000
                }
                race_response = supabase.table('races').insert(race_data).execute()
                if race_response.data:
                    race_id = race_response.data[0]['id']
                    stats['races_created'] += 1
                else:
                    continue

            # Prepare results for batch insert
            results_to_create = []
            for result in results:
                athlete_key = (result['athlete_name'], result['gender'])
                athlete_id = athlete_name_to_id.get(athlete_key)
                if not athlete_id:
                    continue

                results_to_create.append({
                    'meet_id': meet_id,
                    'race_id': race_id,
                    'athlete_id': athlete_id,
                    'time_cs': result['time_cs'],
                    'place_overall': result['place'],
                    'data_source': 'athletic_net'
                })

            # Batch insert results
            if results_to_create:
                # Check for existing results to avoid duplicates
                athlete_ids = [r['athlete_id'] for r in results_to_create]
                existing_results_response = supabase.table('results').select('athlete_id,race_id').eq('race_id', race_id).in_('athlete_id', athlete_ids).execute()
                existing_result_keys = {(r['athlete_id'], r['race_id']) for r in existing_results_response.data}

                # Filter out duplicates
                new_results = [r for r in results_to_create if (r['athlete_id'], r['race_id']) not in existing_result_keys]

                if new_results:
                    response = supabase.table('results').insert(new_results).execute()
                    if response.data:
                        stats['results_inserted'] += len(new_results)

        print(f"  ✅ Processed {meet['meet_name']}: {len(meet['results'])} results")

    print("\n" + "=" * 60)
    print("✅ Import complete!")
    print(f"📊 Athletes created: {stats['athletes_created']}")
    print(f"📊 Venues created: {stats['venues_created']}")
    print(f"📊 Courses created: {stats['courses_created']}")
    print(f"📊 Meets created: {stats['meets_created']}")
    print(f"📊 Races created: {stats['races_created']}")
    print(f"📊 Results inserted: {stats['results_inserted']}")

    return True


def main():
    if len(sys.argv) != 2:
        print("Usage: python import_scraped_data_batch.py <json_file>")
        print("Example: python import_scraped_data_batch.py athletic_net_1076_2025.json")
        sys.exit(1)

    json_file = sys.argv[1]

    if not os.path.exists(json_file):
        print(f"❌ Error: File not found: {json_file}")
        sys.exit(1)

    try:
        success = import_scraped_json_batch(json_file)
        if success:
            print("\n✅ Success!")
            sys.exit(0)
        else:
            print("\n❌ Import failed")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
