#!/usr/bin/env python3
"""
STEP 5: Import Races from CSV

Imports races from 'westmont-xc-results - races.csv'
CSV has: meet_name, meet_date, season_year, race_name, course_name, gender

Requires:
- meets table populated (run csv_import_04_meets.py first)
- courses table populated (run csv_import_02_courses.py first)

This script does composite matching:
- meet_id from (meet_name + meet_date)
- course_id from (course_name)
"""
import csv
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

CSV_FILE = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - races.csv'

def import_races():
    """Import races from CSV"""
    print("=" * 100)
    print("STEP 5: IMPORT RACES FROM CSV")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get meet lookup ((name, date) → id)
    print("\n📋 Loading meet lookup table...")
    meet_data = supabase.table('meets').select('id, name, meet_date').execute()
    meet_lookup = {(row['name'].strip(), row['meet_date']): row['id'] for row in meet_data.data}
    print(f"   ✅ Loaded {len(meet_lookup)} meets")

    if len(meet_lookup) == 0:
        print("\n❌ ERROR: No meets found! Run csv_import_04_meets.py first.")
        return

    # Get course lookup (name → id)
    print("📋 Loading course lookup table...")
    course_data = supabase.table('courses').select('id, name, distance_meters').execute()
    course_lookup = {row['name'].strip(): row['id'] for row in course_data.data}
    print(f"   ✅ Loaded {len(course_lookup)} courses")

    if len(course_lookup) == 0:
        print("\n❌ ERROR: No courses found! Run csv_import_02_courses.py first.")
        return

    # Read CSV
    print(f"\n📂 Reading {CSV_FILE}...")
    races = []
    missing_meets = set()
    missing_courses = set()

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            meet_key = (row['meet_name'].strip(), row['meet_date'].strip())
            course_name = row['course_name'].strip() if row['course_name'] else ''

            # Get meet_id
            meet_id = meet_lookup.get(meet_key)
            if not meet_id:
                missing_meets.add(f"{meet_key[0]} ({meet_key[1]})")
                continue

            # Get course_id
            course_id = course_lookup.get(course_name)
            if not course_id:
                missing_courses.add(course_name)
                continue

            # Get distance from course
            course = next((c for c in course_data.data if c['name'] == course_name), None)
            distance_meters = course['distance_meters'] if course else 5000  # Default 5K

            race = {
                'meet_id': meet_id,
                'course_id': course_id,
                'name': row['race_name'].strip() if row['race_name'] else 'Not Disclosed',
                'gender': row['gender'].strip() if row['gender'] else None,
                'division': 'Varsity',  # Default, could parse from race_name later
                'distance_meters': distance_meters
            }
            races.append(race)

    print(f"   ✅ Loaded {len(races)} races from CSV")

    if missing_meets:
        print(f"\n   ⚠️  Warning: {len(missing_meets)} races reference missing meets:")
        for m in list(missing_meets)[:5]:
            print(f"      - {m}")

    if missing_courses:
        print(f"\n   ⚠️  Warning: {len(missing_courses)} races reference missing courses:")
        for c in list(missing_courses)[:5]:
            print(f"      - '{c}'")

    # Stats
    male_races = sum(1 for r in races if r['gender'] == 'M')
    female_races = sum(1 for r in races if r['gender'] == 'F')
    mixed_races = sum(1 for r in races if r['gender'] not in ['M', 'F'])

    print(f"\n📊 Race Statistics:")
    print(f"   Total races: {len(races)}")
    print(f"   Male: {male_races}")
    print(f"   Female: {female_races}")
    if mixed_races > 0:
        print(f"   Mixed/Other: {mixed_races}")

    # Preview
    print("\n📋 Preview (first 10 races):")
    print(f"{'Meet ID (partial)':<20} {'Race Name':<30} {'Gender':<8} {'Distance':<10}")
    print("-" * 75)

    for race in races[:10]:
        meet_id_short = str(race['meet_id'])[:18]
        name = race['name'][:28]
        gender = race['gender'] if race['gender'] else 'N/A'
        dist = f"{race['distance_meters']}m" if race['distance_meters'] else 'N/A'
        print(f"{meet_id_short:<20} {name:<30} {gender:<8} {dist:<10}")

    if len(races) > 10:
        print(f"... and {len(races) - 10} more races")

    # Ask for confirmation
    print("\n" + "=" * 100)
    response = input("⚠️  Proceed with import? (yes/no): ").strip().lower()

    if response != 'yes':
        print("\n❌ Import cancelled")
        return

    # Get existing races (by meet_id + name + gender)
    print("\n📋 Checking for existing races...")
    existing = supabase.table('races').select('meet_id, name, gender').execute()
    existing_keys = {(row['meet_id'], row['name'], row['gender']) for row in existing.data}
    print(f"   Found {len(existing_keys)} existing races")

    # Import
    inserted = 0
    skipped = 0
    errors = []

    print(f"\n💾 Importing {len(races)} races...\n")

    for idx, race in enumerate(races, 1):
        key = (race['meet_id'], race['name'], race['gender'])

        # Skip if exists
        if key in existing_keys:
            print(f"  ⏭️  {idx:3d}. {race['name'][:55]:<55} - exists")
            skipped += 1
            continue

        try:
            result = supabase.table('races').insert(race).execute()
            print(f"  ✅ {idx:3d}. {race['name'][:55]:<55} - imported")
            inserted += 1
            existing_keys.add(key)
        except Exception as e:
            error_msg = f"{race['name']}: {str(e)}"
            errors.append(error_msg)
            print(f"  ❌ {idx:3d}. {race['name'][:55]:<55} - ERROR: {str(e)[:30]}")

    # Summary
    print("\n" + "=" * 100)
    print("IMPORT SUMMARY")
    print("=" * 100)
    print(f"✅ Inserted:  {inserted}")
    print(f"⏭️  Skipped:   {skipped} (already existed)")
    print(f"❌ Errors:    {len(errors)}")

    if errors:
        print("\n⚠️  Errors encountered:")
        for error in errors[:10]:
            print(f"   - {error}")
        if len(errors) > 10:
            print(f"   ... and {len(errors) - 10} more errors")

    if inserted > 0:
        print(f"\n🎉 Successfully imported {inserted} races!")
        print(f"   Male: {male_races}, Female: {female_races}")
        print("\n📌 Next Step: Run csv_import_06_results.py")

    return inserted, skipped, errors

if __name__ == '__main__':
    import_races()
