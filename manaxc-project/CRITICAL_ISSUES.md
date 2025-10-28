# Critical Issues to Address

**Last Updated:** October 28, 2025 (Late Sprint)
**Status:** 🔴 CRITICAL - Import failing, manual editing UI incomplete
**See also:** `/CLAUDE_PROMPT.md` for full context

## Import Failure - 0 Results Imported

**Status:** CRITICAL - Import ran but imported 0/1633 results

**Error:** "Skipped 1633 results (missing athlete/race)"

**Root Cause:** Likely issue with how the CSV importer is matching/creating athletes and races. The importer created 0 athletes, 0 races, 0 meets - suggesting the data structure doesn't match what the importer expects.

**Next Steps:**
1. Check the CSV structure in `to-be-processed/school_1076_1761665401/` (or wherever it moved)
2. Compare with what `import_csv_data.py` expects
3. Debug the import process stage by stage

## Scraper Issues Identified by User

### 1. Venue Not Properly Extracted
- **Meets affected:** 254429, 254535
- **Problem:** Only Montgomery Hill Park was extracted as venue
- **Other meets:** Baylands course venue not captured

### 2. Course Distance Incorrect
- **Course:** Baylands
- **Problem:** Wrong distance scraped

### 3. Manual Editing Capability Needed
**User needs ability to manually edit:**
- Meet venue
- Course name
- Course distance
- Add missing courses
- Assign courses to venues

## Action Items

### Immediate (Critical Path):
1. ✅ Create manual editing UI for:
   - Venues (add, edit, delete)
   - Courses (add, edit distance, assign to venue)
   - Meets (edit venue assignment)

2. ❌ Fix import process to actually import the 1633 results

3. ❌ Debug/optimize scraper for better venue/course extraction

### Scraper Optimization Needed:
File: `/Users/ron/manaxc/manaxc-project/code/importers/athletic_net_scraper_v2.py`

**Issues to investigate:**
- Venue extraction logic - why only Montgomery Hill Park?
- Course distance parsing - what's going wrong with Baylands?
- Meet 254429 and 254535 specific issues

**Debugging approach:**
1. Re-run scraper with verbose logging
2. Check actual Athletic.net pages for meets 254429, 254535
3. Verify course distance is in expected format on Athletic.net
4. Add fallback/manual correction workflow

## Manual Workaround Until Fixed

Since import failed and scraper has issues, you'll need:

1. **SQL to add meets manually** (via Supabase dashboard)
2. **Admin UI to edit venues/courses/meets** (partially implemented)
3. **Re-run import** after fixing the CSV importer

## Files to Check

- `/Users/ron/manaxc/manaxc-project/code/importers/import_csv_data.py` - Why did it skip all results?
- `/Users/ron/manaxc/manaxc-project/code/importers/athletic_net_scraper_v2.py` - Venue/distance extraction
- `/Users/ron/manaxc/manaxc-project/code/importers/to-be-processed/school_1076_1761665401/` - Check scraped CSV data

## Progress on Manual Editing UI

✅ Added School interface/state/load function
✅ Created SQL migration for league/subleague/cif_division
⏳ Need to complete Schools section UI
⏳ Need to add Venues section (CRUD)
⏳ Need to add venue dropdown to Courses section
⏳ Need to add Meets section for venue editing
⏳ Need to add ability to manually add/edit courses with distance

**Priority:** Get manual editing UI working FIRST, then debug scraper.
