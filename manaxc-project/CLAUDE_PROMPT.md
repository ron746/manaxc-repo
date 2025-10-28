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

## Next Sprint Priorities (Phase 2)

**High Priority**:
1. Interactive import validation (data preview before commit)
2. Difficulty rating calculation from race results
3. Real-time progress streaming to UI
4. Individual athlete detail pages (`/athletes/[id]/page.tsx`)
5. Individual school detail pages (`/schools/[id]/page.tsx`)

**Medium Priority**:
6. Athlete deduplication UI
7. Error recovery (resume failed scrapes)
8. Batch operations (multiple schools at once)

**Low Priority**:
9. Data validation rules (unrealistic times, etc.)
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

**Last Updated**: October 28, 2025
**System Status**: 🟢 Production Ready (Import System v1.0, Website on Vercel)
**Current Phase**: Phase 2 Planning (Interactive Validation)
**Deployment**: Vercel (manaxc.vercel.app) - switched from Cloudflare Pages
**Next Session Goal**: TBD by user

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
