# DATABASE SCHEMA CHANGELOG

**Purpose:** Track all database schema changes for Mana Running

---

## 2025-10-13

### Materialized View Documentation
**Type:** Documentation  
**Status:** Documented existing view

**Details:**
- Documented `athlete_xc_times` materialized view
- Pre-calculates best XC time per athlete
- Formula: `MIN(time_seconds × xc_time_rating)` per athlete
- Refresh command: `REFRESH MATERIALIZED VIEW athlete_xc_times;`
- Used by: School roster, top performances, all results pages

**Indexes:**
```sql
CREATE INDEX idx_athlete_xc_times_athlete ON athlete_xc_times(athlete_id);
CREATE INDEX idx_athlete_xc_times_time ON athlete_xc_times(best_xc_time);
```

---

### Planned Admin Features
**Type:** Planned additions for Phase 0  
**Status:** Not yet implemented

**admin_log table:**
```sql
CREATE TABLE admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_log_user ON admin_log(admin_user_id);
CREATE INDEX idx_admin_log_created ON admin_log(created_at DESC);
```

**SQL Functions to be created:**
- `admin_find_duplicate_results()`
- `admin_delete_result()`
- `admin_delete_race()`
- `admin_delete_meet()`
- `admin_merge_athletes()`
- `admin_find_similar_athletes()`
- `admin_analyze_course_rating()`
- `admin_suggest_course_rating()`
- `admin_update_course_rating()`
- `import_match_or_create_athlete()`
- `import_meet_results()`

See `ADMIN_FEATURES.md` for complete specifications.

---

## 2025-10-12

### UI Enhancements
**Type:** Application changes (no schema changes)  
**Status:** Complete

**Changes:**
- Added clickable links to athlete/school names
- Improved sorting on results tables
- Added podium medals for top 3

---

## 2025-10-10

### Individual Records Functions
**Type:** SQL Functions  
**Status:** Complete

**Functions created:**
```sql
-- Get school records by grade
CREATE OR REPLACE FUNCTION get_school_xc_records(...)

-- Get top 10 performances
CREATE OR REPLACE FUNCTION get_school_top10_xc(...)

-- Get course-specific records
CREATE OR REPLACE FUNCTION get_school_course_records(...)
```

**Performance:** 58x improvement over previous queries

---

## 2025-10-09

### Supabase Auth Migration
**Type:** Library update (no schema changes)  
**Status:** Complete

**Changes:**
- Migrated from `@supabase/auth-helpers-nextjs` to `@supabase/ssr`
- Updated client creation patterns
- Improved cookie handling

---

## 2025-10-08

### Database Cleanup
**Type:** Data integrity  
**Status:** Complete

**Actions taken:**
1. Identified 1,328 duplicate athlete records
2. Executed `merge_athlete_duplicates.sql` script
3. Updated all foreign key references
4. Deleted duplicate records

**Results:**
- Before: 5,805 athletes
- After: 4,477 athletes
- Duplicates removed: 1,328
- Orphaned records: 0

**Unique constraint added:**
```sql
ALTER TABLE athletes
ADD CONSTRAINT unique_athlete 
UNIQUE (first_name, last_name, current_school_id, graduation_year);
```

---

## 2025-09-15

### Materialized View Creation
**Type:** Performance optimization  
**Status:** Complete

**Created view:**
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
```

**Purpose:** Fast XC Time lookups without recalculating

**Refresh strategy:**
- After bulk imports
- After course rating updates
- Manual when needed

---

## 2025-08-20

### Initial Database Schema
**Type:** Initial creation  
**Status:** Complete

**Tables created:**
- `athletes` - Athlete profiles
- `schools` - School information
- `courses` - XC course data
- `meets` - Meet information
- `races` - Individual races
- `results` - Race results
- `school_transfers` - Transfer history
- `user_profiles` - User roles and permissions

**Key design decisions:**
1. Time stored in centiseconds (field misleadingly named `time_seconds`)
2. Results table includes denormalized `meet_id` for faster queries
3. Course ratings default to 1.0 (Crystal Springs baseline)
4. Cascade deletes for referential integrity

---

## 2025-08-01

### Database Indexes
**Type:** Performance  
**Status:** Complete

**Indexes created:**
```sql
-- Athletes
CREATE INDEX idx_athletes_school ON athletes(current_school_id);
CREATE INDEX idx_athletes_name ON athletes(last_name, first_name);
CREATE INDEX idx_athletes_grad_year ON athletes(graduation_year);

-- Results
CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_race ON results(race_id);
CREATE INDEX idx_results_meet ON results(meet_id);
CREATE INDEX idx_results_season ON results(season_year);

-- Races
CREATE INDEX idx_races_meet ON races(meet_id);
CREATE INDEX idx_races_course ON races(course_id);

-- Meets
CREATE INDEX idx_meets_date ON meets(meet_date DESC);
CREATE INDEX idx_meets_season ON meets(season_year);
```

---

## 2025-07-15

### Initial Supabase Setup
**Type:** Project initialization  
**Status:** Complete

**Actions:**
- Created Supabase project
- Enabled Row Level Security (RLS)
- Set up authentication
- Configured storage

---

## PENDING CHANGES

### Phase 0 (October-November 2025)

**admin_log table:**
- Audit trail for all admin actions
- JSONB details field for flexibility

**SQL Functions:**
- 11 new functions for admin operations
- 3 functions for import system
- See `ADMIN_FEATURES.md` for specifications

**Possible indexes:**
- Additional indexes based on query performance analysis
- TBD after Phase 0 implementation

---

## SCHEMA EVOLUTION PRINCIPLES

### Guidelines for Changes
1. **Never break existing queries** - Add, don't modify
2. **Document all changes** - Update this log immediately
3. **Test thoroughly** - Verify no data loss
4. **Backup first** - Always backup before schema changes
5. **Refresh views** - After any data changes

### Change Process
1. Document proposed change in this file
2. Write migration script
3. Test on development database
4. Backup production database
5. Execute migration
6. Verify success
7. Update documentation

---

## NOTES

### Time Storage
**CRITICAL:** The `time_seconds` field is misleadingly named. It stores **centiseconds**, not seconds.
- 15:30.00 = 93000 centiseconds
- Always divide by 100 for display
- This will NOT be changed to avoid breaking existing data

### XC Time Calculation
**Stored in materialized view:**
- Recalculated when courses or results change
- Manual refresh: `REFRESH MATERIALIZED VIEW athlete_xc_times;`
- Automatic refresh planned for future

### Foreign Keys
**All cascade properly:**
- Delete athlete → deletes results
- Delete race → deletes results
- Delete meet → deletes races and results
- Update course → preserves results

---

## QUICK REFERENCE

### Refresh Materialized View
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times;
```

### Check Schema Version
```sql
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';
```

### List All Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### List All Functions
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

**Last Updated:** October 13, 2025  
**Current Schema Version:** 1.2  
**Next Update:** Phase 0 completion (November 2025)
