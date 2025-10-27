# ManaXC Data Importers

Python scripts to scrape and import cross country data from Athletic.net into Supabase.

**Current Status:** Database is clean, ready for controlled phased imports
**See:** `IMPORT_STRATEGY.md` for issues and approach
**See:** `/DATA_IMPORT_SPRINT_PLAN.md` for comprehensive implementation plan

## Setup

1. **Install dependencies:**
   ```bash
   cd /Users/ron/manaxc/manaxc-project/code/importers
   pip3 install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Get Supabase credentials:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings → API
   - Copy the URL and anon/public key

## Current Scripts

### 1. `athletic_net_scraper.py`
**Status:** ✅ Working - Scrapes Athletic.net meet results

**What it does:**
- Scrapes meet results from Athletic.net using Selenium
- Converts times to centiseconds (19:30.45 → 117045)
- Parses athlete names, grades, schools, places
- Extracts race types (Varsity, JV) and gender
- Outputs JSON file for import

**Usage:**
```bash
python3 athletic_net_scraper.py <school_id> <season_year>
# Example: python3 athletic_net_scraper.py 1076 2025
```

**Known Issues:**
- Scrapes ALL schools at meets (not just target school)
- Need to add school filtering functionality

### 2. `import_scraped_data.py`
**Status:** ✅ Working - Sequential importer (slow)

**What it does:**
- Imports JSON data from scraper
- Uses get-or-create pattern for all entities
- Imports in order: schools → athletes → venues → courses → meets → races → results

**Usage:**
```bash
python3 import_scraped_data.py athletic_net_1076_2025.json
```

**Performance:** ~20 minutes for 2,000 results (slow due to individual checks)

### 3. `import_scraped_data_batch.py`
**Status:** ✅ Working - Batch importer (faster)

**What it does:**
- 6-stage batch import process
- Collects unique entities before inserting
- Bulk operations where possible

**Usage:**
```bash
python3 import_scraped_data_batch.py athletic_net_1076_2025.json
```

**Performance:** Faster than sequential, but timeouts on 15K+ results

**Known Issues:**
- Duplicate checking can timeout on large datasets
- All athletes get same default grad_year
- Course distances all default to 5000m
- Imports athletes from ALL schools at meets

## Planned Scripts (In Development)

### 4. `athletic_net_scraper_modular.py`
**Status:** 📝 Planned

Modular scraping functions for targeted data collection:
- `scrape_school_info(school_id)` - School metadata only
- `scrape_school_season(school_id, season, filter)` - Full season, filtered to school
- `scrape_meet_info(meet_id)` - Meet metadata
- `scrape_race_results(race_id, filter)` - Single race with optional school filter
- `parse_distance_from_name(race_name)` - Extract distance in meters
- `calculate_grad_year(grade, season)` - Calculate from grade level

See `DATA_IMPORT_SPRINT_PLAN.md` for detailed implementation plan.

### 5. `import_scraped_data_v2.py`
**Status:** 📝 Planned

Enhanced importer with data quality fixes:
- School filtering validation
- Grad year calculation from grade
- Course distance parsing
- Comprehensive validation
- Preview mode
- Better error handling

## Import Order

**IMPORTANT:** Run imports in this order to satisfy foreign key constraints:

1. Schools (if not already created)
2. Courses
3. Athletes
4. Meets
5. Races
6. Results

## Data Standards

All imports follow ManaXC data standards:

- **Times:** Stored as INTEGER centiseconds (19:30.45 = 117045)
- **Names:** Parsed with `nameparser` library
- **Legacy Data:** Marked with `is_legacy_data = TRUE`
- **Data Source:** Set to `'excel_import'`
- **Validation:** All imports validate before inserting

## Error Handling

- Duplicates are skipped (based on UNIQUE constraints)
- Invalid data is logged to `import_errors.log`
- Transactions used (all-or-nothing imports)
- Progress displayed during import

## Testing

Test imports with small datasets first:

```bash
# Import only first 10 rows (test mode)
python3 import_courses.py --limit 10
python3 import_athletes.py --limit 10
python3 import_results.py --limit 10
```
