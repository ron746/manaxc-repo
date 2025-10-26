#!/usr/bin/env python3
"""
STEP 1: Import Courses from CSV

Imports courses from 'westmont-xc-results - courses.csv'
CSV has: name, venue, distance_meters, distance_display, difficulty_rating

Current schema courses table has:
  - name TEXT
  - venue TEXT (not a foreign key, just text)
  - distance_meters INT
  - difficulty_rating NUMERIC
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
    print("STEP 1: IMPORT COURSES FROM CSV")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Read CSV
    print(f"\n📂 Reading {CSV_FILE}...")
    courses = []

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Clean up the name (remove leading/trailing spaces and commas)
            name = row['name'].strip()
            venue = row['venue'].strip() if row['venue'] else ''

            course = {
                'name': name,
                'venue': venue,
                'distance_meters': int(row['distance_meters']) if row['distance_meters'] else None,
                'difficulty_rating': float(row['difficulty_rating']) if row['difficulty_rating'] else None,
                'location': 'California'  # Default location
            }
            courses.append(course)

    print(f"   ✅ Loaded {len(courses)} courses from CSV")

    # Preview
    print("\n📋 Preview (first 10 courses):")
    print(f"{'Name':<45} {'Venue':<20} {'Distance':<10} {'Difficulty':<12}")
    print("-" * 100)
    for course in courses[:10]:
        name = course['name'][:43]
        venue = course['venue'][:18] if course['venue'] else 'N/A'
        dist = f"{course['distance_meters']}m" if course['distance_meters'] else 'N/A'
        diff = f"{course['difficulty_rating']:.2f}" if course['difficulty_rating'] else 'N/A'
        print(f"{name:<45} {venue:<20} {dist:<10} {diff:<12}")

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
        print("\n📌 Next Step: Run csv_import_02_athletes.py")

    return inserted, skipped, errors

if __name__ == '__main__':
    import_courses()
