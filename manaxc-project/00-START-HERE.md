# 🚀 START HERE - ManaXC AI Context Loader

**MANDATORY FIRST READ FOR EVERY AI SESSION**

---

## Quick Context (2-Minute Read)

**Project:** ManaXC - High school cross country performance tracking platform
**Target Launch:** December 22, 2025 (60 days from October 22)
**Launch Team:** Westmont High School XC
**Current Phase:** Data Import & Web Interface Development

**Current Sprint:** Athletic.net Data Import Infrastructure
**Next Priority:** Build modular scraping system + web-based import interface

---

## Project Status Dashboard

**Last Updated:** October 27, 2025

**Completed:**
- ✅ Project planning and documentation
- ✅ MVP specifications defined
- ✅ Service accounts created (Supabase, GitHub, Vercel, GCP)
- ✅ Domain setup (manaxc.com, manafitness.com)
- ✅ Website deployed to Cloudflare Pages
- ✅ Database schema deployed with CENTISECONDS time storage
- ✅ Working Athletic.net scraper (Selenium-based, outputs centiseconds)
- ✅ Import scripts created (batch and sequential versions)
- ✅ Database cleaned, ready for controlled data import

**Current Status:**
- Database is EMPTY (clean slate)
- Scraper tested and working (Westmont 1,958 results, Silver Creek 15,496 results)
- Import issues identified and documented in IMPORT_STRATEGY.md
- Ready to build phased import system

**Blockers Identified:**
1. School filtering - scraper gets ALL schools at meets, not just target school
2. Graduation year calculation - not calculating from grade level
3. Course metadata - defaults need parsing from race names
4. Performance - large imports timeout
5. No web interface for data import yet

---

## Critical Technical Standards

### ✅ DECISION MADE: CENTISECONDS

**Time Storage:** **CENTISECONDS** (19:30.45 = 117045)
- **Rationale:** Runners and coaches care deeply about accurate data
- **Field name:** `time_cs` (INTEGER)
- **Precision:** 0.01 seconds (hundredths)
- **Status:** NON-NEGOTIABLE
- **Documentation:** `docs/decisions/adr-001-time-storage.md`

**Conversion Formula:**
```
time_cs = (minutes × 60 × 100) + (seconds × 100) + centiseconds
Example: 16:45.3 = (16 × 60 × 100) + (45 × 100) + 30 = 100530 cs
```

**Database Schema:**
- **Status:** DEPLOYED and working
- **Location:** `code/database/` with numbered migration files
- **Key tables:** schools, athletes, venues, courses, meets, races, results
- **Foreign keys:** results table requires BOTH meet_id AND race_id

**Web Scraper:**
- **Status:** WORKING with Selenium
- **Location:** `code/importers/athletic_net_scraper.py`
- **Output:** JSON files with centiseconds conversion
- **Issue:** Collects ALL schools at meets, needs filtering

---

## Session Startup Protocol

**Every AI session MUST start with:**

1. **Read this file** (00-START-HERE.md)
2. **Read current strategy** (code/importers/IMPORT_STRATEGY.md)
3. **Check running servers** (Next.js on http://localhost:3000)
4. **Review database state** (currently EMPTY)
5. **Ask Ron:** "What's our focus for today?"

**Then navigate to relevant deep-dive docs:**
- Import strategy: `code/importers/IMPORT_STRATEGY.md`
- Architecture: `docs/data-schema.md`
- Business requirements: `docs/mvp-specifications.md`
- Current issues: IMPORT_STRATEGY.md root causes section

---

## Key Lessons from Previous Session

### ✅ What Worked
1. **Selenium scraper:** Successfully scraped 1,958 results (Westmont) and 15,496 results (Silver Creek)
2. **Time conversion:** Centiseconds conversion working correctly
3. **Batch operations:** 6-stage batch importer faster than sequential
4. **Clean start:** Database cleanup strategy effective

### ❌ What Didn't Work
1. **School filtering:** ALL schools at a meet imported, not just target school
2. **Graduation years:** All defaulting to same year instead of calculating from grade
3. **Performance:** 15K+ results timeout during duplicate checking
4. **Course metadata:** All defaulting to 5.0 difficulty and 5000m distance

### 🎯 How We're Fixing It
1. **Phased approach:** Import one table at a time with validation
2. **School filtering:** Add post-scrape filter or school-specific scraping
3. **Grad year formula:** `grad_year = season_year + (12 - grade)`
4. **Distance parsing:** Extract from race names ("2.74 Miles", "2.95 Miles")
5. **Web interface:** Build admin UI for controlled imports
6. **Modular scraping:** Functions for school, meet, race, athlete-level scraping

---

## File Organization

```
manaxc-project/
├── 00-START-HERE.md          ← You are here (AI context loader)
├── README.md                  ← Project vision and overview
├── IMPORT_STRATEGY.md         ← Current data import plan
│
├── docs/
│   ├── data-schema.md         ← Database design (DEPLOYED)
│   ├── mvp-specifications.md  ← What we're building
│   ├── service-registry.md    ← All accounts and credentials
│   └── decisions/             ← Architectural Decision Records (ADRs)
│
├── code/
│   ├── database/              ← SQL migrations (numbered)
│   ├── importers/             ← Python scraping and import scripts
│   │   ├── athletic_net_scraper.py          ← Working scraper
│   │   ├── import_scraped_data.py           ← Sequential importer
│   │   ├── import_scraped_data_batch.py     ← Batch importer (6 stages)
│   │   ├── IMPORT_STRATEGY.md               ← Import plan
│   │   └── README.md                        ← Import documentation
│   └── website/               ← Next.js 16 app
│       ├── app/               ← Pages (athletes, schools, courses, etc.)
│       ├── components/        ← React components
│       ├── lib/               ← Supabase client, utilities
│       └── .env.local         ← Environment variables
│
└── reference/                 ← Reference docs and OLD project assets
```

---

## Current Sprint Focus

### Sprint Goal: Build Robust Data Import System

**Why This Matters:**
- Need clean, accurate data for website to work
- Must handle multiple schools without mixing data
- Need web interface so Ron can import without Claude Code
- Must validate data quality at each step

**Sprint Deliverables:**
1. Updated markdown documentation (this file, IMPORT_STRATEGY.md, etc.)
2. Comprehensive sprint plan for data import interface
3. Modular Athletic.net scraping functions:
   - `scrape_school(school_id)` - Get school info only
   - `scrape_meet(meet_id)` - Get single meet with ALL races
   - `scrape_race(race_id)` - Get single race results
   - `scrape_school_season(school_id, season)` - Full season, filtered
4. Web-based admin import interface at `/admin/import`
5. Tested import flow: School → Meet → Race → Results
6. Data validation at each step

---

## Immediate Next Steps

### 1. Update Documentation (IN PROGRESS)
- [x] Update 00-START-HERE.md with current status
- [ ] Update IMPORT_STRATEGY.md with specific implementation plan
- [ ] Update README.md importers section
- [ ] Create DATA_IMPORT_SPRINT_PLAN.md

### 2. Design Modular Scraping System
Create separate scraping functions for different Athletic.net entities:

```python
# School-level scraping
scrape_school_info(school_id) → school_data
scrape_school_season(school_id, season) → filtered_results

# Meet-level scraping
scrape_meet_info(meet_id) → meet_data
scrape_meet_races(meet_id) → list of races

# Race-level scraping
scrape_race_results(race_id, school_filter=None) → results

# Athlete-level scraping
scrape_athlete_profile(athlete_id) → athlete_data
scrape_athlete_season(athlete_id, season) → results
```

### 3. Build Web Import Interface
Location: `/admin/import` page in Next.js

**Features:**
- Import by school (full season)
- Import by meet (single meet, all schools or filtered)
- Import by race (single race)
- Preview before import
- Validation warnings
- Progress tracking
- Error handling

### 4. Test Each Import Level
- [ ] Test school import (Westmont only)
- [ ] Test meet import (STAL #1, filtered to Westmont)
- [ ] Test race import (Varsity Boys only)
- [ ] Verify data quality after each test
- [ ] Document validation checklist

---

## Critical Resources

### Accounts & Services
- **Supabase:** https://supabase.com/dashboard/project/mdspteohgwkpttlmdayn
- **Website:** https://manaxc-project.pages.dev (Cloudflare Pages)
- **Local:** http://localhost:3000
- **GitHub:** ron746 (ron@manaxc.com)
- **Credentials:** See `docs/service-registry.md`

### Athletic.net Reference
- **Westmont School:** ID 1076
- **Silver Creek School:** ID 1082
- **STAL #1 Meet:** ID 265306
- **URL Pattern:** `https://www.athletic.net/CrossCountry/meet/[meet_id]/results/[race_id]`

### Previous Project (Reference Only)
- **Location:** `/Users/ron/manaxc/OLD_Projects/mana-xc/`
- **DO NOT MODIFY OLD PROJECT**

---

## Non-Negotiable Rules

### 1. Data Quality
- ✅ Validate before insert (no bad data in database)
- ✅ Filter to target school (no mixed school data)
- ✅ Calculate grad_year from grade level
- ✅ Parse distances from race names
- ✅ Preview step before commit
- ✅ Duplicate detection required

### 2. Accessibility (Ron is colorblind)
- ✅ Light theme only (white/gray backgrounds)
- ✅ High contrast text (gray-900, gray-800)
- ✅ Yellow highlights (bg-yellow-50 + border-yellow-500)
- ✅ No dark backgrounds, no red/green color coding
- ✅ Thick borders (2px minimum)

### 3. Context Management
- ✅ Read this file every session
- ✅ Document decisions in markdown files
- ✅ Update IMPORT_STRATEGY.md as we learn

### 4. Scope Discipline
- ✅ Focus on data import infrastructure first
- ✅ Build web interface for imports (no Claude Code dependency)
- ✅ Test with small datasets before full imports
- ✅ One school at a time, verify before proceeding

---

## Success Criteria

### This Sprint (Data Import Infrastructure)
- [ ] Modular scraping functions working
- [ ] Web-based import interface functional
- [ ] Can import single school successfully (Westmont)
- [ ] All data validated and correct:
  - [ ] Athletes only from target school
  - [ ] Grad years calculated correctly
  - [ ] Course distances parsed from race names
  - [ ] Times in centiseconds
  - [ ] PRs calculated
- [ ] Ron can use import interface without Claude Code
- [ ] Documentation complete and current

### Next Sprint (Website Features)
- [ ] Athlete profile pages working
- [ ] School pages with team rosters
- [ ] Course pages with records
- [ ] Results display on all pages
- [ ] Search functionality

---

## Emergency Protocols

### If We're Stuck on Import Issues
1. Start with absolute simplest case (1 race, 1 school)
2. Manually verify each record in database
3. Add logging at every step
4. Build validation checklist
5. Don't proceed until data is 100% correct

### If Performance Issues Continue
1. Reduce batch size
2. Add progress checkpoints
3. Implement retry logic
4. Consider background job processing
5. Monitor Supabase connection pool

### If Context is Lost
1. Read this file
2. Read IMPORT_STRATEGY.md
3. Check database state (may be empty)
4. Review athletic_net_scraper.py to understand what we have
5. Ask Ron to clarify current priority

---

## Quick Reference Commands

### Start Development Server
```bash
cd /Users/ron/manaxc/manaxc-project/website
npm run dev
# Website at http://localhost:3000
```

### Run Scraper (Manual)
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
source venv/bin/activate  # if using venv
python3 athletic_net_scraper.py [school_id] [season_year]
# Example: python3 athletic_net_scraper.py 1076 2025
```

### Run Import (Manual)
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
python3 import_scraped_data_batch.py athletic_net_1076_2025.json
```

### Check Database State
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM schools;
SELECT COUNT(*) FROM athletes;
SELECT COUNT(*) FROM results;
-- All should be 0 currently (clean state)
```

---

## Remember

**"Ship Fast, Learn Faster"**

- Clean data beats fast imports
- Validate at every step
- Build for Ron to use without Claude Code
- One school at a time, verify before scaling
- Documentation prevents context loss

**Current Focus: Build the import system RIGHT, then scale it.**

---

**Last Updated:** October 27, 2025
**Status:** ✅ Ready to build data import infrastructure
**Next Session:** Create sprint plan and modular scraping system
