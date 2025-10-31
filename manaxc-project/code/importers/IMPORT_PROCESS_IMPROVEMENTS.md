# Import Process Improvements - Lessons Learned

## Summary of Issues Found

### Meet 254332 (22nd Golden Eagle Invitational)
- **Status:** ✅ Complete (1228/1227 CSV + 1 duplicate)
- **Issue:** Miguel Rodriguez had 2 different times (117431 cs vs 124551 cs)
- **Resolution:** Both times added, flagged in `potential_duplicates` table
- **Learning:** System correctly handles duplicate times now

### Meet 255929 (Artichoke Invitational)
- **Status:** ⚠️ 1659/1658 (1 extra)
- **Issue:** Complex - initially missing 1 result, then added 2 athletes, now have 1 extra
- **Root Cause:** Athlete already exists under different name/record OR duplicate result imported
- **Learning:** Need better duplicate detection BEFORE inserting

### Meet 254378 (Clovis Invitational)
- **Status:** 🟡 4628/4655 (99.4%, 27 missing)
- **Issues:**
  1. 13 results imported successfully
  2. 5 results failed due to slug collisions (Samarth Wadhwa, Zaiden Gurusamy, Kate Sullivan, Yumi Yeh, Addy Oh)
  3. ~22 still missing (likely more duplicate times or athlete issues)
- **Learning:** Slug generation is problematic for certain names

## Root Causes Identified

### 1. Slug Generation Issues
**Problem:** Athletes with names like "Samarth Wadhwa" generate empty/generic slugs that collide with existing athletes.

**Why:** Slug function likely:
- Removes special characters
- Lowercases everything
- Results in generic slug like `-st-margaret-s-2026`

**Solution Needed:**
- Make slugs case-sensitive OR
- Include more name information in slug OR
- Use UUID-based slugs with name as secondary index OR
- Better handling of special characters (preserve hyphens, apostrophes, etc.)

### 2. Trigger Bugs with Foreign Keys
**Problem:** Trigger tries to insert `athlete_best_times` with non-existent result ID `eacc14dd-984f-49e1-97d6-9c996715f151`

**Why:** Trigger logic has a bug when calculating best times

**Solution Used:** Disable USER triggers during import, rebuild derived tables after

### 3. Missing Athletes During Import
**Problem:** Andrew Xu and Anthony Martinez weren't created during initial import of meet 255929

**Why:** Unknown - either:
- Import script skipped them due to error
- Name matching issue
- Race condition during import

**Solution Needed:** Better logging of skipped athletes during import

### 4. Duplicate Detection Not Robust Enough
**Problem:** We added both Andrew Xu and Anthony Martinez, but one was already in system

**Why:** Script doesn't check for existing athletes well enough before creating

**Solution Needed:** Multi-stage athlete matching:
1. Exact name + school match
2. Fuzzy name match (case-insensitive, handle middle initials)
3. Only then create new athlete

## Process Improvements Needed

### Before Large Meet Import (10,000+ results)

1. **Fix Slug Generation**
   - Update slug function to be case-sensitive or use better algorithm
   - Test with problematic names (Samarth Wadhwa, etc.)

2. **Robust Athlete Matching**
   - Create function to find existing athlete with fuzzy matching
   - Check for:
     - Exact match
     - Case-insensitive match
     - Middle initial variations
     - Nickname variations
   - Flag ambiguous matches instead of creating duplicates

3. **Import with Triggers Disabled**
   - Always disable USER triggers during bulk import
   - Rebuild derived tables after import completes
   - Prevents trigger bugs from blocking import

4. **Post-Import Verification**
   - Compare CSV row count to DB row count
   - List all discrepancies with sample data
   - Auto-flag for admin review

5. **Better Error Handling**
   - Log all skipped athletes with reason
   - Continue on error instead of failing entire import
   - Summary report at end

6. **Batch Processing for Large Meets**
   - Split results into batches of 1000
   - Import each batch separately
   - Track progress and allow resume on failure

## Recommended Import Workflow

```
1. Scrape meet data to CSV files
2. Disable USER triggers
3. Import foundation (meets, schools, venues, courses, races)
4. Import athletes in batches with fuzzy matching
5. Import results in batches
6. Re-enable triggers
7. Rebuild derived tables for all affected athletes
8. Run post-import verification
9. Flag discrepancies in import_discrepancies table
10. Update cached counts (result_count on meets table)
```

## Data Quality Tables Status

### ✅ Created
- `potential_duplicates` - Tracks duplicate times for same athlete
- `potential_duplicate_athletes` - Tracks ambiguous athlete name matches

### ⏳ To Create
- `import_discrepancies` - Tracks CSV vs DB count mismatches

### Current Flagged Items
- **Duplicate times:** 1 (Miguel Rodriguez)
- **Duplicate athletes:** 19 (1 from 254332, 18 from 254378)
- **Total items for admin review:** 20

## Next Steps

1. Fix the 1 extra result in meet 255929 (find and remove duplicate)
2. Document slug generation issue and propose fix
3. Create robust athlete matching function
4. Create import_discrepancies table
5. Build admin UI for reviewing flagged items
6. Test improved process on medium-sized meet before tackling 10K+ meet
