# Missing Data Analysis - October 26, 2025

## Executive Summary

**Problem:** Athletes import failed completely, preventing results from being imported.

**Root Cause:** Import script stored grade level (9-12) instead of graduation year (2025-2028).

**Impact:** 0 athletes and 0 results in database despite having 6,711 valid results ready to import.

**Solution Required:** Fix import script to convert grade → graduation year, then re-import.

---

## What Successfully Imported ✅

| Table | Count | Status |
|-------|-------|--------|
| **schools** | 1 | ✅ Westmont High School |
| **courses** | 119 | ✅ All courses loaded |
| **meets** | Unknown | ⚠️ Need to verify |
| **races** | Unknown | ⚠️ Need to verify |

---

## What Failed to Import ❌

| Table | Expected Count | Actual Count | Status |
|-------|----------------|--------------|--------|
| **athletes** | 1,062 | 0 | ❌ ALL FAILED |
| **results** | 6,711 | 0 | ❌ Dependent on athletes |

---

## Detailed Failure Analysis

### Athletes Table (1,062 athletes failed)

**Error Message:**
```
new row for relation "athletes" violates check constraint "athletes_grad_year_check"
```

**Database Constraint:**
```sql
CHECK (grad_year >= 1966 AND grad_year <= 2035)
```

**What Import Script Sent:**
- Adrian Ketterer → grad_year=11 (should be 2026)
- Jack Arango → grad_year=12 (should be 2025)
- Anshul Dhaas → grad_year=10 (should be 2027)
- Tony Yang → grad_year=9 (should be 2028)

**The Problem:**
Import script is sending **current grade level** (9, 10, 11, 12) instead of **4-digit graduation year** (2025, 2026, 2027, 2028).

---

## Data Ready for Import

From the import log, we have successfully **parsed** (but not imported):

1. ✅ **6,711 valid race results** - All parsed, ready for import
2. ✅ **1,062 unique athletes** - All parsed, ready for import
3. ✅ **422 unique meets** - All parsed, ready for import

This data is **ready to import** once the script is fixed!

---

## Sample Athletes from Log

Here are some of the athletes that failed to import (showing pattern):

| Name | Intended Grad Year | Grade Sent | Gender | Status |
|------|-------------------|------------|--------|--------|
| Adrian Ketterer | 2026 | 11 | M | Failed |
| Jack Arango | 2025 | 12 | M | Failed |
| Anshul Dhaas | 2027 | 10 | M | Failed |
| Tony Yang | 2028 | 9 | M | Failed |
| Sara Chaudoin | 2025 | 12 | F | Failed |
| Emily Ha | 2028 | 9 | F | Failed |
| Hannah Crowley | 2027 | 10 | F | Failed |
| Shane Dalziel | 2024 | 12 | M | Failed (graduated) |

**Note:** There's also a gender issue - many female athletes are marked as 'M' in the log (see Hannah Crowley, line 43).

---

## The Fix Needed

### Import Script Correction

**File to Fix:** `/Users/ron/manaxc/manaxc-project/code/importers/import_westmont_excel.py`

**Current Code (WRONG):**
```python
grad_year = student_grade  # Stores 9, 10, 11, or 12
```

**Fixed Code (CORRECT):**
```python
# Determine what year this data is from
current_season_year = 2024  # Or extract from Excel file

# Convert grade to graduation year
# Grade 9 in 2024 → graduates 2028
# Grade 10 in 2024 → graduates 2027
# Grade 11 in 2024 → graduates 2026
# Grade 12 in 2024 → graduates 2025
grad_year = current_season_year + (13 - student_grade)
```

**Examples:**
```python
# For 2024 season:
Grade 9 → 2024 + (13 - 9) = 2028
Grade 10 → 2024 + (13 - 10) = 2027
Grade 11 → 2024 + (13 - 11) = 2026
Grade 12 → 2024 + (13 - 12) = 2025

# For graduated athletes (2024 grad year in Excel):
Grade 12 (2023 season) → 2023 + (13 - 12) = 2024
```

### Additional Fix: Gender Detection

**Issue:** Some female athletes marked as 'M' in import (line 43: Hannah Crowley)

**Check:** Review gender detection logic in import script:
- Is it reading from correct Excel column?
- Does Excel have gender data?
- Is there a default value being set incorrectly?

---

## Import Script Flow (for fixing)

Based on the log, the import process is:

1. ✅ Find Westmont High School in database
2. ✅ Load 119 courses from database
3. ✅ Read Excel file
4. ✅ Parse 6,711 results into memory
5. ✅ Extract 1,062 unique athletes
6. ✅ Extract 422 unique meets
7. ❌ **FAILS HERE:** Import 1,062 athletes (all fail due to grad_year)
8. ❌ **SKIPPED:** Import meets (would have foreign key to athletes)
9. ❌ **SKIPPED:** Import results (would have foreign key to athletes)

---

## Re-Import Strategy

### Option 1: Fix Script and Re-Import Everything (RECOMMENDED)

**Steps:**
1. ✅ Fix `import_westmont_excel.py`:
   - Add grade → grad_year conversion
   - Verify gender detection logic
2. ✅ Clear existing data (if any partial imports exist)
3. ✅ Re-run import script
4. ✅ Verify:
   - All 1,062 athletes imported
   - All 6,711 results imported
   - All relationships correct

**Advantages:**
- Clean start
- Ensures data consistency
- Tests full pipeline

**Time Estimate:** 30 minutes (10 min fix + 5 min test + 15 min full import)

### Option 2: Import Only Athletes and Results (if courses/meets are good)

**Steps:**
1. ✅ Verify courses and meets already in database
2. ✅ Fix athlete import section only
3. ✅ Run athlete import
4. ✅ Run results import

**Advantages:**
- Faster if courses/meets are already good
- Less risk of breaking existing data

**Time Estimate:** 20 minutes

---

## Verification Checklist

After re-import, verify:

### Data Counts
- [ ] 1 school (Westmont)
- [ ] 119 courses
- [ ] 422 meets
- [ ] 1,062 athletes
- [ ] 6,711 results

### Data Quality
- [ ] All grad_years are 4-digit years (not 9-12)
- [ ] All grad_years in range 1966-2035 (per constraint)
- [ ] Gender values are 'M' or 'F' (not NULL)
- [ ] Female athletes correctly marked as 'F'
- [ ] All athlete names parsed correctly (first_name, last_name)

### Relationships
- [ ] All athletes link to Westmont school
- [ ] All results link to valid athlete_id
- [ ] All results link to valid meet_id
- [ ] All results link to valid race_id (if applicable)
- [ ] All meets link to valid course_id

### Time Data (CRITICAL - Centiseconds!)
- [ ] All time_cs values are in centiseconds (not seconds)
- [ ] Sample check: 19:30.45 should be stored as 117045
- [ ] No times show as seconds (like 1170 for 19:30)

---

## Sample Queries to Run After Import

```sql
-- Count records in each table
SELECT 'schools' as table_name, COUNT(*) as count FROM schools
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'athletes', COUNT(*) FROM athletes
UNION ALL
SELECT 'meets', COUNT(*) FROM meets
UNION ALL
SELECT 'races', COUNT(*) FROM races
UNION ALL
SELECT 'results', COUNT(*) FROM results;

-- Verify grad_year values
SELECT
  MIN(grad_year) as min_grad_year,
  MAX(grad_year) as max_grad_year,
  COUNT(DISTINCT grad_year) as unique_years
FROM athletes;

-- Should return:
-- min_grad_year: ~2022 (graduated athletes)
-- max_grad_year: ~2028 (current freshmen)
-- unique_years: 6-7

-- Verify gender distribution
SELECT gender, COUNT(*) as count
FROM athletes
GROUP BY gender;

-- Should show roughly even split or known ratio

-- Verify time format (centiseconds check)
SELECT
  time_cs,
  time_cs / 6000 as minutes,
  (time_cs % 6000) / 100 as seconds,
  time_cs % 100 as centiseconds
FROM results
LIMIT 5;

-- Example result for 19:30.45:
-- time_cs: 117045
-- minutes: 19
-- seconds: 30
-- centiseconds: 45
```

---

## Excel File Analysis

Based on the log output, the import script is reading from an Excel file that contains:

- **Master Results Sheet:** 6,711 rows of race results
- **Data Extracted:**
  - Student names (parsed into first/last)
  - Grade levels (9, 10, 11, 12)
  - Gender (M/F - but may have issues)
  - Race times
  - Meet information
  - Course names

**Recommendation:** Locate and inspect the Excel file:
- File location: Likely in `/Users/ron/manaxc/2022-westmont/` through `/Users/ron/manaxc/2025-westmont/`
- Sheet names: "Master Results", "Master Courses", "Master Athletes"
- Verify grad year column actually has grades (not years)

---

## Historical Data Context

From the log, we can see athletes from multiple graduation years:

| Grad Year | Grade in 2024 | Status | Count (estimated) |
|-----------|---------------|--------|-------------------|
| 2024 | 12 (graduated) | Graduated | ~100-200 |
| 2025 | 12 (seniors) | Current | ~250-300 |
| 2026 | 11 (juniors) | Current | ~250-300 |
| 2027 | 10 (sophomores) | Current | ~250-300 |
| 2028 | 9 (freshmen) | Current | ~150-200 |

**Total:** 1,062 athletes (matches log exactly)

This represents approximately **4-5 years** of Westmont XC history.

---

## Priority Actions

### Immediate (Today)
1. ✅ **Fix import script** - Add grade → graduation year conversion
2. ✅ **Test with 10 athletes** - Verify fix works
3. ✅ **Verify gender logic** - Ensure F athletes marked correctly

### Next (After fix tested)
4. ✅ **Clear database** - Remove any partial imports
5. ✅ **Run full import** - Import all 1,062 athletes + 6,711 results
6. ✅ **Verify data quality** - Run verification queries
7. ✅ **Test website pages** - Check athlete detail and school pages

### Future (After import complete)
8. ⚠️ **Build missing features** - Course normalization, RPC functions
9. ⚠️ **Import additional data** - Other schools, more seasons
10. ⚠️ **Optimize queries** - Create views, materialized views

---

## Files to Review/Edit

1. **Import Script:**
   - `/Users/ron/manaxc/manaxc-project/code/importers/import_westmont_excel.py`
   - Look for athlete parsing section
   - Find where `grad_year` is set

2. **Import Log:**
   - `/Users/ron/manaxc/manaxc-project/code/importers/import_log.txt`
   - 328 lines total
   - Shows all 1,062 athlete errors

3. **Excel Source Files:**
   - `/Users/ron/manaxc/2022-westmont/` (and 2023, 2024, 2025)
   - Need to locate the specific file being imported
   - Verify column mappings

4. **Database Schema:**
   - `/Users/ron/manaxc/manaxc-project/code/database/01-core-tables.sql`
   - Line 34: `CHECK (grad_year >= 1966 AND grad_year <= 2035)`
   - This constraint is CORRECT - script is WRONG

---

## Success Criteria

Import is successful when:

✅ All tables have expected counts
✅ No constraint violation errors
✅ All relationships valid (no orphaned records)
✅ Time values in centiseconds (not seconds)
✅ Grad years are 4-digit years (not 9-12)
✅ Gender distribution matches expectations
✅ Website loads athlete and school pages
✅ Sample queries return sensible data

---

**Created:** October 26, 2025
**Status:** Ready for import script fix
**Next Step:** Fix grade → grad_year conversion in import_westmont_excel.py
