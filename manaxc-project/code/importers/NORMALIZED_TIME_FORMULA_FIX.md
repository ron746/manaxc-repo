# CRITICAL BUG FIX: Normalized Time Formula

**Date:** 2025-10-30
**Severity:** CRITICAL - affects all normalized time calculations database-wide
**Status:** Fixed in code, need to run migrations

## The Problem

The normalized_time_cs formula was completely inverted. It was **dividing** by distance instead of properly scaling by distance ratio.

### Broken Formula (BEFORE)
```sql
time_cs * 100000.0 / (difficulty_rating * (5280.0 / 3.0) * distance_meters)
```

**Why this is wrong:**
- Divides by `distance_meters`
- Makes LONGER races produce SMALLER normalized times
- Example: A 20:00 5K would normalize to a LOWER number than a 12:00 3K - impossible!
- Resulted in normalized times under 10000 cs (under 100 seconds for a mile) - physically impossible for high school runners

### Correct Formula (AFTER)
```sql
time_cs * 1600.0 / (difficulty_rating * distance_meters)
```

**Why this is correct:**
- Properly scales: `(time / distance) * 1600 / difficulty`
- Longer races = proportionally longer normalized times
- Example: 20:00 5K (12000m time / 5000m distance) = 2.4 min/km × 1.6km / difficulty = realistic mile equivalent
- Produces normalized times in 24000-40000 cs range (4:00-6:40 mile pace) for typical HS runners

## Impact

### What Was Affected
- **All results in the database** with normalized_time_cs set
- **athlete_best_times** table - all season/alltime best normalized times
- **school_hall_of_fame** table - sorted by normalized times
- **Any leaderboards or comparisons** using normalized times

### Verification After Fix
Sample results from top 20 fastest normalized times:
```
Jackson Spencer:  24047 cs = 4:00.47 mile (elite HS time) ✓
Sam Hansen:       24134 cs = 4:01.34 mile (elite HS time) ✓
Duncan Lorang:    24242 cs = 4:02.42 mile (elite HS time) ✓
```

These are realistic for top high school cross country athletes.

## Files Fixed

### 1. Database Scripts
- ✅ `/code/database/fix_normalized_time_formula.sql` - Recalculates ALL normalized times
- ✅ `/code/database/batch_rebuild_derived_tables.sql` - Updated formula
- ✅ `/code/database/rebuild_athlete_best_times_after_distance_fix.sql` - Updated formula

### 2. Migrations
- ✅ `/website/supabase/migrations/20251030_fix_normalized_time_formula.sql` - New migration to:
  - Update `batch_rebuild_normalized_times()` function with correct formula
  - Create `calculate_normalized_time()` trigger function for auto-calculation
  - Add trigger to auto-calculate on INSERT/UPDATE

### 3. Old Migrations (NOT updated - for historical record)
- `/website/supabase/migrations/20251029_add_batch_rebuild_functions_v4.sql` - Contains broken formula (line 18)
- `/website/supabase/migrations/20251029_add_batch_rebuild_functions_v2.sql` - Contains broken formula
- These are left as-is for git history. New migration supersedes them.

## Execution Plan

### Step 1: Fix All Existing Data
Run in Supabase SQL Editor:
```sql
-- File: /code/database/fix_normalized_time_formula.sql
-- This updates ALL results with correct normalized times
```

**Expected results:**
- All normalized times recalculated with correct formula
- Should see 0 records with normalized_time_cs < 10000 (after fix)
- Fastest times should be ~24000-26000 cs for elite runners
- Typical times should be ~28000-40000 cs

### Step 2: Update Functions for Future
Run in Supabase SQL Editor:
```sql
-- File: /website/supabase/migrations/20251030_fix_normalized_time_formula.sql
-- This fixes the batch rebuild function and adds auto-calculation trigger
```

**This ensures:**
- Future manual rebuilds use correct formula
- New results auto-calculate normalized_time_cs correctly via trigger

### Step 3: Rebuild Derived Tables
After fixing normalized times, rebuild dependent tables:
```sql
-- File: /code/database/batch_rebuild_derived_tables.sql
-- Run sections 2-5 to rebuild:
-- - athlete_best_times (uses normalized times)
-- - school_hall_of_fame (sorted by normalized times)
-- - course_records
-- - school_course_records
```

## Root Cause

The formula appeared in multiple places with the same error, suggesting it was copied from an initial implementation without validation. The formula likely originated from:

1. Initial migration: `20251029_add_batch_rebuild_functions_v4.sql` (line 18)
2. Copied to: `batch_rebuild_derived_tables.sql`
3. Copied to: Other rebuild scripts

**Lesson learned:** Mathematical formulas should be:
1. Validated with sample data before deploying
2. Unit tested with known inputs/outputs
3. Sanity-checked (e.g., "can a high school runner run sub-100 second mile?")

## Prevention

### Added Documentation
- Comments in all SQL files explaining the formula
- Sample data checks showing expected ranges
- Function comments documenting the formula

### Testing
Should add tests that verify:
- Normalized time for 5000m in 15:00 (elite) = ~24000 cs
- Normalized time for 5000m in 20:00 (good) = ~32000 cs
- Normalized time for 3000m in 10:00 (good) = ~32000 cs (same athlete effort)
- No normalized times < 20000 cs (sub-3:20 mile - world record territory)

## Timeline

1. **2025-10-28**: Initial migrations deployed with broken formula
2. **2025-10-30**: User noticed impossible times under 10000 cs
3. **2025-10-30**: Bug identified and fixed
4. **Next**: Run fix SQL, then migration, then rebuild derived tables

## Related Issues

This bug was discovered while investigating:
- 8 races with `distance_meters = 0` causing NULL normalized times
- User asked: "Are you fixing this in the sql?" referring to low normalized_time_cs values
- Investigation revealed the formula itself was broken, not just missing distance data
