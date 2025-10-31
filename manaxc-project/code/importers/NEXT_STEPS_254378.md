# Next Steps: Complete Meet 254378 Import

## Current State
- **Have:** 4628 results
- **Need:** 4655 results
- **Missing:** 27 results

## Already Done
1. ✅ Imported 13 results (using existing athlete IDs where possible)
2. ✅ Flagged 18 items in `potential_duplicate_athletes`
3. ✅ Updated cached count to 4628
4. ✅ Triggers re-enabled

## Breakdown of 27 Missing

### Known (18 from first analysis)
- **5 slug collisions** (athletes not created):
  1. Samarth Wadhwa (time: 96560)
  2. Zaiden Gurusamy (time: 102980)
  3. Kate Sullivan (time: 130720)
  4. Yumi Yeh (time: 133440)
  5. Addy Oh (time: 142190)

- **13 imported successfully** (DONE)

### Unknown (9 more missing)
- Need to run comparison to find remaining 9 missing times/results

## Action Plan

### Step 1: Find Remaining 9 Missing Results
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
source venv/bin/activate
python compare_254378_times.py
```

This will show all missing unique times. We already know about the 5 slug collision times.

### Step 2: Handle the 5 Slug Collisions

**Option A: Fix slug function, then retry**
- Best long-term solution
- Requires code change to slug generation
- Test on these 5 names first

**Option B: Manually create with better slug**
- Quick fix for these 5
- Create athletes with manual slug override
- Import their results

**Option C: Find similar athletes and use existing IDs**
- Check if "Samarth Wadhwa" is actually "Zach Causee" (grad/gender match?)
- Use existing athlete if found
- Only create new if truly unique

**Recommended: Option C first** (matches user preference to flag duplicates)

### Step 3: Script to Handle Remaining Results

Create: `import_final_254378_results.py`

Logic:
```python
for each missing time:
    1. Get CSV row(s) for that time
    2. Check if athlete exists (fuzzy match):
       - Exact name + school
       - Case-insensitive + school
       - Similar name (grad year + gender + school)
    3. If exists:
       - Use existing athlete ID
       - Add result
       - Flag in potential_duplicate_athletes if name differs
    4. If not exists:
       - Try to create athlete
       - If slug collision:
           - Search for similar athlete
           - If found: use existing (flag as potential duplicate)
           - If not found: manual review needed
       - Add result
```

## Quick Commands

### Check current count
```bash
psql "$NEXT_PUBLIC_SUPABASE_URL" -c "SELECT COUNT(*) FROM results WHERE meet_id = '3f6daf82-5a37-419f-802d-f648bb97d6ff';"
```

### Disable triggers before import
```sql
ALTER TABLE results DISABLE TRIGGER USER;
```

### Re-enable triggers after
```sql
ALTER TABLE results ENABLE TRIGGER USER;
```

### Update cached count
```python
python update_meet_254378_count.py
```

## Files to Use

1. **compare_254378_times.py** - Find missing times
2. **import_and_flag_missing_254378.py** - Template for import (modify for remaining)
3. **CSV:** to-be-processed/meet_254378_1761786641/results.csv

## Meet 254378 Details

- **ID:** 3f6daf82-5a37-419f-802d-f648bb97d6ff
- **Name:** Clovis Invitational
- **CSV:** 4655 results (4654 data rows + 1 header)
- **CSV columns:** athletic_net_race_id, athlete_name, athlete_first_name, athlete_last_name, athlete_school_id, time_cs, place_overall, grade, needs_review

## After Completion

1. Verify: `python verify_meet_254378_final.py`
2. Update count: `python update_meet_254378_count.py`
3. Rebuild derived tables: Run batch functions for new athletes
4. Document final status in CURRENT_STATUS.md
