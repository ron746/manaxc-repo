# ManaXC Import System - Technical Handoff

## Sprint Summary

### Goals Achieved ✅
1. Fixed critical gender detection bug - all athletes now have correct gender
2. Fixed missing races issue - all 6 race types now captured (including Reserves)
3. Fixed graduation year calculation - accounts for athletic calendar (July 1 - June 30)
4. Created dual-mode admin UI - Single Meet and School Season scraping
5. Fixed all import duplicate handling issues
6. Tested end-to-end with real data (Silver Creek 2025: 7 meets, 2,785 results)

### Architecture

```
manaxc-project/
├── code/importers/                    # Backend scraping and import
│   ├── athletic_net_scraper_v2.py    # Main scraper (Selenium-based)
│   ├── import_csv_data.py            # CSV → Database importer
│   ├── clear_database.py             # Database utility
│   ├── to-be-processed/              # Scraped data output
│   └── venv/                         # Python virtual environment
│
└── website/                          # Next.js frontend
    ├── app/admin/import/
    │   └── page.tsx                  # Main import UI
    └── app/api/admin/
        ├── scrape-meet/route.ts      # Single meet API
        ├── scrape-school/route.ts    # School season API
        ├── list-imports/route.ts     # List scraped data
        └── import-csv/route.ts       # Import to database
```

## Key Technical Decisions

### 1. Gender Detection Strategy
**Problem**: Text-based parsing on meet overview page failed because gender markers appeared after race listings.

**Solution**:
- Extract all race IDs from HTML links on meet page
- Visit each individual race page
- Parse gender from race title: "Mens 2.74 Miles Varsity" → M

**Code Location**: `athletic_net_scraper_v2.py:358-682` (scrape_by_meet function)

### 2. Race Coverage
**Problem**: Regex-based race detection missed "Reserves" and other race types.

**Solution**:
- Extract race IDs directly from `<a href="/results/1077799">` links
- No filtering - capture ALL races found
- Added "Reserves" to race type patterns

**Code Location**: `athletic_net_scraper_v2.py:424-433`

### 3. Graduation Year Formula
**Problem**: Original formula didn't account for athletic calendar running July 1 - June 30.

**Solution**:
```python
def calculate_grad_year(grade: int, season_year: int) -> int:
    """
    Formula: grad_year = season_year + (13 - grade)

    Examples:
        grade=12, season=2025 → 2026 (senior graduates spring 2026)
        grade=9, season=2025 → 2029 (freshman graduates spring 2029)
    """
    if grade == 13:  # Post-grad
        return season_year + 1
    return season_year + (13 - grade)
```

**Code Location**: `athletic_net_scraper_v2.py:197-227`

### 4. Duplicate Handling
**Problem**: Unique constraints on `athletic_net_id` caused insertion failures when empty strings were used.

**Solution**:
- Convert empty `athletic_net_id` values to NULL (None in Python)
- Check for existing records by:
  - `athletic_net_id` if present
  - Fallback to unique name combinations if not
- For results: try batch insert, fall back to individual inserts if duplicates found

**Code Locations**:
- Venues: `import_csv_data.py:286-308`
- Courses: `import_csv_data.py:314-342`
- Schools: `import_csv_data.py:348-370`
- Meets: `import_csv_data.py:408-437`
- Races: `import_csv_data.py:456-481`
- Results: `import_csv_data.py:527-557` (batch insert with error handling)

### 5. Race-to-Meet Mapping
**Problem**: Results need both `race_id` and `meet_id`, but CSV only has race ID.

**Solution**:
- Create `race_to_meet_map` during race import
- Map each `athletic_net_race_id` → `meet_db_id`
- Use this map when importing results

**Code Location**: `import_csv_data.py:442-481`

## Data Flow

### Scraping Workflow
```
1. User enters meet ID or school ID + season
   ↓
2. Next.js API route receives request
   ↓
3. API spawns Python scraper subprocess
   ↓
4. Scraper uses Selenium to:
   - Load meet page
   - Extract all race IDs from links
   - Visit each race page individually
   - Parse results using DOM selectors
   ↓
5. Data saved to to-be-processed/ as CSV files
   ↓
6. Metadata.json created with stats
   ↓
7. API returns success + directory path
```

### Import Workflow
```
1. User clicks "Import" on scraped dataset
   ↓
2. API route spawns import_csv_data.py
   ↓
3. Import script processes in 7 stages:
   Stage 1: Venues
   Stage 2: Courses
   Stage 3: Schools
   Stage 4: Athletes (with progress counter)
   Stage 5: Meets
   Stage 6: Races (build race-to-meet map)
   Stage 7: Results (batch insert with duplicate handling)
   ↓
4. Each entity checked for duplicates before insert
   ↓
5. Stats returned: X created, Y skipped
```

## Database Schema Key Constraints

### Unique Constraints
- `venues.athletic_net_id` (nullable)
- `courses.athletic_net_id` (nullable)
- `schools.athletic_net_id` (nullable)
- `meets.athletic_net_id` (nullable)
- `races.athletic_net_race_id` (nullable)
- `results(athlete_id, meet_id, race_id, data_source)` composite key

### Important Fields
- All times stored in **centiseconds** (e.g., 16:27.70 → 98770)
- Gender stored as **text** 'M' or 'F' (not boolean)
- `is_legacy_data` = true for all Athletic.net imports
- `data_source` = 'athletic_net' for all scraped data

## Testing Results

### Test 1: Single Meet (meet_270614)
```
✅ 6 races captured (Varsity M/F, JV M/F, Reserves M/F)
✅ 181 results with correct genders
✅ Proper graduation years (2026-2029 range)
✅ All schools identified
✅ Montgomery Hill Park venue captured
```

### Test 2: School Season (Silver Creek 1082, 2025)
```
✅ 7 meets scraped successfully
✅ 31 races total
✅ 2,785 results
✅ 2,782 unique athletes
✅ 127 different schools
✅ Gender distribution: 981 F, 1,801 M (realistic ratio)
✅ All races have correct gender markers (15 F, 16 M)
```

## Known Limitations

### Current Version
1. **No interactive validation** - imports are automatic, no user prompts
2. **Default difficulty rating** - all courses get 5.0, not calculated from results
3. **No pre-import review** - no chance to review/adjust data before committing
4. **No progress streaming** - UI shows final result only, not real-time updates
5. **No athlete deduplication warnings** - similar names from different schools not flagged

### Browser Requirements
- Requires Chrome + ChromeDriver installed
- ChromeDriver must match Chrome version
- Scraper runs in headless mode (no visible browser)

### Performance
- Single meet: ~30-60 seconds
- School season (7 meets): ~5-10 minutes
- Import time: ~10-30 seconds for single meet, ~1-2 minutes for full season

## Environment Setup

### Required Environment Variables (.env)
```bash
SUPABASE_URL=https://mdspteohgwkpttlmdayn.supabase.co
SUPABASE_KEY=<your-anon-key>
```

### Python Dependencies (venv/lib/python3.13/site-packages/)
- selenium
- supabase-py
- python-dotenv
- webdriver-manager (optional, for auto ChromeDriver management)

### Node.js Dependencies (website/package.json)
- next
- react
- Supabase client library

## Common Errors and Solutions

### Error: "duplicate key value violates unique constraint"
**Cause**: Empty string `athletic_net_id` values treated as duplicates
**Fix**: ✅ FIXED - Now converts empty strings to NULL

### Error: "null value in column 'meet_id' violates not-null constraint"
**Cause**: Race-to-meet mapping not built before results import
**Fix**: ✅ FIXED - Created `race_to_meet_map` during race import

### Error: "chromedriver not found"
**Cause**: ChromeDriver not in PATH
**Fix**: Install ChromeDriver: `brew install chromedriver` (Mac)

### Error: "Permission denied" on venv/bin/python3
**Cause**: Virtual environment not activated or corrupt
**Fix**: Recreate venv: `python3.13 -m venv venv`

## Future Enhancements (Next Sprint)

### High Priority
1. **Interactive Import Validation**
   - Show data preview before import
   - Allow user to adjust course difficulty
   - Flag potential duplicate athletes
   - Confirm race type assignments

2. **Real-time Progress Updates**
   - Stream scraper output to UI
   - Show "Processing race X of Y"
   - Display running totals

3. **Difficulty Rating Calculation**
   - Calculate from race results
   - Compare to historical data
   - Request user confirmation/adjustment

### Medium Priority
4. **Athlete Deduplication UI**
   - Flag similar names
   - Suggest merge candidates
   - Manual review workflow

5. **Error Recovery**
   - Resume failed scrapes
   - Retry failed imports
   - Partial import support

6. **Batch Operations**
   - Scrape multiple schools at once
   - Import multiple datasets together
   - Schedule automated scrapes

### Low Priority
7. **Data Validation Rules**
   - Check for unrealistic times
   - Verify graduation year ranges
   - Flag missing gender/grade data

8. **Historical Data Migration**
   - Import old Excel files
   - Merge with Athletic.net data
   - Handle conflicts

## Deployment Checklist

Before deploying to production:
- [ ] Update .env with production Supabase credentials
- [ ] Install ChromeDriver on production server
- [ ] Set up proper error logging
- [ ] Configure backup schedule for scraped data
- [ ] Test all API routes with production data
- [ ] Document manual recovery procedures
- [ ] Create admin user accounts
- [ ] Set up monitoring/alerts

## Contact and Support

For questions or issues:
- Review USER_GUIDE.md for usage instructions
- Check SINGLE_RACE_IMPORT_PLAN.md for original requirements
- Review git history for specific bug fixes
- Check terminal output for detailed error messages

## Git Commits Reference

Key commits in this sprint:
- Gender detection fix: Race page scraping implementation
- Missing races fix: Race ID extraction from HTML links
- Graduation year fix: Formula update for athletic calendar
- Duplicate handling: NULL conversion and fallback matching
- Admin UI: Dual-mode scraping interface
- Import fixes: Race-to-meet mapping and batch error handling

---

**Sprint Completed**: October 27-28, 2025
**System Status**: ✅ Production Ready
**Next Sprint**: Interactive validation and difficulty rating calculation
