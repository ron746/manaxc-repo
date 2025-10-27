# MANA RUNNING - PROJECT SUMMARY & DEVELOPER GUIDE

**Last Updated:** October 12, 2025

---

## 🎯 PROJECT OVERVIEW

**Mana Running** is a production cross country statistics platform designed to become the definitive XC tool - like xcstats.com but with superior analytics and user experience.

**Live URL:** https://mana-running.vercel.app/  
**GitHub Repository:** github.com/ron681/mana-running (main branch)

### Target Users
1. **Coaches:** Team analysis, varsity selection, performance tracking, championship planning
2. **Athletes:** Personal progress tracking, course PRs, season goals
3. **Fans:** Meet results, school comparisons, historical data

---

## ⚠️ CRITICAL TECHNICAL DETAILS

### Time Storage Format
**CRITICAL:** Times are stored in **CENTISECONDS**, not seconds!

- **Database field name:** `time_seconds` (misleading - actually stores centiseconds)
- **Example:** 15:30.00 = 93000 centiseconds (not 930 seconds)
- **Formula:** `(minutes * 60 * 100) + (seconds * 100) + centiseconds`
- **Display conversion:** Always divide by 100 to get actual seconds

**Code Examples:**
```typescript
// ❌ WRONG - treating as seconds
const displayTime = formatTime(time_seconds); // Will show incorrect time

// ✅ CORRECT - convert from centiseconds to seconds
const actualSeconds = time_seconds / 100;
const displayTime = formatTime(actualSeconds);

// For calculations
const minutes = Math.floor(time_seconds / 6000);  // 6000 centiseconds = 1 minute
const seconds = (time_seconds % 6000) / 100;       // Remaining centiseconds to seconds
```

### Development Environment
- **Computer:** MacBook Air M2
- **OS:** macOS
- **Node Version:** 18.17+ (check with `node --version`)
- **Package Manager:** npm

---

## 🗂️ TECHNICAL ARCHITECTURE

### Core Stack
- **Frontend:** Next.js 14.2.5 with TypeScript, React Server Components
- **Backend:** Supabase (PostgreSQL 15.1) with real-time features
- **Styling:** Tailwind CSS 3.4.1 with shadcn/ui components
- **Deployment:** Vercel with automatic GitHub integration
- **Authentication:** Supabase Auth (@supabase/ssr 0.5.1)

### Database Structure (Key Tables)
- `athletes` - Athlete records with unique constraint
- `schools` - High school/team data
- `courses` - Cross country courses with ratings and difficulty
- `meets` - Meet/competition information
- `races` - Individual race events within meets (FK to meets, courses)
- `results` - Performance results (FK to athletes, races, meets)
  - **CRITICAL:** `time_seconds` field stores CENTISECONDS
- `school_transfers` - Athlete school transfer history (FK to athletes)

### Critical Relationships
```
courses (id) <--FK-- races (course_id)
meets (id) <--FK-- races (meet_id)
races (id) <--FK-- results (race_id)
athletes (id) <--FK-- results (athlete_id)
schools (id) <--FK-- athletes (current_school_id)
```

### Critical Constraints
```sql
-- Prevents duplicate athletes
ALTER TABLE athletes 
ADD CONSTRAINT athletes_unique_person 
UNIQUE (first_name, last_name, current_school_id, graduation_year);
```

---

## 📊 DATABASE SCALABILITY REQUIREMENTS

### Design Philosophy
**Build for 1,000,000+ records from day one**

- **Never fetch-and-filter** - Use database aggregation and SQL functions
- **No arbitrary limits** - Queries must work regardless of dataset size
- **Server-side processing** - Heavy computations happen in PostgreSQL, not JavaScript
- **Indexed queries** - All common queries must use proper database indexes

**Current scale:** 4,477 athletes, ~10,000+ results  
**Target scale:** 100,000+ athletes, 1,000,000+ results

### Database Query Best Practices (CRITICAL)

**Rule 1: Use SQL Functions for Aggregations**
```sql
-- ✅ CORRECT: Database does the work
SELECT * FROM get_school_xc_record('school-id', 'M', NULL);
-- Returns 1 row with the fastest XC time

-- ❌ WRONG: Fetching all data to JavaScript
SELECT * FROM results WHERE school_id = '...' LIMIT 10000;
-- Returns 10,000 rows, then filters in JavaScript
```

**Rule 2: Never Use Hard Limits**
```typescript
// ❌ WRONG: Will break at scale
.limit(1000)  // Breaks when >1000 results exist

// ✅ CORRECT: Use SQL aggregation
.rpc('get_top_performances', { school_id: '...', limit: 10 })
// Only returns the top 10, regardless of total rows
```

**Rule 3: Index All Common Query Patterns**
Every query in production should use an index. See IMMEDIATE_ACTION_ITEMS.md for required indexes.

**Rule 4: Pagination for Lists**
```typescript
// ✅ CORRECT: Paginate large lists
.range(startIndex, endIndex)

// ❌ WRONG: Fetch everything
.select('*')  // No limit at all
```

**Rule 5: Profile Before Deploying**
Use `EXPLAIN ANALYZE` in Supabase SQL Editor to verify query performance before deploying.

---

## ✅ RECENT COMPLETED WORK (October 2025)

### Supabase Auth Migration (Oct 9, 2025)
**Status:** ✅ Complete

- Migrated from deprecated @supabase/auth-helpers-nextjs to @supabase/ssr
- Updated all client/server Supabase configurations
- Eliminated cookie parsing errors
- Files updated: 5 core authentication files
- ⚠️ Minor: Multiple client instances warning (non-blocking, documented in tech debt)

### Database Cleanup (Oct 2025)
**Status:** ✅ Complete

**Problem:** Massive athlete duplication in database
- Aaron Soni: 32 duplicate records
- Adrian Ketterer: 23 duplicate records
- Total: 5,805 athletes (1,328 were duplicates)

**Solution Implemented:**
- Result: 5,805 → 4,477 unique athletes
- SQL Script: `/merge_athlete_duplicates.sql` (already executed)
- Added unique constraint to prevent future duplicates
- Updated all foreign key references in results and school_transfers tables
- Verified: 0 orphaned records remaining

**Unique Constraint:**
```sql
UNIQUE (first_name, last_name, current_school_id, graduation_year)
```

### School Records Pages Scalability (Oct 10-11, 2025)
**Status:** ✅ Individual records complete, 🟡 Team records in progress

**Individual Records Page:**
- ✅ Deployed at `/schools/[id]/individual-records`
- ✅ SQL functions created and working:
  - `get_school_xc_records` - Overall + by grade records
  - `get_school_top10_xc` - Top 10 performances
  - `get_school_course_records` - Course-specific records
- ✅ Performance: 58x faster than old approach
- ✅ Supports unlimited records (no arbitrary limits)

**Team Records Page:**
- 🟡 In progress at `/schools/[id]/team-records`
- 🔴 Blocked: SQL function has column naming conflicts
- 🔴 Needs: Add `res_` prefix to all result columns in function

### UI Improvements (Oct 2025)
**Status:** ✅ Complete

- ✅ Added clickable links to athlete names across all pages
- ✅ Added clickable links to school names across all pages
- ✅ ResultsTable component with client-side sorting
- ✅ Podium medals (🥇🥈🥉) on top 3 finishers
- ✅ Sort indicators (↑/↓) on sortable columns

---

## ⚠️ KNOWN ISSUES & PENDING FIXES

### 1. Race Total Participants Count (CRITICAL)
**Status:** Identified October 2025  
**Priority:** 🔴 Critical

**Issue:** The `total_participants` field on `races` table contains incorrect/stale values.

**Impact:**
- Race statistics show wrong participant counts
- Course performance metrics may be inaccurate
- Team scoring calculations could be affected

**Root Cause:**
- No trigger to auto-update `total_participants` when results change
- Manual imports may not update this field
- Historical data has accumulated inconsistencies

**Solution:** See IMMEDIATE_ACTION_ITEMS.md #1 for complete fix (3-step process: update data, create trigger, test)

**Quick Verification:**
```sql
-- Find races with count mismatches
SELECT 
  r.id, r.name,
  r.total_participants as stored,
  (SELECT COUNT(*) FROM results WHERE race_id = r.id) as actual
FROM races r
WHERE r.total_participants != (SELECT COUNT(*) FROM results WHERE race_id = r.id)
LIMIT 10;
```

### 2. Duplicate Athletes in Application Code
**Status:** Database protected, application code not  
**Priority:** 🔴 Critical

**Current State:**
- ✅ Database has unique constraint (prevents duplicates at DB level)
- ❌ Application code doesn't check before inserting (relies on DB constraint)
- ❌ This causes constraint violation errors instead of graceful handling

**Needed:**
Add duplicate check before ALL athlete creation points:
- Meet import functions
- Admin athlete creation forms
- CSV upload processors
- Any API endpoints that create athletes

**Code Template:**
```typescript
// Check before inserting
const { data: existing } = await supabase
  .from('athletes')
  .select('id')
  .eq('first_name', firstName)
  .eq('last_name', lastName)
  .eq('current_school_id', schoolId)
  .eq('graduation_year', gradYear)
  .single();

if (existing) {
  return existing.id; // Use existing athlete
}
// Only create if doesn't exist
```

### 3. Missing Database Indexes
**Status:** Identified October 2025  
**Priority:** 🔴 High

**Impact:** Slow queries on large datasets

**Required Indexes:**
```sql
-- Speed up athlete lookups
CREATE INDEX IF NOT EXISTS idx_athletes_school_grad 
ON athletes(current_school_id, graduation_year);

-- Speed up results queries
CREATE INDEX IF NOT EXISTS idx_results_athlete ON results(athlete_id);
CREATE INDEX IF NOT EXISTS idx_results_race ON results(race_id);
CREATE INDEX IF NOT EXISTS idx_results_meet ON results(meet_id);

-- Speed up meet searches
CREATE INDEX IF NOT EXISTS idx_meets_date ON meets(meet_date DESC);

-- Speed up race queries
CREATE INDEX IF NOT EXISTS idx_races_meet ON races(meet_id);
CREATE INDEX IF NOT EXISTS idx_races_course ON races(course_id);
```

---

## 🚨 DEVELOPER COMMUNICATION STYLE (CRITICAL)

### User Expectations - NO EXCEPTIONS
- ❌ **NO praise or flattery** ("That's a great question", "Excellent idea")
- ✅ **Direct, actionable solutions immediately**
- ✅ **Step-by-step detailed instructions with exact file paths**
- ✅ **Technical accuracy over diplomatic language**
- ✅ **Performance-first mindset**
- ✅ **Complete code - NO placeholders or "..." ellipsis**
- ✅ **Beginner-friendly instructions - user has less experience**
- ✅ **Skip pleasantries, get straight to implementation**

### Response Format
1. State the solution immediately
2. Provide exact file paths
3. Include complete code
4. Add verification steps
5. No unnecessary explanations

---

## 📁 PROJECT STRUCTURE

```
mana-running/
├── app/                    # Next.js 14 app directory
│   ├── (auth)/            # Auth-related pages
│   ├── (dashboard)/       # Main app pages
│   ├── schools/[id]/      # School pages
│   │   ├── page.tsx                         # School overview
│   │   ├── individual-records/page.tsx      # ✅ NEW - Individual records
│   │   ├── team-records/page.tsx            # 🟡 IN PROGRESS - Team records
│   │   └── records/page.tsx                 # ❌ OLD - Delete after new pages work
│   ├── courses/[id]/      # Course pages
│   ├── meets/[meetId]/    # Meet pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── custom/            # Custom components
│   └── ResultsTable.tsx   # ✅ Sortable results table (client component)
├── lib/
│   ├── supabase/          # Supabase clients
│   │   ├── client.ts      # Browser client (@supabase/ssr)
│   │   └── server.ts      # Server client (@supabase/ssr)
│   ├── utils/             # Utility functions
│   │   └── timeConverter.ts  # CRITICAL: Handles centiseconds conversion
│   └── types/             # TypeScript types
├── public/                # Static assets
└── supabase/
    ├── migrations/        # Database migrations
    └── seed.sql           # Seed data
```

---

## 🚀 DEPLOYMENT

### Automatic Deployment
- **Trigger:** Push to `main` branch
- **Platform:** Vercel
- **URL:** https://mana-running.vercel.app/
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### Environment Variables (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 📝 COMMON QUERIES

### Find Athletes by School
```sql
SELECT a.*, s.name as school_name
FROM athletes a
JOIN schools s ON s.id = a.current_school_id
WHERE s.name ILIKE '%Westmont%'
ORDER BY a.last_name, a.first_name;
```

### Get Athlete's Race Results (Remember: CENTISECONDS!)
```sql
SELECT 
  r.time_seconds / 100 as actual_seconds,  -- Convert from centiseconds!
  r.place_overall,
  m.name as meet_name,
  m.meet_date,
  ra.distance,
  ra.gender
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN meets m ON m.id = r.meet_id
WHERE r.athlete_id = '<athlete-id>'
ORDER BY m.meet_date DESC;
```

### Team Performance Analysis (CENTISECONDS!)
```sql
SELECT 
  a.first_name,
  a.last_name,
  AVG(r.time_seconds) / 100 as avg_seconds,  -- Convert from centiseconds!
  COUNT(r.id) as race_count,
  MIN(r.time_seconds) / 100 as pr_seconds    -- Convert from centiseconds!
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
WHERE a.current_school_id = '<school-id>'
  AND ra.distance = '5K'
  AND ra.gender = 'M'
GROUP BY a.id, a.first_name, a.last_name
ORDER BY avg_seconds ASC
LIMIT 7;  -- Top 7 for varsity
```

---

## 🛠 TROUBLESHOOTING

### Duplicate Athletes Appearing Again
**Check:**
1. Is unique constraint active?
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints
   WHERE table_name = 'athletes' AND constraint_name = 'athletes_unique_person';
   ```
2. Are you running duplicate checks before INSERT?
3. Check import scripts for duplicate creation logic

### Performance Issues
**Quick Fixes:**
1. Check if indexes exist (see Missing Database Indexes section)
2. Review slow queries in Supabase Dashboard → Database → Query Performance
3. Consider pagination for large result sets
4. Use React Server Components for data fetching

### Times Displaying Incorrectly
**CRITICAL CHECK:**
1. Are you dividing `time_seconds` by 100 before formatting?
2. Check `formatTime()` function - should expect seconds, not centiseconds
3. Verify conversion happening at query level or in code

**Example Fix:**
```typescript
// ❌ WRONG
const displayTime = formatTime(result.time_seconds);  // Shows 93000:00.00

// ✅ CORRECT
const displayTime = formatTime(result.time_seconds / 100);  // Shows 15:30.00
```

### Authentication Errors
**Common Issues:**
1. Using old @supabase/auth-helpers-nextjs (deprecated - use @supabase/ssr)
2. Missing environment variables
3. Incorrect redirect URLs in Supabase Dashboard

---

## 📈 ROADMAP & NEXT STEPS

### Immediate (Week 1-2)
- [ ] Fix race participant counts (CRITICAL)
- [ ] Add database indexes (HIGH)
- [ ] Implement athlete duplicate check in all creation flows (CRITICAL)
- [ ] Complete team records page
- [ ] Add data validation on form inputs

### Short-term (Month 1)
- [ ] Build team comparison dashboard
- [ ] Add course PR tracking feature
- [ ] Create varsity selection tool
- [ ] Implement season progression charts

### Medium-term (Quarter 1)
- [ ] Advanced analytics (pace analysis, splits)
- [ ] Championship meet predictor
- [ ] Mobile app (React Native)
- [ ] Coach collaboration tools

### Long-term (Year 1)
- [ ] Historical data import (past 10 years)
- [ ] Machine learning performance predictions
- [ ] Integration with timing systems
- [ ] National rankings database

---

## 📚 DOCUMENTATION LINKS

### External Resources
- **Next.js 14:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **shadcn/ui:** https://ui.shadcn.com/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Vercel Deployment:** https://vercel.com/docs

### Internal Documentation
- **PROJECT_CONTEXT.md** - Quick reference for new conversations
- **IMMEDIATE_ACTION_ITEMS.md** - Current priorities
- **QUICK_REFERENCE.md** - Daily commands and queries
- **DATABASE_SCALABILITY.md** - Performance best practices
- **MANA_RUNNING_ROADMAP.md** - Feature planning

---

## 🔍 ACCESS & CREDENTIALS

### Repositories
- **GitHub:** https://github.com/ron681/mana-running
- **Branch:** main (auto-deploys to production)

### Services
- **Vercel Project:** mana-running.vercel.app
- **Supabase Project:** [Your Supabase project URL]

---

## ⚡ QUICK REFERENCE

### Useful Commands
```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run lint            # Run ESLint

# Database
supabase start          # Start local Supabase
supabase db reset       # Reset local DB
supabase db push        # Push migrations to remote

# Deployment
git push origin main    # Auto-deploy to production
vercel --prod           # Manual deploy
vercel env pull         # Pull environment variables
```

### Important File Paths
```
/app/schools/[id]/individual-records/page.tsx    # NEW individual records
/app/schools/[id]/team-records/page.tsx          # Team records (in progress)
/components/ResultsTable.tsx                      # Sortable results table
/lib/supabase/client.ts                           # Browser Supabase client
/lib/supabase/server.ts                           # Server Supabase client
/lib/utils/timeConverter.ts                       # CRITICAL: Time conversion
```

---

## 📊 SUCCESS METRICS

### Current Status (October 12, 2025)
- ✅ 4,477 unique athletes in database
- ✅ Duplicate prevention system active (database level)
- ✅ Supabase auth migrated to @supabase/ssr
- ✅ Individual records page deployed and working
- ✅ Production deployment stable
- 🔴 Race participant counts need fixing
- 🔴 Application-level duplicate prevention pending
- 🔴 Database indexes pending

### Target Metrics (6 months)
- 10,000+ athletes
- 100+ schools
- <500ms average page load
- 99.9% uptime
- 50+ active coaches using platform

---

**Last Updated:** October 12, 2025  
**Version:** 2.0  
**Status:** Production (Active Development)
