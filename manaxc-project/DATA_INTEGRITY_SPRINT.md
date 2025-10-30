# Data Integrity Sprint - Race Verification & Fixes
**Created**: October 30, 2025
**Focus**: Data Quality, Race Verification, Championship Filters, Team Pages
**Priority**: HIGH - Strong push toward data integrity
**Estimated Duration**: 3-5 days

---

## Sprint Overview

This sprint focuses on verifying all imported race data, fixing data integrity issues, resolving race count discrepancies, fixing broken pages, and planning for comprehensive D2 team data collection.

---

## Sprint Goals (User-Specified)

1. ✅ Finish verifying races imported properly
2. ✅ Evaluate race counts (compare CSV vs DB)
3. ✅ Fix Lagoon Valley race (not 3 miles - incorrect distance)
4. ✅ Look at race count discrepancies
5. ✅ Update newly downloaded race results
6. ✅ Fix team page for a season
7. ✅ Fix championship race filters
8. ✅ Test every meet and race page looking for zero miles
9. ✅ Test course rating system
10. ✅ Look for outliers in normalized times
11. ✅ Strong push toward data integrity
12. ✅ Plan for securing race data for D2 teams not yet captured

---

## Current System Status

### Import System State
- **Triggers**: Should be DISABLED during bulk imports
- **Batch Operations**: Must run after imports to rebuild derived tables
- **Result Count Caching**: Implemented Oct 30 (fixes 1000-row limit)
- **Duplicate Detection**: 99.9% accuracy with time-first optimization

### Database Tables
- `meets` - Now includes `result_count` column (cached)
- `results` - Main table with triggers (must disable for bulk imports)
- `athlete_best_times` - Derived table (rebuilt by batch operations)
- `course_records` - Derived table (rebuilt by batch operations)
- `normalized_times` - Derived table (rebuilt by batch operations)

### Pending Imports (12 meets)
From git status:
- meet_254332_1761787149 (Lagoon Valley?)
- meet_254378_1761786641
- meet_256606_1787049
- meet_257684_1761787216
- meet_257987_1761787306
- meet_258135_1761786705
- meet_263178_1761717103
- meet_265953_1761800186
- meet_265978_1761786402
- meet_267582_1761800292
- meet_270530_1761800444
- meet_270614_1761800484

---

## Task Breakdown

### Phase 1: Data Verification (Day 1)

#### Task 1.1: Verify All Race Imports
**Priority**: P0 - CRITICAL
**Estimated Time**: 2-3 hours

**Steps**:
1. Create comprehensive verification script
2. For each imported meet:
   - Count results in CSV
   - Count results in database
   - Calculate discrepancy
   - Categorize: ✅ Perfect | ⚠️ Minor (1-5 missing) | ❌ Major (10+ missing)
3. Generate report with all discrepancies
4. Document root causes

**Script Location**: `/code/importers/verify_all_imports.py` (create new)

**Output Format**:
```
MEET VERIFICATION REPORT
========================
Total Meets: 45
Perfect: 38 (84%)
Minor Issues: 5 (11%)
Major Issues: 2 (4%)

DISCREPANCIES:
--------------
Golden Eagle (254332): 1227/1228 results (1 missing) - MINOR
Crystal Springs (254535): 1392/1391 results (1 extra) - MINOR
Flat SAC (254032): 3/1314 results (1311 missing) - MAJOR

ROOT CAUSES:
-----------
- Triggers enabled during import: 1,311 results failed
- Slug comparison edge case: 3 results affected
```

**Deliverable**: `IMPORT_VERIFICATION_REPORT.md`

#### Task 1.2: Evaluate Race Count Discrepancies
**Priority**: P0 - CRITICAL
**Estimated Time**: 1-2 hours

**Steps**:
1. For each meet with discrepancies:
   - Check if triggers were enabled during import
   - Review import logs for errors
   - Check duplicate detection logic
   - Verify athlete matching worked correctly
2. Create fix plan for each category:
   - MAJOR: Re-import with triggers disabled
   - MINOR: Investigate slug comparison, run duplicate finder
3. Document findings

**SQL Queries**:
```sql
-- Check current trigger status
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'results'::regclass;

-- Find meets with suspicious result counts
SELECT
  m.name,
  m.athletic_net_id,
  m.result_count,
  COUNT(r.id) as actual_count,
  m.result_count - COUNT(r.id) as diff
FROM meets m
LEFT JOIN results r ON m.id = r.meet_id
GROUP BY m.id, m.name, m.athletic_net_id, m.result_count
HAVING m.result_count != COUNT(r.id)
ORDER BY ABS(m.result_count - COUNT(r.id)) DESC;
```

**Deliverable**: `RACE_COUNT_ANALYSIS.md`

---

### Phase 2: Distance Fixes (Day 2)

#### Task 2.1: Fix Lagoon Valley Race Distance
**Priority**: P1 - HIGH
**Estimated Time**: 30-60 minutes

**Steps**:
1. Identify Lagoon Valley course in database
   ```sql
   SELECT id, name, distance_meters, venue_id
   FROM courses
   WHERE name ILIKE '%lagoon valley%';
   ```
2. Check Athletic.net for actual distance
3. Determine correct distance (user says "not 3 miles")
4. Update course distance
   ```sql
   UPDATE courses
   SET distance_meters = [CORRECT_DISTANCE]
   WHERE id = '[COURSE_ID]';
   ```
5. Recalculate normalized times for affected results
6. Run batch operation: "Force Recalculate All Normalized Times"

**Questions for User**:
- What is the correct distance for Lagoon Valley?
- Is this 2.95 miles (4747m) like Crystal Springs?

**Deliverable**: Updated course distance + recalculated times

#### Task 2.2: Find All Zero-Distance Races
**Priority**: P1 - HIGH
**Estimated Time**: 1-2 hours

**Steps**:
1. Query for races with NULL or 0 distance:
   ```sql
   SELECT
     r.id as race_id,
     r.name as race_name,
     r.distance_meters,
     m.name as meet_name,
     m.athletic_net_id,
     c.name as course_name,
     c.distance_meters as course_distance,
     COUNT(res.id) as result_count
   FROM races r
   JOIN meets m ON r.meet_id = m.id
   LEFT JOIN courses c ON r.course_id = c.id
   LEFT JOIN results res ON r.id = res.race_id
   WHERE r.distance_meters IS NULL OR r.distance_meters = 0
   GROUP BY r.id, r.name, r.distance_meters, m.name, m.athletic_net_id, c.name, c.distance_meters
   ORDER BY COUNT(res.id) DESC;
   ```

2. For each zero-distance race:
   - Look up meet on Athletic.net
   - Find actual distance
   - Document in CSV: race_id, correct_distance_meters

3. Create bulk update script:
   ```python
   import csv
   from supabase import create_client

   with open('race_distance_fixes.csv') as f:
       for row in csv.DictReader(f):
           supabase.table('races').update({
               'distance_meters': int(row['distance_meters'])
           }).eq('id', row['race_id']).execute()
   ```

4. Run batch operation to recalculate normalized times

**Deliverable**: `race_distance_fixes.csv` + updated database

---

### Phase 3: Bulk Import & Batch Operations (Day 3)

#### Task 3.1: Disable Triggers & Import Pending Meets
**Priority**: P0 - CRITICAL
**Estimated Time**: 3-4 hours (import time)

**Steps**:
1. Verify trigger status:
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'results'::regclass;
   ```

2. Disable all triggers on results table:
   ```sql
   ALTER TABLE results DISABLE TRIGGER USER;
   ```

3. Import all 12 pending meets sequentially:
   ```bash
   cd /Users/ron/manaxc/manaxc-project/code/importers

   for meet in to-be-processed/meet_*; do
     echo "Importing $meet..."
     venv/bin/python3 import_csv_data.py "$meet"
     echo "---"
   done
   ```

4. Monitor import logs for errors
5. Document any failures

**Deliverable**: All 12 meets imported successfully

#### Task 3.2: Run All Batch Operations
**Priority**: P0 - CRITICAL
**Estimated Time**: 10-15 minutes

**Steps**:
1. Go to `/admin/batch` page
2. Run batch operations in order:
   - Rebuild Normalized Times
   - Rebuild Athlete Best Times
   - Rebuild Course Records
   - Rebuild School Hall of Fame
   - Rebuild School Course Records
   - Recalculate Meet Result Counts
3. Wait for each to complete before starting next
4. Verify no errors in logs

**Deliverable**: All derived tables rebuilt

#### Task 3.3: Re-enable Triggers
**Priority**: P0 - CRITICAL
**Estimated Time**: 5 minutes

**Steps**:
1. Re-enable triggers:
   ```sql
   ALTER TABLE results ENABLE TRIGGER USER;
   ```
2. Verify triggers enabled:
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'results'::regclass;
   ```
3. Test single result insert to verify triggers work

**Deliverable**: Triggers re-enabled and tested

---

### Phase 4: Page Fixes (Day 4)

#### Task 4.1: Fix Championship Race Filters
**Priority**: P2 - MEDIUM
**Estimated Time**: 1-2 hours

**Steps**:
1. Identify which page has championship filters
   - Likely `/app/meets/page.tsx` or `/app/season/page.tsx`
2. Test current behavior:
   - What does filter currently show?
   - What should it show?
3. Check meet_type column values:
   ```sql
   SELECT DISTINCT meet_type, COUNT(*)
   FROM meets
   GROUP BY meet_type;
   ```
4. Fix filter logic to properly detect championship meets
5. Test with known championship meets

**Questions for User**:
- Which page has the championship filter issue?
- What specific behavior is broken?

**Deliverable**: Championship filters working correctly

#### Task 4.2: Fix Team Page for a Season
**Priority**: P2 - MEDIUM
**Estimated Time**: 1-2 hours

**Steps**:
1. Identify which team page is broken
   - `/app/schools/[id]/team/page.tsx`?
   - `/app/schools/[id]/season/[year]/page.tsx`?
2. Reproduce the issue
3. Check data fetching logic
4. Verify season filtering works
5. Verify grade calculations use athletic calendar
6. Test with multiple schools

**Questions for User**:
- Which specific team page URL is broken?
- What error or incorrect behavior do you see?

**Deliverable**: Team page fixed and tested

---

### Phase 5: Quality Analysis (Day 5)

#### Task 5.1: Test Course Rating System
**Priority**: P3 - LOW
**Estimated Time**: 1-2 hours

**Steps**:
1. Query all courses with ratings:
   ```sql
   SELECT
     c.name,
     c.difficulty,
     v.name as venue,
     COUNT(r.id) as race_count,
     COUNT(DISTINCT res.id) as result_count
   FROM courses c
   JOIN venues v ON c.venue_id = v.id
   LEFT JOIN races r ON c.id = r.course_id
   LEFT JOIN results res ON r.id = res.race_id
   GROUP BY c.id, c.name, c.difficulty, v.name
   ORDER BY COUNT(res.id) DESC;
   ```

2. Check for courses with default 5.0 rating
3. Use AI analysis endpoint on top 20 courses:
   - POST to `/api/admin/analyze-course`
   - Review statistical recommendations
4. Document courses that need rating updates
5. Update ratings where AI analysis is confident

**Deliverable**: `COURSE_RATING_REVIEW.md`

#### Task 5.2: Find Normalized Time Outliers
**Priority**: P3 - LOW
**Estimated Time**: 1-2 hours

**Steps**:
1. Query extreme outliers (>3 standard deviations):
   ```sql
   WITH stats AS (
     SELECT
       AVG(normalized_time_cs) as mean,
       STDDEV(normalized_time_cs) as stddev
     FROM athlete_best_times
     WHERE normalized_time_cs IS NOT NULL
   )
   SELECT
     abt.athlete_id,
     a.name,
       s.name as school,
       abt.normalized_time_cs,
       abt.season_best_time_cs,
       c.name as course,
       c.difficulty,
       (abt.normalized_time_cs - stats.mean) / stats.stddev as z_score
     FROM athlete_best_times abt
     JOIN athletes a ON abt.athlete_id = a.id
     JOIN schools s ON a.school_id = s.id
     JOIN courses c ON abt.season_best_course_id = c.id
     CROSS JOIN stats
     WHERE ABS((abt.normalized_time_cs - stats.mean) / stats.stddev) > 3
     ORDER BY ABS((abt.normalized_time_cs - stats.mean) / stats.stddev) DESC
     LIMIT 50;
   ```

2. For each outlier, investigate:
   - Is course distance correct?
   - Is course rating reasonable?
   - Is this a legitimate performance?
   - Is this a data entry error?

3. Create flagging system for manual review
4. Document patterns in outliers

**Deliverable**: `NORMALIZED_TIME_OUTLIERS.md`

---

### Phase 6: D2 Planning (Day 5-6)

#### Task 6.1: Compile D2 School List
**Priority**: P3 - LOW (Strategic planning)
**Estimated Time**: 2-3 hours

**Steps**:
1. Review existing BVAL school list
2. Identify which BVAL schools are D2 vs other divisions
3. Get CIF D2 rosters from:
   - CCS (Central Coast Section)
   - NCS (North Coast Section)
   - SJS (Sac-Joaquin Section)
4. Compile master list of D2 schools
5. Check which are already imported
6. Prioritize by:
   - BVAL schools (highest priority)
   - Recent results (2024-2025 season)
   - Data availability on Athletic.net
7. Create batch import list

**Files**:
- Input: `/code/importers/bval_non_stal_schools_final.txt`
- Output: `/code/importers/D2_SCHOOLS_PRIORITY.txt`

**Deliverable**: Prioritized D2 school import list

---

## Technical Reference

### Trigger Management Commands

```sql
-- Check trigger status
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'results'::regclass;

-- Disable triggers (before bulk import)
ALTER TABLE results DISABLE TRIGGER USER;

-- Re-enable triggers (after batch operations)
ALTER TABLE results ENABLE TRIGGER USER;
```

### Batch Operations Order

Must run in this sequence:
1. Rebuild Normalized Times (depends on course difficulty)
2. Rebuild Athlete Best Times (depends on normalized times)
3. Rebuild Course Records (depends on results)
4. Rebuild School Hall of Fame (depends on normalized times)
5. Rebuild School Course Records (depends on results)
6. Recalculate Meet Result Counts (independent)
7. Find Duplicate Results (independent, for review)

### Import Script Usage

```bash
# Single meet
cd /Users/ron/manaxc/manaxc-project/code/importers
venv/bin/python3 import_csv_data.py to-be-processed/meet_270614_1761800484

# Bulk import (triggers must be disabled first)
for meet in to-be-processed/meet_*; do
  venv/bin/python3 import_csv_data.py "$meet"
done
```

---

## Known Issues & Workarounds

### Issue 1: Trigger FK Violations
**Status**: ✅ RESOLVED - Process documented

**Solution**: Disable triggers before bulk imports, run batch operations after

### Issue 2: Duplicate Detection Edge Cases
**Status**: ⚠️ ACCEPTABLE - 99.9% accuracy

**Workaround**: Run "Find Duplicate Results" batch operation for manual review

### Issue 3: Empty athletic_net_id
**Status**: ✅ EXPECTED - By design

**Impact**: Slower imports for large meets (10-30 minutes for 1000+ results)

---

## Success Criteria

Sprint is complete when:
- ✅ All imported meets verified with discrepancies documented
- ✅ Lagoon Valley distance corrected
- ✅ All zero-distance races identified and fixed
- ✅ All 12 pending meets imported successfully
- ✅ Batch operations completed
- ✅ Triggers re-enabled
- ✅ Championship filters working
- ✅ Team page fixed
- ✅ Course ratings reviewed
- ✅ Outliers documented
- ✅ D2 school list compiled

---

## Documentation to Create

1. **IMPORT_VERIFICATION_REPORT.md** - Full meet verification results
2. **RACE_COUNT_ANALYSIS.md** - Discrepancy analysis and root causes
3. **COURSE_RATING_REVIEW.md** - Course rating recommendations
4. **NORMALIZED_TIME_OUTLIERS.md** - Outlier analysis and patterns
5. **D2_SCHOOLS_PRIORITY.txt** - Prioritized import list
6. **DATA_INTEGRITY_SUMMARY.md** - Overall sprint summary

---

## Questions for User

Before starting sprint:
1. What is the correct distance for Lagoon Valley course?
2. Which page has the championship filter issue?
3. Which team page URL is broken?
4. Are there specific schools or meets you want prioritized?
5. Should we focus more on verification or new imports?

---

**Created**: October 30, 2025
**Status**: 📋 READY FOR EXECUTION
**Focus**: Data Integrity & Quality
**Duration**: 3-5 days

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
