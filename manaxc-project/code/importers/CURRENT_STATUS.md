# Current Import Status - After Normalized Time Formula Fix

**Date:** 2025-10-30
**Context:** Fixed critical database-wide bug in normalized_time_cs formula, all derived tables rebuilt

## Meet Status Summary

### Meet 254332 (22nd Golden Eagle Invitational)
- **Status:** ✅ **COMPLETE**
- **Results:** 1228/1228 (CSV: 1227 + 1 duplicate time)
- **Cached count:** Updated to 1228
- **Issues Resolved:**
  - Miguel A. Rodriguez has 2 times (117431 cs & 124551 cs) - flagged in `potential_duplicates`
- **File:** `add_miguel_rodriguez_duplicate.sql` was run successfully

### Meet 255929 (Artichoke Invitational)
- **Status:** ⚠️ **1 EXTRA RESULT** (need to fix)
- **Results:** 1659/1658 (1 too many)
- **Cached count:** Updated to 1659
- **Issue:**
  - Time 113200 cs appears 6 times in DB but only 5 times in CSV
  - Added both Andrew Xu AND Anthony Martinez, but only one was actually missing
  - One is a duplicate that needs to be identified and removed
- **Created athletes:**
  - Andrew Xu (ID: 0681fabc-9e92-4ced-af47-623737c0aaa6)
  - Anthony Martinez (ID: 88e3a500-7ffc-456d-97b8-a0ce7b7a50db)
- **Action Needed:** Find which one is duplicate and remove

### Meet 254378 (Clovis Invitational)
- **Status:** 🟡 **99.4% COMPLETE** (27 missing)
- **Results:** 4628/4655 (27 short)
- **Cached count:** Updated to 4628
- **What was done:**
  - Imported 13 results successfully
  - 5 failed due to slug collisions (already flagged in `potential_duplicate_athletes`)
  - 22 still missing (likely more duplicate times or athlete issues)
- **Triggers:** Currently ENABLED (need to check status)

## Files Created During This Session

### Documentation
1. `/code/importers/DATA_QUALITY_SYSTEM.md` - Complete system design for tracking duplicates
2. `/code/importers/DUPLICATE_TIME_WORKFLOW.md` - Process for handling duplicate times
3. `/code/importers/IMPORT_PROCESS_IMPROVEMENTS.md` - Lessons learned and improvements needed
4. `/code/importers/CURRENT_STATUS.md` - This file

### Database Migrations
1. `/website/supabase/migrations/20251030_add_duplicate_detection.sql` - `potential_duplicates` table ✅ APPLIED
2. `/website/supabase/migrations/20251030_add_potential_duplicate_athletes.sql` - `potential_duplicate_athletes` table ✅ APPLIED
3. `/website/supabase/migrations/20251030_allow_null_name1_duplicate_athletes.sql` - Allow NULL in name_1 ✅ APPLIED

### SQL Scripts
1. `/code/database/add_miguel_rodriguez_duplicate.sql` - ✅ RAN - Adds Miguel's 2nd time
2. `/code/database/find_orphaned_best_times.sql` - Find orphaned athlete_best_times
3. `/code/database/delete_orphaned_best_times.sql` - Clean up orphaned records (NOT USED - you said don't delete)

### Python Scripts
1. `flag_miguel_duplicate_athlete.py` - ✅ RAN - Flags Miguel Rodriguez name variation
2. `flag_all_missing_254378.py` - ✅ RAN - Flags all 18 missing 254378 results
3. `import_and_flag_missing_254378.py` - ✅ RAN - Imported 13/18 results (5 slug collisions)
4. `add_missing_255929_results.py` - ✅ RAN - Added Andrew Xu & Anthony Martinez (1 extra!)
5. `update_meet_254332_count.py` - ✅ RAN - Updated cached count
6. `update_meet_254378_count.py` - ✅ RAN - Updated cached count
7. Various verification scripts (verify_miguel_added.py, check_zach_causee.py, etc.)

## Database State

### Tables Modified
- `results` - Added results for meets 254332, 254378, 255929
- `athletes` - Created new athletes (Zach Causee, Benjamin Harrison, Parker Oh, Tyler Sant, Andrew Xu, Anthony Martinez)
- `meets` - Updated result_count for all 3 meets
- `potential_duplicates` - 1 record (Miguel Rodriguez)
- `potential_duplicate_athletes` - 19 records (1 from 254332, 18 from 254378)

### Triggers
- **Currently:** ENABLED (re-enabled after imports)
- **Note:** Need to disable before large imports, rebuild derived tables after

## Key Insights for Large Meet (10K+)

### 1. Slug Generation Issue
**Problem:** Names like "Samarth Wadhwa", "Kate Sullivan" create empty slugs that collide

**Evidence:**
- 5 athletes failed with error: `duplicate key value violates unique constraint "athletes_slug_key"`
- Slug was `-st-margaret-s-2026` (just school and year)

**Solution Options:**
1. Make slug include more of the name (even if special chars)
2. Make slug case-sensitive
3. Use UUID-based slugs
4. Better special character handling

### 2. Trigger Bug with athlete_best_times
**Problem:** Trigger tries to insert athlete_best_times with non-existent result ID

**Error:** `insert or update on table "athlete_best_times" violates foreign key constraint`
- Result ID: `eacc14dd-984f-49e1-97d6-9c996715f151` doesn't exist anywhere

**Workaround Used:** Disable USER triggers during import, rebuild after

### 3. Athlete Matching Not Robust
**Problem:** Created duplicate athletes (Andrew Xu or Anthony Martinez already existed)

**Solution Needed:** Multi-stage matching:
1. Exact name + school
2. Case-insensitive name + school
3. Fuzzy match (handle middle initials, nicknames)
4. Only create if no match

## Recent Work - CRITICAL BUG FIX: Normalized Time Formula

### Discovery
While investigating 8 races with `distance_meters = 0`, user noticed normalized_time_cs values below 10000 (sub-100 second miles - impossible!). This revealed a **database-wide critical bug** in the normalization formula.

### The Bug
**Broken formula** (in migrations since 2025-10-28):
```sql
time_cs * 100000.0 / (difficulty_rating * (5280.0 / 3.0) * distance_meters)
```
This **divides** by distance, making longer races produce SMALLER normalized times - completely backwards!

**Correct formula**:
```sql
time_cs * 1600.0 / (difficulty_rating * distance_meters)
```
This properly scales times to 1600m equivalent on flat course.

### What Was Fixed ✅
1. **Updated all normalized_time_cs values** - Ran `/code/database/fix_normalized_time_formula.sql`
   - ALL results in database recalculated with correct formula
   - Eliminated impossible times (no more sub-100 second miles!)

2. **Fixed functions and triggers** - Applied migration `20251030_fix_normalized_time_formula.sql`
   - Updated `batch_rebuild_normalized_times()` function
   - Created `calculate_normalized_time()` trigger for auto-calculation
   - Future imports will use correct formula

3. **Rebuilt all derived tables** - Ran `/code/database/rebuild_after_formula_fix_simple.sql`
   - athlete_best_times
   - course_records
   - school_hall_of_fame
   - school_course_records

4. **Fixed distance_meters issue** - Ran `/code/database/update_4000m_race_distances.sql`
   - 8 races updated from 0 to 4000 meters
   - 993 athletes affected

### Verification ✅
**Sanity check results:**
- Fastest normalized: 24047 cs (4:00.47 mile) - Elite HS runner ✓
- Slowest normalized: 93757 cs (15:37 mile) - Realistic ✓
- Average normalized: 37445 cs (6:14 mile) - Good HS average ✓
- World record pace: 0 results - No impossible times! ✓
- Distribution: 3,478 elite (4:00-5:00), 17,013 good (5:00-6:40), 8,528 slower ✓

### Documentation Created
- `/code/importers/NORMALIZED_TIME_FORMULA_FIX.md` - Complete analysis and fix documentation
- Updated all SQL scripts with correct formula and comments

## Next Steps for Meet 254378

### Immediate Actions
1. **Find remaining 22 missing results**
   - Run time comparison (CSV vs DB)
   - Categorize by issue type:
     - Duplicate times (same athlete, different times)
     - Missing athletes (slug collisions or other)
     - Actual data issues

2. **Fix slug collisions** (5 athletes)
   - Samarth Wadhwa
   - Zaiden Gurusamy
   - Kate Sullivan
   - Yumi Yeh
   - Addy Oh

   Options:
   - Manually add with better slug logic
   - Fix slug function first, then retry
   - Flag as duplicates if similar athletes exist

3. **Rebuild derived tables**
   - Run `batch_rebuild_athlete_best_times` for affected athletes
   - Verify athlete_best_times has no orphaned records

### Before Large Meet
1. Fix slug generation function
2. Implement robust athlete matching
3. Create `import_discrepancies` table
4. Test improved process on medium meet
5. Document final import workflow

## Critical IDs to Remember

### Meet IDs
- **254332:** c4011285-2267-4a98-8d4b-4e0f41f5ca04
- **255929:** c3b506c3-0e4b-43b6-b0fc-a0c237a24a76
- **254378:** 3f6daf82-5a37-419f-802d-f648bb97d6ff

### School IDs
- **St. Margaret's:** 32d83f42-2935-4943-a211-fad3fd660a05 (most slug collisions here)
- **Redwood (Visalia):** (Miguel Rodriguez's school)

### Athlete IDs (New)
- **Zach Causee:** ed62e037-f48d-42f3-b836-074d8c688458 (existing) & 1ad3ea4e-1ed6-4d8f-924a-624a35f6f5cb (created)
- **Benjamin Harrison:** ed8fe84c-c2ed-4f5e-b8a2-3d7a7ac5a996
- **Parker Oh:** dea53572-1832-43d8-8479-0ae062cae6ba
- **Tyler Sant:** 71698501-3924-4a9d-a7f3-95375c6c36e0
- **Andrew Xu:** 0681fabc-9e92-4ced-af47-623737c0aaa6 (DUPLICATE?)
- **Anthony Martinez:** 88e3a500-7ffc-456d-97b8-a0ce7b7a50db (DUPLICATE?)

## Scripts Ready to Run

### For Meet 255929 Fix
Need to create: `find_and_remove_duplicate_255929.py`
- Find which of Andrew Xu or Anthony Martinez is duplicate
- Check if either has results elsewhere
- Remove the duplicate athlete and result

### For Meet 254378 Remaining
1. `compare_254378_times.py` - Already exists, finds missing unique times
2. Need to create script to handle each missing result systematically

## Important Notes

1. **Always disable triggers** for bulk imports: `ALTER TABLE results DISABLE TRIGGER USER;`
2. **Always rebuild derived tables** after: Run batch functions for affected athletes
3. **Always update cached counts** after: Update `result_count` on meets table
4. **Flag ambiguous cases** instead of guessing - use `potential_duplicate_athletes` table
5. **User preference:** "flag them all as potential duplicates but add the time to the potentially duplicate name"

## Data Quality Tracking Working Well

- **potential_duplicates:** 1 record - Miguel Rodriguez (2 times: 117431 & 124551)
- **potential_duplicate_athletes:** 19 records
  - 1 from meet 254332 (Miguel Rodriguez name variation)
  - 18 from meet 254378 (9 capitalization, 9 new athletes)

Admin can review all flagged items later through UI (to be built).
