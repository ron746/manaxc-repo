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

### Issue 1: Course Calibration Needs Distance Filtering - Oct 31, 2025

**Status:** 🟡 HIGH PRIORITY - Calibration working but has distance-effect confounding

**Current State:**
- Network calibration API working ✅
- Dual anchors configured (Crystal Springs 1.0, Woodward Park 0.95) ✅
- Analyzing 23 courses with results ✅
- **BUT:** Comparing all distances to 2.95-mile anchor (wrong)

**Problem:**
- Crystal Springs 2.13 miles shows -17.9% discrepancy
- This captures PACING differences, not terrain difficulty
- Function needs ±15% distance filter like Malcolm Slaney method

**Fix Required:**
Update `get_all_course_calibrations()` in `/website/supabase/migrations/20251030_optimize_course_analysis_CORRECTED.sql` to filter:
```sql
WHERE c.distance_meters BETWEEN
  FLOOR(anchor_distance * 0.85) AND
  CEIL(anchor_distance * 1.15)
```

**See:** `/Users/ron/manaxc/manaxc-project/SESSION_HANDOFF_2025-10-31.md` for full details

### Issue 2: Database Triggers Must Be Re-enabled (CRITICAL) - Oct 30, 2025

**Status:** 🔴 CRITICAL - Triggers currently disabled for bulk import

**Details:**
- All result triggers disabled on Oct 30, 2025 for meet 254378 bulk import
- Import completed successfully: 4,651 out of 4,655 results (99.9%)
- **MUST re-enable triggers before any new imports**

**Triggers Disabled:**
- `trigger_calculate_normalized_time_cs`
- `update_athlete_best_times_trigger`
- `maintain_course_records_trigger`
- `maintain_school_hall_of_fame_trigger`
- `maintain_school_course_records_trigger`

**Next Steps (PRIORITY 0 - Do This First Next Session):**
1. **Re-enable triggers in Supabase SQL Editor:**
   ```sql
   ALTER TABLE results ENABLE TRIGGER trigger_calculate_normalized_time_cs;
   ALTER TABLE results ENABLE TRIGGER update_athlete_best_times_trigger;
   ALTER TABLE results ENABLE TRIGGER maintain_course_records_trigger;
   ALTER TABLE results ENABLE TRIGGER maintain_school_hall_of_fame_trigger;
   ALTER TABLE results ENABLE TRIGGER maintain_school_course_records_trigger;
   ```

2. **Run batch rebuild of derived tables:**
   - SQL file: `/Users/ron/manaxc/manaxc-project/code/database/batch_rebuild_derived_tables.sql`
   - This recalculates normalized times, best times, course records for all 4,651 new results

3. **Fix 4 missing athletes and import their results**

**Detailed Doc:** `/Users/ron/manaxc/manaxc-project/SESSION_HANDOFF_2025-10-30.md`

### Issue 2: Import Failure - 0 Results Imported (RESOLVED - See Issue 1 for new blocking issue)

**Status:** RESOLVED - Was due to orphaned references (Issue 1)

**Original Details:**
- Scraper successfully collected 1633 results from 5 meets (school 1076, 2025 season)
- Import validation passed (0 errors, 0 warnings)
- Import ran but imported: 0 athletes, 0 races, 0 meets, 0 results
- All 1633 results skipped with: "missing athlete/race"

**Root Cause (IDENTIFIED):** Silent exception catching in import_csv_data.py lines 685-686, 702-703

**Fix Applied:** Enhanced error logging to show actual error messages instead of silently failing

**Files:**
- `/Users/ron/manaxc/manaxc-project/code/importers/import_csv_data.py` - Lines 685-686, 702-703 now log errors

**Next Steps:**
1. Fix orphaned references (Issue 1)
2. Re-run imports with improved error visibility

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

## Latest Sprint Work (Oct 28, 2025 - Filter Enhancement Sprint)

### Athletic Calendar Grade Calculation & Filter Enhancements ✅

**What:** Fixed grade calculations across all pages to use proper athletic calendar (July 1 - June 30) and enhanced filtering capabilities with checkbox-driven UI

**Key Changes:**

1. **Grade Calculation Fix - All Pages**
   - Implemented `getGrade()` helper function accounting for July 1 - June 30 athletic year
   - Formula: If meet month >= 6 (July-Dec), season year = meet year + 1, else season year = meet year
   - Grade = 12 - (grad_year - season_year)
   - Fixed pages: School records, School records performances, Course performances

2. **School Records Performances Page** (`/schools/[id]/records/performances`)
   - Complete rewrite to use optimized `school_course_records` table
   - Changed from complex results joins to pre-computed best performances
   - Added sidebar with Grade Level filter (FR, SO, JR, SR) with Select All
   - Added Courses filter with Select All
   - Added pagination (50 results per page)
   - Layout: 25% sidebar, 75% main content
   - Gender toggle: Boys/Girls buttons

3. **School Detail Page** (`/schools/[id]`)
   - Added CIF Section badge (purple)
   - Added CIF Division badge (indigo)
   - Added League badge (cyan)
   - Added Subleague badge (teal)
   - Reordered filters: Gender moved above Graduation Year

4. **Schools List Page** (`/schools`)
   - Converted from dropdown to checkbox-driven filters
   - Filter order: State → CIF Section → CIF Division → League → Subleague
   - Each filter has "Select All" checkbox
   - Each filter has "Blank/Unknown" checkbox with count display
   - Moved filters above schools list
   - Fixed search box text color to darker for better visibility

5. **Season Page** (`/season`)
   - Reorganized filter sidebar order:
     - Season Best or Personal Best (Radio buttons)
     - Project Times to Course (Dropdown)
     - Gender (Boys/Girls checkboxes)
     - CIF Section (Checkboxes with Select All)
     - CIF Division (Checkboxes with Select All)
     - League (Checkboxes with Select All)
     - Subleague (Checkboxes with Select All)
     - Schools (Checkboxes with Select All)
   - Added null/blank value support for all metadata filters
   - Added blank counts for each filter type
   - Confirmed using `athlete_best_times` table for performance

**Technical Implementation:**

```typescript
// Grade calculation helper
const getGrade = (gradYear: number, meetDate: string) => {
  const meetYear = new Date(meetDate).getFullYear()
  const meetMonth = new Date(meetDate).getMonth()
  const seasonYear = meetMonth >= 6 ? meetYear + 1 : meetYear
  return 12 - (gradYear - seasonYear)
}

// Filter logic with null support
const cifSectionMatch = selectedCifSections.size === 0 ||
  (school.cif_section && selectedCifSections.has(school.cif_section)) ||
  (!school.cif_section && includeCifSectionNulls)
```

**Files Changed:**
- `/app/schools/[id]/records/page.tsx` - Added getGrade() for athletic calendar
- `/app/schools/[id]/records/performances/page.tsx` - Complete rewrite with filters
- `/app/schools/[id]/page.tsx` - Added CIF metadata badges, reordered filters
- `/app/schools/page.tsx` - Converted to checkbox filters with null support
- `/app/season/page.tsx` - Reorganized filters, added CIF metadata filters with null support
- `/app/courses/[id]/performances/page.tsx` - Verified grade calculation

**Database Tables Used:**
- `school_course_records` - Optimized pre-computed best performances per grade/course/gender
- `athlete_best_times` - Season-best and all-time best normalized times
- Both tables indexed for fast lookups, avoiding complex joins

**Benefits:**
- Accurate grade levels reflecting athletic season calendar
- Faster page loads using pre-computed optimized tables
- Better user experience with checkbox-driven multi-select filters
- Ability to filter by league structure and divisions
- Explicit handling of null/blank values in filters

---

## Latest Sprint Work (Oct 31, 2025 - Course Calibration Sprint)

### Malcolm Slaney Calibration Method Implementation ✅

**What:** Implemented network-based course difficulty calibration using Malcolm Slaney's research methodology

**Key Achievements:**

1. **Dual Anchor System Configured**
   - Crystal Springs 2.95 miles: confidence 1.0 (50 years validation)
   - Woodward Park 5000 meters: confidence 0.95 (proven elite usage)
   - All other courses: 0.30-0.50 (single season data)

2. **Network Calibration API Working**
   - Fixed schema errors (`meets.date` → `meets.meet_date`)
   - Fixed parameter mismatches
   - Fixed count query syntax
   - Admin UI at `/admin/network-calibration` operational

3. **Confidence Scoring System**
   - Formula: results (30%) + seasons (40%) + variance (20%) + shared athletes (10%)
   - Single-season penalty: 0.00 season contribution (max ~0.40 confidence)
   - Multi-season requirement: 5+ seasons for full credit

4. **Malcolm Slaney Functions Created**
   - `get_course_outlier_analysis()` - Time differences with athlete improvement
   - `calculate_course_confidence()` - Data quality scoring
   - `calculate_athlete_improvement_rate()` - Performance-based rates
   - `get_all_course_calibrations()` - Network calibration (all courses)

**Current Results (23 Courses Analyzed):**
- 18 high confidence (>30%)
- 5 need review (>5% discrepancy)
- Notable outliers:
  - Lagoon Valley Park: -27.2% (needs investigation)
  - Crystal Springs 2.13: -17.9% (distance-effect confounding)
  - North Monterey County: -7.8% (high confidence, likely real)

**Known Issues:**
- Distance filtering not implemented in UI function (shows all courses)
- Crystal Springs 2.13 should be excluded from 2.95 comparison
- Need ±15% distance tolerance like Malcolm Slaney method

**Migrations Applied:**
- `20251030_correct_malcolm_slaney_method.sql`
- `20251030_add_course_confidence.sql`
- `20251030_athlete_improvement_model.sql`
- `20251030_fix_distance_comparison.sql`
- `20251031_fix_confidence_calculation.sql`
- `20251031_set_dual_anchors.sql`
- `20251031_fix_outlier_analysis_ambiguity.sql`

**Documentation Created:**
- `AI_CONFIDENCE_EVOLUTION.md` - Future AI-driven learning system
- `MALCOLM_SLANEY_CORRECT_METHOD.md` - Implementation guide
- `COURSE_CONFIDENCE_SYSTEM.md` - Confidence calculation docs
- `ATHLETE_IMPROVEMENT_MODEL.md` - Performance-based rates
- `SESSION_HANDOFF_2025-10-31.md` - Full session details

**Next Steps:**
1. Add distance filtering to `get_all_course_calibrations()`
2. Investigate Lagoon Valley Park outlier
3. Cross-validate with Woodward Park anchor
4. Implement elite runner filter (top 5 only)
5. Create calibration application workflow

**Files Changed:**
- `/website/app/api/admin/network-course-calibration-optimized/route.ts`
- `/website/supabase/migrations/` (7 new files)
- Documentation files (4 new files)

**Technical Details:**
```typescript
// Athlete Improvement Rates
elite: 1.0 sec/week (< 5:20/mile)
strong: 1.25 sec/week (5:20-6:00)
developing: 2.0 sec/week (6:00-7:00)
novice: 2.5 sec/week (> 7:00)
girls: plateau/decline patterns (puberty effects)

// Confidence Formula
confidence =
  MIN(0.30, results / 500) +
  CASE seasons: 1=0.00, 2=0.15, 3=0.25, 5+=0.40 END +
  CASE seasons >= 2: MAX(0.0, 0.20 - variance/2500) ELSE 0.00 END +
  MIN(0.10, shared_athletes / 100)
```

---

## Previous Sprint Work (Oct 28, 2025 - Evening Sprint)

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

## Next Sprint Priorities

**See:** `/Users/ron/manaxc/manaxc-project/NEXT_SPRINT_PRIORITIES.md` for detailed sprint plan

### Quick Summary:

**P0 - Critical (Blocking):**
1. Fix orphaned references in athlete_best_times (run FIX_ORPHANED_REFERENCES.py)
2. Finish importing all pending results

**P1 - High Priority Features:**
3. Test for duplicate athletes
4. Delete operations (result, race, meet)
5. Mark time as unofficial
6. Fix seasons page
7. Fix maintenance page
8. Import single file at a time via UI
9. Investigate why "intrasquad" is not a valid meet

**Technical Debt:**
- Implement proper logging (Python + TypeScript)
- Add audit logging for admin operations
- Improve error handling across UI

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

## AI Memory Wall Strategy

### The Challenge
Claude Code sessions lose context between conversations. Without proper documentation and handoff procedures, each new session starts from scratch, wasting time re-discovering issues and losing critical context.

### Session Handoff Protocol

**At End of Session:**
1. Create `SESSION_HANDOFF_YYYY-MM-DD.md` in project root
2. Include:
   - What was accomplished
   - What's in progress (with file paths and line numbers)
   - What's next
   - Any blocking issues discovered
   - Critical decisions made
3. Update `NEXT_SPRINT_PRIORITIES.md` if priorities changed
4. Create issue-specific docs for major problems (like `IMPORT_ISSUE_SUMMARY.md`)
5. Commit and push everything to GitHub

**At Start of Session:**
1. Read `CLAUDE_PROMPT.md` (this file)
2. Read latest `SESSION_HANDOFF_*.md`
3. Read `NEXT_SPRINT_PRIORITIES.md`
4. Read any issue-specific docs mentioned
5. Check `git status` for uncommitted changes

### Documentation Best Practices

**Create Targeted Docs:**
- Don't bury critical issues in long files
- Create focused docs like `IMPORT_ISSUE_SUMMARY.md` for specific problems
- Include: Problem, Root Cause, Fix Script, Next Steps
- Update immediately when issue discovered (don't wait for end of session)

**Use Code References:**
- Always include file paths and line numbers
- Example: "Fixed in import_csv_data.py:685-686"
- Makes it easy for next AI session to find exact location

**Maintain Progress Tracking:**
- Use TodoWrite tool actively during session
- Mark tasks completed immediately (don't batch)
- One in_progress task at a time
- Keep list current (remove stale items)

## Logging Best Practices

### Current State vs Target State

**Python Import Scripts:**
- Current: Basic print() statements
- Target: Structured logging with timestamps and levels
- Location: `code/importers/*.py`

**Web Application:**
- Current: Console.log statements
- Target: Structured logging with winston/pino
- Location: `website/app/**/*.ts`

### Python Logging Implementation

```python
import logging
from datetime import datetime
import os

# Set up logging at start of script
log_dir = 'logs'
os.makedirs(log_dir, exist_ok=True)
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
log_file = f"{log_dir}/import_{timestamp}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()  # Also print to console
    ]
)

logger = logging.getLogger(__name__)

# Usage examples
logger.info("Starting import for meet 254032")
logger.warning(f"School not found: {school_name}, creating new")
logger.error(f"Failed to insert result: {error}", exc_info=True)
logger.debug(f"Processing athlete {i}/{total}: {athlete_name}")
```

**Key Principles:**
- Log files timestamped: `import_20251029_133045.log`
- Include context: IDs, names, counts, values
- Use appropriate levels:
  - DEBUG: Verbose details for debugging
  - INFO: Progress updates, successful operations
  - WARNING: Recoverable issues, data quality concerns
  - ERROR: Failed operations with exception details
- Never silently catch exceptions - always log them
- Log both to file AND console for live monitoring

### TypeScript/Next.js Logging Implementation

```typescript
// utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
});

// Usage in API routes
import { logger } from '@/utils/logger';

export async function POST(request: Request) {
  const { meetId } = await request.json();

  logger.info({ meetId, userId: session.user.id }, 'Starting meet deletion');

  try {
    await deleteMeet(meetId);
    logger.info({ meetId }, 'Meet deleted successfully');
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack, meetId },
      'Failed to delete meet'
    );
    throw error;
  }
}
```

### Database Audit Logging

**Required for Admin Operations:**
- Create `audit_log` table:
  - id (uuid, primary key)
  - user_id (uuid, foreign key)
  - action (text: 'delete_result', 'delete_race', 'delete_meet', etc.)
  - table_name (text)
  - record_id (uuid)
  - details (jsonb: old values, new values, etc.)
  - timestamp (timestamptz)

**Log These Operations:**
- Delete result
- Delete race
- Delete meet
- Mark time unofficial
- Merge duplicate athletes
- Update school metadata
- Update course difficulty

**Example:**
```typescript
await supabase.from('audit_log').insert({
  user_id: session.user.id,
  action: 'delete_meet',
  table_name: 'meets',
  record_id: meetId,
  details: {
    meet_name: meet.name,
    races_deleted: raceCount,
    results_deleted: resultCount
  }
});
```

## Session Start Protocol

When starting a new Claude session:

1. **Read this file first** (`CLAUDE_PROMPT.md`)
2. **Read relevant sprint docs** based on what you're working on:
   - Import system work? → Read `TECHNICAL_HANDOFF.md`
   - Website features? → Read `MISSING_PAGES_AND_FEATURES_ANALYSIS.md`
   - Data issues? → Read `MISSING_DATA_ANALYSIS.md`
3. **Read latest session handoff** (`SESSION_HANDOFF_*.md`)
4. **Read sprint priorities** (`NEXT_SPRINT_PRIORITIES.md`)
5. **Check for issue-specific docs** (e.g., `IMPORT_ISSUE_SUMMARY.md`)
6. **State your goal** clearly (e.g., "I want to build the athlete detail page")
7. **Reference this file's location** in commit messages when updating it

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

**Last Updated**: October 31, 2025 (Course Calibration System Working)
**System Status**: 🟢 OPERATIONAL - Network calibration running, needs refinement
**Current Phase**: Malcolm Slaney Calibration Method - Distance Filtering Needed
**Deployment**: Vercel (manaxc.vercel.app)
**Next Session Goal**: Add distance filtering to calibration, investigate outliers
**Localhost**: http://localhost:3000/admin/network-calibration

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
