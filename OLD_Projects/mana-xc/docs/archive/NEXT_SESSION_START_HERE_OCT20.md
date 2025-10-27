# 🚀 Next Session Start Guide - Mana XC

**Date Created:** October 20, 2025
**Status:** ✅ 4-Year Data Import Complete - Ready for Frontend Development
**Last Achievement:** 31,721 results imported, per-course PR system operational

---

## Step 0: Launch Everything (5 minutes)

### On MacBook Air:

1. **Open VS Code**
   ```bash
   cd /Users/ron/mana-xc
   code .
   ```

2. **Open Integrated Terminals** (Recommended)
   - Press `` Ctrl + ` `` (backtick) to open integrated terminal
   - Click the **split terminal** button (+) to create multiple terminals

   **Terminal 1 - Frontend (Next.js):**
   ```bash
   npm run dev
   ```
   Wait for: `✓ Ready on http://localhost:3000`

   **Terminal 2 - Claude Code:**
   Already running in this terminal!

   **Terminal 3 - Testing/Commands:**
   Use for running SQL scripts, git commands, etc.

3. **Verify Servers Are Running**
   - Frontend: http://localhost:3000 (should show redirect to /top-performances)
   - Database: Supabase (cloud-hosted, always available)

---

## Session Summary - October 20, 2025

### ✅ What Was Accomplished

**1. Complete 4-Year Data Import**
- Imported all Westmont XC data from 2022-2025 seasons
- 31,721 total race results across 4 years
- 13,487 athletes, 674 schools, 558 races, 17 courses
- Import performance: 40 seconds total (100x faster than original approach!)

**2. Per-Course PR System Created**
- `athlete_course_prs` materialized view operational in Supabase
- Tracks each athlete's best time at each specific course (RAW times)
- No XC time normalization yet - requires AI course rating model first

**3. Crystal Springs Baseline Established**
- **Crystal Springs 2.95 Mile = 1.000 rating (baseline course)**
- All other courses will be rated relative to this standard
- Complete methodology documented in `COURSE_RATING_BASELINE.md`

**4. Data Quality**
- 98%+ data quality (minor outliers documented)
- All foreign keys valid, no orphaned records
- Season years, graduation years all populated correctly

---

## Files Created This Session

### New Documentation
- `4_YEAR_IMPORT_SUCCESS.md` - Complete import summary
- `COURSE_RATING_BASELINE.md` - Crystal Springs methodology (62 lines)
- `DATA_QUALITY_NOTES.md` - Outlier tracking and validation plans
- `SESSION_SUMMARY_OCT20_FINAL.md` - Complete session record

### New SQL Scripts
- `CREATE_COURSE_PRS.sql` - Per-course PR view (**EXECUTED IN SUPABASE**)
- `VERIFY_COURSE_PRS.sql` - Course records analysis
- `VERIFY_4_YEAR_DATA.sql` - Data distribution verification
- `CHECK_COUNTS.sql` - Quick table counts

### Modified Files
- `app/api/admin/batch-import-v2/route.ts` - Fixed courseId scoping
- `scripts/athletic-net-scraper-v3.js` - Scraper with normalized output
- `scripts/convert-to-normalized-csvs.js` - JSON → 7 CSV converter

### Archived Files (moved to docs/archive/)
- `SESSION_SUMMARY_OCT19.md`
- `SESSION_SUMMARY_OCT20.md`
- `CLEAN_ALL_TABLES.sql`
- `CLEAN_AND_UPDATE_SCHEMA.sql`
- `CHECK_SCHEMA.sql`
- `VERIFY_2025_IMPORT.sql`
- `FIX_COURSE_VENUE_TYPE.sql`

### Data Files Organized (moved to data/imports/)
- All 2022 season CSVs/JSON → `data/imports/2022-westmont/`
- All 2023 season CSVs/JSON → `data/imports/2023-westmont/`
- All 2024 season CSVs/JSON → `data/imports/2024-westmont/`
- All 2025 season CSVs/JSON → `data/imports/2025-westmont/`

---

## Immediate Next Steps (6-Hour Plan)

### Phase 1: Frontend Development - View Pages (Current Session Goal!)

**User wants to see:**
1. ✅ **Course difficulty analysis** - Verify system estimates vs. user expectations
2. 📊 **Team rankings page** - Season standings
3. 📈 **Most improved page** - Team improvement tracking
4. 👤 **Athlete profile page** - Career progression and PRs

**Implementation Plan:**

#### Step 1: Course Difficulty Analysis (30 min)
- Check current `xc_time_rating` values in database
- Compare with user's domain knowledge
- Discuss approach for AI course rating model
- Decision: Use current ratings or wait for AI model?

#### Step 2: Team Rankings Page (90 min)
**Route:** `/teams/rankings/[season]`
- Display all teams ranked by average XC time (top 7 runners)
- Filter by season year (2022, 2023, 2024, 2025)
- Show: rank, school name, average time, top 7 athletes
- Link to school profile page

**Files to create:**
- `app/teams/rankings/[season]/page.tsx`
- `components/teams/TeamRankings.tsx`
- `app/api/teams/rankings/route.ts` (Supabase RPC)

#### Step 3: Most Improved Team Page (60 min)
**Route:** `/teams/most-improved/[season]`
- Compare team average from season N-1 to season N
- Show improvement in seconds
- Highlight biggest gainers
- Filter by school

**Files to create:**
- `app/teams/most-improved/[season]/page.tsx`
- `components/teams/MostImproved.tsx`
- `app/api/teams/most-improved/route.ts`

#### Step 4: Athlete Profile Page (120 min)
**Route:** `/athletes/[id]/profile`
- Career overview: PRs, graduation year, school
- 4-year progression chart (if applicable)
- Per-course PRs (best at each venue)
- All race results with filters (season, meet, course)
- Season-by-season summary

**Files to create:**
- `app/athletes/[id]/profile/page.tsx`
- `components/athletes/AthleteProfile.tsx`
- `components/athletes/ProgressionChart.tsx` (line chart)
- `components/athletes/CourseRecords.tsx`
- `app/api/athletes/[id]/profile/route.ts`

#### Step 5: Testing & Refinement (60 min)
- Test all pages with real data
- Fix any display issues
- Add loading states
- Error handling
- Mobile responsiveness

---

## Success Metrics

### After completing Phase 1, you should have:
- ✅ Course ratings verified with user input
- ✅ Team rankings page showing 674 schools
- ✅ Most improved teams calculated for each season
- ✅ Athlete profiles displaying 4-year progressions
- ✅ All pages responsive and fast (<1 sec load time)

---

## Database Schema Reminder

### Key Tables
- **venues** - (name, city, state)
- **courses** - (venue_id, distance_meters, layout_version, xc_time_rating)
- **schools** - (name, athletic_net_id)
- **athletes** - (full_name, current_school_id, gender, graduation_year)
- **meets** - (name, meet_date, season_year, athletic_net_id)
- **races** - (meet_id, course_id, name, gender, distance_meters)
- **results** - (athlete_id, race_id, time_cs, place_overall, season_year)

### Materialized Views
- **athlete_course_prs** - Per-course PRs (athlete_id, course_id, best_time_cs, times_raced_here, first_year, last_year)

### Important Field Names
- Use `current_school_id` (not `school_id`) in athletes table
- Courses reference `venue_id` - must JOIN through venues for venue name
- Times stored in **centiseconds** (`time_cs`)
- Gender: boolean (false = male, true = female)

---

## Troubleshooting

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### Database connection issues
- Check Supabase dashboard: https://supabase.com/dashboard
- Verify `.env.local` has correct SUPABASE_URL and SUPABASE_ANON_KEY
- Test connection with simple query in SQL Editor

### Course ratings seem off
- Current ratings are all 1.000 (default)
- Need to build AI course rating model
- See `COURSE_RATING_BASELINE.md` for methodology

---

## File Organization

### Root Directory (Active Files Only)
- Documentation: 13 .md files
- SQL Scripts: 6 active scripts
- Config: package.json, tsconfig.json, next.config.js, etc.

### Archives
- `docs/archive/` - Old session summaries, superseded SQL scripts
- `data/imports/YYYY-westmont/` - Scraped data by season
- `data/testing-archive/` - Early development test files

---

## Estimated Timeline

**Today's Session (6 hours):**
- ✅ Course difficulty analysis: 30 min
- 📊 Team rankings page: 90 min
- 📈 Most improved page: 60 min
- 👤 Athlete profile page: 120 min
- ✅ Testing & refinement: 60 min

**Next Session Priorities:**
1. AI Course Rating Model (3-4 hours)
2. XC Time PR System (2 hours)
3. Additional frontend pages (course records, school profiles)

---

## Quick Commands

### Start Development
```bash
npm run dev          # Frontend (port 3000)
```

### Database Verification
```bash
# In Supabase SQL Editor, run:
# - CHECK_COUNTS.sql (quick table counts)
# - VERIFY_4_YEAR_DATA.sql (comprehensive analysis)
# - VERIFY_COURSE_PRS.sql (course records)
```

### Git Status
```bash
git status           # Check what's changed
git add -A           # Stage all changes
git commit -m "..."  # Commit with message
git push             # Push to GitHub
```

---

## What to Tell Claude Code

**Start with:**
> "Let's build the frontend pages! First, let's verify the course difficulty ratings in the database match what I'd expect. Then we'll build:
> 1. Team rankings page for the season
> 2. Most improved teams page
> 3. Athlete profile page with career progression
>
> Read NEXT_SESSION_START_HERE.md first for context."

---

## Repository Status

**GitHub:** https://github.com/ron681/mana-xc
**Branch:** main
**Status:** Clean, all changes committed
**Latest Work:** 4-year data import, per-course PR system, Crystal Springs baseline

---

**Ready to build! 🚀**

**Phase:** Frontend Development
**Focus:** User-facing views with real 4-year data
**Next Milestone:** Complete athlete and team pages with course rating analysis
