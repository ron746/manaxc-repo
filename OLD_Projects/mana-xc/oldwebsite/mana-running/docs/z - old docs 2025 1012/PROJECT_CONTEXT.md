# MANA RUNNING - PROJECT CONTEXT

**Start every new Claude conversation by searching Google Drive for "Mana Running Documentation" and reviewing relevant files.**

---

## CRITICAL TECHNICAL DETAILS

### Time Storage Format
**⚠️ CRITICAL:** Times are stored in **CENTISECONDS**, not seconds!
- Database field: `time_seconds` (misleading name, actually centiseconds)
- 15:30.00 = 93000 centiseconds (not 930 seconds)
- Formula: `(minutes * 60 * 100) + (seconds * 100) + centiseconds`
- Always divide by 100 to get actual seconds for display

### Development Environment
- **Computer:** MacBook Air M2
- **OS:** macOS
- **Frontend:** Next.js 14.2.5 with TypeScript, React Server Components
- **Backend:** Supabase (PostgreSQL 15.1)
- **Styling:** Tailwind CSS 3.4.1 + shadcn/ui components
- **Deployment:** Vercel (auto-deploy from `main` branch)
- **Repository:** github.com/ron681/mana-running

### Supabase Configuration
- **Auth Package:** @supabase/ssr 0.5.1 (migrated Oct 9, 2025)
- **Client Creation:** Uses createBrowserClient/createServerClient patterns
- **Note:** Minor warning about multiple client instances exists (non-blocking, documented in tech debt)

---

## PROJECT OVERVIEW

**Mana Running** is a production cross country statistics platform at https://mana-running.vercel.app/

**Goal:** Become the definitive XC tool - like xcstats.com but with superior analytics and UX

### Target Users
1. **Coaches:** Team analysis, varsity selection, performance tracking, championship planning
2. **Athletes:** Personal progress tracking, course PRs, season goals  
3. **Fans:** Meet results, school comparisons, historical data

### Database Scale
- **Current:** 4,477 unique athletes, ~10,000+ results
- **Target:** 100,000+ athletes, 1,000,000+ results
- **Design Philosophy:** Build for 1M+ records from day one

---

## RECENT COMPLETED WORK (October 2025)

### ✅ Supabase Auth Migration (Oct 9)
- Migrated from deprecated @supabase/auth-helpers-nextjs to @supabase/ssr
- Updated all client/server Supabase configurations
- Eliminated cookie parsing errors
- Files updated: 5 core files with new import patterns

### ✅ Database Cleanup (Oct 2025)
- Removed 1,328 duplicate athlete records (5,805 → 4,477 athletes)
- Added unique constraint: `(first_name, last_name, current_school_id, graduation_year)`
- Updated all foreign key references in results and school_transfers tables
- Zero orphaned records remaining

### ✅ School Records Pages Scalability (Oct 10-11)
- Created SQL functions for database-level aggregation
- **Individual Records Page:** Deployed and working
  - Functions: `get_school_xc_records`, `get_school_top10_xc`, `get_school_course_records`
  - Path: `/schools/[id]/individual-records`
  - Performance: 58x faster than old approach
- **Team Records Page:** In progress
  - SQL function has column naming conflicts (needs `res_` prefix on all columns)
  - Will be at: `/schools/[id]/team-records`

### ✅ UI Improvements
- Added clickable links to athlete names across all pages
- Added clickable links to school names across all pages
- ResultsTable component now has interactive sorting
- Podium medals (🥇🥈🥉) on top 3 finishers

---

## PENDING CRITICAL WORK

### 🔴 HIGH PRIORITY

#### 1. Fix Race Participant Counts (45 min)
**Issue:** `races.total_participants` field incorrect/stale
**Solution:** 
1. Update existing data with correct counts
2. Create trigger to auto-maintain counts
3. Add application-level validation
**See:** IMMEDIATE_ACTION_ITEMS.md #1 for complete fix

#### 2. Prevent Duplicate Athletes in Code (30 min)
**Action:** Add duplicate check before ALL athlete creation points
**Files to update:**
- Meet import functions
- Admin athlete creation forms  
- CSV upload processors
- Any API endpoints that create athletes

#### 3. Add Database Indexes (5 min)
**Run in Supabase SQL Editor:**
```sql
CREATE INDEX IF NOT EXISTS idx_athletes_school_grad ON athletes(current_school_id, graduation_year);
CREATE INDEX IF NOT EXISTS idx_results_athlete ON results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_results_race ON results(race_id);
CREATE INDEX IF NOT EXISTS idx_results_meet ON results(meet_id);
CREATE INDEX IF NOT EXISTS idx_meets_date ON meets(meet_date DESC);
CREATE INDEX IF NOT EXISTS idx_races_meet ON races(meet_id);
CREATE INDEX IF NOT EXISTS idx_races_course ON races(course_id);
```

### 🟡 MEDIUM PRIORITY

#### 4. Complete Team Records Page
- Debug SQL function column naming conflicts
- Deploy team records page at `/schools/[id]/team-records`
- Test with actual team data

#### 5. Clean Up Old Records Page
- Delete `/schools/[id]/records/page.tsx` after new pages work
- Remove old 1484-line mixed code file

---

## DEVELOPER COMMUNICATION REQUIREMENTS

**User expects:**
- ❌ NO praise or flattery ("That's a great question")
- ✅ Direct, actionable solutions immediately
- ✅ Step-by-step detailed instructions with exact file paths
- ✅ Technical accuracy over diplomatic language
- ✅ Complete code with NO placeholders or "..." ellipsis
- ✅ Beginner-friendly instructions (user has less experience)
- ✅ Skip pleasantries, get straight to implementation

---

## KEY DATABASE RELATIONSHIPS

```
courses (id) <--FK-- races (course_id)
meets (id) <--FK-- races (meet_id)
races (id) <--FK-- results (race_id)
athletes (id) <--FK-- results (athlete_id)
schools (id) <--FK-- athletes (current_school_id)
```

---

## COMMON QUERIES

### Check for Duplicates
```sql
SELECT first_name, last_name, current_school_id, graduation_year, COUNT(*)
FROM athletes
GROUP BY first_name, last_name, current_school_id, graduation_year
HAVING COUNT(*) > 1;
```

### Top 7 Varsity (Boys 5K)
```sql
SELECT a.first_name, a.last_name, AVG(r.time_seconds) as avg_time
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
WHERE a.current_school_id = '<school-id>' 
  AND ra.distance = '5K' 
  AND ra.gender = 'M'
GROUP BY a.id, a.first_name, a.last_name
ORDER BY avg_time ASC
LIMIT 7;
```

---

## QUICK COMMANDS

```bash
# Development
npm run dev                    # Start local (localhost:3000)
npm run build                  # Test build
npm run lint                   # Check code

# Deployment
git push origin main           # Auto-deploy to production

# Database
supabase db reset              # Reset local DB
supabase db push               # Push migrations
```

---

## IMPORTANT FILE PATHS

```
/app/schools/[id]/individual-records/page.tsx    # New individual records page
/app/schools/[id]/team-records/page.tsx          # Team records (in progress)
/app/schools/[id]/records/page.tsx               # OLD - delete after new pages work
/components/ResultsTable.tsx                      # Sortable results table
/lib/supabase/client.ts                           # Browser client
/lib/supabase/server.ts                           # Server client
/lib/utils.ts                                     # Time formatting utilities
```

---

## DOCUMENTATION STRUCTURE

**For comprehensive details, see:**
- MANA_RUNNING_PROJECT_SUMMARY.md - Complete technical documentation
- IMMEDIATE_ACTION_ITEMS.md - Current priorities and tasks
- QUICK_REFERENCE.md - Daily commands and queries
- DATABASE_SCALABILITY.md - Performance and scalability guidelines
- MANA_RUNNING_ROADMAP.md - Feature planning and roadmap

---

**Last Updated:** October 12, 2025  
**Status:** Production (Active Development)
