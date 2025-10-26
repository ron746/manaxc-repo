#!/usr/bin/env python3
"""
Import the 6 remaining courses that failed due to constraint
"""
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def import_remaining_courses():
    """Import the 6 courses that failed"""

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # The 6 courses that failed
    remaining_courses = [
        {'name': 'Track | 1600m', 'distance_meters': 1600, 'difficulty_rating': 0.998351972, 'distance_display': '1600m'},
        {'name': 'Zone 9', 'distance_meters': 1609, 'difficulty_rating': 0.711571513, 'distance_display': '1609m'},
        {'name': 'Zone 8', 'distance_meters': 1609, 'difficulty_rating': 0.759752796, 'distance_display': '1609m'},
        {'name': 'Zone 7', 'distance_meters': 1609, 'difficulty_rating': 0.841283108, 'distance_display': '1609m'},
        {'name': 'Zone 6', 'distance_meters': 1609, 'difficulty_rating': 0.959882284, 'distance_display': '1609m'},
        {'name': 'Camden High School | 2.65 Miles', 'distance_meters': 4265, 'difficulty_rating': 0.941730430, 'distance_display': '4265m'},
    ]

    print(f"Importing {len(remaining_courses)} remaining courses...")

    imported = 0
    for course in remaining_courses:
        try:
            course['location'] = None
            course['surface_type'] = None
            result = supabase.table('courses').insert(course).execute()
            imported += 1
            print(f"  ✅ {course['name']}")
        except Exception as e:
            print(f"  ❌ {course['name']}: {e}")

    print(f"\n✅ Imported {imported}/{len(remaining_courses)} courses")

    # Verify total
    result = supabase.table('courses').select('id').execute()
    print(f"Total courses in database: {len(result.data)}")

if __name__ == '__main__':
    import_remaining_courses()
