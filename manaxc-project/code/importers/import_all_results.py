#!/usr/bin/env python3
"""
Import ALL results from westmont-xc-results.xlsx to Supabase
Includes: schools, athletes, meets, races, results
"""
import zipfile
import xml.etree.ElementTree as ET
from supabase import create_client, Client
from datetime import datetime, timedelta
import re

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def parse_excel_date(excel_date_value):
    """Convert Excel date serial number to Python date"""
    try:
        # Excel epoch is December 30, 1899
        excel_epoch = datetime(1899, 12, 30)
        date_value = excel_epoch + timedelta(days=float(excel_date_value))
        return date_value.date()
    except:
        return None

def parse_time_decimal_to_centiseconds(decimal_value):
    """Convert Excel decimal time (fraction of day) to centiseconds"""
    try:
        # Decimal is fraction of 24 hours
        # 1 day = 86400 seconds
        total_seconds = float(decimal_value) * 86400
        centiseconds = int(round(total_seconds * 100))
        return centiseconds
    except:
        return None

def format_time_cs(cs):
    """Format centiseconds to MM:SS.ss"""
    if not cs:
        return None
    total_seconds = cs / 100
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:05.2f}"

def parse_name(full_name):
    """Parse 'Last, First' format"""
    if not full_name or ',' not in full_name:
        return full_name, full_name, ''

    parts = full_name.split(',', 1)
    last_name = parts[0].strip()
    first_name = parts[1].strip() if len(parts) > 1 else ''
    return full_name, first_name, last_name

def import_all_results():
    """Import all results from MasterResults sheet"""

    print("=" * 100)
    print("IMPORTING ALL WESTMONT XC RESULTS")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # First, ensure Westmont school exists
    print("\n1. Ensuring Westmont High School exists...")
    westmont = supabase.table('schools').select('*').eq('name', 'Westmont High School').execute()
    if westmont.data:
        school_id = westmont.data[0]['id']
        print(f"   ✅ Westmont found: {school_id}")
    else:
        result = supabase.table('schools').insert({
            'name': 'Westmont High School',
            'short_name': 'Westmont',
            'city': 'Campbell',
            'state': 'CA',
            'league': 'BVAL'
        }).execute()
        school_id = result.data[0]['id']
        print(f"   ✅ Westmont created: {school_id}")

    # Read Excel file
    excel_file = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results.xlsx'
    z = zipfile.ZipFile(excel_file)

    # Get shared strings
    print("\n2. Reading Excel file...")
    strings_xml = z.read('xl/sharedStrings.xml')
    strings_root = ET.fromstring(strings_xml)
    ns_strings = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    shared_strings = []
    for si in strings_root.findall('.//s:si', ns_strings):
        t = si.find('.//s:t', ns_strings)
        if t is not None and t.text:
            shared_strings.append(t.text)

    # Read MasterResults sheet (sheet7.xml)
    sheet_xml = z.read('xl/worksheets/sheet7.xml')
    sheet_root = ET.fromstring(sheet_xml)
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    # Parse all rows
    print("   Parsing results...")
    rows = sheet_root.findall('.//s:row', ns)

    results_data = []
    athletes_cache = {}
    courses_cache = {}
    meets_cache = {}
    races_cache = {}

    for idx, row in enumerate(rows[1:], 1):  # Skip header
        cells = row.findall('.//s:c', ns)
        if len(cells) < 8:
            continue

        # Extract values
        values = []
        for cell in cells[:10]:
            v = cell.find('.//s:v', ns)
            t = cell.get('t')
            if v is not None:
                if t == 's':
                    idx_str = int(v.text)
                    if idx_str < len(shared_strings):
                        values.append(shared_strings[idx_str])
                    else:
                        values.append('')
                else:
                    values.append(v.text)
            else:
                values.append('')

        if len(values) < 8:
            continue

        # Parse row: Date, Athlete, Grade, Duration, Event, Course, Distance, Season
        date_serial = values[0]
        athlete_name = values[1]
        grade_year = values[2]
        duration_decimal = values[3]
        event_name = values[4]
        course_name = values[5]
        distance_display = values[6]
        season_year = values[7] if len(values) > 7 else ''

        if not athlete_name or not duration_decimal or not course_name:
            continue

        # Parse date
        meet_date = parse_excel_date(date_serial)
        if not meet_date:
            continue

        # Parse season year (convert from decimal if needed)
        # XC season is fall (Aug-Nov), so it belongs to the following spring's academic year
        # Example: September 2024 race = 2024-2025 school year = season 2025
        try:
            if '.' in str(season_year):
                # It's a decimal, likely Excel format - extract year from date
                if meet_date.month >= 8:  # August or later = fall season
                    year = meet_date.year + 1  # Next spring's year
                else:
                    year = meet_date.year  # Already spring
            else:
                year = int(float(season_year))
        except:
            # Fallback: use date
            if meet_date.month >= 8:
                year = meet_date.year + 1
            else:
                year = meet_date.year

        # Parse time
        time_cs = parse_time_decimal_to_centiseconds(duration_decimal)
        if not time_cs:
            continue

        results_data.append({
            'date': meet_date,
            'athlete_name': athlete_name,
            'grade_year': grade_year,
            'time_cs': time_cs,
            'event_name': event_name if event_name else 'Unknown Meet',
            'course_name': course_name,
            'distance_display': distance_display,
            'season_year': year
        })

        if idx % 500 == 0:
            print(f"   Parsed {idx} rows...")

    print(f"\n   ✅ Parsed {len(results_data)} results")

    # Show sample
    print("\n3. Sample results:")
    for result in results_data[:5]:
        print(f"   {result['date']} | {result['athlete_name']:<20} | {format_time_cs(result['time_cs'])} | {result['course_name']}")

    # Get unique athletes, courses, meets
    unique_athletes = {}
    unique_courses = set()
    unique_meets = {}

    for result in results_data:
        # Athletes
        athlete_key = result['athlete_name']
        if athlete_key not in unique_athletes:
            full_name, first_name, last_name = parse_name(athlete_key)
            try:
                grad_year = int(float(result['grade_year']))
            except:
                grad_year = result['season_year'] + 4  # Estimate

            unique_athletes[athlete_key] = {
                'name': full_name,
                'first_name': first_name,
                'last_name': last_name,
                'grad_year': grad_year,
                'gender': 'M',  # Will need to determine
                'school_id': school_id
            }

        # Courses
        unique_courses.add(result['course_name'])

        # Meets (keyed by date + event name)
        meet_key = f"{result['date']}_{result['event_name']}"
        if meet_key not in unique_meets:
            unique_meets[meet_key] = {
                'name': result['event_name'],
                'meet_date': result['date'],
                'season_year': result['season_year'],
                'course_name': result['course_name']
            }

    print(f"\n4. Summary:")
    print(f"   Athletes: {len(unique_athletes)}")
    print(f"   Courses: {len(unique_courses)}")
    print(f"   Meets: {len(unique_meets)}")
    print(f"   Results: {len(results_data)}")

    # Auto-proceed with import (no prompt)
    print(f"\n✅ Proceeding with import of {len(results_data)} results...")

    # Import athletes
    print("\n5. Importing athletes...")
    for athlete_name, athlete_data in unique_athletes.items():
        try:
            result = supabase.table('athletes').insert(athlete_data).execute()
            athletes_cache[athlete_name] = result.data[0]['id']
        except Exception as e:
            # Might already exist
            existing = supabase.table('athletes').select('*').eq('name', athlete_data['name']).eq('school_id', school_id).execute()
            if existing.data:
                athletes_cache[athlete_name] = existing.data[0]['id']

    print(f"   ✅ {len(athletes_cache)} athletes ready")

    print("\n6. Getting course IDs...")
    for course_name in unique_courses:
        result = supabase.table('courses').select('*').eq('name', course_name).execute()
        if result.data:
            courses_cache[course_name] = result.data[0]['id']
        else:
            print(f"   ⚠️  Course not found: {course_name}")

    print(f"   ✅ {len(courses_cache)} courses found")

    # Import meets
    print("\n7. Importing meets...")
    for meet_key, meet_data in unique_meets.items():
        course_id = courses_cache.get(meet_data['course_name'])
        if not course_id:
            print(f"   ⚠️  Skipping meet (no course): {meet_data['name']}")
            continue

        try:
            result = supabase.table('meets').insert({
                'name': meet_data['name'],
                'meet_date': str(meet_data['meet_date']),
                'season_year': meet_data['season_year'],
                'course_id': course_id,
                'meet_type': 'league'
            }).execute()
            meets_cache[meet_key] = result.data[0]['id']
        except Exception as e:
            # Check if exists
            existing = supabase.table('meets').select('*').eq('name', meet_data['name']).eq('meet_date', str(meet_data['meet_date'])).execute()
            if existing.data:
                meets_cache[meet_key] = existing.data[0]['id']

    print(f"   ✅ {len(meets_cache)} meets ready")

    # Create default race for each meet
    print("\n8. Creating races...")
    for meet_key, meet_id in meets_cache.items():
        race_key = f"{meet_key}_varsity"
        if race_key not in races_cache:
            try:
                result = supabase.table('races').insert({
                    'meet_id': meet_id,
                    'name': 'Varsity',
                    'gender': 'M',
                    'division': 'Varsity',
                    'distance_meters': 5000  # Default
                }).execute()
                races_cache[meet_key] = result.data[0]['id']
            except:
                # Check if exists
                existing = supabase.table('races').select('*').eq('meet_id', meet_id).execute()
                if existing.data:
                    races_cache[meet_key] = existing.data[0]['id']

    print(f"   ✅ {len(races_cache)} races ready")

    # Import results
    print("\n9. Importing results...")
    imported_count = 0
    error_count = 0

    for idx, result in enumerate(results_data, 1):
        meet_key = f"{result['date']}_{result['event_name']}"

        athlete_id = athletes_cache.get(result['athlete_name'])
        meet_id = meets_cache.get(meet_key)
        race_id = races_cache.get(meet_key)

        if not athlete_id or not meet_id or not race_id:
            error_count += 1
            continue

        try:
            supabase.table('results').insert({
                'athlete_id': athlete_id,
                'meet_id': meet_id,
                'race_id': race_id,
                'time_cs': result['time_cs'],
                'data_source': 'excel_import',
                'is_legacy_data': True,
                'validation_status': 'imported'
            }).execute()
            imported_count += 1

            if imported_count % 100 == 0:
                print(f"   Imported {imported_count}/{len(results_data)}...")
        except Exception as e:
            error_count += 1
            if error_count <= 5:
                print(f"   Error: {e}")

    print(f"\n{'='*100}")
    print(f"✅ IMPORT COMPLETE!")
    print(f"   Successfully imported: {imported_count}")
    print(f"   Errors: {error_count}")
    print(f"{'='*100}")

if __name__ == '__main__':
    import_all_results()
