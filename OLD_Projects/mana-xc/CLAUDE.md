# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mana XC** is a cross-country (XC) statistics platform targeting high school distance runners and coaches. The core value proposition is bridging the gap between training data (Strava/Runna) and official race results (Athletic.net/xcStats) through intelligent analytics and AI-powered insights.

**Tech Stack:**
- Frontend: Next.js 14.2.5 (App Router), React 18, TypeScript, Tailwind CSS
- Backend: Django 5.2.7, Python (virtual environment)
- Database: PostgreSQL 15.1 (Supabase)
- Architecture: Hybrid model with Next.js frontend + Django backend services

## Development Commands

### Frontend (Next.js)
```bash
npm run dev      # Start development server (default port 3000)
npm run build    # Build production bundle
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend (Django)
```bash
source .venv/bin/activate          # Activate Python virtual environment
python manage.py runserver         # Start Django server (port 8000)
python manage.py makemigrations    # Create database migrations
python manage.py migrate           # Apply migrations
```

## Critical Data Architecture Rules

### Time Storage Convention
**NON-NEGOTIABLE:** All race and workout times MUST be stored in **CENTISECONDS** (e.g., 15:30.00 = 93000).
- Field name: `time_cs` in the `results` table
- Type: INTEGER (not Float)
- Example conversion: "17:51.2" → 107120 centiseconds

### XC Time Normalization System
The platform uses a **1-Mile Track Equivalent** rating system to normalize race times across different courses and distances:
- Rating factor stored in `races.xc_time_rating` field (NUMERIC, default: 1.000)
- Normalized time = `time_cs * xc_time_rating`
- This is course AND distance dependent (same course at different distances has different ratings)
- **Methodology**: Inspired by Malcolm Slaney's Bayesian Course Difficulty Model (see COURSE_RATING_METHODOLOGY.md)
- **Validation**: Statistical testing available at `/admin/course-ratings`

### Materialized View for Performance
The `athlete_xc_times_v3` materialized view calculates normalized XC PRs:
```sql
CREATE MATERIALIZED VIEW athlete_xc_times_v3 AS
SELECT
  r.athlete_id,
  MIN(r.time_cs * ra.xc_time_rating) as best_xc_time_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
WHERE r.time_cs > 0
GROUP BY r.athlete_id;

-- IMPORTANT: Must refresh after data changes
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;
```

## Database Schema (v2.4)

Key tables in PostgreSQL:
- **competitive_levels**: CIF/league hierarchy with `CIF_LEVEL_TYPE` enum
- **schools**: School data with `ath_net_id` (Athletic.net ID) and `cif_division`
- **athletes**: Runner profiles with `ath_net_id`, `current_school_id`, `gender` (BOOLEAN)
- **meets**: Race events with optional `host_school_id`, `ath_net_id`, and `athletic_net_id` (for scraper duplicate detection)
- **courses**: Race locations (name, city)
- **races**: Individual races with `meet_id`, `course_id`, `xc_time_rating`, `distance_meters`, `athletic_net_id` (scraper tracking)
- **results**: Individual athlete performances with `athlete_id`, `race_id`, `time_cs`, `season_year` (denormalized)
- **admin_log**: Audit trail with JSONB details
- **course_rating_defaults**: Starting point ratings for import tool
- **maturation_curves**: Gender/grade-based prediction adjustments

## Project Structure

### Frontend (`app/` directory - Next.js App Router)
- `/app/admin/` - Admin tools (import wizard, duplicate resolution, course ratings, delete, scraper, bulk import)
  - `/app/admin/import/` - 5-step CSV import wizard
  - `/app/admin/scraper/` - Athletic.net automated scraper UI (admin-only)
  - `/app/admin/bulk-import/` - Batch import from existing CSV/JSON files
  - `/app/admin/duplicate-results/` - Duplicate detection dashboard
  - `/app/admin/course-ratings/` - Course rating management
  - `/app/admin/delete/` - Safe delete functions
- `/app/api/` - Next.js API routes that proxy to Supabase RPC functions
  - `/app/api/admin/scrape-athletic-net/` - Run Athletic.net scraper
  - `/app/api/admin/batch-import/` - Batch import scraped data to database
  - `/app/api/admin/download/` - Download scraped CSV/JSON files
- `/app/top-performances/` - Main landing page (default redirect)
- `/app/courses/[id]/records/` - Course-specific records
- `/app/schools/[id]/` - School profiles with team records and all results
- `/app/athletes/[id]/seasons/` - Athlete season histories
- `/app/optimizer/` - Team optimizer tool
- `/app/trainnig/log/` - Workout logging (typo in directory name)

### Components (`components/`)
- `/components/layout/` - Header, Footer (use @/components/* alias)
- `/components/admin/import-steps/` - 5-step import wizard (Step1-Step5)
- `/components/admin/AthleticNetScraperDashboard.tsx` - Athletic.net scraper UI component
- `/components/ui/` - Reusable UI primitives (button, input, label, select, switch)

### Libraries (`lib/`)
- `/lib/admin/` - Import utilities (CSV parser, race grouping, name splitting)
- `/lib/prediction/` - Race time prediction engine
- `/lib/supabase/` - Supabase client configuration (referenced by API routes)

### Backend (`backend_config/` and `core/`)
- `backend_config/` - Django project settings, URLs, ASGI/WSGI
- `core/` - Django app with minimal models (Athlete, Course, Race, Result)
- `core/services/` - Business logic (F6_import_service.py)
- Database: SQLite3 (`db.sqlite3`) for Django, Supabase for production

### Scripts (`scripts/`)
- `scripts/athletic-net-scraper-v2.js` - Automated Athletic.net web scraper
  - Uses Puppeteer to scrape race results from Athletic.net
  - Supports duplicate detection by tracking Athletic.net meet IDs
  - Outputs CSV (with centiseconds) and JSON files
  - Usage: `node scripts/athletic-net-scraper-v2.js <schoolId> <season>`
  - Example: `node scripts/athletic-net-scraper-v2.js 1076 2025`

## Athletic.net Scraper (Admin Tool)

The **Athletic.net scraper** (`/admin/scraper`) automates the process of downloading race results from Athletic.net:

### Features
- **Web scraping**: Uses Puppeteer (headless Chrome) to navigate Athletic.net's Angular SPA
- **Duplicate detection**: Tracks Athletic.net meet IDs to avoid re-scraping existing data
- **Date extraction**: Captures meet dates from page content
- **Automatic time conversion**: Converts times to centiseconds following the CENTISECONDS rule
- **Batch import**: One-click import of all scraped data directly to database

### Access
- **Admin-only**: Route protected by Supabase auth + role check (currently disabled for local dev)
- **URL**: `http://localhost:3000/admin/scraper`
- **Bulk Import URL**: `http://localhost:3000/admin/bulk-import` (for existing CSV/JSON files)
- **API endpoints**:
  - `POST /api/admin/scrape-athletic-net` - Runs scraper script
  - `POST /api/admin/batch-import` - Imports scraped data to database
  - `GET /api/admin/download?file=...` - Downloads CSV/JSON files

### Usage Workflow
1. Navigate to `/admin/scraper` (admin role required)
2. Enter Athletic.net School ID (e.g., 1076 for Westmont)
3. Enter season year (e.g., 2025)
4. Click "Scrape Results" - scraper downloads all meets for that school/season
5. Review scraped data (meet count, race count, athlete results)
6. Click "Import to Database" to add data to Supabase
7. Optional: Download CSV/JSON files for manual review

### CSV Output Format
The scraper generates CSV files with the following columns:
- Meet ID (Athletic.net meet ID for duplicate detection)
- Meet Name, Meet Date, Location
- Race Name, Gender (M/F)
- Place, Grade, Athlete (full name)
- Time (original format), Time (cs) (centiseconds), School

### Technical Details
- Script location: `scripts/athletic-net-scraper-v2.js`
- Output files: `athletic-net-{schoolId}-{season}.csv` and `.json`
- Duplicate detection: Compares meet IDs from existing JSON files
- Rate limiting: 2-second delay between meet scrapes (be nice to Athletic.net)
- Timeout: 5 minutes for entire scrape operation

## Import Wizard Architecture

The **5-step import wizard** (`/admin/import`) is the core data ingestion tool:

**Step 1 (Meet Info):** Basic meet details (name, date, course)
**Step 2 (Upload):** CSV file upload with drag & drop support
**Step 3 (Map Columns):** Auto-detection and manual mapping of CSV columns
**Step 4 (Race Config):** Group results into races, configure course/distance
**Step 5 (Validate):** Final review and import execution

### CSV Parser Capabilities (`lib/admin/import-parser.ts`)
- Handles both full names ("Edward Innes") and split first/last columns
- Supports gender as "Boys"/"Girls" or "M"/"F"
- Converts time strings (MM:SS.CC) to centiseconds
- Auto-detects common column names (Athlete, Name, Duration, Time, etc.)

### Race Grouping Logic (`lib/admin/import-utils.ts`)
- Groups parsed results by race category (Varsity/JV/Reserves) and gender
- Returns array of race configurations for Step 4

## API Architecture

Next.js API routes (`app/api/*/route.ts`) connect to Supabase using RPC functions:
- Pattern: Import `createClient` from `@/lib/supabase/server`
- Call optimized Postgres functions (e.g., `get_top_xc_performances`)
- Return JSON responses with error handling

Example endpoints:
- `/api/top-performances` - Top normalized XC times (gender filter required)
- `/api/admin/import-meet` - Process CSV import
- `/api/admin/duplicate-results` - Find duplicate race results
- `/api/admin/update-rating` - Update course rating factor
- `/api/team-optimizer` - Team lineup optimizer

## Path Aliases

TypeScript paths configured in `tsconfig.json`:
- `@/components/*` → `components/*`
- `@/lib/*` → `lib/*`

## Current Development Phase

**Phase 0: Foundation & Data Moat** (Data Quality Fixes)
- All 14 core features are coded (admin tools, user views, predictors)
- **CRITICAL**: Data quality issues identified (see IMPORT_FIXES_NEEDED.md)
- **Next action**: Follow NEXT_SESSION_PRIORITY.md to fix import bugs and clean database
- **Reference**: DO_THIS_NEXT.md for session startup instructions

## Known Configuration Notes

### Next.js Configuration (`next.config.js`)
- Default redirect: `/` → `/top-performances`
- `experimental.esmExternals: false` - Bypasses module resolution issues

### Development Environment
- OS: macOS (zsh)
- Python: Virtual environment required (`.venv/`)
- Node: v18+ recommended
- Servers run on ports 3000 (Next.js) and 8000 (Django)
- Supabase: PostgreSQL 15.1 hosted database

## Testing Workflow

### Import Wizard Validation
1. Start both servers (Django + Next.js)
2. Navigate to `http://localhost:3000/admin/import`
3. Test with sample CSV (191 results → 6 races expected)
4. Verify database insertion: `SELECT COUNT(*) FROM results;`
5. Confirm materialized view refresh

### Bulk Import Workflow
1. Navigate to `http://localhost:3000/admin/bulk-import`
2. Enter CSV file path (e.g., `athletic-net-1076-2024.csv`)
3. Enter JSON file path (e.g., `athletic-net-1076-2024.json`)
4. Click "Import Data" and monitor progress
5. Verify successful import in Supabase database

### Success Criteria
- CSV parsing: Extract all results with correct name splitting
- Race grouping: Detect distinct races by category/gender
- Time conversion: MM:SS.CC → centiseconds accurately
- Database integrity: All foreign keys valid, no orphaned records
- View refresh: `athlete_xc_times_v3` updates with new data

## Course Rating Validation

The system includes statistical testing for course difficulty ratings:
- **Admin Tool**: `/admin/course-ratings` - Statistical validation dashboard
- **Methodology**: Similar to Malcolm Slaney's Bayesian Course Difficulty Model
- **Testing Approach**: Uses overlapping runners who competed at multiple courses
- **Documentation**: See `COURSE_RATING_METHODOLOGY.md` for complete guide
- **API**: `/api/admin/rating-analysis` provides runner-by-runner analysis and suggested ratings

### Rating Test Workflow
1. Navigate to `/admin/course-ratings`
2. Select a race with sufficient overlapping runners (>20 recommended)
3. Click "Analyze Rating" to run statistical test
4. Review mean error, standard deviation, and sample size
5. If mean error > 500 cs, consider adjusting the `xc_time_rating`
6. After adjustment, refresh materialized view

### Key Metrics
- **Mean Error < 500 cs**: Rating is accurate
- **Mean Error 500-2000 cs**: Consider adjustment
- **Mean Error > 2000 cs**: Definitely adjust rating
- **Sample Size**: Need 20+ overlapping runners for reliable estimate

## Known Issues & Priority Fixes

### Critical Data Quality Issues (As of Oct 19, 2025)
**IMPORTANT**: Before any analysis, the following data issues must be resolved:

1. **Course Names** - Contain full location string instead of just name
2. **Race-Course Linking** - Races not linked to courses (course_id = NULL)
3. **Gender Format** - Stored as boolean instead of 'M'/'F' string in races table
4. **Season Year** - Missing from meets and results tables
5. **Total Participants** - Not calculated for races
6. **Athlete Names** - Some parsing errors from over-complex logic

### Fix Plan
See these files for complete fix instructions:
- **DO_THIS_NEXT.md** - Session startup guide
- **NEXT_SESSION_PRIORITY.md** - 5-phase fix plan with verification steps
- **IMPORT_FIXES_NEEDED.md** - Detailed issue documentation
- **FIX_DATA_IMPORT.sql** - Database cleanup script

### Quick Fix Summary
1. Run `FIX_DATA_IMPORT.sql` in Supabase to clean database and fix schema
2. Fix `app/api/admin/batch-import/route.ts` to correctly parse and insert data
3. Re-import 2024 and 2025 data using bulk import tool
4. Verify data quality in Supabase tables
5. Refresh materialized view

## Session Documentation

The following files document recent work and current state:
- **SESSION_SUMMARY_OCT18.md** - Last session accomplishments and learnings
- **DATABASE_SETUP.md** - Supabase schema setup guide
- **ATHLETIC_NET_SCRAPER_GUIDE.md** - Scraper usage documentation
- **COURSE_RATING_METHODOLOGY.md** - Statistical validation approach
