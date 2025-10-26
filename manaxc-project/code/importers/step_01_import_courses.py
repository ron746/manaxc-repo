#!/usr/bin/env python3
"""
STEP 1: Import Courses from Westmont XC Results Excel

Extracts unique courses from westmont-xc-results.xlsx and imports them to Supabase.
This is the first step in the table-by-table import process.

Course format in Excel: "Crystal Springs | 2.95 Miles"
"""
import zipfile
import xml.etree.ElementTree as ET
from supabase import create_client, Client
import re

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def parse_distance_to_meters(distance_str):
    """
    Convert distance string to meters.
    Examples:
        '2.95 Miles' -> 4748
        '3 miles' -> 4828
        '5K' -> 5000
    """
    if not distance_str:
        return None

    distance_str = distance_str.strip().lower()

    # Extract number
    match = re.search(r'(\d+\.?\d*)', distance_str)
    if not match:
        return None

    value = float(match.group(1))

    # Convert to meters
    if 'mile' in distance_str:
        return int(value * 1609.34)  # miles to meters
    elif 'k' in distance_str or 'km' in distance_str:
        return int(value * 1000)  # km to meters
    elif 'm' in distance_str:
        return int(value)  # already meters
    else:
        # Assume miles if no unit
        return int(value * 1609.34)

def parse_course_string(course_str):
    """
    Parse course string like 'Crystal Springs | 2.95 Miles'
    Returns: (name, distance_display, distance_meters)
    """
    if not course_str:
        return None, None, None

    # Split by pipe
    if '|' in course_str:
        parts = course_str.split('|')
        name = parts[0].strip()
        distance_display = parts[1].strip() if len(parts) > 1 else None
    else:
        name = course_str.strip()
        distance_display = None

    # Convert distance to meters
    distance_meters = parse_distance_to_meters(distance_display) if distance_display else None

    return name, distance_display, distance_meters

def extract_courses_from_excel(excel_file):
    """Extract unique courses from Excel file"""
    print("=" * 100)
    print("STEP 1: EXTRACT COURSES FROM WESTMONT XC RESULTS")
    print("=" * 100)

    print(f"\n📂 Reading Excel file: {excel_file}")

    # Open Excel file as ZIP
    z = zipfile.ZipFile(excel_file)

    # Read shared strings
    print("   Loading shared strings...")
    strings_xml = z.read('xl/sharedStrings.xml')
    strings_root = ET.fromstring(strings_xml)
    ns_strings = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    shared_strings = []
    for si in strings_root.findall('.//s:si', ns_strings):
        t = si.find('.//s:t', ns_strings)
        if t is not None and t.text:
            shared_strings.append(t.text)

    # Read MasterResults sheet (sheet7.xml)
    print("   Loading worksheet data...")
    sheet_xml = z.read('xl/worksheets/sheet7.xml')
    sheet_root = ET.fromstring(sheet_xml)
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    # Parse rows and extract courses
    rows = sheet_root.findall('.//s:row', ns)
    course_names = set()

    print("   Parsing courses from results...")
    for row in rows[1:]:  # Skip header
        cells = row.findall('.//s:c', ns)
        if len(cells) < 6:
            continue

        # Course is in column 6 (index 5)
        course_cell = cells[5] if len(cells) > 5 else None
        if course_cell is None:
            continue

        v = course_cell.find('.//s:v', ns)
        t = course_cell.get('t')

        if v is not None and t == 's':
            idx_str = int(v.text)
            if idx_str < len(shared_strings):
                course_name = shared_strings[idx_str]
                if course_name:
                    course_names.add(course_name)

    print(f"\n✅ Found {len(course_names)} unique courses")

    # Parse course details
    courses = []
    for course_str in sorted(course_names):
        name, distance_display, distance_meters = parse_course_string(course_str)

        if name:
            courses.append({
                'name': name,
                'distance_display': distance_display,
                'distance_meters': distance_meters,
                'original': course_str
            })

    return courses

def preview_courses(courses):
    """Show preview of courses to be imported"""
    print("\n" + "=" * 100)
    print("COURSE PREVIEW")
    print("=" * 100)
    print(f"\nShowing first 20 of {len(courses)} courses:\n")

    for idx, course in enumerate(courses[:20], 1):
        meters = f"{course['distance_meters']}m" if course['distance_meters'] else "unknown"
        display = course['distance_display'] or "N/A"
        print(f"{idx:2d}. {course['name']:<40} | {display:<15} | {meters}")

    if len(courses) > 20:
        print(f"\n... and {len(courses) - 20} more courses")

def import_courses(courses, dry_run=False):
    """Import courses to Supabase"""
    print("\n" + "=" * 100)
    print("IMPORTING COURSES TO SUPABASE")
    print("=" * 100)

    if dry_run:
        print("\n🔍 DRY RUN MODE - No data will be inserted")
        return 0, 0, []

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get existing courses
    print("\n📋 Checking for existing courses...")
    existing_response = supabase.table('courses').select('name').execute()
    existing_names = {row['name'] for row in existing_response.data}
    print(f"   Found {len(existing_names)} existing courses in database")

    # Import courses
    inserted = 0
    skipped = 0
    errors = []

    print(f"\n💾 Importing {len(courses)} courses...\n")

    for idx, course in enumerate(courses, 1):
        name = course['name']

        # Skip if already exists
        if name in existing_names:
            print(f"  ⏭️  {idx:2d}. {name:<40} - already exists")
            skipped += 1
            continue

        # Prepare course data for Supabase
        course_data = {
            'name': name,
            'distance_meters': course['distance_meters'],
            'location': 'California',  # Default location, can update later
        }

        # Add optional fields if they exist
        if course['distance_display']:
            course_data['distance_display'] = course['distance_display']

        try:
            result = supabase.table('courses').insert(course_data).execute()
            print(f"  ✅ {idx:2d}. {name:<40} - imported")
            inserted += 1
            existing_names.add(name)  # Add to cache to prevent duplicates
        except Exception as e:
            error_msg = f"{name}: {str(e)}"
            errors.append(error_msg)
            print(f"  ❌ {idx:2d}. {name:<40} - ERROR: {str(e)}")

    # Summary
    print("\n" + "=" * 100)
    print("IMPORT SUMMARY")
    print("=" * 100)
    print(f"✅ Inserted: {inserted}")
    print(f"⏭️  Skipped:  {skipped} (already existed)")
    print(f"❌ Errors:   {len(errors)}")

    if errors:
        print("\n⚠️  Errors encountered:")
        for error in errors[:10]:  # Show first 10 errors
            print(f"   - {error}")
        if len(errors) > 10:
            print(f"   ... and {len(errors) - 10} more errors")

    return inserted, skipped, errors

def main():
    """Main import workflow"""
    excel_file = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results.xlsx'

    # Step 1: Extract courses from Excel
    courses = extract_courses_from_excel(excel_file)

    # Step 2: Preview courses
    preview_courses(courses)

    # Step 3: Ask for confirmation
    print("\n" + "=" * 100)
    response = input("\n⚠️  Proceed with import? (yes/no): ").strip().lower()

    if response != 'yes':
        print("\n❌ Import cancelled")
        return

    # Step 4: Import courses
    inserted, skipped, errors = import_courses(courses, dry_run=False)

    # Step 5: Final summary
    print("\n" + "=" * 100)
    print("✅ STEP 1 COMPLETE: COURSES IMPORTED")
    print("=" * 100)
    print(f"\nTotal courses processed: {len(courses)}")
    print(f"Successfully imported:    {inserted}")
    print(f"Skipped (duplicates):     {skipped}")
    print(f"Failed:                   {len(errors)}")

    if inserted > 0:
        print(f"\n🎉 {inserted} new courses added to database!")
        print("\n📌 Next Step: Run step_02_import_athletes.py")
    elif skipped == len(courses):
        print("\n✅ All courses already exist in database")
        print("\n📌 Next Step: Run step_02_import_athletes.py")
    else:
        print("\n⚠️  Some courses failed to import. Check errors above.")

if __name__ == '__main__':
    main()
