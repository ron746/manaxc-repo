# Next Steps and Recommendations - ManaXC Project
**Date:** October 27, 2025
**Status:** Website Deployed, Ready for Feature Development

---

## Executive Summary

**Where We Are:**
- ✅ Website deployed and live at https://manaxc-repo.pages.dev
- ✅ Database schema complete and operational (Supabase)
- ✅ 6 core pages implemented (Landing, Athletes List/Detail, Schools List/Detail, Courses List)
- ⚠️ Data import blocked (graduation year conversion bug - 10 min fix)
- ⚠️ 18 pages from old website need to be rebuilt

**What We Found:**
The old website (`OLD_Projects/mana-xc/oldwebsite/mana-running`) was a comprehensive platform with **23+ pages** covering:
- School records, seasons, and roster management
- Course details with difficulty ratings and performance rankings
- Meet and race results with team scoring
- Athlete profiles with comprehensive statistics
- Admin tools for data import and management

**Recommendation:**
Build out the missing pages in phases, using the old website as a reference but adapting to the new schema (centiseconds time storage, races table, new field names).

---

## Current Status Breakdown

### ✅ COMPLETED (6/24 pages = 25%)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Landing | `/` | ✅ Live | Stats cards, logo, navigation |
| Athletes List | `/athletes` | ✅ Live | Search, filter, sort |
| Athlete Detail | `/athletes/[id]` | ✅ Live | Full profile with race history |
| Schools List | `/schools` | ✅ Live | Searchable table |
| School Detail | `/schools/[id]` | ✅ Live | Roster with filters |
| Courses List | `/courses` | ✅ Live | Basic listing |

**Key Achievement:** All existing pages use the NEW schema correctly:
- Time stored in centiseconds (`time_cs`)
- Joins through `races` table
- Uses `school_id` (not `current_school_id`)
- Proper formatting utilities in `lib/utils/time.ts`

---

## ❌ MISSING PAGES (18 pages)

### Priority 1: School Pages (HIGH IMPACT - 4 pages)

These pages existed in the old website and were heavily used:

#### 1. School Records Page
**Route:** `/schools/[id]/records`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/schools/[id]/records/page.tsx`

**Features to Implement:**
- Boys/Girls XC records (normalized times using course difficulty)
- Grade-level records (9th, 10th, 11th, 12th)
- Course-specific records (dropdown selector)
- Top 10 all-time performances per course
- Record holder info (athlete name, year, meet)

**Data Requirements:**
- RPC function: `get_school_xc_records(school_id, gender)`
- RPC function: `get_school_course_records(school_id, course_id, gender)`
- Course normalization logic (need to add `xc_time_rating` field OR calculate dynamically)

**Estimated Time:** 2-3 hours (including RPC functions)

---

#### 2. School Seasons Page
**Route:** `/schools/[id]/seasons`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/schools/[id]/seasons/page.tsx`

**Features to Implement:**
- Season cards showing:
  - Year
  - Total athletes (boys/girls breakdown)
  - Total races
  - Best performance
  - Average time
- Clickable cards → Season detail page
- Sort by year (newest first)

**Data Requirements:**
- Query: Group results by `season_year`
- Aggregate athlete counts, race counts
- Calculate best/average times per season

**Estimated Time:** 1-2 hours

---

#### 3. School Season Detail Page
**Route:** `/schools/[id]/seasons/[year]`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/schools/[id]/seasons/[year]/page.tsx`

**Features to Implement:**
- Athlete roster for that season
- Results filtered by season year
- Season statistics:
  - Varsity boys/girls top 7 average
  - Team performance by meet
  - Individual PRs during season
- Meet-by-meet results table

**Data Requirements:**
- Filter athletes and results by `season_year`
- Calculate team averages (top 7 runners)
- Link to specific meets

**Estimated Time:** 2 hours

---

#### 4. School All Results Page
**Route:** `/schools/[id]/results`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/schools/[id]/results/page.tsx`

**Features to Implement:**
- Complete results history table
- Columns: Date, Athlete, Meet, Course, Time, Place
- Advanced filtering:
  - By athlete name
  - By season year
  - By gender
  - By course
- Multi-column sorting
- Pagination (50 results per page)
- Export to CSV option

**Data Requirements:**
- Join: results → athletes → races → meets → courses
- Full-text search on athlete names
- Efficient pagination with Supabase

**Estimated Time:** 2-3 hours

---

### Priority 2: Course Pages (MEDIUM IMPACT - 3 pages)

#### 5. Course Detail Page
**Route:** `/courses/[id]`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/courses/[id]/page.tsx`

**Features to Implement:**
- Course information:
  - Name, distance, difficulty rating
  - XC time rating (if we add it)
  - Location/venue
- Statistics:
  - Total meets held
  - Total results
  - Boys/girls split
- Recent meets on this course
- Top 5 team performances (avg of top 7)

**Data Requirements:**
- Course details from `courses` table
- Count meets and results
- Calculate team averages

**Estimated Time:** 1.5 hours

---

#### 6. Course Records Page
**Route:** `/courses/[id]/records`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/courses/[id]/records/page.tsx`

**Features to Implement:**
- Boys/Girls records by grade level
- All-time course record
- School filter (see records for specific school on this course)
- Year filter (see records by season)
- Record progression over time (optional chart)

**Data Requirements:**
- RPC function: `get_course_records(course_id, gender, grade)`
- Filter by school_id if selected

**Estimated Time:** 1.5-2 hours

---

#### 7. Course Performances Page (Top 50)
**Route:** `/courses/[id]/performances`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/courses/[id]/performances/page.tsx`

**Features to Implement:**
- Top 50 (or 100) fastest times on this course
- Filters:
  - Gender
  - School
  - Grade level
  - Season year
- Mark repeat performances (same athlete multiple times)
- Highlight PRs
- Sortable table

**Data Requirements:**
- Query: Get all results for course, order by time_cs
- Join to athletes for grade/school info
- Apply filters

**Estimated Time:** 2 hours

---

### Priority 3: Meet/Race Pages (HIGH VALUE - 4 pages)

#### 8. Meets List Page
**Route:** `/meets`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/meets/page.tsx`

**Features to Implement:**
- All meets table with:
  - Date, Name, Location, Course
  - Number of races (Varsity/JV/Frosh boys/girls)
  - Total participants
- Filters:
  - Season year
  - Meet type (Invitational, Dual, League, etc.)
  - Course
  - Date range
- Sort by date (newest first)
- Pagination
- Click → Meet detail

**Data Requirements:**
- Query meets with race counts
- Join to courses for course names
- Count results per meet

**Estimated Time:** 1.5 hours

---

#### 9. Meet Detail Page
**Route:** `/meets/[meetId]`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/meets/[id]/page.tsx`

**Features to Implement:**
- Meet header:
  - Name, Date, Location, Course
  - Weather (if available)
- Race cards/grid showing:
  - Race name (e.g., "Varsity Boys")
  - Distance
  - Number of participants
  - Winning time
  - Winning team (if team scoring)
- Click race → Race results page
- Link to combined results (if XC time normalization)

**Data Requirements:**
- Query meet info
- Get all races for meet
- Count participants per race
- Get winning results

**Estimated Time:** 1.5-2 hours

---

#### 10. Race Results Page
**Route:** `/meets/[meetId]/races/[raceId]`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/meets/[id]/races/[id]/page.tsx`

**Features to Implement:**
- Race header (name, distance, date)
- **Individual Results Table:**
  - Place, Bib, Name, School, Grade, Time, Pace
  - Team position (1-7 for scorers)
  - PR indicator
- **Team Standings Table:**
  - Place, School, Score (sum of top 5)
  - Top 5 runners with places
  - Displacement runners (6th-7th)
  - Incomplete teams section
- Export results to CSV/PDF
- Links to athlete profiles

**Data Requirements:**
- Query all results for race
- Calculate team scores (top 5 places)
- Identify scoring vs non-scoring runners
- Sort by place_overall

**Estimated Time:** 3-4 hours (includes team scoring logic)

---

#### 11. Combined Results Page (XC Normalized)
**Route:** `/meets/[meetId]/combined`
**Old Reference:** `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/meets/[id]/combined/page.tsx`

**Features to Implement:**
- Combine results across multiple races (different distances/courses)
- Normalize times using XC time rating
- Show "equivalent" times for fair comparison
- Recalculate team scores using normalized times
- Use case: Compare Varsity Boys (5K) vs Varsity Girls (4K) fairly

**Data Requirements:**
- **REQUIRES:** `xc_time_rating` on courses table
- Formula: `normalized_time = actual_time * (standard_distance / actual_distance) * difficulty_factor`
- Complex team scoring logic

**Estimated Time:** 3-4 hours (most complex feature)
**Note:** May want to defer this until after other pages

---

### Priority 4: Admin/Import Pages (3 pages)

These pages are for data management:

#### 12. Admin Dashboard
**Route:** `/admin`

**Features:**
- System statistics
- Recent imports
- Data validation issues
- Quick links to import tools
- Bulk edit capabilities

**Estimated Time:** 1-2 hours

---

#### 13-14. Import Tools
**Routes:** `/import`, `/courses/import-courses`, `/admin/mass-import`

**Features:**
- CSV upload wizard
- Column mapping
- Data validation
- Bulk import progress
- Error reporting

**Estimated Time:** 3-4 hours total
**Note:** Python scripts already exist, need web UI

---

### Priority 5: Auth & Search (2 pages)

#### 15-16. Authentication Pages
**Routes:** `/auth/login`, `/auth/signup`

**Features:**
- Email/password login
- Social auth (Google, etc.)
- Password reset
- Profile management

**Estimated Time:** 2 hours (using Supabase Auth)

---

#### 17. Search Page
**Route:** `/search`

**Features:**
- Multi-entity search (athletes, schools, courses, meets)
- Type-ahead suggestions
- Filters by entity type
- Recent searches

**Estimated Time:** 2-3 hours

---

## Database Requirements

### Missing Features to Add

#### 1. XC Time Normalization (CRITICAL for Combined Results)

**Problem:** Need to fairly compare times across different courses/distances

**Options:**

**Option A: Add xc_time_rating field to courses table**
```sql
ALTER TABLE courses
ADD COLUMN xc_time_rating DECIMAL(5,3) DEFAULT 1.000;
```
- Then populate with ratings (e.g., 1.000 = Crystal Springs 2.95mi standard)
- Easiest to implement
- Requires manual rating of each course

**Option B: Calculate dynamically from historical data**
- Compare average times on each course
- Calculate difficulty factor automatically
- More accurate but complex
- Requires sufficient historical data

**Recommendation:** Start with Option A (manual ratings), migrate to Option B later

---

#### 2. RPC Functions (CRITICAL for Records Pages)

Need to create Postgres functions for efficient querying:

```sql
-- School records by grade level
CREATE OR REPLACE FUNCTION get_school_records(
  p_school_id UUID,
  p_gender TEXT
)
RETURNS TABLE (
  grade INTEGER,
  best_time_cs INTEGER,
  athlete_name TEXT,
  meet_name TEXT,
  meet_date DATE
) AS $$
  SELECT
    (2024 - a.grad_year + 12) as grade,
    MIN(r.time_cs) as best_time_cs,
    a.name as athlete_name,
    m.name as meet_name,
    m.meet_date
  FROM results r
  JOIN athletes a ON r.athlete_id = a.id
  JOIN meets m ON r.meet_id = m.id
  WHERE a.school_id = p_school_id
    AND a.gender = p_gender
  GROUP BY grade, a.name, m.name, m.meet_date
  ORDER BY grade, best_time_cs
$$ LANGUAGE sql;

-- Course records
CREATE OR REPLACE FUNCTION get_course_records(
  p_course_id UUID,
  p_gender TEXT
)
RETURNS TABLE (
  grade INTEGER,
  best_time_cs INTEGER,
  athlete_name TEXT,
  school_name TEXT,
  meet_date DATE
) AS $$
  -- Similar structure
$$ LANGUAGE sql;
```

**Estimated Time to Create:** 1-2 hours for all RPC functions

---

#### 3. Database Views (OPTIONAL but helpful)

Create views for common queries:

```sql
-- Results with full details (avoids complex joins in code)
CREATE VIEW results_with_details AS
SELECT
  r.*,
  a.first_name,
  a.last_name,
  a.name,
  a.grad_year,
  a.gender,
  s.name as school_name,
  s.short_name as school_short_name,
  rc.name as race_name,
  rc.gender as race_gender,
  m.meet_date,
  m.name as meet_name,
  m.season_year,
  c.name as course_name,
  c.distance_meters,
  c.difficulty_rating
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN schools s ON a.school_id = s.id
LEFT JOIN races rc ON r.race_id = rc.id
JOIN meets m ON r.meet_id = m.id
LEFT JOIN courses c ON m.course_id = c.id;
```

**Estimated Time:** 30 minutes

---

## Implementation Roadmap

### Phase 1: Data Import (BLOCKER - DO FIRST)
**Time:** 30-45 minutes

1. ✅ Fix `import_westmont_excel.py` graduation year bug
2. ✅ Test import with 10 athletes
3. ✅ Full import (1,062 athletes + 6,711 results)
4. ✅ Verify data quality with SQL queries

**Why First:** All pages need data to test properly

---

### Phase 2: Database Enhancements (FOUNDATION)
**Time:** 2-3 hours

1. ✅ Add `xc_time_rating` field to courses
2. ✅ Create RPC functions for records
3. ✅ Create `results_with_details` view
4. ✅ Add database indexes for performance

**Why Second:** Enables advanced features in pages

---

### Phase 3: School Pages (HIGH VALUE)
**Time:** 8-10 hours

Build in order:
1. School Records (`/schools/[id]/records`) - 2-3 hours
2. School Seasons List (`/schools/[id]/seasons`) - 1-2 hours
3. School Season Detail (`/schools/[id]/seasons/[year]`) - 2 hours
4. School All Results (`/schools/[id]/results`) - 2-3 hours

**Why Third:** Schools are primary entity, heavily used

---

### Phase 4: Course Pages (MEDIUM VALUE)
**Time:** 5-6 hours

1. Course Detail (`/courses/[id]`) - 1.5 hours
2. Course Records (`/courses/[id]/records`) - 1.5-2 hours
3. Course Performances (`/courses/[id]/performances`) - 2 hours

**Why Fourth:** Completes course browsing experience

---

### Phase 5: Meet/Race Pages (HIGH VALUE)
**Time:** 8-10 hours

1. Meets List (`/meets`) - 1.5 hours
2. Meet Detail (`/meets/[meetId]`) - 1.5-2 hours
3. Race Results (`/meets/[meetId]/races/[raceId]`) - 3-4 hours
4. Combined Results (`/meets/[meetId]/combined`) - 3-4 hours *(optional)*

**Why Fifth:** Core feature, but depends on having data

---

### Phase 6: Admin/Auth (LATER)
**Time:** 6-8 hours

1. Admin Dashboard - 1-2 hours
2. Import Tools - 3-4 hours
3. Auth Pages - 2 hours

**Why Last:** Can manage data with SQL/Python for now

---

## Key Technical Considerations

### 1. Static Export vs Dynamic Rendering

**Current Setup:** Static export (`output: 'export'` in next.config.ts)

**Limitation:** Cannot use server-side rendering or API routes

**Options:**
- **Keep static export:** Pre-generate all pages at build time
  - Pros: Fast, works on Cloudflare Pages free tier
  - Cons: Must rebuild when data changes

- **Switch to SSR:** Use Cloudflare Workers/Functions
  - Pros: Dynamic data, no rebuilds needed
  - Cons: More complex deployment, may have costs

**Recommendation:** Start with static export, add pages gradually. Once data is stable, consider SSR for better UX.

---

### 2. Team Scoring Logic

Team scoring is complex but critical for Race Results page:

```typescript
// Pseudo-code for team scoring
function calculateTeamScores(results: Result[]) {
  // 1. Group results by school
  const bySchool = groupBy(results, 'school_id');

  // 2. For each school, take top 5 scoring runners
  const teamScores = Object.entries(bySchool).map(([school, runners]) => {
    const scoringRunners = runners
      .sort((a, b) => a.place_overall - b.place_overall)
      .slice(0, 5);

    const score = scoringRunners.reduce((sum, r) => sum + r.place_overall, 0);
    const displacementRunners = runners.slice(5, 7); // 6th and 7th

    return {
      school,
      score,
      scoringRunners,
      displacementRunners,
      isComplete: scoringRunners.length === 5
    };
  });

  // 3. Sort by score (low score wins)
  return teamScores.sort((a, b) => a.score - b.score);
}
```

**Recommendation:** Create a utility file `lib/utils/scoring.ts` with this logic

---

### 3. Time Formatting and Calculations

Already implemented in `lib/utils/time.ts` - good foundation!

Functions available:
- `formatTime(time_cs)` → "19:30.45"
- `calculatePace(time_cs, distance_meters)` → "6:15/mi"
- `formatDistance(meters)` → "5K"
- And more...

**Recommendation:** Keep using these utilities consistently

---

## Quick Wins (Easy Pages to Build)

If you want to build something quickly to show progress:

### 1. Meets List Page (90 minutes)
- Simple table query
- Basic filtering
- High visibility feature

### 2. Course Detail Page (90 minutes)
- Straightforward layout
- Reuse existing components
- Nice completion of courses section

### 3. School Seasons Page (60-90 minutes)
- Simple aggregation query
- Card-based layout (already used elsewhere)
- Connects existing pages

---

## Migration Strategy from Old Website

For each page you rebuild:

### Step 1: Reference the old page
- Find in `OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/...`
- Note the features and layout
- Identify data queries

### Step 2: Adapt to new schema
- Change `time_seconds` → `time_cs` (and divide by 100 for seconds)
- Change `current_school_id` → `school_id`
- Add `races` table joins where needed
- Use new utility functions from `lib/utils/time.ts`

### Step 3: Update styling
- Use your current Tailwind classes
- Match the zinc/cyan theme
- Ensure responsive design

### Step 4: Test with real data
- Once data is imported, verify page works
- Check edge cases (empty states, single result, etc.)

---

## Component Reusability

Create reusable components to speed up development:

### Already Exist (can reuse):
- Header/Footer (in `components/layout/`)
- Basic layout structure

### Should Create:
1. **ResultsTable** - Sortable table for race results
2. **RecordsGrid** - Grid layout for grade-level records
3. **TeamStandingsCard** - Team scoring display
4. **StatCard** - Reusable stat card component
5. **FilterSidebar** - Consistent filter UI
6. **PaginationControls** - Advanced pagination (with +/-5, +/-10)

**Location:** `manaxc-project/website/components/`

---

## Testing Plan

Once pages are built:

### 1. Functionality Testing
- [ ] All links work
- [ ] Filters apply correctly
- [ ] Sorting works on all columns
- [ ] Pagination works
- [ ] Search finds correct results
- [ ] Times display correctly (MM:SS.CC)
- [ ] PR badges show on personal records

### 2. Data Accuracy Testing
- [ ] Team scores calculate correctly
- [ ] Records show actual best times
- [ ] Grade levels calculated correctly from grad_year
- [ ] Season filtering works
- [ ] Course normalization accurate (if implemented)

### 3. Edge Cases
- [ ] Empty states (no results)
- [ ] Single result
- [ ] Incomplete teams (< 5 runners)
- [ ] Ties in results
- [ ] Missing data (NULL race_id, etc.)

### 4. Responsive Design
- [ ] Mobile (320px - 767px)
- [ ] Tablet (768px - 1023px)
- [ ] Desktop (1024px+)

### 5. Performance
- [ ] Pages load in < 2 seconds
- [ ] Large tables paginate properly
- [ ] Queries optimized (use EXPLAIN in Postgres)

---

## Estimated Timeline

### Conservative Estimate (Part-Time Work)
- **Phase 1:** Data Import - 1 hour
- **Phase 2:** Database Setup - 3 hours
- **Phase 3:** School Pages - 10 hours
- **Phase 4:** Course Pages - 6 hours
- **Phase 5:** Meet/Race Pages - 10 hours
- **Testing & Polish:** 4 hours
- **Total:** ~34 hours

**Timeline:** 2-3 weeks at 2-3 hours/day

### Aggressive Estimate (Full-Time)
- **Week 1:** Phases 1-3 (Data + DB + School Pages)
- **Week 2:** Phases 4-5 (Course + Meet Pages)
- **Week 3:** Admin tools, polish, testing
- **Total:** 3 weeks full-time

---

## Recommended Next Session Plan

### Session 1: Fix Data Import (45 min)
1. Fix graduation year bug (10 min)
2. Test import (5 min)
3. Full import (15 min)
4. Verify data (15 min)

### Session 2: Database Enhancements (2-3 hours)
1. Add xc_time_rating field
2. Create RPC functions
3. Create views
4. Test queries

### Session 3-4: Build 2-3 Priority Pages (4-6 hours)
Choose from:
- School Records
- Meets List
- Meet Detail
- Course Detail

### Session 5+: Continue Building Pages
Work through phases 3-5 systematically

---

## Success Metrics

### MVP (Minimum Viable Product)
- ✅ Data imported successfully
- ✅ School records page working
- ✅ Meet results page working
- ✅ Course detail pages working
- ✅ All times displaying correctly
- ✅ Basic search and filtering

**Goal:** Matches 80% of old website functionality

### Full Feature Parity
- ✅ All 24 pages implemented
- ✅ XC time normalization working
- ✅ Combined results working
- ✅ Admin tools functional
- ✅ Auth implemented

**Goal:** 100% feature parity + improvements

---

## Questions to Consider

Before starting, decide:

1. **XC Time Normalization:**
   - Do you want to add `xc_time_rating` to courses now?
   - Or defer combined results feature?

2. **Static vs Dynamic:**
   - Keep static export (rebuild on data changes)?
   - Or switch to SSR (requires Cloudflare Workers setup)?

3. **Priority Order:**
   - Which pages are most important to you?
   - School records? Meet results? Both?

4. **Data Sources:**
   - Only Westmont data initially?
   - Or import multiple schools at once?

5. **Timeline:**
   - Working sessions of 2-3 hours at a time?
   - Or longer focused development sessions?

---

## Conclusion

You have a **solid foundation** with:
- Working deployment pipeline
- Correct schema implementation
- Time utilities in place
- 6 core pages functional

The path forward is clear:
1. Fix data import (blocking everything)
2. Enhance database (enables advanced features)
3. Build pages systematically (school → course → meet)
4. Test and polish
5. Add admin tools

**Estimated Total Effort:** 30-40 hours to full feature parity

**My Recommendation:** Start with **Phase 1** (data import fix) immediately, then build **School Records** and **Meets List** pages as quick wins to demonstrate progress.

---

**Ready to begin? Let me know which phase you'd like to tackle first!**
