#!/usr/bin/env python3
"""
Orchestrates the import of all 7 normalized CSV files for a given scrape.
"""
import subprocess
import sys

def run_import(script_name, file_prefix):
    """Runs a given import script."""
    print(f"\n--- Running {script_name} ---")
    try:
        subprocess.run(["python3", script_name, file_prefix], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running {script_name}: {e}")
        sys.exit(1)

def main(school_id, season):
    """Runs all import scripts in the correct order."""
    file_prefix = f"athletic-net-{school_id}-{season}"
    print(f"Starting import for prefix: {file_prefix}")

    importers = [
        "csv_import_01_venues.py",
        "csv_import_02_courses.py",
        "csv_import_03_athletes.py",
        "csv_import_04_meets.py",
        "csv_import_05_races.py",
        "csv_import_06_results.py",
    ]

    for importer in importers:
        run_import(importer, file_prefix)

    print("\n--- All imports complete! ---")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 import_all.py <schoolId> <season>")
        sys.exit(1)
    
    school_id = sys.argv[1]
    season = sys.argv[2]
    main(school_id, season)
