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

### XC Time Calculation
**XC Time** is a CALCULATED value that normalizes performance across courses:
- Formula: `time_seconds × course.xc_time_rating`
- Uses Crystal Springs as baseline (rating = 1.0)
- Easier courses have rating < 1.0, harder courses > 1.0
- Stored in materialized view: `athlete_xc_times`
- Refresh view after bulk imports: `REFRESH MATERIALIZED VIEW athlete_xc_times;`

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

### âœ… XC Time Calculation Fixed (Oct 13)
- Implemented proper XC Time calculation across all pages
- Formula: `time_seconds × xc_time_rating` from `athlete_xc_times` view
- Fixed school roster page to show best XC times correctly
- Removed hardcoded limits that caused 1000-row cap

### âœ… 1000-Row Limit Resolution (Oct 13)
- Identified Supabase default 1000-row limit across multiple pages
- Implemented pagination loops to fetch ALL records
- Created SQL functions for efficient data retrieval
- School roster now handles unlimited athletes

### âœ… UI Enhancements (Oct 12)
- Added clickable links to athlete names (all pages)
- Added clickable links to school names (all pages)
- ResultsTable component with client-side sorting
- Podium medals (ðŸ¥‡ðŸ¥ˆðŸ¥‰) on top 3 finishers

### âœ… Database Cleanup (Oct 2025)
- Removed 1,328 duplicate athlete records (5,805 → 4,477 athletes)
- Added unique constraint: `(first_name, last_name, current_school_id, graduation_year)`
- Updated all foreign key references
- Zero orphaned records remaining

### âœ… Supabase Auth Migration (Oct 9)
- Migrated from deprecated @supabase/auth-helpers-nextjs to @supabase/ssr
- Updated all client/server configurations
- Eliminated cookie parsing errors

### âœ… School Records Pages (Oct 10-11)
- Individual Records Page deployed (`/schools/[id]/individual-records`)
- SQL functions: `get_school_xc_records`, `get_school_top10_xc`, `get_school_course_records`
- 58x performance improvement
- Supports unlimited records

---

## CURRENT PRIORITIES - PHASE 1: ADMIN TOOLS

### Critical Admin Features (Do First)
**All admin features should be hidden from normal users**

#### 1. Find Duplicate Results
**Purpose:** Identify data errors where an athlete has multiple results in same race
**Priority:** CRITICAL
**Time:** 2 hours

**Query to implement:**
```sql
SELECT 
  a.first_name || ' ' || a.last_name as athlete_name,
  r.name as race_name,
  m.name as meet_name,
  m.meet_date,
  COUNT(res.id) as result_count,
  ARRAY_AGG(res.id) as result_ids
FROM results res
JOIN athletes a ON a.id = res.athlete_id
JOIN races r ON r.id = res.race_id
JOIN meets m ON m.id = res.meet_id
GROUP BY res.athlete_id, res.race_id, a.first_name, a.last_name, r.name, m.name, m.meet_date
HAVING COUNT(res.id) > 1
ORDER BY result_count DESC;
```

#### 2. Safe Delete Functions
**Purpose:** Properly remove results, races, and meets with cascade handling
**Priority:** CRITICAL
**Time:** 3 hours

**Required functions:**
- Delete a single result (update race participant count)
- Delete an entire race (cascade to all results, update meet)
- Delete an entire meet (cascade to all races and results)

#### 3. Merge Athletes
**Purpose:** Combine duplicate athlete records (different schools/years)
**Priority:** HIGH
**Time:** 4 hours

**Requirements:**
- Search/find similar athletes
- Preview merge (show which records will be affected)
- Update all foreign keys (results, school_transfers)
- Preserve history

#### 4. Test Course Rating Accuracy
**Purpose:** Use AI to analyze if course ratings are accurate based on athlete performance
**Priority:** MEDIUM
**Time:** 8 hours

**Requirements:**
- Analyze athletes who ran multiple courses
- Compare expected vs actual time differences
- Flag courses with ratings that seem incorrect
- Suggest corrected ratings

#### 5. Update Course Rating
**Purpose:** Manual adjustment of course difficulty ratings
**Priority:** MEDIUM
**Time:** 1 hour

**Requirements:**
- Simple form to update `xc_time_rating` field
- Refresh materialized view after update
- Show impact (how many athlete XC times will change)

#### 6. Import Meet Results
**Purpose:** Bulk upload results from race timing systems
**Priority:** HIGH
**Time:** 6 hours

**Requirements:**
- Support common formats (CSV, Athletic.net export)
- Validate data before import
- Check for duplicate athletes
- Match to existing athletes/schools
- Create new athletes if needed
- Calculate XC times automatically

---

## CURRENT PRIORITIES - PHASE 2: USER VIEW ENHANCEMENTS

### 1. Top Performances Page (Rename from "School Records")
**Location:** `/schools/[id]/top-performances`
**Time:** 2 hours

**Changes from current records page:**
- Remove course selection dropdown
- Just show overall top performances (all courses combined)
- Keep gender/grade filtering
- Display best XC times (already normalized for course difficulty)

### 2. Course Records Page
**Location:** `/courses/[id]/records`
**Time:** 4 hours

**Requirements:**
- Show top performances for THIS specific course
- 10 categories total (5 per gender):
  - Overall best time (all grades)
  - Freshman (9th grade) best
  - Sophomore (10th grade) best
  - Junior (11th grade) best
  - Senior (12th grade) best
- Left side: Boys, Right side: Girls
- Each record shows: Athlete name (linked), School (linked), Time, Date
- Course selector dropdown to switch between courses

### 3. Team Records Page
**Location:** `/schools/[id]/team-records`
**Time:** 3 hours

**Requirements:**
- Best single-day time for top 5 athletes (varsity scoring)
- Best Frosh/Soph time (top 5 freshmen/sophomores on single day)
- Show both boys and girls
- Optional: Filter by specific course
- Display: School, Date, Meet name, 5 athlete names (linked) + times, Total time

### 4. Seasons Page
**Location:** `/schools/[id]/seasons`
**Time:** 6 hours

**Requirements:**
- List all seasons (years) school has results
- Clicking season shows all athletes who competed that season:
  - Athlete name (linked)
  - Top XC Time (best performance that season)
  - Average of top 3 races
  - Last 3 races (times)
  - Improvement % from prior season
- Sortable by all columns
- Filter by gender and grade

### 5. All Results Page
**Location:** `/schools/[id]/all-results`
**Time:** 3 hours

**Requirements:**
- List all athletes with at least one result
- Columns:
  - Rank (by gender)
  - Name (linked)
  - Grad Year
  - Division (Boys/Girls)
  - Total Races (count)
  - XC Time PR (best XC time ever)
- Sortable by all fields
- Filter by gender

---

## KEY DATABASE RELATIONSHIPS

```
courses (id) <--FK-- races (course_id)
meets (id) <--FK-- races (meet_id)
races (id) <--FK-- results (race_id)
athletes (id) <--FK-- results (athlete_id)
schools (id) <--FK-- athletes (current_school_id)

# Materialized View
athlete_xc_times: Pre-calculated best XC time per athlete
```

---

## DEVELOPER COMMUNICATION REQUIREMENTS

**User expects:**
- ❌ NO praise or flattery ("That's a great question")
- âœ… Direct, actionable solutions immediately
- âœ… Step-by-step detailed instructions with exact file paths
- âœ… Technical accuracy over diplomatic language
- âœ… Complete code with NO placeholders or "..." ellipsis
- âœ… Beginner-friendly instructions (user has less experience)
- âœ… Skip pleasantries, get straight to implementation

---

## COMMON QUERIES

### Find Athletes with Multiple Results in Same Race
```sql
SELECT 
  a.first_name || ' ' || a.last_name as athlete,
  m.name as meet,
  r.name as race,
  COUNT(res.id) as result_count
FROM results res
JOIN athletes a ON a.id = res.athlete_id  
JOIN races r ON r.id = res.race_id
JOIN meets m ON m.id = res.meet_id
GROUP BY a.id, a.first_name, a.last_name, r.id, r.name, m.name
HAVING COUNT(res.id) > 1;
```

### Find Similar Athletes (Potential Merges)
```sql
SELECT 
  a1.id as athlete1_id,
  a1.first_name || ' ' || a1.last_name as athlete1,
  s1.name as school1,
  a1.graduation_year as grad1,
  a2.id as athlete2_id,
  a2.first_name || ' ' || a2.last_name as athlete2,
  s2.name as school2,
  a2.graduation_year as grad2
FROM athletes a1
JOIN athletes a2 ON 
  LOWER(a1.first_name) = LOWER(a2.first_name)
  AND LOWER(a1.last_name) = LOWER(a2.last_name)
  AND a1.id < a2.id
JOIN schools s1 ON s1.id = a1.current_school_id
JOIN schools s2 ON s2.id = a2.current_school_id
WHERE ABS(a1.graduation_year - a2.graduation_year) <= 1
ORDER BY a1.last_name;
```

### Refresh XC Times After Changes
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times;
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
REFRESH MATERIALIZED VIEW athlete_xc_times;  # Update XC times
```

---

## IMPORTANT FILE PATHS

```
/app/schools/[id]/page.tsx                   # School roster (with XC times)
/app/schools/[id]/individual-records/        # Individual records (working)
/app/schools/[id]/team-records/              # Team records (TODO)
/app/schools/[id]/seasons/                   # Seasons page (TODO)
/app/schools/[id]/all-results/               # All results (TODO)
/app/schools/[id]/top-performances/          # Rename from records (TODO)
/app/courses/[id]/records/                   # Course records (TODO)
/app/admin/                                  # Admin tools (TODO - all 6)
/components/ResultsTable.tsx                 # Sortable results table
/lib/supabase/client.ts                      # Browser client
/lib/supabase/server.ts                      # Server client
```

---

## DOCUMENTATION STRUCTURE

**For comprehensive details, see:**
- MANA_RUNNING_PROJECT_SUMMARY.md - Complete technical documentation
- IMMEDIATE_ACTION_ITEMS.md - Current priorities and detailed tasks
- QUICK_REFERENCE.md - Daily commands and queries
- MANA_RUNNING_ROADMAP.md - Feature planning and roadmap
- ADMIN_FEATURES.md - Detailed admin feature specifications
- USER_VIEW_ENHANCEMENTS.md - Detailed user view specifications

---

**Last Updated:** October 13, 2025  
**Status:** Production (Active Development)  
**Current Phase:** Admin Tools + User View Enhancements
