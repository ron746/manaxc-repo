#!/usr/bin/env python3
"""
Import scraped Athletic.net data to Supabase
Reads JSON from scraper and inserts into database with proper foreign keys.
"""

import sys
import json
import os
from supabase import create_client, Client
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../../website/.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing Supabase credentials")
    print("Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def parse_name(full_name):
    """
    Split full name into first and last name.
    Handles middle names by putting them in first_name.
    """
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) == 2:
        return parts[0], parts[1]
    else:
        # Multiple parts: first + middle go to first_name, last part is last_name
        return " ".join(parts[:-1]), parts[-1]


def get_or_create_athlete(athlete_name, school_id, gender):
    """
    Get existing athlete or create new one.
    Returns athlete ID.
    """
    first_name, last_name = parse_name(athlete_name)

    # Try to find existing athlete by name and school
    response = supabase.table('athletes').select('id').eq('school_id', school_id).eq('first_name', first_name).eq('last_name', last_name).execute()

    if response.data and len(response.data) > 0:
        return response.data[0]['id']

    # Create new athlete
    athlete_data = {
        'school_id': school_id,
        'name': athlete_name,
        'first_name': first_name,
        'last_name': last_name,
        'gender': gender,
        'grad_year': datetime.now().year + 1,  # Default to next year (will need manual correction)
        'is_active': True
    }

    response = supabase.table('athletes').insert(athlete_data).execute()
    if response.data and len(response.data) > 0:
        print(f"  ✅ Created athlete: {athlete_name}")
        return response.data[0]['id']

    raise Exception(f"Failed to create athlete: {athlete_name}")


def get_or_create_venue(venue_name):
    """
    Get existing venue or create new one.
    Returns venue ID.
    """
    # Try to find existing venue by name
    response = supabase.table('venues').select('id').eq('name', venue_name).execute()

    if response.data and len(response.data) > 0:
        return response.data[0]['id']

    # Create new venue
    venue_data = {
        'name': venue_name,
        'city': 'Unknown',
        'state': 'CA'
    }

    response = supabase.table('venues').insert(venue_data).execute()
    if response.data and len(response.data) > 0:
        print(f"  ✅ Created venue: {venue_name}")
        return response.data[0]['id']

    raise Exception(f"Failed to create venue: {venue_name}")


def get_or_create_course(course_name, venue_id, distance_meters=5000):
    """
    Get existing course or create new one.
    Returns course ID.
    """
    # Try to find existing course by name and venue
    response = supabase.table('courses').select('id').eq('name', course_name).eq('venue_id', venue_id).execute()

    if response.data and len(response.data) > 0:
        return response.data[0]['id']

    # Create new course
    course_data = {
        'name': course_name,
        'venue_id': venue_id,
        'distance_meters': distance_meters,
        'difficulty_rating': 5.0  # Default middle difficulty
    }

    response = supabase.table('courses').insert(course_data).execute()
    if response.data and len(response.data) > 0:
        print(f"  ✅ Created course: {course_name}")
        return response.data[0]['id']

    raise Exception(f"Failed to create course: {course_name}")


def get_or_create_meet(meet_name, meet_date, season_year, venue_id=None):
    """
    Get existing meet or create new one.
    Returns meet ID.
    """
    # Try to find existing meet by name and date
    response = supabase.table('meets').select('id').eq('name', meet_name).eq('meet_date', meet_date).execute()

    if response.data and len(response.data) > 0:
        return response.data[0]['id']

    # Create new meet (without course_id due to PostgREST schema cache issue)
    meet_data = {
        'name': meet_name,
        'meet_date': meet_date,
        'season_year': season_year
    }

    response = supabase.table('meets').insert(meet_data).execute()
    if response.data and len(response.data) > 0:
        print(f"  ✅ Created meet: {meet_name} on {meet_date}")
        return response.data[0]['id']

    raise Exception(f"Failed to create meet: {meet_name}")


def get_or_create_race(meet_id, race_type, gender, distance_meters=5000):
    """
    Get existing race or create new one.
    Returns race ID.
    """
    # Try to find existing race
    response = supabase.table('races').select('id').eq('meet_id', meet_id).eq('name', race_type).eq('gender', gender).execute()

    if response.data and len(response.data) > 0:
        return response.data[0]['id']

    # Create new race
    race_data = {
        'meet_id': meet_id,
        'name': race_type,
        'gender': gender,
        'distance_meters': distance_meters
    }

    response = supabase.table('races').insert(race_data).execute()
    if response.data and len(response.data) > 0:
        print(f"  ✅ Created race: {race_type} ({gender})")
        return response.data[0]['id']

    raise Exception(f"Failed to create race: {race_type}")


def import_result(result, meet_id, race_id, athlete_id):
    """
    Import a single result.
    Checks for duplicates before inserting.
    """
    # Check if result already exists
    response = supabase.table('results').select('id').eq('race_id', race_id).eq('athlete_id', athlete_id).execute()

    if response.data and len(response.data) > 0:
        # Update existing result
        result_data = {
            'time_cs': result['time_cs'],
            'place_overall': result['place']
        }
        supabase.table('results').update(result_data).eq('id', response.data[0]['id']).execute()
        return 'updated'

    # Insert new result
    result_data = {
        'meet_id': meet_id,
        'race_id': race_id,
        'athlete_id': athlete_id,
        'time_cs': result['time_cs'],
        'place_overall': result['place'],
        'data_source': 'athletic_net'
    }

    supabase.table('results').insert(result_data).execute()
    return 'inserted'


def import_scraped_json(json_file):
    """
    Import all data from scraped JSON file.
    """
    print(f"\n📥 Importing data from {json_file}")
    print("=" * 60)

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    athletic_net_school_id = data.get('athletic_net_school_id') or data.get('school_id')
    season_year = int(data['season_year'])

    # Get school from database by athletic_net_id
    school_response = supabase.table('schools').select('id,name').eq('athletic_net_id', athletic_net_school_id).execute()
    if not school_response.data:
        print(f"❌ Error: School with Athletic.net ID {athletic_net_school_id} not found in database")
        print("Please create the school first")
        return False

    school_id = school_response.data[0]['id']
    school_name = school_response.data[0]['name']
    print(f"🏫 School: {school_name} (ID: {school_id})")
    print(f"📅 Season: {season_year}")
    print(f"📊 Meets to import: {data['meets_count']}")
    print(f"📊 Total results: {data['total_results']}")

    stats = {
        'meets_processed': 0,
        'races_created': 0,
        'athletes_created': 0,
        'results_inserted': 0,
        'results_updated': 0
    }

    for meet in data['meets']:
        print(f"\n🏃 Processing: {meet['meet_name']}")

        if not meet['meet_date']:
            print("  ⚠️ Skipping meet (no date found)")
            continue

        # Get or create venue and course (use meet name for both for now)
        venue_id = get_or_create_venue(meet['meet_name'])
        course_id = get_or_create_course(meet['meet_name'], venue_id)

        # Get or create meet
        meet_id = get_or_create_meet(
            meet['meet_name'],
            meet['meet_date'],
            season_year
        )

        # Group results by race type
        races = {}
        for result in meet['results']:
            race_key = (result['race_type'], result['gender'])
            if race_key not in races:
                races[race_key] = []
            races[race_key].append(result)

        # Process each race
        for (race_type, gender), results in races.items():
            race_id = get_or_create_race(meet_id, race_type, gender)
            stats['races_created'] += 1

            # Process each result
            for result in results:
                # Get or create athlete
                athlete_id = get_or_create_athlete(
                    result['athlete_name'],
                    school_id,
                    gender
                )

                # Import result
                status = import_result(result, meet_id, race_id, athlete_id)
                if status == 'inserted':
                    stats['results_inserted'] += 1
                else:
                    stats['results_updated'] += 1

        stats['meets_processed'] += 1
        print(f"  ✅ Processed {len(meet['results'])} results")

    print("\n" + "=" * 60)
    print("✅ Import complete!")
    print(f"📊 Meets processed: {stats['meets_processed']}")
    print(f"📊 Races created: {stats['races_created']}")
    print(f"📊 Results inserted: {stats['results_inserted']}")
    print(f"📊 Results updated: {stats['results_updated']}")

    return True


def main():
    if len(sys.argv) != 2:
        print("Usage: python import_scraped_data.py <json_file>")
        print("Example: python import_scraped_data.py athletic_net_1076_2025.json")
        sys.exit(1)

    json_file = sys.argv[1]

    if not os.path.exists(json_file):
        print(f"❌ Error: File not found: {json_file}")
        sys.exit(1)

    try:
        success = import_scraped_json(json_file)
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
