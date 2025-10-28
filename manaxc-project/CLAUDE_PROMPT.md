# ManaXC Project - Claude Session Starter

**READ THIS FILE FIRST when starting any new session on this project.**

---

## Quick Start Command

```
Please read /Users/ron/manaxc/CLAUDE_PROMPT.md to understand the current state
of the ManaXC project and what we're working on.
```

---

## Project Overview

**ManaXC** is a cross-country race management and analytics platform built with:
- **Frontend**: Next.js 16.0.0, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Data Pipeline**: Python 3.13 (Selenium-based web scraping)
- **Deployment**: Vercel (switched from Cloudflare Pages Oct 28, 2025)

**Primary Goal**: Import, manage, and analyze cross-country race data from Athletic.net and historical sources.

---

## Current System Status

### ✅ Production Ready Components

1. **Website** (Vercel)
   - **Primary URL**: https://manaxc.vercel.app/
   - **Custom Domain**: https://manaxc.com (redirects to Vercel via Cloudflare Page Rules)
   - **Deployment**: Automatic via GitHub integration
   - **Working pages**: Home, Meets, Schools, Athletes, Courses (all list and detail views)
   - **Features**: Responsive design, dynamic routes, API routes, server-side rendering
   - **Admin UI**: `/admin/import` for data import operations

2. **Athletic.net Import System** (v1.0 - Sprint Complete Oct 27, 2025)
   - **Status**: 🟢 Fully Operational
   - Single meet scraping ✅
   - School season scraping ✅
   - Dual-mode admin UI ✅
   - All critical data quality bugs fixed ✅
   - Tested with 2,785+ results across 7 meets ✅

### 🚧 Work In Progress

- **Phase 2**: Interactive validation features (Next Sprint)
- **Missing Pages**: Individual athlete detail pages, individual school detail pages
- **Data Migration**: Historical Excel data import (planned)

---

## Essential Documentation

### Must Read (Before Any Code Work)

1. **Sprint Completion Summary**
   - Location: `/Users/ron/manaxc/manaxc-project/code/importers/SPRINT_COMPLETION_SUMMARY.md`
   - Contains: Sprint goals, testing results, achievements, next sprint backlog

2. **Technical Handoff**
   - Location: `/Users/ron/manaxc/manaxc-project/code/importers/TECHNICAL_HANDOFF.md`
   - Contains: Architecture, key decisions, data flow, known limitations, future enhancements

3. **User Guide**
   - Location: `/Users/ron/manaxc/manaxc-project/code/importers/USER_GUIDE.md`
   - Contains: How to use the import system, troubleshooting, command reference

### Architecture Reference

4. **Schema Comparison**
   - Location: `/Users/ron/manaxc/docs/session-archives/SCHEMA_COMPARISON_OLD_VS_NEW.md`
   - Contains: Database schema evolution, field mappings

5. **Missing Data Analysis**
   - Location: `/Users/ron/manaxc/docs/session-archives/MISSING_DATA_ANALYSIS.md`
   - Contains: Data completeness analysis, what's missing vs what we have

---

## Project Structure

```
/Users/ron/manaxc/manaxc-project/
├── website/                          # Next.js frontend
│   ├── app/                          # App router pages
│   │   ├── admin/import/page.tsx    # Import admin UI
│   │   ├── athletes/page.tsx        # Athletes list
│   │   ├── meets/page.tsx           # Meets list
│   │   └── schools/page.tsx         # Schools list
│   ├── components/                   # React components
│   ├── lib/                          # Utilities
│   │   └── supabase/                # Database queries
│   └── public/                       # Static assets
│
├── code/importers/                   # Python data pipeline
│   ├── athletic_net_scraper_v2.py   # Main scraper (PRODUCTION)
│   ├── import_csv_data.py           # CSV → Database import
│   ├── clear_database.py            # Database utility
│   ├── to-be-processed/             # Scraped data output
│   ├── venv/                        # Python virtual environment
│   ├── SPRINT_COMPLETION_SUMMARY.md # Latest sprint report
│   ├── TECHNICAL_HANDOFF.md         # Developer docs
│   └── USER_GUIDE.md                # End-user guide
│
├── docs/session-archives/            # Historical documentation
└── CLAUDE_PROMPT.md                 # This file (ALWAYS IN ROOT)
```

---

## Critical Information

### Database Schema (Supabase)

**Core Tables**:
- `venues` - Race locations (name, city, state, athletic_net_id)
- `courses` - Race courses (name, distance_meters, difficulty, venue_id)
- `schools` - High schools (name, city, state, athletic_net_id)
- `athletes` - Student athletes (name, gender, grad_year, school_id)
- `meets` - Race meets (name, date, season_year, venue_id)
- `races` - Individual races (name, gender, distance_meters, race_type, meet_id, course_id)
- `results` - Race results (time_centiseconds, place_overall, athlete_id, race_id, meet_id)

**Key Constraints**:
- All `athletic_net_id` fields are **nullable** (NULL not empty string)
- Times stored in **centiseconds** (16:27.70 → 98770)
- Gender stored as **text** 'M' or 'F' (not boolean)
- Composite unique key on results: `(athlete_id, meet_id, race_id, data_source)`

### Recent Critical Fixes (Oct 27, 2025)

1. **Gender Detection** - Fixed by scraping individual race pages (100% accurate)
2. **Race Coverage** - Fixed by extracting race IDs from HTML links (all races captured)
3. **Graduation Year** - Fixed formula: `season_year + (13 - grade)` (accounts for athletic calendar July 1 - June 30)
4. **Duplicate Handling** - Fixed NULL handling and batch insert fallback
5. **Race-to-Meet Mapping** - Fixed by building map during race import

### Course Difficulty Rating System (Oct 28, 2025 - Enhanced)

**Pace Multiplier Concept:**
- Measures effort multiplier needed to run 1 mile on track vs the XC course
- Range: 1.00 (flat track) to 1.64 (extremely difficult)
- Typical HS XC: 1.06 to 1.25
- **Baseline:** 1.1336 (median high school course)
- **Precision:** 10 decimal places (for training pace calculations from marathon to sprint)

**Example:**
- Course difficulty 1.15 = 15% harder than flat track
- 5:00/mile on track = 5:45/mile effort on this course

**Malcolm Slaney's Research Integration:**
- **Research:** 70k+ boys, 63k+ girls HS results, Bayesian modeling (PyMC)
- **Statistical Robustness:** 36 MCMC chains, 72,000 trace samples per course
- **CRITICAL DIFFERENCE:** Slaney's baseline = Crystal Springs 2.95mi = 1.0, Our baseline = 1.1336
- **NOT directly comparable** - use his methodology, NOT his numeric scale
- **Seasonal improvement:** ~10.5 sec/month for boys
- **Yearly improvement:** ~15.2 sec/year for boys

**Gender-Specific Development Patterns:**
- **Boys:** Generally consistent improvement through HS
- **Girls:** HIGHLY VARIABLE due to puberty (hormonal changes, body composition)
  - Early developers may peak as freshmen/sophomores
  - Late developers may improve as juniors/seniors
  - **DO NOT assume linear improvement** - look at individual trend data

**Implementation:** `/app/api/admin/analyze-course/route.ts` with enhanced statistical analysis

### Deployment Platform Switch (Oct 28, 2025)

**Migration: Cloudflare Pages → Vercel**

**Why the switch?**
- Cloudflare Pages requires static export (`output: 'export'`) which breaks:
  - API routes (needed for `/admin/import` functionality)
  - Dynamic routes without `generateStaticParams()` (11 routes would need implementation)
- Vercel has native Next.js 16 support (Vercel created Next.js)
- Full support for server-side rendering, API routes, and dynamic routes

**Key Configuration Changes:**
1. Removed `output: 'export'` from `next.config.ts`
2. Added `turbopack.root` config to prevent symlink errors from parent directories
3. Build command remains `npm run build` (standard Next.js build)

**Lessons Learned:**
- Next.js 16 static export is incompatible with API routes
- Dynamic routes in static export require `generateStaticParams()` for every [param] route
- Turbopack scans parent directories by default, causing issues with Python venv symlinks
- Vercel deployment "just works" with Next.js 16 - no configuration gymnastics needed

### Environment Setup

**Required Environment Variables** (`.env` in `/code/importers/`, `.env.local` in `/website/`):
```bash
SUPABASE_URL=https://mdspteohgwkpttlmdayn.supabase.co
SUPABASE_KEY=<your-anon-key>
```

**Python Dependencies** (in venv):
- selenium
- supabase-py
- python-dotenv

**System Requirements**:
- Python 3.13+
- Chrome + ChromeDriver
- Node.js + npm

---

## Common Tasks

### Starting Development

```bash
# Start Next.js dev server
cd /Users/ron/manaxc/manaxc-project/website
npm run dev
# Access at http://localhost:3000/admin/import

# Activate Python environment
cd /Users/ron/manaxc/manaxc-project/code/importers
source venv/bin/activate
```

### Scraping Data

```bash
# Single meet
venv/bin/python3 athletic_net_scraper_v2.py meet 270614

# School season
venv/bin/python3 athletic_net_scraper_v2.py school 1082 2025
```

### Importing Data

```bash
# Import scraped CSV data
venv/bin/python3 import_csv_data.py to-be-processed/meet_270614_1761619855
```

### Database Management

```bash
# Clear all data (WARNING: Destructive!)
echo "DELETE ALL DATA" | venv/bin/python3 clear_database.py
```

---

## 🚨 CRITICAL ISSUES - MUST READ FIRST 🚨

### Issue 1: Import Failure - 0 Results Imported (BLOCKING)

**Status:** CRITICAL - Scraper succeeded, import failed completely

**Details:**
- Scraper successfully collected 1633 results from 5 meets (school 1076, 2025 season)
- Import validation passed (0 errors, 0 warnings)
- Import ran but imported: 0 athletes, 0 races, 0 meets, 0 results
- All 1633 results skipped with: "missing athlete/race"

**Root Cause:** CSV structure vs importer expectations mismatch OR silent failure in athlete/race creation

**Files:**
- `/Users/ron/manaxc/manaxc-project/code/importers/import_csv_data.py`
- Scraped data: `/Users/ron/manaxc/manaxc-project/code/importers/to-be-processed/school_1076_1761665401/`

**Next Steps:**
1. Check CSV structure in scraped folder
2. Debug athlete creation logic
3. Debug race creation logic
4. Add verbose logging
5. Test import stage by stage

**Detailed Doc:** `/Users/ron/manaxc/manaxc-project/CRITICAL_ISSUES.md`

### Issue 2: Scraper Venue/Distance Extraction Problems

**Status:** HIGH - Blocking data quality

**Problems:**
1. Meet 254429: Venue not properly extracted
2. Meet 254535: Venue not properly extracted
3. Baylands course: Incorrect distance scraped
4. Only Montgomery Hill Park consistently extracted

**Root Cause:** Venue extraction logic in `athletic_net_scraper_v2.py` not robust enough

**Workaround:** Manual editing UI needed (see below)

**Files:** `/Users/ron/manaxc/manaxc-project/code/importers/athletic_net_scraper_v2.py`

### Issue 3: Manual Editing UI Incomplete

**Status:** HIGH - Required for data quality fixes

**What's Needed:**
- Edit school league/subleague/CIF division
- Add/edit/delete venues
- Assign courses to venues
- Edit course distances
- Edit meet venue assignments

**What's Done:**
- School interface and state management added to `/app/admin/maintenance/page.tsx`
- SQL migration created: `/Users/ron/manaxc/manaxc-project/website/ADD_SCHOOL_FIELDS.sql` (NOT YET RUN)

**What's Missing:**
- Schools section UI with dropdowns
- Venues section (full CRUD)
- Course-venue assignment UI
- Meets venue editing

**Detailed Doc:** `/Users/ron/manaxc/manaxc-project/MAINTENANCE_PAGE_UPDATES.md`

---

## Latest Sprint Work (Oct 28, 2025 - Evening Sprint)

### 1. Course Records & Team Performances ✅

**What:** Moved course records to main course detail page and enhanced team performance calculations

**Key Changes:**
- Moved course records from separate `/courses/[id]/records` page to main `/courses/[id]` page
- Added overall course records (fastest time ever) for boys and girls
- Added grade-level records (9th-12th) for boys and girls with color-coded cards
- Updated team performance calculation algorithm:
  - OLD: Average of top 7 runners across all races
  - NEW: Combined time of top 5 runners in a single race
- Only teams with exactly 5 runners count as valid team scores
- Reordered sections: Course Records → Team Performances → Meets
- Removed stats cards showing 0 (Total Meets, Total Results, Boys/Girls Results)

**Files Changed:**
- `/app/courses/[id]/page.tsx` - Main course detail page with records and performances
- `/app/courses/[id]/records/page.tsx` - Old records page (deprecated, may need removal)
- `/app/courses/page.tsx` - Courses listing page
- `/app/meets/page.tsx` - Meets listing page
- `/components/layout/Header.tsx` - Navigation header
- `/lib/supabase/queries.ts` - Database queries

**Team Scoring Algorithm:**
```typescript
// Group results by race first, then by school within each race
byRace[raceId][schoolId] = results
// For each school in each race:
//   Sort by time, take top 5
//   Only count if exactly 5 runners
//   Calculate combined time (sum of top 5)
// Sort all performances by combined time
// Display top 5
```

**Grade Calculation:**
```typescript
const grade = 12 - (athlete.grad_year - seasonYear)
```

**Known Issues:**
- Data accuracy concern with Willow Glen results not showing correctly
- User reported faster times not appearing in records or team performances
- Added extensive debug logging to investigate (console.log statements)
- Debug logging checks:
  - Total results fetched for course
  - Willow Glen results specifically (count, sample times)
  - Race groupings and school participation
  - Whether schools have 5 runners per race
  - Top 5 team performances

**Next Steps:**
1. Check browser console on http://localhost:3000/courses/80cbf969-ceea-4145-9565-c3c68cebe99f
2. Verify debug output shows Willow Glen results
3. Investigate why certain results may be filtered out
4. Consider adjusting team composition requirements if needed
5. Remove debug logging once issue is resolved

**Documentation Created:**
- `/website/CLAUDE_PROMPT.md` - Detailed sprint documentation with technical details
- `/website/README.md` - Updated with current project state and features

---

## Previous Sprint Work (Oct 28, 2025 - Late Sprint)

### 1. AI Course Difficulty Enhancement ✅

**What:** Integrated Malcolm Slaney's statistical research methodology

**Key Concepts:**
- **Slaney's Research:** 70k+ boys, 63k+ girls HS results analyzed with Bayesian modeling (PyMC)
- **Critical Baseline Difference:**
  - Slaney: Crystal Springs 2.95mi = 1.0
  - Our system: Median HS course = 1.1336
  - **NOT directly comparable** - different scales
- **Precision:** 10 decimal places for training pace calculations (marathon to sprint)
- **Gender Patterns:** Boys show consistent improvement, girls highly variable due to puberty

**Files Changed:**
- `/app/api/admin/analyze-course/route.ts` - Enhanced with Slaney methodology
- `/app/admin/maintenance/page.tsx` - Added statistical analysis display

**New JSON Output:**
```json
{
  "suggestedRating": 1.1234567890,
  "statisticalAnalysis": {
    "boysAnalysis": "...",
    "girlsAnalysis": "...",
    "genderSpecificNotes": "...",
    "weightedRecommendation": "..."
  },
  "slaneysMethodologyNotes": "..."
}
```

### 2. Import Validation Fix ✅

**What:** Removed arbitrary time limits to support all race distances

**Change:**
- BEFORE: Time range 60000-240000 cs (10:00-40:00 limit)
- AFTER: Only validates time > 0 cs (supports XC, 10K, marathon, track)

**Rationale:** "We don't want those validation limits as we might import 10K or marathon results"

**Files:** `/code/importers/import_csv_data.py`

**Result:** Validation passed on 1633 results, but import failed for different reason (see Issue 1)

### 3. Season Page Select All Feature ✅

**What:** Added Select All/Deselect All for schools filter

**Implementation:**
- `toggleAllSchools()` function
- Dynamic button text based on selection state
- Simplifies multi-school combined race analysis

**Files:** `/app/season/page.tsx`

### 4. School League/Division Fields (Partial) ⏳

**What:** Started foundation for filtering schools by league/division

**Done:**
- School interface added to maintenance page
- State management implemented
- `loadSchools()` function created
- SQL migration created: `ADD_SCHOOL_FIELDS.sql`

**Not Done:**
- SQL migration NOT executed in Supabase
- UI implementation incomplete
- No dropdowns for league/subleague/division yet

**Dropdown Values Needed:**
- **Leagues:** BVAL, WCAL, SCVAL, PAL, PCAL
- **BVAL Subleagues:** Mt Hamilton Division, Valley Division, West Valley Division
- **CIF Divisions:** Division 1, Division 2, Division 3, Division 4, Division 5

### 5. Batch Import Infrastructure ✅

**What:** Created scripts for importing multiple schools

**Files Created:**
- `/code/importers/batch_import_schools.py` - Batch import all BVAL/Division 2 schools
- `/code/importers/find_school_ids.py` - Selenium script to find Athletic.net school IDs

**Status:** Scripts created, school ID lookup may be running in background

**Schools Target:** 40+ schools (All BVAL + All Division 2, some overlap)

---

## Next Sprint Priorities (UPDATED)

### CRITICAL PRIORITY (BLOCKING):

1. **Fix Import Failure** - Debug why 0/1633 results were imported
   - Investigate `import_csv_data.py` athlete/race creation logic
   - Check CSV structure vs expectations
   - Add verbose logging
   - Test stage by stage

### HIGH PRIORITY:

2. **Complete Manual Editing UI** - Required for data quality
   - Run SQL migration `ADD_SCHOOL_FIELDS.sql` in Supabase dashboard
   - Complete Schools section with league/subleague/division dropdowns
   - Add Venues section (full CRUD: add, edit, delete)
   - Add Course-venue assignment to Courses section
   - Add Meets section for venue editing
   - Add course distance editing

3. **Optimize Scraper** - Fix venue/distance extraction
   - Debug meets 254429, 254535 specifically
   - Fix why only Montgomery Hill Park extracted
   - Fix Baylands course distance extraction
   - Review `athletic_net_scraper_v2.py` venue extraction logic

4. **Batch Import Schools** - Import all BVAL/Division 2 schools
   - Check `/tmp/school_ids.txt` for results
   - Update `batch_import_schools.py` with IDs
   - Run batch import

### MEDIUM PRIORITY (Post-Fix):

5. Interactive import validation (data preview before commit)
6. Real-time progress streaming to UI
7. Individual athlete detail pages (`/athletes/[id]/page.tsx`)
8. Individual school detail pages (`/schools/[id]/page.tsx`)

### LOW PRIORITY:

9. Athlete deduplication UI
10. Historical Excel data migration

---

## Known Limitations

1. **No interactive validation** - imports are automatic, no user prompts yet
2. **Default difficulty rating** - all courses get 5.0, not calculated
3. **No pre-import review** - can't review/adjust data before committing
4. **No progress streaming** - UI shows final result only
5. **Browser dependency** - requires Chrome + ChromeDriver

---

## Git Workflow

**Main Branch**: `main`
**Recent Commits**:
- Oct 27, 2025: Sprint completion (gender fix, school scraper, admin UI)
- Oct 27, 2025: Documentation organization (moved to archives)
- Oct 26, 2025: Website deployment to Cloudflare Pages

**Commit Standards**:
- Use descriptive messages
- Reference file locations for bug fixes
- Include "🤖 Generated with Claude Code" footer

---

## Troubleshooting Quick Reference

### Import Fails
- Check `.env` file has correct Supabase credentials
- Verify ChromeDriver version matches Chrome version
- Check virtual environment is activated
- Review `to-be-processed/*/metadata.json` for scrape stats

### Website Issues
- Check Vercel build logs for deployment errors
- Verify environment variables in Vercel dashboard (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Ensure `turbopack.root` config is set in next.config.ts to prevent parent directory scanning

### Data Quality Issues
- All gender/race/grad year bugs have been fixed (v2 scraper)
- If seeing issues, verify using `athletic_net_scraper_v2.py` (not v1 or v3)

---

## Session Start Protocol

When starting a new Claude session:

1. **Read this file first** (`CLAUDE_PROMPT.md`)
2. **Read relevant sprint docs** based on what you're working on:
   - Import system work? → Read `TECHNICAL_HANDOFF.md`
   - Website features? → Read `MISSING_PAGES_AND_FEATURES_ANALYSIS.md`
   - Data issues? → Read `MISSING_DATA_ANALYSIS.md`
3. **State your goal** clearly (e.g., "I want to build the athlete detail page")
4. **Reference this file's location** in commit messages when updating it

---

## Important Notes

- ⚠️ **ALWAYS** keep this file in the project root
- ⚠️ **ALWAYS** update this file when major changes occur
- ⚠️ **ALWAYS** reference the actual documentation files (don't duplicate content here)
- ⚠️ **ALWAYS** commit this file with any sprint completion

---

## Contact & Support

- **GitHub Repo**: Check recent commits for context
- **Documentation**: See `docs/session-archives/` for historical context
- **Sprint Reports**: See `code/importers/SPRINT_COMPLETION_SUMMARY.md` for latest status

---

**Last Updated**: October 28, 2025 (Evening Sprint - Course Records & Team Performances)
**System Status**: 🟡 INVESTIGATING - Course records data accuracy issue (Willow Glen results)
**Current Phase**: Frontend Features (Course Records, Team Performances, Data Debugging)
**Deployment**: Vercel (manaxc.vercel.app)
**Next Session Goal**: Investigate Willow Glen data accuracy, create course performances page

---

## Example Session Starter Prompts

### For Import System Work:
```
Please read /Users/ron/manaxc/CLAUDE_PROMPT.md and
/Users/ron/manaxc/manaxc-project/code/importers/TECHNICAL_HANDOFF.md

I want to implement the interactive validation features from Phase 2.
```

### For Website Development:
```
Please read /Users/ron/manaxc/CLAUDE_PROMPT.md

I want to build the individual athlete detail page at /athletes/[id].
```

### For Data Analysis:
```
Please read /Users/ron/manaxc/CLAUDE_PROMPT.md and
/Users/ron/manaxc/docs/session-archives/MISSING_DATA_ANALYSIS.md

I want to understand what data we're missing and plan the historical import.
```

### For General Context:
```
Please read /Users/ron/manaxc/CLAUDE_PROMPT.md to get up to speed on the ManaXC
project. I'll specify what I want to work on after you've reviewed it.
```

---

**END OF CLAUDE_PROMPT.md**
