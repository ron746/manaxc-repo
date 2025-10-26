#!/usr/bin/env python3
"""
STEP 2: Import Courses from CSV

Imports courses from 'westmont-xc-results - courses.csv'
CSV has: name, venue, distance_meters, distance_display, difficulty_rating

Requires: venues table populated (run csv_import_01_venues.py first)
"""
import csv
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

CSV_FILE = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - courses.csv'

def import_courses():
    """Import courses from CSV"""
    print("=" * 100)
    print("STEP 2: IMPORT COURSES FROM CSV")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get venue lookup (name → id)
    print("\n📋 Loading venue lookup table...")
    venue_data = supabase.table('venues').select('id, name').execute()
    venue_lookup = {row['name']: row['id'] for row in venue_data.data}
    print(f"   ✅ Loaded {len(venue_lookup)} venues")

    if len(venue_lookup) == 0:
        print("\n❌ ERROR: No venues found! Run csv_import_01_venues.py first.")
        return

    # Read CSV
    print(f"\n📂 Reading {CSV_FILE}...")
    courses = []
    missing_venues = set()

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            venue_name = row['venue'].strip() if row['venue'] else ''

            # Get venue_id
            venue_id = venue_lookup.get(venue_name)
            if not venue_id:
                missing_venues.add(venue_name)
                continue

            course = {
                'name': row['name'].strip(),
                'venue': venue_name,  # Keep for reference
                'venue_id': venue_id,
                'location': 'California',
                'distance_meters': int(row['distance_meters']) if row['distance_meters'] else None,
                'distance_display': row['distance_display'].strip() if row['distance_display'] else None,
                'difficulty_rating': float(row['difficulty_rating']) if row['difficulty_rating'] else None
            }
            courses.append(course)

    print(f"   ✅ Loaded {len(courses)} courses from CSV")

    if missing_venues:
        print(f"\n   ⚠️  Warning: {len(missing_venues)} courses reference missing venues:")
        for v in list(missing_venues)[:5]:
            print(f"      - '{v}'")

    # Preview
    print("\n📋 Preview (first 10 courses):")
    print(f"{'Name':<45} {'Venue':<25} {'Distance':<10} {'Difficulty':<12}")
    print("-" * 100)
    for course in courses[:10]:
        name = course['name'][:43]
        venue = course['venue'][:23] if course['venue'] else 'N/A'
        dist = f"{course['distance_meters']}m" if course['distance_meters'] else 'N/A'
        diff = f"{course['difficulty_rating']:.2f}" if course['difficulty_rating'] else 'N/A'
        print(f"{name:<45} {venue:<25} {dist:<10} {diff:<12}")

    if len(courses) > 10:
        print(f"... and {len(courses) - 10} more courses")

    # Ask for confirmation
    print("\n" + "=" * 100)
    response = input("⚠️  Proceed with import? (yes/no): ").strip().lower()

    if response != 'yes':
        print("\n❌ Import cancelled")
        return

    # Get existing courses
    print("\n📋 Checking for existing courses...")
    existing = supabase.table('courses').select('name').execute()
    existing_names = {row['name'] for row in existing.data}
    print(f"   Found {len(existing_names)} existing courses")

    # Import
    inserted = 0
    skipped = 0
    errors = []

    print(f"\n💾 Importing {len(courses)} courses...\n")

    for idx, course in enumerate(courses, 1):
        name = course['name']

        # Skip if exists
        if name in existing_names:
            print(f"  ⏭️  {idx:3d}. {name[:60]:<60} - exists")
            skipped += 1
            continue

        try:
            result = supabase.table('courses').insert(course).execute()
            print(f"  ✅ {idx:3d}. {name[:60]:<60} - imported")
            inserted += 1
            existing_names.add(name)
        except Exception as e:
            error_msg = f"{name}: {str(e)}"
            errors.append(error_msg)
            print(f"  ❌ {idx:3d}. {name[:60]:<60} - ERROR: {str(e)[:30]}")

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
        print(f"\n🎉 Successfully imported {inserted} courses with difficulty ratings!")
        print("\n📌 Next Step: Run csv_import_03_athletes.py")

    return inserted, skipped, errors

if __name__ == '__main__':
    import_courses()
