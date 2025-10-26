# Migration and Import Guide

**Date:** October 26, 2025
**Purpose:** Complete guide for running schema migration and CSV data import

---

## Overview

This guide walks you through:
1. Running the schema migration to add venues table
2. Disabling RLS for import
3. Importing all 6 CSV files in the correct order
4. Re-enabling RLS with read-only policies

**Total Data to Import:**
- 54 venues
- 115 courses (all with difficulty ratings!)
- 1,038 athletes (1966-2028)
- 208 meets
- 445 races
- 6,710 results

---

## Prerequisites

✅ **CSV Files Ready** - All 6 CSV files have been cleaned and validated:
- 100% course name matching achieved
- All formatting issues fixed
- Backups created with timestamps

✅ **Schema Migration Created** - `migration_add_venues_table.sql` ready to run

✅ **Import Scripts** - Python scripts created for each table

---

## Step-by-Step Process

### STEP 1: Run Schema Migration

**Location:** Supabase SQL Editor
**File:** `/code/database/migration_add_venues_table.sql`

**What it does:**
- Creates `venues` table
- Extracts unique venues from existing `courses.venue` data
- Adds `venue_id` to `courses` table
- Changes `meets.course_id` to `meets.venue_id`
- Adds `course_id` to `races` table
- Sets up proper foreign key relationships

**How to run:**
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to your ManaXC project
3. Click "SQL Editor" in left sidebar
4. Click "New query"
5. Copy entire contents of `migration_add_venues_table.sql`
6. Paste into SQL Editor
7. Click "Run" (or press Cmd/Ctrl + Enter)

**Expected output:**
```
NOTICE:  ✅ Created X venues from courses.venue data
NOTICE:  ✅ All X courses linked to venues
NOTICE:  ✅ Dropped meets.course_id foreign key constraint
NOTICE:  ✅ Dropped meets.course_id column

================================================================================
MIGRATION VERIFICATION
================================================================================
NOTICE:  Venues created: X
NOTICE:  Courses with venue_id: X
NOTICE:  Meets total: X
NOTICE:  Races total: X

NOTICE:  ✅ Migration complete! Schema is ready for CSV import.
```

**Verify:** Schema is now ready for import!

---

### STEP 2: Disable RLS for Import

**Location:** Supabase SQL Editor
**File:** `/code/importers/DISABLE_RLS_FOR_IMPORT.sql`

**Why:** Row Level Security blocks anonymous API key writes. We need to temporarily disable it for the import.

**How to run:**
1. In Supabase SQL Editor, click "New query"
2. Copy entire contents of `DISABLE_RLS_FOR_IMPORT.sql`
3. Paste into SQL Editor
4. Click "Run"

**Expected output:**
```
 tablename | rowsecurity
-----------+-------------
 athletes  | f
 courses   | f
 meets     | f
 races     | f
 results   | f
 venues    | f
```

All should show `rowsecurity = f` (false)

---

### STEP 3: Import CSV Data (Table by Table)

**Location:** Terminal (local)
**Directory:** `/code/importers/`

Run the scripts in this exact order:

#### 3.1: Import Venues (54 venues)
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
python3 csv_import_01_venues.py
```

**What it does:**
- Reads `venues.csv`
- Imports 54 unique venue names
- Skips duplicates if re-run

**Expected:** `✅ Successfully imported 54 venues`

---

#### 3.2: Import Courses (115 courses)
```bash
python3 csv_import_02_courses.py
```

**What it does:**
- Reads `courses.csv`
- Matches venue names to get venue_id
- Imports 115 courses with difficulty ratings
- Links to venues via venue_id foreign key

**Expected:** `✅ Successfully imported 115 courses with difficulty ratings!`

---

#### 3.3: Import Athletes (1,038 athletes)
```bash
python3 csv_import_03_athletes.py
```

**What it does:**
- Reads `athletes.csv`
- Links to Westmont school (already exists)
- Imports 1,038 athletes spanning 1966-2028
- Generates slugs for URLs

**Expected:** `✅ Successfully imported 1,038 athletes`

---

#### 3.4: Import Meets (208 meets)
```bash
python3 csv_import_04_meets.py
```

**What it does:**
- Reads `meets.csv`
- Matches venue names to get venue_id
- Imports 208 meets (2002-2024)
- Links to venues via venue_id foreign key

**Expected:** `✅ Successfully imported 208 meets`

---

#### 3.5: Import Races (445 races)
```bash
python3 csv_import_05_races.py
```

**What it does:**
- Reads `races.csv`
- Matches meet (by name + date) and course (by name)
- Imports 445 races
- Links to both meets and courses

**Expected:** `✅ Successfully imported 445 races`

---

#### 3.6: Import Results (6,710 results)
```bash
python3 csv_import_06_results.py
```

**What it does:**
- Reads `results.csv`
- Matches athletes (by name + grad_year)
- Matches races (by meet + course + gender)
- Imports 6,710 individual results
- Calculates standardized times

**Expected:** `✅ Successfully imported 6,710 results!`

---

### STEP 4: Re-enable RLS

**Location:** Supabase SQL Editor
**File:** `/code/importers/ENABLE_RLS_AFTER_IMPORT.sql`

**Why:** Re-enable Row Level Security with read-only policies for security.

**How to run:**
1. In Supabase SQL Editor, click "New query"
2. Copy entire contents of `ENABLE_RLS_AFTER_IMPORT.sql`
3. Paste into SQL Editor
4. Click "Run"

**Expected output:**
```
ALTER TABLE (x6 times)
DROP POLICY (x8 times)
CREATE POLICY (x8 times)

[Table showing all policies with "Allow public read access"]
```

---

### STEP 5: Verify Import Success

Run these verification queries in Supabase SQL Editor:

```sql
-- Count imported records
SELECT
  'venues' as table_name, COUNT(*) as count FROM venues
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'meets', COUNT(*) FROM meets
UNION ALL
SELECT 'races', COUNT(*) FROM races
UNION ALL
SELECT 'results', COUNT(*) FROM results
ORDER BY table_name;
```

**Expected Output:**
```
 table_name | count
------------+-------
 athletes   |  1038
 courses    |   115
 meets      |   208
 races      |   445
 results    |  6710
 venues     |    54
```

**Foreign Key Validation:**
```sql
-- Verify all foreign keys are valid
SELECT
  'Courses without venue' as check_name,
  COUNT(*) as count
FROM courses
WHERE venue_id IS NULL

UNION ALL

SELECT
  'Meets without venue',
  COUNT(*)
FROM meets
WHERE venue_id IS NULL

UNION ALL

SELECT
  'Races without course or meet',
  COUNT(*)
FROM races
WHERE course_id IS NULL OR meet_id IS NULL

UNION ALL

SELECT
  'Results without athlete or race',
  COUNT(*)
FROM results
WHERE athlete_id IS NULL OR race_id IS NULL;
```

**Expected:** All counts should be **0** (no orphaned records)

---

### STEP 6: Test Website

**URL:** https://manaxc.com

**What to check:**
1. Homepage loads
2. Navigate to Results page
3. See imported results displayed
4. Filter by athlete, meet, season
5. Check athlete profiles load
6. Verify course difficulty ratings appear

---

## Rollback (If Needed)

If anything goes wrong during import:

### Rollback Migration

Run this SQL in Supabase SQL Editor:

```sql
BEGIN;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_courses_venue;
ALTER TABLE courses DROP COLUMN IF EXISTS venue_id;
ALTER TABLE meets DROP CONSTRAINT IF EXISTS fk_meets_venue;
ALTER TABLE meets DROP COLUMN IF EXISTS venue_id;
ALTER TABLE meets ADD COLUMN course_id UUID REFERENCES courses(id);
ALTER TABLE races DROP CONSTRAINT IF EXISTS fk_races_course;
ALTER TABLE races DROP COLUMN IF EXISTS course_id;
DROP TABLE IF EXISTS venues CASCADE;
COMMIT;
```

### Delete Imported Data

```sql
-- Delete in reverse order to respect foreign keys
DELETE FROM results WHERE is_legacy_data = TRUE;
DELETE FROM races;
DELETE FROM meets WHERE season_year >= 2002;
DELETE FROM athletes WHERE school_id IN (
  SELECT id FROM schools WHERE name = 'Westmont High School'
);
DELETE FROM courses WHERE venue_id IS NOT NULL;
DELETE FROM venues;
```

---

## Troubleshooting

### Import Script Fails

**Error:** `'new row violates row-level security policy'`
**Fix:** You forgot to run `DISABLE_RLS_FOR_IMPORT.sql` first

**Error:** `Foreign key violation`
**Fix:** You ran scripts out of order. Must run in sequence: venues → courses → athletes → meets → races → results

**Error:** `duplicate key value violates unique constraint`
**Fix:** You already imported this table. The script will skip duplicates automatically.

### Migration Fails

**Error:** `column "venue_id" already exists`
**Fix:** Migration was already run. Check if venues table exists. If yes, skip to Step 2.

**Error:** `relation "venues" does not exist`
**Fix:** Migration wasn't completed. Re-run `migration_add_venues_table.sql`

---

## Files Reference

### SQL Files (Run in Supabase)
- `/code/database/migration_add_venues_table.sql` - Schema migration
- `/code/importers/DISABLE_RLS_FOR_IMPORT.sql` - Disable RLS before import
- `/code/importers/ENABLE_RLS_AFTER_IMPORT.sql` - Re-enable RLS after import

### Python Import Scripts (Run Locally)
- `/code/importers/csv_import_01_venues.py`
- `/code/importers/csv_import_02_courses.py`
- `/code/importers/csv_import_03_athletes.py`
- `/code/importers/csv_import_04_meets.py`
- `/code/importers/csv_import_05_races.py`
- `/code/importers/csv_import_06_results.py`

### CSV Data Files
- `/reference/data/westmont-xc-results - venues.csv`
- `/reference/data/westmont-xc-results - courses.csv`
- `/reference/data/westmont-xc-results - athletes.csv`
- `/reference/data/westmont-xc-results - meets.csv`
- `/reference/data/westmont-xc-results - races.csv`
- `/reference/data/westmont-xc-results - results.csv`

### Documentation
- `/code/importers/CSV_ANALYSIS_REPORT.md` - Initial deep analysis
- `/code/importers/CSV_IMPORT_READINESS_REPORT.md` - Data readiness status
- `/code/importers/MIGRATION_AND_IMPORT_GUIDE.md` - This file

---

## Timeline Estimate

| Step | Time | Description |
|------|------|-------------|
| 1. Schema Migration | 1 min | Run SQL in Supabase |
| 2. Disable RLS | 30 sec | Run SQL in Supabase |
| 3.1 Import Venues | 5 sec | Python script |
| 3.2 Import Courses | 10 sec | Python script |
| 3.3 Import Athletes | 30 sec | Python script |
| 3.4 Import Meets | 20 sec | Python script |
| 3.5 Import Races | 1 min | Python script (composite matching) |
| 3.6 Import Results | 5 min | Python script (6,710 rows) |
| 4. Re-enable RLS | 30 sec | Run SQL in Supabase |
| 5. Verification | 2 min | Run queries, check website |
| **TOTAL** | **~10 minutes** | Full migration and import |

---

## Success Criteria

✅ Schema migration completes without errors
✅ All 6 tables import successfully
✅ Foreign key counts: 0 orphaned records
✅ Data counts match expected values
✅ RLS re-enabled with read-only policies
✅ Website displays imported data correctly

---

## Next Steps After Import

1. **Verify Data Quality**
   - Spot-check athlete names
   - Verify course difficulty ratings
   - Check sample race results

2. **Test Website Features**
   - Search functionality
   - Filters (season, gender, athlete)
   - Athlete profile pages
   - Meet detail pages

3. **Performance Optimization** (if needed)
   - Add database indexes
   - Optimize queries
   - Cache frequently accessed data

4. **Future Data Sources**
   - Set up Athletic.net scraper
   - Plan for ongoing season updates
   - Implement validation system (ADR-002)

---

## Contact & Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Database → Logs
2. Review Python script output for specific errors
3. Verify CSV files weren't modified after cleaning
4. Check backup files in `/reference/data/*.backup_*`

---

**Ready to begin? Start with STEP 1: Run Schema Migration!**
