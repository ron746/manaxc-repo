# MANA RUNNING - PROJECT SUMMARY

**Last Updated:** October 13, 2025

---

## PROJECT OVERVIEW

**Name:** Mana Running  
**URL:** https://mana-running.vercel.app/  
**Repository:** https://github.com/ron681/mana-running  
**Purpose:** Cross country statistics and analytics platform

**Vision:** Become the definitive XC statistics tool - like xcstats.com but with superior analytics, UX, and AI-powered insights.

---

## TECHNICAL STACK

### Frontend
- **Framework:** Next.js 14.2.5 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.4.1
- **UI Components:** shadcn/ui
- **Charts:** Recharts (when needed)

### Backend
- **Database:** PostgreSQL 15.1 (via Supabase)
- **Auth:** Supabase Auth (@supabase/ssr 0.5.1)
- **API:** Next.js API Routes

### Deployment
- **Platform:** Vercel
- **Auto-deploy:** Push to `main` branch
- **Environment:** Production + Preview

### Development Environment
- **Computer:** MacBook Air M2
- **OS:** macOS
- **Node:** v18+
- **Package Manager:** npm

---

## DATABASE ARCHITECTURE

### Core Tables

**athletes**
```sql
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  current_school_id UUID REFERENCES schools(id),
  graduation_year INT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (first_name, last_name, current_school_id, graduation_year)
);
```

**schools**
```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  city TEXT,
  state TEXT,
  division TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**courses**
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  xc_time_rating NUMERIC DEFAULT 1.0,  -- Course difficulty (Crystal Springs = 1.0)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**meets**
```sql
CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  meet_date DATE NOT NULL,
  host_school_id UUID REFERENCES schools(id),
  location TEXT,
  season_year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**races**
```sql
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID REFERENCES meets(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  name TEXT NOT NULL,
  distance TEXT DEFAULT '5K',
  gender TEXT CHECK (gender IN ('M', 'F')),
  category TEXT,  -- 'Varsity', 'Frosh/Soph', 'JV', etc.
  total_participants INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**results**
```sql
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  meet_id UUID REFERENCES meets(id),  -- Denormalized for faster queries
  time_seconds INT NOT NULL,  -- Actually CENTISECONDS! (15:30.00 = 93000)
  place_overall INT,
  season_year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**school_transfers**
```sql
CREATE TABLE school_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  from_school_id UUID REFERENCES schools(id),
  to_school_id UUID REFERENCES schools(id),
  transfer_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**user_profiles**
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**admin_log** (TODO - Phase 0)
```sql
CREATE TABLE admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Materialized View

**athlete_xc_times**
```sql
CREATE MATERIALIZED VIEW athlete_xc_times AS
SELECT 
  athlete_id,
  MIN(time_seconds * xc_time_rating) as best_xc_time
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE r.time_seconds > 0
GROUP BY athlete_id;

CREATE INDEX idx_athlete_xc_times_athlete ON athlete_xc_times(athlete_id);
CREATE INDEX idx_athlete_xc_times_time ON athlete_xc_times(best_xc_time);
```

**Refresh after data changes:**
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times;
```

### Key Indexes

```sql
-- Athlete lookups
CREATE INDEX idx_athletes_school ON athletes(current_school_id);
CREATE INDEX idx_athletes_name ON athletes(last_name, first_name);
CREATE INDEX idx_athletes_grad_year ON athletes(graduation_year);

-- Result queries
CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_race ON results(race_id);
CREATE INDEX idx_results_meet ON results(meet_id);
CREATE INDEX idx_results_season ON results(season_year);

-- Race queries
CREATE INDEX idx_races_meet ON races(meet_id);
CREATE INDEX idx_races_course ON races(course_id);

-- Meet queries
CREATE INDEX idx_meets_date ON meets(meet_date DESC);
CREATE INDEX idx_meets_season ON meets(season_year);
```

---

## CRITICAL TECHNICAL DETAILS

### ⚠️ Time Storage in CENTISECONDS

**THE MOST IMPORTANT THING TO REMEMBER:**
- Database field name: `time_seconds` (MISLEADING NAME!)
- Actual storage: **CENTISECONDS**, not seconds
- 15:30.00 → 93000 centiseconds (NOT 930 seconds)
- Formula: `(minutes × 60 × 100) + (seconds × 100) + centiseconds`

**Always divide by 100 to display:**
```typescript
function formatTime(centiseconds: number): string {
  const totalSeconds = centiseconds / 100
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0')
  return `${minutes}:${seconds}`
}
```

### XC Time Calculation

**XC Time = Normalized performance across all courses**

**Formula:**
```
XC Time = time_seconds × course.xc_time_rating
```

**How it works:**
- Crystal Springs (baseline): rating = 1.0
- Easier courses: rating < 1.0 (e.g., 0.95)
- Harder courses: rating > 1.0 (e.g., 1.05)

**Example:**
- 15:30.00 at Crystal Springs (rating 1.0) = 93000 × 1.0 = 93000 XC Time
- 15:30.00 at easier course (rating 0.95) = 93000 × 0.95 = 88350 XC Time
- 15:30.00 at harder course (rating 1.05) = 93000 × 1.05 = 97650 XC Time

**Stored in materialized view:**
```sql
SELECT athlete_id, MIN(time_seconds * xc_time_rating) as best_xc_time
FROM results...
```

**Refresh after bulk imports:**
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times;
```

### Supabase Client Setup

**Browser Client:**
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Server Client:**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
}
```

---

## RECENT COMPLETED WORK

### October 13, 2025
**XC Time Calculation Fixed**
- Implemented proper XC Time calculation across all pages
- Formula: `time_seconds × xc_time_rating` from `athlete_xc_times` view
- Fixed school roster to show best XC times correctly
- Removed hardcoded 1000-row limits

**1000-Row Limit Resolution**
- Identified Supabase default 1000-row limit
- Implemented pagination loops to fetch ALL records
- Created SQL functions for efficient data retrieval
- School roster now handles unlimited athletes

### October 12, 2025
**UI Enhancements**
- Added clickable links to athlete names (all pages)
- Added clickable links to school names (all pages)
- ResultsTable component with client-side sorting
- Podium medals (🥇🥈🥉) on top 3 finishers

### October 2025
**Database Cleanup**
- Removed 1,328 duplicate athlete records (5,805 → 4,477)
- Added unique constraint on athletes table
- Updated all foreign key references
- Zero orphaned records

### October 9, 2025
**Supabase Auth Migration**
- Migrated from @supabase/auth-helpers-nextjs to @supabase/ssr
- Updated all client/server configurations
- Eliminated cookie parsing errors

### October 10-11, 2025
**School Records Pages**
- Individual Records page deployed
- SQL functions for records queries
- 58x performance improvement
- Supports unlimited records

---

## CURRENT PRIORITIES

### Phase 0: Foundation (October-November 2025)
1. **Import Meet Results** (6h) - Bulk upload system
2. **Find Duplicate Results** (2h) - Data integrity
3. **Safe Delete Functions** (3h) - Cleanup tools
4. **Merge Athletes** (4h) - Combine duplicates
5. **Course Rating Test** (8h) - AI validation

### Phase 1: User Views (December 2025)
1. **Top Performances** (2h) - Rename records page
2. **Course Records** (4h) - Per-course top times
3. **Team Records** (3h) - Best varsity/FS performances
4. **Seasons** (6h) - Year-by-year stats
5. **All Results** (3h) - Complete athlete listing

### Phase 2: Advanced Features (2026)
- Predictive race times
- Team optimization tools
- Championship projections
- Training insights
- National expansion

---

## KEY FILE LOCATIONS

```
/app/
  schools/[id]/
    page.tsx                    # School roster with XC times
    individual-records/         # Individual records (working)
    team-records/               # Team records (TODO)
    seasons/                    # Seasons page (TODO)
    all-results/                # All results (TODO)
    top-performances/           # Rename from records (TODO)
  courses/[id]/
    records/                    # Course records (TODO)
  admin/                        # Admin tools (TODO - all 6)
    duplicate-results/
    delete/
    merge-athletes/
    course-ratings/
    update-course-rating/
    import-meet/
  api/
    admin/                      # Admin API endpoints
  
/components/
  ResultsTable.tsx              # Sortable results table
  ui/                           # shadcn/ui components
  
/lib/
  supabase/
    client.ts                   # Browser Supabase client
    server.ts                   # Server Supabase client
  utils/
    time-format.ts              # Time formatting utilities
```

---

## DATABASE SCALE

**Current:**
- 4,477 unique athletes
- ~10,000 results
- 50+ schools
- 30+ courses
- 100+ meets

**Target:**
- 100,000+ athletes
- 1,000,000+ results
- 500+ schools
- 200+ courses
- 5,000+ meets

**Design Philosophy:**
- Built for 1M+ records from day one
- Materialized views for performance
- Efficient indexes on all queries
- Pagination for large result sets

---

## COMMON QUERIES

### Get School Roster with XC Times
```sql
SELECT 
  a.id,
  a.first_name || ' ' || a.last_name as name,
  a.graduation_year,
  a.gender,
  axt.best_xc_time,
  COUNT(DISTINCT r.id) as total_races
FROM athletes a
LEFT JOIN athlete_xc_times axt ON axt.athlete_id = a.id
LEFT JOIN results r ON r.athlete_id = a.id
WHERE a.current_school_id = :school_id
GROUP BY a.id, a.first_name, a.last_name, a.graduation_year, a.gender, axt.best_xc_time
ORDER BY axt.best_xc_time ASC;
```

### Get Meet Results
```sql
SELECT 
  r.place_overall,
  a.first_name || ' ' || a.last_name as athlete_name,
  s.name as school_name,
  r.time_seconds,
  (12 - (a.graduation_year - EXTRACT(YEAR FROM m.meet_date)))::INT as grade
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN schools s ON s.id = a.current_school_id
JOIN races ra ON ra.id = r.race_id
JOIN meets m ON m.id = ra.meet_id
WHERE ra.id = :race_id
ORDER BY r.place_overall ASC;
```

### Find Duplicate Results
```sql
SELECT 
  athlete_id,
  race_id,
  COUNT(*) as count,
  ARRAY_AGG(id) as result_ids
FROM results
GROUP BY athlete_id, race_id
HAVING COUNT(*) > 1;
```

---

## TESTING CHECKLIST

**Before Every Deployment:**
- [ ] All pages load without errors
- [ ] Times display correctly (MM:SS.CC format)
- [ ] Links work (athlete pages, school pages)
- [ ] Sorting works on tables
- [ ] Filters work as expected
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Performance < 2s per page

---

## DEPLOYMENT PROCESS

```bash
# 1. Test locally
npm run dev

# 2. Build test
npm run build

# 3. Commit changes
git add .
git commit -m "feat: description of changes"

# 4. Push to GitHub (auto-deploys to Vercel)
git push origin main

# 5. Verify deployment
# Check https://mana-running.vercel.app/
```

---

## TROUBLESHOOTING

### "Can't see XC times"
- Check `athlete_xc_times` materialized view exists
- Run: `REFRESH MATERIALIZED VIEW athlete_xc_times;`
- Verify course ratings are set correctly

### "1000 row limit"
- Use pagination loops in queries
- Example in PROJECT_CONTEXT.md
- Don't rely on single query for large datasets

### "Times showing wrong"
- Remember: stored in CENTISECONDS!
- Always divide by 100 before display
- Use `formatTime()` utility function

### "Duplicate results"
- Use Find Duplicate Results admin tool
- Check import logic for athlete matching
- Verify unique constraints on tables

---

## DOCUMENTATION STRUCTURE

**For day-to-day work:**
1. PROJECT_CONTEXT.md - Start here
2. IMMEDIATE_ACTION_ITEMS.md - Your task list
3. QUICK_REFERENCE.md - Daily commands

**For feature development:**
4. ADMIN_FEATURES.md - Admin tool specs
5. USER_VIEW_ENHANCEMENTS.md - User view specs
6. This file - Technical deep dive

**For planning:**
7. MANA_RUNNING_ROADMAP.md - Long-term vision
8. NEW_STRATEGIC_DIRECTION.md - Why Phase 0 first

---

**Last Updated:** October 13, 2025  
**Status:** Active Development - Phase 0  
**Next Milestone:** Import system complete
