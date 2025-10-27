# DATABASE SCHEMA CHANGELOG

**Last Updated:** October 12, 2025

---

## 2025-10-11
### School Records SQL Functions
- **CREATED:** `get_school_xc_records(p_school_id UUID, p_gender TEXT, p_grade INTEGER)`
  - Returns overall and by-grade XC time records for a school
  - Handles grade filtering (NULL for overall records)
  - Used by individual records page
  
- **CREATED:** `get_school_top10_xc(p_school_id UUID, p_gender TEXT, p_grade INTEGER)`
  - Returns top 10 XC performances for school/gender/grade combination
  - Ordered by time_seconds ascending
  - Includes athlete, meet, course, and race details
  
- **CREATED:** `get_school_course_records(p_school_id UUID, p_gender TEXT)`
  - Returns fastest times for each course a school has competed on
  - Groups by course and finds minimum time per course
  - Includes athlete details and grade at time of race

---

## 2025-10-09
### Supabase Auth Migration
- **APPLICATION LEVEL:** Migrated from @supabase/auth-helpers-nextjs to @supabase/ssr
  - No database schema changes
  - Updated client creation patterns in application code
  - Files affected: 5 core auth files
  - Result: Eliminated cookie parsing errors

---

## 2025-10-07
### Identified Critical Issues

#### Race Participant Counts Issue
- **IDENTIFIED ISSUE:** `races.total_participants` field contains incorrect/stale values
  - Field exists but is not automatically maintained
  - No trigger exists to update count when results are inserted/updated/deleted
  - Historical data has accumulated inconsistencies
  - **STATUS:** Not fixed yet
  - **SOLUTION:** See IMMEDIATE_ACTION_ITEMS.md #1 for complete fix
    1. Update existing data
    2. Create trigger function
    3. Create trigger on results table

#### Course-Race Relationship
- **DOCUMENTED:** Course-Race relationship structure
  - `courses.id` is primary key
  - `races.course_id` is foreign key to courses (nullable)
  - One course can have many races
  - Critical for: course PRs, difficulty ratings, performance tracking

#### Recommended Indexes
- **RECOMMENDED:** Add missing database indexes for performance
  - `idx_races_course` on `races(course_id)`
  - `idx_athletes_school_grad` on `athletes(current_school_id, graduation_year)`
  - `idx_results_athlete` on `results(athlete_id)`
  - `idx_results_race` on `results(race_id)`
  - `idx_results_meet` on `results(meet_id)`
  - `idx_meets_date` on `meets(meet_date DESC)`
  - `idx_races_meet` on `races(meet_id)`
  - **STATUS:** Not added yet
  - See IMMEDIATE_ACTION_ITEMS.md #3 for SQL

---

## 2025-10-02
### Database Cleanup & Constraints

#### Athlete Deduplication
- **UPDATED:** Merged duplicate athlete records
  - Before: 5,805 total athletes (1,328 duplicates)
  - After: 4,477 unique athletes
  - Process:
    1. Identified duplicates by (first_name, last_name, current_school_id, graduation_year)
    2. Kept oldest record (by created_at) for each unique athlete
    3. Updated all `results` table foreign keys to point to kept athlete
    4. Updated all `school_transfers` table foreign keys to point to kept athlete
    5. Deleted 1,328 duplicate athlete records
  - Result: 0 orphaned foreign keys in results or school_transfers

#### Unique Constraint Added
- **ADDED CONSTRAINT:** `athletes_unique_person`
  ```sql
  ALTER TABLE athletes 
  ADD CONSTRAINT athletes_unique_person 
  UNIQUE (first_name, last_name, current_school_id, graduation_year);
  ```
  - Prevents future athlete duplicates at database level
  - **NOTE:** Application code should still check before INSERT to avoid constraint violations

#### Meet Deletion Cascade
- **UPDATED:** Meet deletion functionality
  - Added cascading deletion of races and results when meet is deleted
  - Ensures data integrity when removing meets

#### Supabase Client Migration
- **APPLICATION LEVEL:** Migrated to @supabase/ssr for Supabase client
  - Updated: `meets/[meetId]/page.tsx`
  - Updated: `races/[raceId]/page.tsx`
  - No database schema changes

---

## CRITICAL DATA NOTES

### Time Storage Format
**⚠️ IMPORTANT:** The `results.time_seconds` field name is misleading!

- **Field name:** `time_seconds`
- **Actual storage:** **CENTISECONDS** (not seconds)
- **Example:** 15:30.00 = 93000 centiseconds (stored as 93000)
- **Conversion:** Always divide by 100 to get actual seconds for display

**Impact on queries:**
```sql
-- ❌ WRONG - treats centiseconds as seconds
SELECT time_seconds FROM results;  -- Returns 93000 for 15:30

-- ✅ CORRECT - converts to actual seconds
SELECT time_seconds / 100 as actual_seconds FROM results;  -- Returns 930.00 seconds (15:30)
```

**Historical Note:** This field name has always been misleading and would require extensive changes to rename throughout the codebase. All developer documentation now clearly states this conversion requirement.

---

## PENDING CHANGES

### High Priority
1. **Race participant counts fix**
   - Update existing data
   - Create trigger for auto-maintenance
   - Add application validation

2. **Database indexes**
   - Add 7 recommended indexes for performance
   - See IMMEDIATE_ACTION_ITEMS.md #3

3. **Application-level duplicate prevention**
   - Add checks before all athlete INSERT operations
   - Complements database constraint

### Medium Priority
1. **Team records SQL function**
   - Debug column naming conflicts in `get_school_top_team_performances`
   - Add `res_` prefix to all result columns

---

## MIGRATION HISTORY

### Applied Migrations
*(List of actual migration files would go here)*

```
migrations/
├── 20231001_initial_schema.sql
├── 20231015_add_courses.sql
├── 20231101_add_results.sql
├── 20240515_add_school_transfers.sql
└── 20251002_athlete_unique_constraint.sql
```

---

## VERIFICATION QUERIES

### Check Unique Constraint Exists
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'athletes' 
  AND constraint_name = 'athletes_unique_person';
```

### Check for Duplicate Athletes (Should Return 0)
```sql
SELECT first_name, last_name, current_school_id, graduation_year, COUNT(*)
FROM athletes
GROUP BY first_name, last_name, current_school_id, graduation_year
HAVING COUNT(*) > 1;
```

### Check for Orphaned Results (Should Return 0)
```sql
SELECT COUNT(*) 
FROM results r
LEFT JOIN athletes a ON a.id = r.athlete_id
WHERE a.id IS NULL;
```

### Check Race Participant Count Accuracy
```sql
SELECT COUNT(*)
FROM races r
WHERE r.total_participants != (
  SELECT COUNT(*) FROM results WHERE race_id = r.id
);
```

### Verify Indexes Exist
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## ROLLBACK PROCEDURES

### If Duplicate Cleanup Needs Reversal
**NOTE:** This was a one-time operation. The deleted records are not recoverable without a database backup. Always test on staging before production migrations.

### If Constraint Causes Issues
```sql
-- Remove unique constraint if needed (NOT RECOMMENDED)
ALTER TABLE athletes DROP CONSTRAINT athletes_unique_person;
```

---

## NOTES

- Always use database migrations for schema changes
- Test all migrations on staging before production
- Keep this changelog updated with every schema change
- Document reasoning for major decisions
- Include rollback procedures where applicable

---

**Maintained by:** Development Team  
**Last Schema Change:** October 11, 2025 (SQL functions)  
**Last Verified:** October 12, 2025
