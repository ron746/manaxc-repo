#!/usr/bin/env python3
"""
Helper script to create JSON data files from simple text input
"""

import json
import sys

def parse_league_data(text):
    """
    Parse league data from text format:
    School Name - League - Subleague - City
    or
    School Name - League - City
    """
    data = {}
    for line in text.strip().split('\n'):
        if not line.strip() or line.strip().startswith('#'):
            continue

        parts = [p.strip() for p in line.split(' - ')]

        if len(parts) >= 3:
            school_name = parts[0]
            league = parts[1]

            # Check if there's a subleague
            if len(parts) == 4:
                subleague = parts[2]
                city = parts[3]
            else:
                subleague = None
                city = parts[2]

            data[school_name] = {
                'league': league,
                'city': city
            }
            if subleague:
                data[school_name]['subleague'] = subleague

    return data

def parse_division_data(text):
    """
    Parse CIF division data from text format:
    School Name - Division - City
    """
    data = {}
    for line in text.strip().split('\n'):
        if not line.strip() or line.strip().startswith('#'):
            continue

        parts = [p.strip() for p in line.split(' - ')]

        if len(parts) >= 2:
            school_name = parts[0]
            division = parts[1]
            city = parts[2] if len(parts) > 2 else 'Unknown'

            data[school_name] = {
                'division': division,
                'city': city
            }

    return data

def parse_school_ids_data(text):
    """
    Parse school IDs data from text format:
    School Name - Athletic.net ID - City
    """
    data = {}
    for line in text.strip().split('\n'):
        if not line.strip() or line.strip().startswith('#'):
            continue

        parts = [p.strip() for p in line.split(' - ')]

        if len(parts) >= 2:
            school_name = parts[0]
            athletic_id = parts[1]
            city = parts[2] if len(parts) > 2 else ''

            data[school_name] = {
                'id': int(athletic_id) if athletic_id.isdigit() else None,
                'city': city
            }

    return data

def main():
    print("="*80)
    print("📝 Data File Creator")
    print("="*80)
    print("\nWhat type of data file do you want to create?")
    print("1. League data (school name - league - subleague - city)")
    print("2. CIF Division data (school name - division - city)")
    print("3. School IDs for scraping (school name - athletic.net ID - city)")
    print()

    choice = input("Enter choice (1-3): ").strip()

    if choice == '1':
        print("\n📚 LEAGUE DATA")
        print("Enter data in format: School Name - League - Subleague - City")
        print("(or School Name - League - City if no subleague)")
        print("Press Ctrl+D (Mac/Linux) or Ctrl+Z (Windows) when done:")
        print("-" * 80)

        text = sys.stdin.read()
        data = parse_league_data(text)
        output_file = 'league_data.json'

    elif choice == '2':
        print("\n🏆 CIF DIVISION DATA")
        print("Enter data in format: School Name - Division - City")
        print("Press Ctrl+D (Mac/Linux) or Ctrl+Z (Windows) when done:")
        print("-" * 80)

        text = sys.stdin.read()
        data = parse_division_data(text)
        output_file = 'division_data.json'

    elif choice == '3':
        print("\n🆔 SCHOOL IDs FOR SCRAPING")
        print("Enter data in format: School Name - Athletic.net ID - City")
        print("Press Ctrl+D (Mac/Linux) or Ctrl+Z (Windows) when done:")
        print("-" * 80)

        text = sys.stdin.read()
        data = parse_school_ids_data(text)
        output_file = 'school_ids.json'

    else:
        print("❌ Invalid choice")
        sys.exit(1)

    # Save to file
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print("\n" + "="*80)
    print(f"✅ Created {output_file}")
    print(f"   {len(data)} schools")
    print("="*80)

    # Show preview
    print("\n📋 Preview (first 5 entries):")
    for i, (school, info) in enumerate(list(data.items())[:5]):
        print(f"  {school}: {info}")

    print(f"\n💡 Use this file with:")
    if choice == '1':
        print(f"   python3 update_schools_league_division.py league {output_file}")
    elif choice == '2':
        print(f"   python3 update_schools_league_division.py division {output_file}")
    elif choice == '3':
        print(f"   python3 scrape_school_meets_list.py {output_file} 2025")

if __name__ == '__main__':
    main()
