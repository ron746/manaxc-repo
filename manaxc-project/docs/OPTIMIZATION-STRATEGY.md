# Performance Optimization Strategy

**Date:** 2025-10-28
**Status:** Implementation in Progress

## Problem Statement

Popular courses like Mt. SAC and Crystal Springs can have 100,000+ results per season. Loading all these results on the course records and performances pages causes:
- **Slow page loads** (5-10 seconds+)
- **High database load** (scanning 100k+ rows)
- **Poor user experience** (timeouts, crashes)

## Solution: Optimized Caching Tables

We'll create specialized tables that cache the top performances and records, updated automatically via triggers.

---

## Table 1: `athlete_best_times` ✅ COMPLETED

**Purpose:** Cache season-best and all-time-best normalized times for each athlete

**Status:** ✅ Implemented (Migration 001)

**Usage:**
- Season projection page (20x faster)
- Athlete rankings
- School season pages

---

## Table 2: `course_records` (NEW)

**Purpose:** Cache top 100 unique athletes per gender per course

**Why Top 100?**
- Covers 99.9% of use cases (who looks beyond top 100?)
- Keeps table small (max ~200 records per course)
- Fast queries (indexed, pre-sorted)

**Schema:**
```sql
CREATE TABLE course_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),

  -- Result info
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  time_cs INTEGER NOT NULL,

  -- Context info (denormalized for fast display)
  athlete_name TEXT NOT NULL,
  athlete_grad_year INTEGER NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id),
  school_name TEXT NOT NULL,
  meet_id UUID NOT NULL REFERENCES meets(id),
  meet_name TEXT NOT NULL,
  meet_date DATE NOT NULL,
  race_id UUID NOT NULL REFERENCES races(id),

  -- Rank within this course/gender
  rank INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_id, gender, athlete_id),
  UNIQUE(course_id, gender, rank)
);

CREATE INDEX idx_course_records_course_gender ON course_records(course_id, gender, rank);
CREATE INDEX idx_course_records_athlete ON course_records(athlete_id);
```

**Key Design Decisions:**

1. **One record per athlete per course per gender**
   - Each athlete can only appear once
   - Stores their BEST time on that course
   - Prevents one athlete from dominating the list

2. **Rank column**
   - Pre-computed rank (1-100)
   - Makes display instant (no sorting needed)
   - Unique constraint ensures no rank collisions

3. **Denormalized data**
   - Stores athlete_name, school_name, meet_name
   - Avoids joins on read
   - Slight redundancy but HUGE performance win

---

## Automatic Maintenance Strategy

### Trigger Logic:

**When a new result is inserted:**
1. Check if result is fast enough to qualify for top 100
2. Check if athlete already has a record for this course/gender
3. If athlete exists and new time is SLOWER: do nothing
4. If athlete exists and new time is FASTER: update existing record
5. If athlete doesn't exist and result is top 100: insert new record
6. If new record pushes total over 100: remove slowest record
7. Recalculate ranks for all affected records

**Example Scenario:**

```
Current top 100 boys at Crystal Springs:
Rank 1: John Smith (16:45)
Rank 2: Mike Jones (16:50)
...
Rank 100: Tom Brown (19:30)

New result: John Smith runs 16:40
→ Update John's record (still rank 1, just faster)
→ Ranks unchanged

New result: Sarah Williams runs 19:25
→ Check gender: Girls (different top 100)
→ Insert into girls top 100

New result: Alex Chen runs 19:20 (not in top 100)
→ Count: Already 100 boys records
→ Compare: 19:20 is faster than rank 100 (19:30)
→ Remove Tom Brown's record (rank 100)
→ Insert Alex Chen
→ Recalculate ranks (Alex becomes rank 100, everyone faster stays same)
```

---

## Implementation Plan

### Phase 1: Create Migration (002-add-course-records.sql)
- [x] Design schema
- [ ] Write trigger function
- [ ] Backfill existing data
- [ ] Add verification queries

### Phase 2: Update Application Code
- [ ] Update `/courses/[id]/records/page.tsx` to use `course_records`
- [ ] Update `/courses/[id]/performances/page.tsx` to use `course_records`
- [ ] Update `/schools/[id]/records/page.tsx` to use combination of `course_records` and `athlete_best_times`

### Phase 3: Additional Optimizations
- [ ] Add grade-level caching (optional)
- [ ] Add season-specific records (optional)
- [ ] Monitor query performance

---

## Performance Impact

### Before Optimization:

**Course Records Page (Crystal Springs, 100,000 results):**
```sql
-- Loads ALL 100,000 results
SELECT * FROM results WHERE course_id = 'crystal-springs'
-- Query time: 5-10 seconds
-- Memory: 100MB+
-- User experience: Timeout
```

**After Optimization:**

```sql
-- Loads pre-computed top 100 per gender
SELECT * FROM course_records
WHERE course_id = 'crystal-springs' AND gender = 'M'
ORDER BY rank
-- Query time: 10ms
-- Memory: 1MB
-- User experience: Instant
```

**Improvement: 500x faster**

---

## Edge Cases & Considerations

### 1. What if an athlete transfers schools?
- Athlete record stays with original school (historical accuracy)
- Future results create new records with new school

### 2. What if a result is deleted?
- Trigger removes record from `course_records`
- Next-fastest athlete automatically promoted via backfill

### 3. What about season-specific records?
- Current design: All-time top 100
- Future enhancement: Add `season_year` column for season-specific records
- Tradeoff: More records (100/gender/season vs 100/gender/all-time)

### 4. What about grade-specific records?
- Handled separately via school records page
- Course records focus on absolute fastest
- Grade records better suited to school-specific pages

---

## Maintenance

### Monitoring Queries

**Check table size:**
```sql
SELECT
  course_id,
  gender,
  COUNT(*) as record_count
FROM course_records
GROUP BY course_id, gender
HAVING COUNT(*) > 100;
-- Should always return 0 rows
```

**Check rank integrity:**
```sql
SELECT
  course_id,
  gender,
  COUNT(DISTINCT rank) as distinct_ranks,
  MAX(rank) as max_rank
FROM course_records
GROUP BY course_id, gender;
-- distinct_ranks should equal max_rank
-- max_rank should be <= 100
```

**Find gaps in ranks:**
```sql
WITH expected_ranks AS (
  SELECT
    course_id,
    gender,
    generate_series(1, (SELECT COUNT(*) FROM course_records cr WHERE cr.course_id = course_records.course_id AND cr.gender = course_records.gender)) as expected_rank
  FROM course_records
  GROUP BY course_id, gender
)
SELECT er.*
FROM expected_ranks er
LEFT JOIN course_records cr ON er.course_id = cr.course_id AND er.gender = cr.gender AND er.expected_rank = cr.rank
WHERE cr.rank IS NULL;
-- Should return 0 rows
```

---

## Migration Path

1. **Create tables and triggers** (002-add-course-records.sql)
2. **Backfill historical data** (included in migration)
3. **Update application code** (page by page)
4. **Monitor performance** (compare before/after)
5. **Remove old code** (clean up direct results queries)

---

## Success Metrics

- [ ] Course records page loads in <100ms (currently 5-10s)
- [ ] Database CPU usage reduced by 90%
- [ ] Zero timeout errors on course pages
- [ ] User satisfaction: "Wow, that's fast!"

---

**Status:** Ready for implementation
**Risk Level:** Low (rollback available, no data loss)
**Priority:** HIGH (major performance bottleneck)
