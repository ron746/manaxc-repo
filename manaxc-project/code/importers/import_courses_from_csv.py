#!/usr/bin/env python3
"""
Import courses from Courses.csv to Supabase
"""
import csv
import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def import_courses():
    """Import all courses from CSV"""

    # Initialize Supabase client
    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Read CSV file
    csv_file = '/Users/ron/manaxc/Courses.csv'
    print(f"\nReading courses from: {csv_file}")

    courses_to_import = []
    skipped = 0

    with open(csv_file, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM
        reader = csv.DictReader(f)

        for row in reader:
            # Skip empty rows
            if not row['course_name'] or not row['course_name'].strip():
                skipped += 1
                continue

            # Parse data
            course_name = row['course_name'].strip()
            distance_meters = int(float(row['distance_meters']))

            # Parse mile_difficulty (handle empty values)
            mile_difficulty = None
            if row['mile_difficulty'] and row['mile_difficulty'].strip():
                mile_difficulty = float(row['mile_difficulty'].strip())

            # Create course object
            course = {
                'name': course_name,
                'distance_meters': distance_meters,
                'difficulty_rating': mile_difficulty,
                'location': None,
                'surface_type': None,
                'distance_display': f"{distance_meters}m"
            }

            courses_to_import.append(course)

    print(f"\nFound {len(courses_to_import)} courses to import")
    print(f"Skipped {skipped} empty rows")

    # Show sample
    print("\nSample courses:")
    for course in courses_to_import[:5]:
        print(f"  - {course['name']:<45} {course['distance_meters']:>5}m  difficulty: {course['difficulty_rating']}")

    # Confirm import
    response = input(f"\nImport {len(courses_to_import)} courses to Supabase? (yes/no): ")
    if response.lower() != 'yes':
        print("Import cancelled.")
        return

    # Import to Supabase
    print("\nImporting courses...")
    imported = 0
    errors = []

    for course in courses_to_import:
        try:
            result = supabase.table('courses').insert(course).execute()
            imported += 1
            if imported % 10 == 0:
                print(f"  Imported {imported}/{len(courses_to_import)}...")
        except Exception as e:
            errors.append((course['name'], str(e)))
            print(f"  ERROR: {course['name']} - {e}")

    # Summary
    print("\n" + "="*80)
    print(f"✅ Import complete!")
    print(f"   Successfully imported: {imported}")
    print(f"   Errors: {len(errors)}")

    if errors:
        print("\nErrors encountered:")
        for name, error in errors[:10]:  # Show first 10 errors
            print(f"  - {name}: {error}")

    # Verify
    print("\nVerifying import...")
    result = supabase.table('courses').select('id, name, distance_meters, difficulty_rating').execute()
    print(f"Total courses in database: {len(result.data)}")

    return imported, errors

if __name__ == '__main__':
    try:
        imported, errors = import_courses()
        sys.exit(0 if len(errors) == 0 else 1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
