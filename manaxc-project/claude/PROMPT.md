# ManaXC Project - Claude Context

**Priority**: Read `/sessions/latest.md` first for most recent work, then this file for comprehensive project context.

---

## Project Overview

**ManaXC** is a cross-country race management and analytics platform built with:
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Data Pipeline**: Python 3.13 (Selenium web scraping)
- **Deployment**: Vercel
- **Domain**: https://manaxc.com

**Primary Goal**: Import, manage, and analyze cross-country race data with advanced course calibration and athlete projections.

---

## Quick Start for New Sessions

1. **Read latest session**: `/sessions/latest.md` (symlink to most recent handoff)
2. **Check current priorities**: `/sprints/current/priorities.md`
3. **Check blockers**: `/sprints/current/blockers.md`
4. **Development**: `cd website && npm run dev`

---

## Current System Status

### Production Components

1. **Website** (https://manaxc.com)
   - All main pages working: Home, Meets, Schools, Athletes, Courses
   - Combined race projections with course selection
   - XC team scoring with tiebreakers
   - Course records (overall + grade-level)
   - Responsive design, SSR

2. **Admin Interface** (`/admin/*`)
   - Data import UI (`/admin/import`)
   - Batch operations
   - Course calibration
   - Network calibration
   - **NEW**: `/admin/import-meet` (race-by-race import with metadata verification)

3. **Import System**
   - Athletic.net scraping (single meet + school season)
   - Race-by-race import protocol (designed, UI created)
   - CSV import pipeline
   - Data quality validation

### In Development

- **Race-by-Race Import**: Admin UI created (`/admin/import-meet`), needs API endpoints
- **Documentation Organization**: New structure created, needs migration
- **API Endpoints**: Need to build 5 endpoints for import-meet workflow

---

## Critical Technical Details

### Projection Formula
```typescript
// CRITICAL: Used across site for time projections
const METERS_PER_MILE = 1609.344

const projectedTime = Math.round(
  result.normalized_time_cs *           // Pace per mile at difficulty 1.0
  targetCourse.difficulty_rating *       // Course difficulty multiplier
  (targetCourse.distance_meters / METERS_PER_MILE)  // Distance in miles
)
```

**Key Insight**: `normalized_time_cs` is stored as pace per mile at difficulty 1.0, NOT at 5.0 baseline.

### Database Schema

**Key Tables**:
- `courses` - XC courses with difficulty ratings
- `races` - Individual races (links course + meet)
- `results` - Athlete results with normalized times
- `athletes` - Athlete records (grad_year, gender, school_id)
- `schools` - School records
- `meets` - Meet records

**Important Fields**:
- `results.time_cs` - Actual time in centiseconds
- `results.normalized_time_cs` - Pace per mile at difficulty 1.0 (cs)
- `results.is_sb` - Season best flag
- `results.is_pr` - Personal record flag
- `courses.difficulty_rating` - Course difficulty multiplier
- `courses.distance_meters` - Course distance

### User Preferences

- **Difficulty ratings HIDDEN from public** (admin-only)
- Show tiebreakers for tied team scores (6th runner)
- Project times to ANY course in database
- Identical Boys/Girls formatting

---

## Project Structure

```
/Users/ron/manaxc/manaxc-project/
├── README.md                     # Project overview
├── claude/                       # Claude context (THIS FILE)
│   ├── PROMPT.md                # Main context file
│   └── quick-start.md           # Quick reference
│
├── sessions/                    # AI session handoffs
│   ├── latest.md               # Symlink to most recent
│   ├── 2025-11/                # November sessions
│   └── 2025-10/                # October sessions
│
├── sprints/                    # Sprint work
│   ├── current/                # Active sprint
│   │   ├── priorities.md      # Current backlog
│   │   ├── daily-log.md       # Daily updates
│   │   └── blockers.md        # Current issues
│   └── completed/             # Completed sprints
│
├── docs/                      # Strategic documentation
│   ├── business/             # Product & strategy
│   ├── architecture/         # System design
│   ├── algorithms/           # Core algorithms
│   ├── operations/           # Admin guides
│   └── research/             # Analysis & investigations
│
├── website/                  # Next.js application
│   ├── app/                 # App router pages
│   │   ├── admin/import-meet/  # NEW: Race-by-race importer
│   │   ├── meets/[id]/combined-race/  # Projections
│   │   └── season/          # Season view
│   └── components/          # React components
│
└── code/                    # Backend code
    ├── importers/          # Python scrapers
    │   ├── scrape_meet_by_races.py  # Per-race scraper
    │   └── import_csv_data.py       # CSV importer
    └── database/           # DB migrations
```

---

## Essential Documentation

### Current Sprint Work
- `/sprints/current/priorities.md` - What to work on
- `/sprints/current/blockers.md` - Known issues
- `/sprints/current/daily-log.md` - Progress log

### Technical References
- `/code/importers/docs/user-guide.md` - Import system usage
- `/code/importers/docs/technical-guide.md` - Import architecture
- `/docs/architecture/data-schema.md` - Database schema
- `/docs/algorithms/course-calibration-system.md` - Calibration logic

### Operations
- `/docs/operations/end-of-session-checklist.md` - Session close protocol
- `/docs/operations/admin-setup-guide.md` - Admin configuration
- `/docs/operations/deployment-guide.md` - Deployment procedures

---

## Recent Major Work

### 2025-11-01 Session

**Completed**:
1. **Admin Import Page Created** (`/admin/import-meet`)
   - 5-step wizard (Meet ID → Metadata Verification → Scraping → Importing → Complete)
   - Venue selection (create new OR select existing with search)
   - Multi-course support (add/remove courses dynamically)
   - Real-time progress tracking (polling every 3s)
   - Complete UI ready for API integration

2. **Documentation Research**
   - Analyzed 121 markdown files across project
   - Designed new organizational structure
   - Created directory hierarchy
   - Identified duplicate CLAUDE_PROMPT files (consolidated here)

**Next Steps**:
- Build 5 API endpoints for import-meet workflow
- Migrate documentation to new structure
- Test race-by-race import end-to-end

### Previous Sprint (2025-10-31)

1. **Combined Race Projections Enhancement**
   - Project times to ANY course (not just meet courses)
   - Fixed projection formula to use normalized_time_cs correctly
   - Hidden difficulty ratings from public
   - Added XC scoring tiebreakers (6th runner)

2. **UI/UX Improvements**
   - Boys/Girls identical formatting
   - Removed redundant filters
   - Cleaner navigation

---

## Sprint Priorities

### Next Sprint: File & Project Management
**Goal**: Organize project documentation and files

**Tasks**:
1. Consolidate duplicate documentation
2. Migrate files to new structure
3. Archive old session handoffs
4. Clean root directory (43 files → 2 files)
5. Create master index files

### Following Sprint: Race-by-Race Import
**Goal**: Complete admin import workflow

**Tasks**:
1. Build API endpoints (5 total)
2. Create database schema (import_jobs table)
3. Integrate Python scrapers
4. Test complete workflow
5. Import Mt. SAC meet data

---

## Development Commands

```bash
# Start development server
cd /Users/ron/manaxc/manaxc-project/website
npm run dev

# Check git status
git status
git log --oneline -5

# Run importer
cd /Users/ron/manaxc/manaxc-project/code/importers
source venv/bin/activate
python3 scrape_meet_by_races.py <meet_id>

# Database migrations
cd /Users/ron/manaxc/manaxc-project/code/database
# See docs/operations/deployment-guide.md
```

---

## Key Files Created This Session

- `/website/app/admin/import-meet/page.tsx` - Admin import UI (5-step wizard)
- `/claude/PROMPT.md` - This file (consolidated context)
- Directory structure for new documentation organization

---

## Environment

- **Working Directory**: `/Users/ron/manaxc/manaxc-project/`
- **Website**: `/Users/ron/manaxc/manaxc-project/website/`
- **Importers**: `/Users/ron/manaxc/manaxc-project/code/importers/`
- **Repository**: https://github.com/ron746/manaxc-repo.git
- **Production URL**: https://manaxc.com
- **Development**: http://localhost:3000

---

**Last Updated**: 2025-11-01
**Status**: Active Development
**Next Session**: Start with file management sprint
