#!/usr/bin/env python3
"""
Update schools with league and CIF division data using fuzzy matching
Adds new schools to database if they don't exist
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from difflib import SequenceMatcher
import json

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

supabase: Client = create_client(url, key)

# Fuzzy matching threshold (0-1, higher = more strict)
MATCH_THRESHOLD = 0.75

def similarity(a: str, b: str) -> float:
    """Calculate similarity ratio between two strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def normalize_school_name(name: str) -> str:
    """Normalize school name for comparison"""
    name = name.lower().strip()
    # Remove common suffixes
    for suffix in [' high school', ' high', ' hs', ' school']:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
    return name.strip()

def find_matching_school(target_name: str, existing_schools: list) -> tuple:
    """
    Find best matching school from existing schools using fuzzy matching
    Returns: (school_dict, confidence_score) or (None, 0) if no good match
    """
    target_normalized = normalize_school_name(target_name)
    best_match = None
    best_score = 0

    for school in existing_schools:
        # Try matching against name and short_name
        name_score = similarity(target_normalized, normalize_school_name(school['name']))
        short_name_score = 0
        if school.get('short_name'):
            short_name_score = similarity(target_normalized, normalize_school_name(school['short_name']))

        score = max(name_score, short_name_score)

        if score > best_score:
            best_score = score
            best_match = school

    if best_score >= MATCH_THRESHOLD:
        return (best_match, best_score)
    else:
        return (None, best_score)

def get_all_schools():
    """Fetch all schools from database"""
    try:
        response = supabase.table('schools').select('*').execute()
        return response.data
    except Exception as e:
        print(f"❌ Error fetching schools: {e}")
        return []

def create_school(name: str, short_name: str = None, city: str = None, state: str = 'CA'):
    """Create a new school in the database"""
    try:
        data = {
            'name': name,
            'short_name': short_name or name.replace(' High School', '').replace(' High', ''),
            'city': city,
            'state': state
        }
        response = supabase.table('schools').insert(data).execute()
        if response.data:
            print(f"  ✅ Created new school: {name} (ID: {response.data[0]['id']})")
            return response.data[0]
        return None
    except Exception as e:
        print(f"  ❌ Error creating school {name}: {e}")
        return None

def update_school_league(school_id: str, league: str, subleague: str = None):
    """Update school's league information"""
    try:
        data = {'league': league}
        if subleague:
            data['subleague'] = subleague

        response = supabase.table('schools').update(data).eq('id', school_id).execute()
        return response.data is not None
    except Exception as e:
        print(f"  ❌ Error updating league for school {school_id}: {e}")
        return False

def update_school_cif_division(school_id: str, cif_division: str, cif_section: str = None):
    """Update school's CIF division and section"""
    try:
        data = {'cif_division': cif_division}
        if cif_section:
            data['cif_section'] = cif_section

        response = supabase.table('schools').update(data).eq('id', school_id).execute()
        return response.data is not None
    except Exception as e:
        print(f"  ❌ Error updating CIF division for school {school_id}: {e}")
        return False

def process_league_updates(league_data: dict, existing_schools: list):
    """
    Process league updates for a dictionary of schools
    Format: {'School Name': {'league': 'BVAL', 'subleague': 'Mt Hamilton', 'city': 'San Jose'}}
    """
    print("\n" + "="*80)
    print("📚 PROCESSING LEAGUE UPDATES")
    print("="*80)

    stats = {'updated': 0, 'created': 0, 'failed': 0, 'skipped': 0}

    for school_name, info in league_data.items():
        print(f"\n🏫 {school_name}")

        # Find matching school
        match, confidence = find_matching_school(school_name, existing_schools)

        if match:
            print(f"  ✓ Matched to: '{match['name']}' (confidence: {confidence:.2%})")

            # Update league
            if update_school_league(match['id'], info['league'], info.get('subleague')):
                print(f"  ✅ Updated league: {info['league']}")
                if info.get('subleague'):
                    print(f"     Subleague: {info['subleague']}")
                stats['updated'] += 1
            else:
                print(f"  ❌ Failed to update league")
                stats['failed'] += 1
        else:
            # No match found - create new school
            print(f"  ⚠️  No match found (best: {confidence:.2%})")
            print(f"  → Creating new school...")

            school = create_school(
                name=school_name,
                short_name=info.get('short_name'),
                city=info.get('city', 'Unknown'),
                state=info.get('state', 'CA')
            )

            if school:
                # Update with league info
                if update_school_league(school['id'], info['league'], info.get('subleague')):
                    print(f"  ✅ Set league: {info['league']}")
                    stats['created'] += 1
                    # Add to existing schools for subsequent matches
                    existing_schools.append(school)
                else:
                    stats['failed'] += 1
            else:
                stats['failed'] += 1

    return stats

def process_cif_division_updates(division_data: dict, existing_schools: list):
    """
    Process CIF division updates for a dictionary of schools
    Format: {'School Name': {'division': 'I', 'section': 'Central Coast Section', 'city': 'San Jose'}}
    """
    print("\n" + "="*80)
    print("🏆 PROCESSING CIF DIVISION UPDATES")
    print("="*80)

    stats = {'updated': 0, 'created': 0, 'failed': 0, 'skipped': 0}

    for school_name, info in division_data.items():
        print(f"\n🏫 {school_name}")

        # Find matching school
        match, confidence = find_matching_school(school_name, existing_schools)

        if match:
            print(f"  ✓ Matched to: '{match['name']}' (confidence: {confidence:.2%})")

            # Update CIF division and section
            if update_school_cif_division(match['id'], info['division'], info.get('section')):
                print(f"  ✅ Updated CIF Division: {info['division']}")
                if info.get('section'):
                    print(f"     CIF Section: {info['section']}")
                stats['updated'] += 1
            else:
                print(f"  ❌ Failed to update CIF division")
                stats['failed'] += 1
        else:
            # No match found - create new school
            print(f"  ⚠️  No match found (best: {confidence:.2%})")
            print(f"  → Creating new school...")

            school = create_school(
                name=school_name,
                short_name=info.get('short_name'),
                city=info.get('city', 'Unknown'),
                state=info.get('state', 'CA')
            )

            if school:
                # Update with CIF division and section
                if update_school_cif_division(school['id'], info['division'], info.get('section')):
                    print(f"  ✅ Set CIF Division: {info['division']}")
                    if info.get('section'):
                        print(f"     CIF Section: {info['section']}")
                    stats['created'] += 1
                    # Add to existing schools for subsequent matches
                    existing_schools.append(school)
                else:
                    stats['failed'] += 1
            else:
                stats['failed'] += 1

    return stats

def main():
    """Main execution"""

    # Example data structures - you'll provide the actual data
    # Format for league updates:
    league_data = {}

    # Format for CIF division updates:
    division_data = {}

    # Check if data files are provided
    if len(sys.argv) < 2:
        print("Usage: python3 update_schools_league_division.py <mode> [data_file]")
        print("\nModes:")
        print("  league   - Update schools with league data")
        print("  division - Update schools with CIF division data")
        print("  both     - Update both league and division (requires 2 files)")
        print("\nData file format (JSON):")
        print('  League: {"School Name": {"league": "BVAL", "subleague": "Mt Hamilton", "city": "San Jose"}}')
        print('  Division: {"School Name": {"division": "I", "city": "San Jose"}}')
        sys.exit(1)

    mode = sys.argv[1].lower()

    # Load existing schools
    print("📊 Loading existing schools from database...")
    existing_schools = get_all_schools()
    print(f"   Found {len(existing_schools)} schools\n")

    stats_total = {'updated': 0, 'created': 0, 'failed': 0, 'skipped': 0}

    if mode == 'league':
        if len(sys.argv) < 3:
            print("❌ Please provide league data file")
            sys.exit(1)

        with open(sys.argv[2], 'r') as f:
            league_data = json.load(f)

        stats = process_league_updates(league_data, existing_schools)
        for key in stats_total:
            stats_total[key] += stats[key]

    elif mode == 'division':
        if len(sys.argv) < 3:
            print("❌ Please provide division data file")
            sys.exit(1)

        with open(sys.argv[2], 'r') as f:
            division_data = json.load(f)

        stats = process_cif_division_updates(division_data, existing_schools)
        for key in stats_total:
            stats_total[key] += stats[key]

    elif mode == 'both':
        if len(sys.argv) < 4:
            print("❌ Please provide both league and division data files")
            sys.exit(1)

        with open(sys.argv[2], 'r') as f:
            league_data = json.load(f)
        with open(sys.argv[3], 'r') as f:
            division_data = json.load(f)

        stats = process_league_updates(league_data, existing_schools)
        for key in stats_total:
            stats_total[key] += stats[key]

        # Refresh schools list after league updates
        existing_schools = get_all_schools()

        stats = process_cif_division_updates(division_data, existing_schools)
        for key in stats_total:
            stats_total[key] += stats[key]

    else:
        print(f"❌ Invalid mode: {mode}")
        sys.exit(1)

    # Print summary
    print("\n" + "="*80)
    print("📊 FINAL SUMMARY")
    print("="*80)
    print(f"Schools updated:  {stats_total['updated']}")
    print(f"Schools created:  {stats_total['created']}")
    print(f"Failed:           {stats_total['failed']}")
    print(f"Skipped:          {stats_total['skipped']}")
    print("="*80)

if __name__ == '__main__':
    main()
