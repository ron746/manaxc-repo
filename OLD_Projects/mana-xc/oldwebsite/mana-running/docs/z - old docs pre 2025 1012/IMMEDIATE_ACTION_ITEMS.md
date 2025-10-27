# MANA RUNNING - IMMEDIATE ACTION ITEMS

## ✅ COMPLETED (October 2025)

### Database Cleanup
- [x] Identified 1,328 duplicate athlete records
- [x] Merged duplicates (5,805 → 4,477 athletes)
- [x] Updated all foreign key references (results, school_transfers)
- [x] Added unique constraint: `(first_name, last_name, current_school_id, graduation_year)`
- [x] Verified data integrity (0 orphaned records)

### Scalability Architecture (October 10, 2025)
- [x] Implemented SQL function approach for school records
- [x] Eliminated hardcoded query limits
- [x] Database aggregation instead of JavaScript filtering
- [x] System now supports 1M+ results with same performance

---

## 🔴 CRITICAL - DO IMMEDIATELY

### 1. Fix Race Total Participants Count
**Priority:** CRITICAL  
**Time:** 45 minutes

**Issue:** The `total_participants` field on `races` table contains incorrect values. This field should be calculated from actual results count.

**Solution:**

**Step 1: Update existing races with correct counts**
```sql
-- Run in Supabase SQL Editor
UPDATE races r
SET total_participants = (
  SELECT COUNT(*)
  FROM results res
  WHERE res.race_id = r.id
)
WHERE r.id IN (
  SELECT DISTINCT race_id 
  FROM results 
  WHERE race_id IS NOT NULL
);

-- Verify the update
SELECT 
  r.id,
  r.name,
  r.total_participants as stored_count,
  (SELECT COUNT(*) FROM results WHERE race_id = r.id) as actual_count
FROM races r
WHERE r.total_participants != (SELECT COUNT(*) FROM results WHERE race_id = r.id)
LIMIT 10;
```

**Step 2: Create function to auto-update on result changes**
```sql
-- Create function to update participant count
CREATE OR REPLACE FUNCTION update_race_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE races
  SET total_participants = (
    SELECT COUNT(*)
    FROM results
    WHERE race_id = COALESCE(NEW.race_id, OLD.race_id)
  )
  WHERE id = COALESCE(NEW.race_id, OLD.race_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on results table
DROP TRIGGER IF EXISTS update_race_participants_trigger ON results;
CREATE TRIGGER update_race_participants_trigger
AFTER INSERT OR UPDATE OR DELETE ON results
FOR EACH ROW
EXECUTE FUNCTION update_race_participants();
```

**Step 3: Add validation to application code**

File: `/src/lib/crud-operations.ts` (or wherever results are created)

```typescript
// After inserting results, verify count matches
const { data: race } = await supabase
  .from('races')
  .select('total_participants')
  .eq('id', raceId)
  .single();

const { count: actualCount } = await supabase
  .from('results')
  .select('*', { count: 'exact', head: true })
  .eq('race_id', raceId);

if (race?.total_participants !== actualCount) {
  console.error(`Mismatch: Race ${raceId} has ${race?.total_participants} stored but ${actualCount} actual results`);
}
```

**Verification Checklist:**
- [ ] Run UPDATE query to fix existing counts
- [ ] Create trigger function and trigger
- [ ] Test: Add a result, verify total_participants increments
- [ ] Test: Delete a result, verify total_participants decrements
- [ ] Add validation logging to application code

---

### 2. Prevent Future Duplicates in Application Code
**Priority:** CRITICAL  
**Time:** 30 minutes

Add duplicate check before every athlete creation:

**Files to Update:**
- Any import/upload scripts
- Admin athlete creation forms
- API endpoints that create athletes
- Meet result processors

**Code to Add:**
```typescript
// Before inserting athlete
const { data: existing } = await supabase
  .from('athletes')
  .select('id')
  .eq('first_name', firstName)
  .eq('last_name', lastName)
  .eq('current_school_id', schoolId)
  .eq('graduation_year', gradYear)
  .single();

if (existing) {
  return existing.id; // Use existing
}

// Create new only if not found
```

---

### 2. Prevent Future Duplicates in Application Code
**Priority:** CRITICAL  
**Time:** 30 minutes

Add duplicate check before every athlete creation:

**Files to Update:**
- Any import/upload scripts
- Admin athlete creation forms
- API endpoints that create athletes
- Meet result processors

**Code to Add:**
```typescript
// Before inserting athlete
const { data: existing } = await supabase
  .from('athletes')
  .select('id')
  .eq('first_name', firstName)
  .eq('last_name', lastName)
  .eq('current_school_id', schoolId)
  .eq('graduation_year', gradYear)
  .single();

if (existing) {
  return existing.id; // Use existing
}

// Create new only if not found
```

**Where to add this:**
- [ ] Meet import function
- [ ] Manual athlete creation form
- [ ] CSV upload processor
- [ ] Any other athlete creation points

### 3. Add Database Indexes
**Priority:** HIGH  
**Time:** 5 minutes

Massive performance improvement with these indexes:

```sql
-- Run in Supabase SQL Editor

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

**Action:**
- [ ] Copy SQL above
- [ ] Run in Supabase Dashboard → SQL Editor
- [ ] Verify with: `\di` to list indexes


## 🟡 IMPORTANT - DO THIS WEEK

### 5. Add Data Validation
**Priority:** MEDIUM  
**Time:** 1 hour

Prevent bad data entry:

```typescript
// Graduation year validation
if (gradYear < 2024 || gradYear > 2030) {
  throw new Error('Invalid graduation year');
}

// Race time validation (5K in seconds: 5:00 to 40:00)
if (finishTime < 300 || finishTime > 2400) {
  throw new Error('Invalid finish time');
}

// Meet date validation
if (meetDate > new Date()) {
  throw new Error('Meet date cannot be in future');
}
```

**Add to:**
- [ ] Athlete creation forms
- [ ] Result upload processing
- [ ] Meet creation forms
- [ ] API validation middleware

### 6. Update Project Documentation
**Priority:** MEDIUM  
**Time:** 15 minutes

- [ ] Add `README.md` to root of GitHub repo
- [ ] Add `MANA_RUNNING_PROJECT_SUMMARY.md` to repo `/docs` folder
- [ ] Update `.env.example` with all required variables
- [ ] Add `/docs` folder structure:
  ```
  docs/
  ├── MANA_RUNNING_PROJECT_SUMMARY.md
  ├── DATABASE_SCHEMA.md
  ├── API_DOCUMENTATION.md
  └── DEPLOYMENT_GUIDE.md
  ```

### 7. Set Up Error Monitoring
**Priority:** MEDIUM  
**Time:** 30 minutes

Add Sentry or similar:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Configure in `sentry.client.config.ts`:
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

---

## 🟢 NICE TO HAVE - DO THIS MONTH

### 8. Performance Optimization
- [ ] Implement React Server Components for data fetching
- [ ] Add pagination to large result sets
- [ ] Optimize image loading with Next.js Image
- [ ] Enable Vercel Analytics
- [ ] Set up edge caching for static pages

### 9. Testing Infrastructure
- [ ] Add Vitest for unit tests
- [ ] Add Playwright for E2E tests
- [ ] Set up GitHub Actions CI/CD
- [ ] Add test coverage reporting

### 10. User Features
- [ ] Athlete dashboard (personal stats)
- [ ] Team comparison tool
- [ ] Course PR tracker
- [ ] Season progression charts
- [ ] Championship meet predictor

---

## 📋 VERIFICATION CHECKLIST

After completing critical items, verify:

### Database Health
```sql
-- No duplicates (should return 0)
SELECT COUNT(*) FROM (
  SELECT first_name, last_name, current_school_id, graduation_year
  FROM athletes
  GROUP BY first_name, last_name, current_school_id, graduation_year
  HAVING COUNT(*) > 1
) as dupes;

-- All indexes exist (should return 6+)
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public';

-- No orphaned results (should return 0)
SELECT COUNT(*) FROM results r
LEFT JOIN athletes a ON a.id = r.athlete_id
WHERE a.id IS NULL;
```

### Application Health
- [ ] All pages load without errors
- [ ] Authentication works (login/logout)
- [ ] Data displays correctly
- [ ] Forms validate input
- [ ] No console errors in browser
- [ ] Mobile responsive design works

### Performance
- [ ] Page load < 2 seconds
- [ ] Query execution < 500ms
- [ ] Lighthouse score > 90
- [ ] No memory leaks (check DevTools)

---

## 🔄 RECURRING TASKS

### Daily
- Check Vercel deployment status
- Review error logs in Supabase
- Monitor database size

### Weekly
- Review new athlete additions for duplicates
- Check query performance
- Update documentation if needed

### Monthly
- Database backup verification
- Security updates (`npm audit fix`)
- Performance review
- Feature planning

---

## 📞 QUICK CONTACTS

### When Things Break
1. **Deployment Issues:** Check Vercel Dashboard
2. **Database Issues:** Check Supabase Dashboard → Logs
3. **Auth Issues:** Verify environment variables
4. **Performance Issues:** Check database indexes exist

### Useful Commands
```bash
# Check for duplicates
npm run check-duplicates

# Run migrations
supabase db push

# Deploy to production
git push origin main  # Auto-deploys

# Check logs
vercel logs [deployment-url]
```

---

**Priority Guide:**
- 🔴 CRITICAL = Do today (data integrity, security)
- 🟡 IMPORTANT = Do this week (performance, UX)
- 🟢 NICE TO HAVE = Do this month (features, optimization)

**Next Review:** 1 week from today


UPDATED 10/11/25
## School Records Pages Separation (Priority: HIGH)

### Current Issue
- School records page has scalability issues (1000 record limit)
- Mixed JavaScript filtering with SQL functions causing conflicts
- Single page trying to handle both individual and team records

### Solution: Split into Two Pages

#### 1. Individual Records Page (COMPLETED SQL Functions)
**New Location:** `/schools/[id]/individual-records`
**Status:** Ready to implement
**Features:**
- ✅ Overall XC Records (by grade) - uses `get_school_xc_records` SQL function
- ✅ Top 10 Performances - uses `get_school_top10_xc` SQL function  
- ✅ Course-specific records (by grade) - uses `get_school_course_records` SQL function
**Performance:** 58x faster than old approach, no record limits
**Files:** New page.tsx at `/src/app/schools/[id]/individual-records/page.tsx`

#### 2. Team Records Page (NEW - TO BE BUILT)
**New Location:** `/schools/[id]/team-records`
**Status:** Not started
**Features:**
- Top 10 team performances (5-person times)
- By course and overall
- Team scoring analysis
**Performance:** Will need SQL function similar to `get_school_top_team_performances` (needs debugging)
**Files:** New page.tsx at `/src/app/schools/[id]/team-records/page.tsx`

### Implementation Steps
1. ✅ Create SQL functions (3 of 4 complete)
2. ⏳ Create `/src/app/schools/[id]/individual-records/page.tsx` (uses SQL functions)
3. ⏳ Update navigation link in `/src/app/schools/[id]/page.tsx`
4. ⏳ Test individual records page
5. ⏳ Deploy to production
6. 🔜 Create team records SQL function (debug column naming issues)
7. 🔜 Create `/src/app/schools/[id]/team-records/page.tsx`
8. 🔜 Delete old `/src/app/schools/[id]/records/page.tsx`

### Technical Notes
- SQL functions are 58x faster than JavaScript filtering
- Functions handle unlimited records
- Current roadblock: Local dev cache issues, deploy directly to production
- Team records function has column naming conflicts (needs prefix like `res_` on all columns)


## School Records Pages - Split Implementation

### Issue
- Current `/records` page has 1484 lines of mixed old/new code
- Still using JavaScript filtering (1000 record limit)
- SQL functions created but not being used due to cache conflicts

### Solution: Clean Break - Two Separate Pages

**Page 1: Individual Records** (Priority: HIGH - Do Now)
- Path: `/schools/[id]/individual-records`
- Uses 3 SQL functions (already working in database):
  - `get_school_xc_records` - Overall + by grade
  - `get_school_top10_xc` - Top 10 performances
  - `get_school_course_records` - Course-specific records
- Status: Ready to deploy (600 lines, clean code)

**Page 2: Team Records** (Priority: LOW - Do Later)
- Path: `/schools/[id]/team-records`
- Keep using JavaScript for now (can optimize later)
- Needs SQL function debugging (column naming conflicts)

### Next Session Steps
1. Create `/src/app/schools/[id]/individual-records/page.tsx`
2. Update navigation in `/src/app/schools/[id]/page.tsx`
3. Deploy directly to production (skip local dev cache issues)
4. Test on https://mana-running.vercel.app
5. Delete old `/records` folder after confirming new page works

## ✅ COMPLETED (October 2025)

### Supabase Auth Migration (October 9, 2025)
- [x] Migrated from @supabase/auth-helpers-nextjs to @supabase/ssr
- [x] Updated client and server Supabase configurations
- [x] Eliminated cookie parsing errors
- ⚠️ Note: Multiple client instances warning documented in tech debt

### School Records Pages Separation (October 11, 2025)
- [x] SQL functions created (get_school_xc_records, etc.)
- [ ] Individual records page deployment (in progress)


### Supabase Auth Migration (October 9, 2025)
- [x] Installed @supabase/ssr package
- [x] Removed @supabase/auth-helpers-nextjs
- [x] Updated 5 files with new imports
- [x] Eliminated cookie parsing errors
- ⚠️ Minor: Multiple client instances warning (non-blocking, in tech debt)

