# MANA RUNNING - IMMEDIATE ACTION ITEMS

**Last Updated:** October 12, 2025

---

## ✅ COMPLETED (October 2025)

### Database Cleanup (Oct 2025)
- [x] Identified 1,328 duplicate athlete records
- [x] Merged duplicates (5,805 → 4,477 athletes)
- [x] Updated all foreign key references (results, school_transfers)
- [x] Added unique constraint: `(first_name, last_name, current_school_id, graduation_year)`
- [x] Verified data integrity (0 orphaned records)

### Supabase Auth Migration (Oct 9, 2025)
- [x] Installed @supabase/ssr package
- [x] Removed @supabase/auth-helpers-nextjs
- [x] Updated 5 files with new imports
- [x] Eliminated cookie parsing errors
- ⚠️ Minor: Multiple client instances warning (non-blocking, in tech debt)

### Scalability Architecture (Oct 10-11, 2025)
- [x] Implemented SQL function approach for school records
- [x] Eliminated hardcoded query limits
- [x] Database aggregation instead of JavaScript filtering
- [x] Individual records page deployed (`/schools/[id]/individual-records`)
  - [x] SQL functions: `get_school_xc_records`, `get_school_top10_xc`, `get_school_course_records`
  - [x] 58x performance improvement
  - [x] Supports unlimited records

### UI Improvements (Oct 2025)
- [x] Added clickable links to athlete names (all pages)
- [x] Added clickable links to school names (all pages)
- [x] ResultsTable component with client-side sorting
- [x] Podium medals (🥇🥈🥉) on top 3 finishers

---

## 🔴 CRITICAL - DO IMMEDIATELY

### 1. Fix Race Total Participants Count ⚠️ URGENT
**Priority:** CRITICAL  
**Time:** 45 minutes  
**Status:** Not started

**Issue:** The `total_participants` field on `races` table contains incorrect values.

**Step 1: Update existing races with correct counts (2 min)**
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

-- Set to 0 for races with no results
UPDATE races
SET total_participants = 0
WHERE id NOT IN (
  SELECT DISTINCT race_id 
  FROM results 
  WHERE race_id IS NOT NULL
);
```

**Verify:**
```sql
-- Should return 0 rows after fix
SELECT 
  r.id,
  r.name,
  r.total_participants as stored_count,
  (SELECT COUNT(*) FROM results WHERE race_id = r.id) as actual_count
FROM races r
WHERE r.total_participants != (SELECT COUNT(*) FROM results WHERE race_id = r.id)
LIMIT 10;
```

**Step 2: Create function to auto-update on result changes (3 min)**
```sql
-- Create function
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

-- Create trigger
DROP TRIGGER IF EXISTS update_race_participants_trigger ON results;
CREATE TRIGGER update_race_participants_trigger
AFTER INSERT OR UPDATE OR DELETE ON results
FOR EACH ROW
EXECUTE FUNCTION update_race_participants();
```

**Step 3: Test (2 min)**
```sql
-- Insert a test result
INSERT INTO results (athlete_id, race_id, meet_id, time_seconds, season_year)
VALUES ('<test-athlete-id>', '<test-race-id>', '<test-meet-id>', 900, 2025);

-- Verify count increased
SELECT total_participants FROM races WHERE id = '<test-race-id>';

-- Delete test result
DELETE FROM results WHERE athlete_id = '<test-athlete-id>' AND race_id = '<test-race-id>';

-- Verify count decreased
SELECT total_participants FROM races WHERE id = '<test-race-id>';
```

**Checklist:**
- [ ] Run UPDATE query to fix existing data
- [ ] Create trigger function
- [ ] Create trigger on results table
- [ ] Test insert/delete scenarios
- [ ] Verify 0 mismatched races

---

### 2. Prevent Future Duplicates in Application Code
**Priority:** CRITICAL  
**Time:** 30 minutes  
**Status:** Not started

**Add duplicate check before every athlete creation**

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
const { data: newAthlete } = await supabase
  .from('athletes')
  .insert({
    first_name: firstName,
    last_name: lastName,
    current_school_id: schoolId,
    graduation_year: gradYear
  })
  .select()
  .single();

return newAthlete.id;
```

**Checklist:**
- [ ] Add to meet import function
- [ ] Add to manual athlete creation form
- [ ] Add to CSV upload processor
- [ ] Add to any other athlete creation points

---

### 3. Add Database Indexes
**Priority:** HIGH  
**Time:** 5 minutes  
**Status:** Not started

**Massive performance improvement:**

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

**Verify:**
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Checklist:**
- [ ] Run index creation SQL
- [ ] Verify all indexes created
- [ ] Test query performance improvement

---

## 🟡 IMPORTANT - DO THIS WEEK

### 4. Complete Team Records Page
**Priority:** MEDIUM  
**Time:** 1-2 hours  
**Status:** Blocked

**Current Issue:** SQL function `get_school_top_team_performances` has column naming conflicts

**Solution:**
1. Fix SQL function by adding `res_` prefix to all result columns
2. Test function returns correct data
3. Create page at `/schools/[id]/team-records`
4. Deploy and test

**Current SQL Function Issue:**
```sql
-- Problem: Ambiguous column names
SELECT 
  r.id,           -- Conflict: multiple tables have 'id'
  r.time_seconds, -- Conflict: result also has time_seconds
  ...
```

**Fix:** Add prefixes to disambiguate:
```sql
SELECT 
  res.id as res_id,
  res.time_seconds as res_time_seconds,
  r.id as race_id,
  ...
```

---

### 5. Clean Up Old Records Page
**Priority:** MEDIUM  
**Time:** 5 minutes  
**Status:** Not started

**After individual and team records pages work:**

```bash
# Delete the old combined records page
rm /src/app/schools/[id]/records/page.tsx
rm -rf /src/app/schools/[id]/records/

# Update any navigation links that point to old page
```

---

### 6. Add Data Validation
**Priority:** MEDIUM  
**Time:** 1 hour  
**Status:** Not started

**Prevent bad data entry:**

```typescript
// Graduation year validation
if (gradYear < 2024 || gradYear > 2030) {
  throw new Error('Invalid graduation year');
}

// Race time validation (5K in centiseconds: 5:00 to 40:00)
// Remember: times stored in CENTISECONDS!
if (finishTime < 30000 || finishTime > 240000) {
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

---

## 🟢 NICE TO HAVE - DO THIS MONTH

### 7. Performance Optimization
- [ ] Implement React Server Components for all data fetching
- [ ] Add pagination to large result sets
- [ ] Optimize image loading with Next.js Image
- [ ] Enable Vercel Analytics
- [ ] Set up edge caching for static pages

### 8. Testing Infrastructure
- [ ] Add Vitest for unit tests
- [ ] Add Playwright for E2E tests
- [ ] Set up GitHub Actions CI/CD
- [ ] Add test coverage reporting

### 9. User Features
- [ ] Athlete dashboard (personal stats)
- [ ] Team comparison tool
- [ ] Course PR tracker
- [ ] Season progression charts
- [ ] Championship meet predictor

---

## 📋 VERIFICATION CHECKLIST

**After completing critical items, verify:**

### Database Health
```sql
-- No duplicates (should return 0)
SELECT COUNT(*) FROM (
  SELECT first_name, last_name, current_school_id, graduation_year
  FROM athletes
  GROUP BY first_name, last_name, current_school_id, graduation_year
  HAVING COUNT(*) > 1
) as dupes;

-- All indexes exist (should return 7+)
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public';

-- No orphaned results (should return 0)
SELECT COUNT(*) FROM results r
LEFT JOIN athletes a ON a.id = r.athlete_id
WHERE a.id IS NULL;

-- Race participant counts correct (should return 0)
SELECT COUNT(*) FROM races r
WHERE r.total_participants != (SELECT COUNT(*) FROM results WHERE race_id = r.id);
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

## 📄 RECURRING TASKS

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

## 🆘 QUICK TROUBLESHOOTING

### Duplicates Appearing?
1. Check constraint exists:
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints
   WHERE table_name = 'athletes' AND constraint_name = 'athletes_unique_person';
   ```
2. Verify duplicate check in code
3. Check import scripts

### Slow Queries?
1. Verify indexes exist
2. Review query in Supabase → Database → Query Performance
3. Check for .limit() usage

### Race Participant Counts Wrong?
1. Check if trigger exists
2. Run data fix SQL
3. Verify trigger firing on insert/delete

---

**Priority Guide:**
- 🔴 CRITICAL = Do today (data integrity, security)
- 🟡 IMPORTANT = Do this week (performance, UX)
- 🟢 NICE TO HAVE = Do this month (features, optimization)

**Next Review:** October 19, 2025
