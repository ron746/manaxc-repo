#!/usr/bin/env python3
"""
QUICK VARSITY REPORT - Direct from Excel
Generates adjusted times and improvement analysis WITHOUT database import
"""
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from collections import defaultdict
from supabase import create_client

# Supabase (just for course difficulty ratings)
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def parse_excel_date(excel_date_value):
    """Convert Excel date serial number to Python date"""
    try:
        excel_epoch = datetime(1899, 12, 30)
        date_value = excel_epoch + timedelta(days=float(excel_date_value))
        return date_value.date()
    except:
        return None

def parse_time_decimal_to_centiseconds(decimal_value):
    """Convert Excel decimal time to centiseconds"""
    try:
        total_seconds = float(decimal_value) * 86400
        centiseconds = int(round(total_seconds * 100))
        return centiseconds
    except:
        return None

def format_time_cs(cs):
    """Format centiseconds to MM:SS.ss"""
    if not cs:
        return "N/A"
    total_seconds = cs / 100
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:05.2f}"

def calculate_adjusted_time(time_cs, difficulty):
    """Adjust time to standard course (difficulty = 1.0)"""
    if not time_cs or not difficulty or difficulty == 0:
        return time_cs
    return int(time_cs / difficulty)

def main():
    print("=" * 120)
    print("WESTMONT XC - QUICK VARSITY EVALUATION REPORT")
    print("=" * 120)

    # Get course difficulty ratings
    print("\n1. Loading course difficulty ratings...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    courses_result = supabase.table('courses').select('name, difficulty_rating').execute()

    course_ratings = {}
    for course in courses_result.data:
        if course['difficulty_rating']:
            course_ratings[course['name']] = course['difficulty_rating']

    print(f"   ✅ Loaded {len(course_ratings)} course ratings")

    # Read Excel
    print("\n2. Reading Excel file...")
    excel_file = '../../reference/data/westmont-xc-results.xlsx'
    z = zipfile.ZipFile(excel_file)

    # Get shared strings
    strings_xml = z.read('xl/sharedStrings.xml')
    strings_root = ET.fromstring(strings_xml)
    ns_strings = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    shared_strings = []
    for si in strings_root.findall('.//s:si', ns_strings):
        t = si.find('.//s:t', ns_strings)
        if t is not None and t.text:
            shared_strings.append(t.text)

    # Read MasterResults
    sheet_xml = z.read('xl/worksheets/sheet7.xml')
    sheet_root = ET.fromstring(sheet_xml)
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    # Parse rows
    athletes_data = defaultdict(lambda: defaultdict(list))
    rows = sheet_root.findall('.//s:row', ns)

    for row in rows[1:]:  # Skip header
        cells = row.findall('.//s:c', ns)
        if len(cells) < 8:
            continue

        values = []
        for cell in cells[:10]:
            v = cell.find('.//s:v', ns)
            t = cell.get('t')
            if v is not None:
                if t == 's':
                    idx = int(v.text)
                    if idx < len(shared_strings):
                        values.append(shared_strings[idx])
                    else:
                        values.append('')
                else:
                    values.append(v.text)
            else:
                values.append('')

        if len(values) < 8:
            continue

        date_serial = values[0]
        athlete_name = values[1]
        grade_year = values[2]
        duration_decimal = values[3]
        course_name = values[5]

        if not athlete_name or not duration_decimal or not course_name:
            continue

        meet_date = parse_excel_date(date_serial)
        if not meet_date:
            continue

        # Determine season (Aug-Nov = next year)
        season = meet_date.year + 1 if meet_date.month >= 8 else meet_date.year

        # Only 2024 and 2025 seasons
        if season not in [2024, 2025]:
            continue

        time_cs = parse_time_decimal_to_centiseconds(duration_decimal)
        if not time_cs:
            continue

        # Get difficulty rating
        difficulty = course_ratings.get(course_name, 1.0)
        adjusted_time_cs = calculate_adjusted_time(time_cs, difficulty)

        athletes_data[athlete_name][season].append({
            'date': meet_date,
            'course': course_name,
            'time_cs': time_cs,
            'adjusted_cs': adjusted_time_cs,
            'difficulty': difficulty,
            'grade': grade_year
        })

    print(f"   ✅ Parsed data for {len(athletes_data)} athletes")

    # Calculate best times
    report_data = []
    for athlete_name, seasons in athletes_data.items():
        best_2024 = min([r['adjusted_cs'] for r in seasons[2024]], default=None) if seasons[2024] else None
        best_2025 = min([r['adjusted_cs'] for r in seasons[2025]], default=None) if seasons[2025] else None

        improvement_cs = None
        improvement_pct = None

        if best_2024 and best_2025:
            improvement_cs = best_2024 - best_2025
            improvement_pct = (improvement_cs / best_2024) * 100

        grade = seasons[2025][0]['grade'] if seasons[2025] else (seasons[2024][0]['grade'] if seasons[2024] else 'N/A')

        report_data.append({
            'name': athlete_name,
            'grade': grade,
            'best_2024': best_2024,
            'best_2025': best_2025,
            'improvement_cs': improvement_cs,
            'improvement_pct': improvement_pct,
            'races_2024': len(seasons[2024]),
            'races_2025': len(seasons[2025])
        })

    # Sort by 2025 performance
    report_data.sort(key=lambda x: x['best_2025'] if x['best_2025'] else 999999)

    # Print report
    print("\n" + "=" * 120)
    print("2025 VARSITY RANKINGS (Adjusted Times)")
    print("=" * 120)
    print(f"{'Rank':<6}{'Athlete':<30}{'Grade':<8}{'Best 2025':<12}{'Best 2024':<12}{'Improvement':<15}{'%':<8}{'Races':<8}")
    print("-" * 120)

    for idx, athlete in enumerate(report_data[:25], 1):
        if not athlete['best_2025']:
            continue

        improvement_str = ""
        pct_str = ""

        if athlete['improvement_cs'] is not None:
            if athlete['improvement_cs'] > 0:
                improvement_str = f"-{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"{athlete['improvement_pct']:.1f}%"
            else:
                improvement_str = f"+{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"-{abs(athlete['improvement_pct']):.1f}%"

        races = f"{athlete['races_2025']}/{athlete['races_2024']}"

        print(f"{idx:<6}{athlete['name']:<30}{athlete['grade']:<8}"
              f"{format_time_cs(athlete['best_2025']):<12}"
              f"{format_time_cs(athlete['best_2024']) if athlete['best_2024'] else 'N/A':<12}"
              f"{improvement_str:<15}{pct_str:<8}{races:<8}")

    print("\n" + "=" * 120)
    print("MOST IMPROVED ATHLETES (2024 → 2025)")
    print("=" * 120)

    improved = [a for a in report_data if a['improvement_cs'] and a['improvement_cs'] > 0]
    improved.sort(key=lambda x: x['improvement_cs'], reverse=True)

    print(f"{'Rank':<6}{'Athlete':<30}{'Grade':<8}{'2024 Best':<12}{'2025 Best':<12}{'Improved':<15}{'%':<8}")
    print("-" * 120)

    for idx, athlete in enumerate(improved[:15], 1):
        print(f"{idx:<6}{athlete['name']:<30}{athlete['grade']:<8}"
              f"{format_time_cs(athlete['best_2024']):<12}"
              f"{format_time_cs(athlete['best_2025']):<12}"
              f"-{format_time_cs(athlete['improvement_cs']):<15}"
              f"{athlete['improvement_pct']:.1f}%")

    print("\n" + "=" * 120)
    print(f"\nReport generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Note: Times adjusted to standard course difficulty (1.0 = track)")

if __name__ == '__main__':
    main()
