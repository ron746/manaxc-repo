# ManaXC Data Import System - User Guide

## Overview

The ManaXC Data Import System allows you to scrape cross country race data from Athletic.net and import it into your database. The system supports two scraping modes:
1. **Single Meet** - Scrape one meet at a time
2. **School Season** - Scrape all meets for a school's entire season

## Prerequisites

- Python 3.13+ with virtual environment set up
- Chrome browser installed
- ChromeDriver installed and in PATH
- Next.js development server running
- Supabase database configured

## Quick Start

### 1. Start the Development Server

```bash
cd /Users/ron/manaxc/manaxc-project/website
npm run dev
```

The admin interface will be available at: **http://localhost:3000/admin/import**

### 2. Scrape Data

#### Option A: Single Meet
1. Navigate to http://localhost:3000/admin/import
2. Select **"Single Meet"** mode
3. Enter either:
   - Full URL: `https://www.athletic.net/CrossCountry/meet/270614`
   - Or just the meet ID: `270614`
4. Click **"Scrape Meet"**
5. Wait for completion (typically 30-60 seconds)

#### Option B: School Season
1. Navigate to http://localhost:3000/admin/import
2. Select **"School Season"** mode
3. Enter:
   - **School ID**: e.g., `1082` (for Silver Creek High School)
   - **Season Year**: e.g., `2025`
4. Click **"Scrape School Season"**
5. Wait for completion (typically 5-10 minutes for a full season)

### 3. Import Scraped Data

1. After scraping completes, the dataset will appear in the **"Available Imports"** list
2. Click the **"Import"** button next to the dataset you want to import
3. Monitor progress in the Activity Log
4. Import complete! Data is now in your database

## Finding School IDs

To find a school's Athletic.net ID:
1. Go to https://www.athletic.net
2. Search for the school
3. Visit the school's page
4. Look at the URL: `https://www.athletic.net/school/1082/cross-country`
   - The school ID is `1082`

## Data Scraped

For each meet/race, the system captures:

### Venues
- Name, city, state
- Athletic.net ID (for duplicate detection)

### Courses
- Name, distance (in meters)
- Venue association
- Default difficulty rating: 5.0

### Schools
- Name, city, state
- Athletic.net ID

### Athletes
- Full name, first name, last name
- Graduation year (calculated from grade + season)
- Gender (from race type)
- School association

### Meets
- Name, date, season year
- Venue association
- Athletic.net ID

### Races
- Name, gender, distance
- Race type (Varsity, JV, Frosh, Reserves)
- Meet and course associations

### Results
- Time (in centiseconds)
- Overall place
- Athlete, race, and meet associations
- Automatically marked as legacy data from Athletic.net

## Output Format

Scraped data is stored in timestamped directories:
```
to-be-processed/
├── meet_270614_1761619855/
│   ├── metadata.json       # Scrape statistics
│   ├── venues.csv
│   ├── courses.csv
│   ├── schools.csv
│   ├── athletes.csv
│   ├── meets.csv
│   ├── races.csv
│   └── results.csv
└── school_1082_1761620871/
    └── (same structure)
```

## Duplicate Handling

The system automatically handles duplicates:

- **Venues**: Matched by athletic_net_id or name
- **Courses**: Matched by athletic_net_id or name+venue
- **Schools**: Matched by athletic_net_id or name
- **Athletes**: Matched by name+school+grad_year
- **Meets**: Matched by athletic_net_id or name+date
- **Races**: Matched by athletic_net_id or meet+name+gender
- **Results**: Matched by athlete+meet+race+data_source (skipped if duplicate)

**Re-importing the same data is safe** - duplicates will be skipped automatically.

## Data Quality

### Gender Detection
✅ **FIXED** - Gender is now correctly detected by:
1. Extracting race IDs from meet page
2. Visiting each individual race page
3. Reading gender from race title ("Mens" or "Womens")

### Graduation Year Calculation
✅ **FIXED** - Formula accounts for athletic calendar (July 1 - June 30):
```
grad_year = season_year + (13 - grade)
```
Example: Grade 12 in fall 2025 → Graduates spring 2026

### Race Coverage
✅ **FIXED** - All race types captured:
- Varsity
- JV (Junior Varsity)
- Frosh/Soph (Freshman/Sophomore)
- Reserves

## Troubleshooting

### Scraper Fails to Start
- **Check ChromeDriver**: Run `chromedriver --version`
- **Check Python environment**: Ensure virtual environment is activated
- **Check .env file**: Verify SUPABASE_URL and SUPABASE_KEY are set

### Import Fails with "duplicate key" Error
- This has been fixed in the latest version
- If you still see it, ensure you're using the updated `import_csv_data.py`

### No Data Appears After Import
- Check Activity Log for error messages
- Verify Supabase connection in .env file
- Check database permissions

### Scraper Only Gets Some Races
- This has been fixed - all races should now be captured
- If missing, check the metadata.json file to see what was scraped

## Database Clearing

**⚠️ WARNING: This deletes ALL data!**

To start fresh with an empty database:

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
echo "DELETE ALL DATA" | venv/bin/python3 clear_database.py
```

This will delete all data from:
- Results
- Races
- Meets
- Athletes
- Courses
- Schools
- Venues

## Command Line Usage

### Scrape Single Meet
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
venv/bin/python3 athletic_net_scraper_v2.py meet 270614
```

### Scrape School Season
```bash
venv/bin/python3 athletic_net_scraper_v2.py school 1082 2025
```

### Import CSV Data
```bash
venv/bin/python3 import_csv_data.py to-be-processed/meet_270614_1761619855
```

## File Locations

- **Scrapers**: `/Users/ron/manaxc/manaxc-project/code/importers/`
- **Web UI**: `/Users/ron/manaxc/manaxc-project/website/app/admin/import/`
- **API Routes**: `/Users/ron/manaxc/manaxc-project/website/app/api/admin/`
- **Scraped Data**: `/Users/ron/manaxc/manaxc-project/code/importers/to-be-processed/`

## Getting Help

If you encounter issues:
1. Check the Activity Log in the web UI for error messages
2. Review the terminal output from the scraper
3. Check the metadata.json file in the scraped directory for statistics
4. Ensure all prerequisites are installed and configured

## Next Steps

After importing data, you can:
1. View results in the database
2. Build visualization pages
3. Calculate difficulty ratings
4. Generate athlete performance reports
5. Create meet results pages
