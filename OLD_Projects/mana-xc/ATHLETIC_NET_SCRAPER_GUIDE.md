# Athletic.net Scraper - Complete Guide

## Overview

This scraper automatically downloads **all race results** for a given high school team and season from Athletic.net. It extracts athlete names, times, places, schools, and converts everything to the correct format for your database.

**NEW**: Admin UI now available at `/admin/scraper` for one-click scraping and batch import!

---

## What It Does

1. **Finds all meets** for a school/season
2. **Scrapes each meet's "All Results" page**
3. **Extracts all race data** (Varsity, JV, Reserves, etc.)
4. **Parses athlete results** (Name, Time, Place, Grade, School)
5. **Converts times to centiseconds** (follows your CENTISECONDS rule)
6. **Extracts meet dates** (e.g., "Sep 11, 2025")
7. **Detects duplicates** by comparing Athletic.net meet IDs
8. **Generates CSV + JSON** files ready for import

---

## Two Ways to Use

### Option A: Admin UI (Recommended)

Navigate to **http://localhost:3001/admin/scraper** (requires admin login)

**Benefits:**
- No command line needed
- Visual interface
- One-click batch import to database
- Review data before importing
- Download CSV/JSON files

**Steps:**
1. Enter School ID (e.g., 1076)
2. Enter Season (e.g., 2025)
3. Click "Scrape Results"
4. Review the summary
5. Click "Import to Database" (optional)

### Option B: Command Line

Use this for automation or when the UI is unavailable.

---

## Installation

Already done! Puppeteer is installed in `/Users/ron/mana-xc/`

---

## Usage

### Basic Command

```bash
cd ~/mana-xc
node scripts/athletic-net-scraper-v2.js <schoolId> <season>
```

### Example

```bash
node scripts/athletic-net-scraper-v2.js 1076 2025
```

This will scrape **Westmont High School** for the **2025 season**.

---

## Finding School IDs

School IDs are in the Athletic.net URL:

```
https://www.athletic.net/team/1076/cross-country/2025
                              ^^^^
                           School ID
```

**Examples:**
- Westmont: 1076
- Silver Creek: 1082
- Pioneer: 1080
- Andrew Hill: 1063

---

## Output Files

The scraper creates two files:

### 1. CSV File
`athletic-net-{schoolId}-{season}.csv`

**Format:**
```csv
Meet ID,Meet Name,Meet Date,Location,Race Name,Gender,Place,Grade,Athlete,Time,Time (cs),School
265306,"STAL #1","Sep 11, 2025","Montgomery Hill Park, CA  US","2.74 Miles Varsity",M,1,12,"Vincent Cheung",15:05.5,90550,"Silver Creek"
```

**Columns:**
- **Meet ID**: Athletic.net meet ID (e.g., 265306) - **NEW** for duplicate detection
- **Meet Name**: e.g., "STAL #1"
- **Meet Date**: e.g., "Sep 11, 2025" - **FIXED** now extracts correctly
- **Location**: e.g., "Montgomery Hill Park, CA  US"
- **Race Name**: e.g., "2.74 Miles Varsity"
- **Gender**: M or F
- **Place**: 1, 2, 3, etc.
- **Grade**: 9, 10, 11, or 12
- **Athlete**: Full name (e.g., "Edgar Gomez Tapia")
- **Time**: Original format (e.g., "15:05.5")
- **Time (cs)**: **CENTISECONDS** (e.g., 90550)
- **School**: School name

### 2. JSON File
`athletic-net-{schoolId}-{season}.json`

Structured data with full meet hierarchy:
```json
[
  {
    "meetId": "265306",
    "meetName": "STAL #1",
    "date": "",
    "location": "Montgomery Hill Park, CA  US",
    "races": [
      {
        "raceId": "1053255",
        "raceName": "2.74 Miles Varsity",
        "gender": "M",
        "results": [
          {
            "place": 1,
            "grade": 12,
            "fullName": "Vincent Cheung",
            "time": "15:05.5",
            "school": "Silver Creek"
          }
        ]
      }
    ]
  }
]
```

---

## Test Results

### Westmont 2025 Season

```
✅ SCRAPING COMPLETE!
   📁 CSV: athletic-net-1076-2025.csv
   📁 JSON: athletic-net-1076-2025.json
   📊 4 meets with results
   👥 2,776 total athlete results

   STAL #1:
      - 2.74 Miles Varsity (M): 41 athletes
      - 2.74 Miles Junior Varsity (M): 36 athletes
      - 2.74 Miles Reserves (M): 49 athletes
      - 2.74 Miles Varsity (F): 36 athletes
      - 2.74 Miles Junior Varsity (F): 22 athletes
      - 2.74 Miles Reserves (F): 5 athletes

   Baylands Invitational:
      - 4,000 Meters Freshmen (M): 210 athletes
      - 4,000 Meters Sophomore (M): 203 athletes
      - 4,000 Meters Junior (M): 143 athletes
      - 4,000 Meters Senior (M): 165 athletes
      - 4,000 Meters Freshmen (F): 63 athletes
      - 4,000 Meters Sophomore (F): 99 athletes
      - 4,000 Meters Junior (F): 63 athletes
      - 4,000 Meters Senior (F): 50 athletes

   (... and 2 more meets)
```

**Total: 2,776 athlete results from 4 meets!**

---

## Importing to Your Database

### Option 1: Admin UI Batch Import (Recommended)

1. Use the scraper UI at http://localhost:3001/admin/scraper
2. After scraping completes, click "Import to Database"
3. The batch import will:
   - Check for duplicate meets using Athletic.net meet IDs
   - Create/match courses and schools automatically
   - Create/match athletes by name and school
   - Import all results with times in centiseconds
   - Skip meets that already exist

### Option 2: Manual Import Wizard

1. Open http://localhost:3001/admin/import
2. Step 1: Enter meet info manually
3. Step 2: Upload the CSV file
4. Step 3-5: Follow the wizard

### Option 3: Direct CSV Import

The CSV is already in the correct format for your database. You can:
1. Parse it with your existing CSV parser
2. Split names into first/last
3. The `Time (cs)` column is already in centiseconds!

---

## Time Conversion Verification

The scraper **correctly converts times to centiseconds**:

| Original Time | Centiseconds | Calculation |
|--------------|--------------|-------------|
| 15:05.5 | 90550 | (15 × 6000) + (5 × 100) + 50 |
| 17:51.2 | 107120 | (17 × 6000) + (51 × 100) + 20 |
| 23:34.3 | 141430 | (23 × 6000) + (34 × 100) + 30 |

**Formula**: `MM × 6000 + SS × 100 + CC`

---

## Data Mapping to Your Schema

### Meet Data
- `meetName` → `meets.name`
- `location` → Course (you'll need to create/match courses)
- `date` → `meets.date`

### Race Data
- `raceName` → Used to create `races.name`
- `gender` → Determines which race (Boys vs Girls)
- Distance from race name (e.g., "2.74 Miles" → 4409 meters)

### Result Data
- `fullName` → Split into `athletes.first_name` + `athletes.last_name`
- `time_cs` → `results.time_cs` (already in centiseconds!)
- `place` → `results.place_overall`
- `grade` → Can be used for maturation curves
- `school` → Match to `schools.name` or create new

---

## Recent Fixes

### 1. Date Extraction - ✅ FIXED
**Was:** Meet dates were not being extracted
**Now:** Dates are correctly captured (e.g., "Sep 11, 2025")
**Implementation:** Pattern matching for "Thu, Sep 11, 2025" format

### 2. Duplicate Detection - ✅ IMPLEMENTED
**Was:** Scraper would re-download all meets every time
**Now:** Automatically skips meets already scraped
**Implementation:** Compares Athletic.net meet IDs from existing JSON files
**Output Example:** "📊 4 total meets (1 new, 3 existing)"

### 3. Meet ID Tracking - ✅ ADDED
**Was:** No way to track Athletic.net meet IDs in database
**Now:** Meet ID column added to CSV output
**Benefit:** Enables database-level duplicate detection

## Known Issues

### 1. Course Matching
**Issue:** Batch import creates new courses instead of matching existing ones
**Workaround:** Use manual import wizard for better course control
**Future:** Add fuzzy matching for course names

---

## Advanced Usage

### Scrape Multiple Schools

Create a bash script:

```bash
#!/bin/bash
# scrape-all-schools.sh

schools=(1076 1082 1080 1063 1065 1084)

for school in "${schools[@]}"
do
    echo "Scraping school $school..."
    node scripts/athletic-net-scraper-v2.js $school 2025
    sleep 5  # Be nice to the server
done
```

Run:
```bash
chmod +x scrape-all-schools.sh
./scrape-all-schools.sh
```

### Scrape Multiple Seasons

```bash
for season in 2023 2024 2025
do
    node scripts/athletic-net-scraper-v2.js 1076 $season
done
```

---

## Performance

- **Speed**: ~5-10 seconds per meet
- **Rate limiting**: Built-in 2-second delay between meets
- **Memory**: Low (closes pages after each scrape)

### Example Timing
- 4 meets: ~30-40 seconds
- 10 meets: ~1-2 minutes

---

## Troubleshooting

### "No meets found"
- Check the school ID is correct
- Verify the season exists on Athletic.net
- The school might not have posted results yet

### "0 races found"
- The meet might not have results published yet
- Try visiting the meet URL manually to verify

### Scraper crashes
- Increase timeout in code (line 23-24)
- Check your internet connection
- Athletic.net might be down

---

## Next Steps

### To Fully Automate Import

1. **Add Duplicate Detection**
   - Check if meet already exists by name + date
   - Skip meets that are already in your database

2. **Auto-Match Courses**
   - Create a mapping of locations → course IDs
   - Or create new courses automatically

3. **Auto-Match Schools**
   - Look up schools by name in your database
   - Create new schools if needed

4. **Add to Admin Panel**
   - Create `/admin/scrape-athletic-net` page
   - UI to enter school ID and season
   - Show preview before importing
   - Click "Import" to add to database

---

## Example Workflows

### Workflow A: Using Admin UI (Easiest)

```
1. Navigate to http://localhost:3001/admin/scraper
2. Enter:
   - School ID: 1076
   - Season: 2025
3. Click "Scrape Results"
4. Wait 30-60 seconds
5. Review summary:
   - ✅ 4 total meets (1 new, 3 existing)
   - 👥 2,776 total athlete results
6. Click "Import to Database"
7. Done! Data is now in Supabase
```

### Workflow B: Command Line + Manual Import

```bash
# 1. Scrape the data
node scripts/athletic-net-scraper-v2.js 1076 2025

# 2. Review the output
head -20 athletic-net-1076-2025.csv

# 3. Check the summary
grep "meetName\|raceName" athletic-net-1076-2025.json

# 4. Import via wizard
# Open http://localhost:3001/admin/import
# Upload athletic-net-1076-2025.csv
```

---

## Files Created

- `/Users/ron/mana-xc/scripts/athletic-net-scraper-v2.js` - Main scraper
- `/Users/ron/mana-xc/scripts/analyze-athletic-net.js` - Analysis tool
- `/Users/ron/mana-xc/scripts/analyze-meet-page.js` - Meet analyzer
- `/Users/ron/mana-xc/scripts/scrape-all-results.js` - All results scraper

---

## Credits

- Scraper built using Puppeteer (headless Chrome)
- Follows Athletic.net robots.txt
- Respects rate limits (2-second delays)

---

## Support

If you encounter issues:
1. Check the HTML output: `*.html` files in project root
2. Check screenshots: `*.png` files
3. Review the JSON output for partial data
4. The scraper logs progress to console

---

**Happy scraping!** 🏃‍♂️📊
