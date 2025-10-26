#!/usr/bin/env python3
"""
Quick extraction of courses from Excel - no dependencies needed
"""
import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_courses(excel_file):
    """Extract course data from Course Rating Logic.xlsx"""
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

    # Get worksheet data
    sheet_xml = z.read('xl/worksheets/sheet1.xml')
    sheet_root = ET.fromstring(sheet_xml)
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    courses = []

    print("\nCOURSES FROM YOUR EXCEL FILE:")
    print("=" * 120)
    print(f"{'Course Name':<45} | {'Distance (m)':<12} | {'XC Rating':<15} | {'Mile Difficulty':<15}")
    print("=" * 120)

    for row in sheet_root.findall('.//s:row', ns):
        cells = row.findall('.//s:c', ns)
        if len(cells) < 3:
            continue

        values = []
        for i, cell in enumerate(cells):
            if i >= 6:  # Only need first 6 columns
                break
            v = cell.find('.//s:v', ns)
            t = cell.get('t')
            if v is not None:
                if t == 's':  # String reference
                    idx = int(v.text)
                    if idx < len(shared_strings):
                        values.append(shared_strings[idx])
                    else:
                        values.append('')
                else:
                    values.append(v.text)
            else:
                values.append('')

        # Skip headers and empty rows
        if len(values) >= 4 and values[0] and \
           'Course' not in values[0] and 'Description' not in values[0] and \
           values[0] not in ['Race Time', 'Distance In Meters']:

            course_name = values[0]
            distance = values[1] if len(values) > 1 else ''
            xc_rating = values[2] if len(values) > 2 else ''
            mile_diff = values[3] if len(values) > 3 else ''

            # Skip if no numeric data
            try:
                if distance:
                    float(distance)
                if not distance and not xc_rating and not mile_diff:
                    continue
            except:
                continue

            print(f"{course_name:<45} | {distance:<12} | {xc_rating:<15} | {mile_diff:<15}")

            courses.append({
                'name': course_name,
                'distance_meters': float(distance) if distance else None,
                'xc_rating': float(xc_rating) if xc_rating else None,
                'mile_difficulty': float(mile_diff) if mile_diff else None
            })

    print("=" * 120)
    print(f"\nTotal courses found: {len(courses)}")
    return courses

if __name__ == '__main__':
    excel_file = '../../reference/data/Course Rating Logic.xlsx'
    courses = extract_courses(excel_file)
