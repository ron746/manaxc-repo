# USER VIEW ENHANCEMENTS - DETAILED SPECIFICATIONS

**Last Updated:** October 13, 2025

---

## OVERVIEW

These 5 enhancements improve the user experience for coaches, athletes, and fans by providing better data visualization and analysis tools.

**All features are PUBLIC** (visible to all users, not admin-only)

---

## ENHANCEMENT 1: TOP PERFORMANCES PAGE

### Purpose
Rename and simplify "School Records" page to show top performances without course selection complexity.

### Current Issues
- Page called "Records" but shows performances across all courses
- Course selection dropdown confusing (XC Times already normalize for difficulty)
- Mixed individual and team data

### Solution
Rename to "Top Performances" and remove course filtering.

### Priority
**HIGH** - Quick win, improves UX immediately

### Time Estimate
2 hours

### URL
**Current:** `/schools/[id]/individual-records`  
**New:** `/schools/[id]/top-performances`

### User Interface

```
┌─ WESTMONT HIGH SCHOOL ──────────────────────────────────────┠
│ Top Performances
│
│ Tabs: [Top Performances] [Course Records] [Team Records] ...
│
│ ┌─ Filters ────────────────────────────────────────────────┠│
│ │ Gender: [All â–¼] [Boys] [Girls]                          ││
│ │ Grade: [All â–¼] [9th] [10th] [11th] [12th]              ││
│ │ Season: [All Time â–¼] [2024] [2023] [2022]              ││
│ └─────────────────────────────────────────────────────────┘│
│
│ ┌─ BOYS TOP 10 XC TIMES ──────────────────────────────────┠│
│ │                                                           ││
│ │ 1. 14:23.45 - John Smith (12th) - Crystal Springs        ││
│ │    Oct 15, 2024 • WCAL Championships                     ││
│ │                                                           ││
│ │ 2. 14:35.12 - Mike Johnson (11th) - Toro Park            ││
│ │    Sep 20, 2024 • Earlybird Invitational                 ││
│ │    ...                                                    ││
│ └─────────────────────────────────────────────────────────┘│
│
│ ┌─ GIRLS TOP 10 XC TIMES ─────────────────────────────────┠│
│ │ 1. 16:45.23 - Jane Doe (12th) - Hayward HS               ││
│ │    ...                                                    ││
│ └─────────────────────────────────────────────────────────┘│
│
│ ┌─ BY GRADE LEVEL ────────────────────────────────────────┠│
│ │ Freshman Record: 15:45.12 - Bob Lee (9th)                ││
│ │ Sophomore Record: 15:12.34 - Sam Chen (10th)             ││
│ │ Junior Record: 14:50.23 - Alex Kim (11th)                ││
│ │ Senior Record: 14:23.45 - John Smith (12th)              ││
│ └─────────────────────────────────────────────────────────┘│
```

### Data Structure

```typescript
interface TopPerformance {
  rank: number
  xc_time: number  // Best XC time (normalized)
  athlete_id: string
  athlete_name: string
  grade: number
  course_name: string
  meet_name: string
  meet_date: string
  raw_time: number  // Actual time run
}
```

### SQL Query

```sql
-- Top 10 performances for a school/gender
SELECT 
  ROW_NUMBER() OVER (ORDER BY axt.best_xc_time ASC) as rank,
  axt.best_xc_time as xc_time,
  a.id as athlete_id,
  a.first_name || ' ' || a.last_name as athlete_name,
  -- Calculate grade at time of best performance
  (SELECT 
    12 - (a.graduation_year - EXTRACT(YEAR FROM m.meet_date))
   FROM results r2
   JOIN races ra2 ON ra2.id = r2.race_id
   JOIN meets m ON m.id = ra2.meet_id
   WHERE r2.athlete_id = a.id
     AND r2.time_seconds * c2.xc_time_rating = axt.best_xc_time
   LIMIT 1
  ) as grade,
  -- Get course/meet details for best performance
  (SELECT c.name
   FROM results r2
   JOIN races ra2 ON ra2.id = r2.race_id
   JOIN courses c ON c.id = ra2.course_id
   WHERE r2.athlete_id = a.id
     AND r2.time_seconds * c.xc_time_rating = axt.best_xc_time
   LIMIT 1
  ) as course_name,
  (SELECT m.name
   FROM results r2
   JOIN races ra2 ON ra2.id = r2.race_id
   JOIN meets m ON m.id = ra2.meet_id
   WHERE r2.athlete_id = a.id
     AND r2.time_seconds * c.xc_time_rating = axt.best_xc_time
   LIMIT 1
  ) as meet_name,
  (SELECT m.meet_date
   FROM results r2
   JOIN races ra2 ON ra2.id = r2.race_id
   JOIN meets m ON m.id = ra2.meet_id
   WHERE r2.athlete_id = a.id
     AND r2.time_seconds * c.xc_time_rating = axt.best_xc_time
   LIMIT 1
  ) as meet_date,
  -- Get raw time
  (SELECT r2.time_seconds
   FROM results r2
   JOIN races ra2 ON ra2.id = r2.race_id
   JOIN courses c ON c.id = ra2.course_id
   WHERE r2.athlete_id = a.id
     AND r2.time_seconds * c.xc_time_rating = axt.best_xc_time
   LIMIT 1
  ) as raw_time
FROM athlete_xc_times axt
JOIN athletes a ON a.id = axt.athlete_id
WHERE a.current_school_id = :school_id
  AND a.gender = :gender
ORDER BY axt.best_xc_time ASC
LIMIT 10;
```

### Implementation Steps

1. Create new route: `/app/schools/[id]/top-performances/page.tsx`
2. Copy logic from individual-records page
3. Remove course selection UI
4. Update SQL queries
5. Add season filtering
6. Update navigation/breadcrumbs
7. Test with various schools
8. Delete old `/individual-records` route

---

## ENHANCEMENT 2: COURSE RECORDS PAGE

### Purpose
Show top performances for a specific course, organized by gender and grade.

### Priority
**HIGH** - Highly requested by coaches

### Time Estimate
4 hours

### URL
`/courses/[id]/records`

### User Interface

```
┌─ CRYSTAL SPRINGS COURSE ────────────────────────────────────┠
│ Course Records
│
│ Course: [Crystal Springs â–¼]  (dropdown to switch courses)
│ Rating: 1.000 (Baseline)
│ Location: Belmont, CA
│
│ ┌─────────────────────────────────────────────────────────┠│
│ │  BOYS RECORDS                 GIRLS RECORDS             ││
│ │ ─────────────────────────────────────────────────────── ││
│ │  Overall:                     Overall:                  ││
│ │  14:23.45                     16:45.23                  ││
│ │  John Smith (Westmont '25)    Jane Doe (Mitty '24)     ││
│ │  WCAL Championships 2024      CCS Finals 2024          ││
│ │                                                         ││
│ │  Freshman (9th):              Freshman (9th):          ││
│ │  15:45.12                     18:12.34                  ││
│ │  Bob Lee (Bellarmine '28)     Sue Chen (Presentation '28)││
│ │  Earlybird Invitational '24   Earlybird Invitational '24││
│ │                                                         ││
│ │  Sophomore (10th):            Sophomore (10th):        ││
│ │  15:12.34                     17:45.67                  ││
│ │  Sam Kim (St. Francis '27)    Amy Wong (Notre Dame '27) ││
│ │  WCAL #3 2024                 WCAL #3 2024             ││
│ │                                                         ││
│ │  Junior (11th):               Junior (11th):           ││
│ │  14:50.23                     17:12.45                  ││
│ │  Alex Martinez (Mitty '26)    Lisa Park (Westmont '26)  ││
│ │  Mt. SAC Invitational '24     Mt. SAC Invitational '24  ││
│ │                                                         ││
│ │  Senior (12th):               Senior (12th):           ││
│ │  14:23.45                     16:45.23                  ││
│ │  John Smith (Westmont '25)    Jane Doe (Mitty '24)     ││
│ │  WCAL Championships 2024      CCS Finals 2024          ││
│ └─────────────────────────────────────────────────────────┘│
```

### Data Structure

```typescript
interface CourseRecord {
  gender: 'M' | 'F'
  grade: number | null  // null = overall
  time_seconds: number
  athlete_id: string
  athlete_name: string
  school_name: string
  graduation_year: number
  meet_name: string
  meet_date: string
}

interface CourseRecordsData {
  course_id: string
  course_name: string
  course_rating: number
  boys_records: CourseRecord[]  // [overall, 9th, 10th, 11th, 12th]
  girls_records: CourseRecord[]  // [overall, 9th, 10th, 11th, 12th]
}
```

### SQL Function

```sql
CREATE OR REPLACE FUNCTION get_course_records(
  p_course_id UUID,
  p_gender TEXT,
  p_grade INT  -- NULL for overall
) RETURNS TABLE (
  athlete_id UUID,
  athlete_name TEXT,
  school_name TEXT,
  graduation_year INT,
  time_seconds INT,
  meet_name TEXT,
  meet_date DATE,
  grade_at_time INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as athlete_id,
    a.first_name || ' ' || a.last_name as athlete_name,
    s.name as school_name,
    a.graduation_year,
    r.time_seconds,
    m.name as meet_name,
    m.meet_date,
    (12 - (a.graduation_year - EXTRACT(YEAR FROM m.meet_date)))::INT as grade_at_time
  FROM results r
  JOIN athletes a ON a.id = r.athlete_id
  JOIN schools s ON s.id = a.current_school_id
  JOIN races ra ON ra.id = r.race_id
  JOIN meets m ON m.id = ra.meet_id
  WHERE ra.course_id = p_course_id
    AND ra.gender = p_gender
    AND r.time_seconds > 0
    -- Filter by grade if specified
    AND (p_grade IS NULL OR (12 - (a.graduation_year - EXTRACT(YEAR FROM m.meet_date))) = p_grade)
  ORDER BY r.time_seconds ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### Implementation Steps

1. Create route: `/app/courses/[id]/records/page.tsx`
2. Create SQL function for fetching records
3. Build two-column layout (Boys | Girls)
4. Add course selection dropdown
5. Fetch and display all 10 records (5 per gender)
6. Add links to athlete/school pages
7. Format dates nicely
8. Add loading states
9. Test with multiple courses

---

## ENHANCEMENT 3: TEAM RECORDS PAGE

### Purpose
Show best team performances (top 5 athletes on same day) for varsity and frosh/soph.

### Priority
**MEDIUM** - Requested by coaches for championship prep

### Time Estimate
3 hours

### URL
`/schools/[id]/team-records`

### User Interface

```
┌─ WESTMONT HIGH SCHOOL ──────────────────────────────────────┠
│ Team Records
│
│ Course Filter: [All Courses â–¼] [Crystal Springs] [Toro Park] ...
│
│ ┌─ BOYS VARSITY ──────────────────────────────────────────┠│
│ │                                                           ││
│ │ Best Team Time: 1:15:23.45                                ││
│ │ WCAL Championships • Oct 15, 2024 • Crystal Springs      ││
│ │                                                           ││
│ │ 1. John Smith     14:23.45 (5th overall)                  ││
│ │ 2. Mike Johnson   14:35.12 (8th overall)                  ││
│ │ 3. Alex Kim       15:12.34 (15th overall)                 ││
│ │ 4. Sam Chen       15:30.23 (22nd overall)                 ││
│ │ 5. Bob Lee        15:42.31 (28th overall)                 ││
│ │                                                           ││
│ │ Average: 15:04.69 • Team Score: 78 points                 ││
│ └─────────────────────────────────────────────────────────┘│
│
│ ┌─ BOYS FROSH/SOPH ───────────────────────────────────────┠│
│ │ Best Team Time: 1:22:15.67                                ││
│ │ Earlybird Invitational • Sep 20, 2024 • Toro Park        ││
│ │ ...                                                       ││
│ └─────────────────────────────────────────────────────────┘│
│
│ ┌─ GIRLS VARSITY ─────────────────────────────────────────┠│
│ │ Best Team Time: 1:28:45.12                                ││
│ │ CCS Finals • Nov 5, 2024 • Crystal Springs               ││
│ │ ...                                                       ││
│ └─────────────────────────────────────────────────────────┘│
│
│ ┌─ GIRLS FROSH/SOPH ──────────────────────────────────────┠│
│ │ Best Team Time: 1:35:23.45                                ││
│ │ WCAL #2 • Sep 15, 2024 • Hayward HS                      ││
│ │ ...                                                       ││
│ └─────────────────────────────────────────────────────────┘│
```

### Data Structure

```typescript
interface TeamPerformance {
  meet_id: string
  meet_name: string
  meet_date: string
  course_name: string
  total_time: number  // Sum of top 5
  average_time: number  // Average of top 5
  team_score: number  // Sum of top 5 places
  runners: Array<{
    athlete_id: string
    athlete_name: string
    time_seconds: number
    place_overall: number
  }>
}

interface TeamRecords {
  boys_varsity: TeamPerformance
  boys_frosh_soph: TeamPerformance
  girls_varsity: TeamPerformance
  girls_frosh_soph: TeamPerformance
}
```

### SQL Function

```sql
CREATE OR REPLACE FUNCTION get_best_team_performance(
  p_school_id UUID,
  p_gender TEXT,
  p_category TEXT,  -- 'Varsity' or 'Frosh/Soph'
  p_course_id UUID DEFAULT NULL  -- Optional course filter
) RETURNS TABLE (
  meet_id UUID,
  meet_name TEXT,
  meet_date DATE,
  race_id UUID,
  race_name TEXT,
  course_id UUID,
  course_name TEXT,
  total_time BIGINT,
  average_time NUMERIC,
  team_score INT,
  runner_1_id UUID,
  runner_1_name TEXT,
  runner_1_time INT,
  runner_1_place INT,
  runner_2_id UUID,
  runner_2_name TEXT,
  runner_2_time INT,
  runner_2_place INT,
  runner_3_id UUID,
  runner_3_name TEXT,
  runner_3_time INT,
  runner_3_place INT,
  runner_4_id UUID,
  runner_4_name TEXT,
  runner_4_time INT,
  runner_4_place INT,
  runner_5_id UUID,
  runner_5_name TEXT,
  runner_5_time INT,
  runner_5_place INT
) AS $$
BEGIN
  RETURN QUERY
  WITH race_results AS (
    -- Get all results for this school/gender
    SELECT 
      r.race_id,
      ra.meet_id,
      m.name as meet_name,
      m.meet_date,
      ra.name as race_name,
      ra.course_id,
      c.name as course_name,
      r.athlete_id,
      a.first_name || ' ' || a.last_name as athlete_name,
      r.time_seconds,
      r.place_overall,
      -- Determine if athlete qualifies for category
      CASE 
        WHEN p_category = 'Varsity' THEN TRUE
        WHEN p_category = 'Frosh/Soph' AND 
             (12 - (a.graduation_year - EXTRACT(YEAR FROM m.meet_date))) <= 10 THEN TRUE
        ELSE FALSE
      END as qualifies
    FROM results r
    JOIN athletes a ON a.id = r.athlete_id
    JOIN races ra ON ra.id = r.race_id
    JOIN meets m ON m.id = ra.meet_id
    JOIN courses c ON c.id = ra.course_id
    WHERE a.current_school_id = p_school_id
      AND ra.gender = p_gender
      AND r.time_seconds > 0
      -- Optional course filter
      AND (p_course_id IS NULL OR ra.course_id = p_course_id)
  ),
  top_5_per_race AS (
    -- Get top 5 for each race
    SELECT 
      race_id,
      meet_id,
      meet_name,
      meet_date,
      race_name,
      course_id,
      course_name,
      ARRAY_AGG(
        ROW(athlete_id, athlete_name, time_seconds, place_overall)::team_runner
        ORDER BY time_seconds ASC
      ) FILTER (WHERE qualifies) as runners,
      SUM(time_seconds) FILTER (WHERE qualifies) as total_time,
      SUM(place_overall) FILTER (WHERE qualifies) as team_score,
      COUNT(*) FILTER (WHERE qualifies) as runner_count
    FROM race_results
    GROUP BY race_id, meet_id, meet_name, meet_date, race_name, course_id, course_name
    HAVING COUNT(*) FILTER (WHERE qualifies) >= 5
  )
  SELECT 
    t.meet_id,
    t.meet_name,
    t.meet_date,
    t.race_id,
    t.race_name,
    t.course_id,
    t.course_name,
    t.total_time,
    (t.total_time::NUMERIC / 5) as average_time,
    t.team_score,
    -- Extract top 5 runners
    (t.runners[1]).athlete_id,
    (t.runners[1]).athlete_name,
    (t.runners[1]).time_seconds,
    (t.runners[1]).place_overall,
    (t.runners[2]).athlete_id,
    (t.runners[2]).athlete_name,
    (t.runners[2]).time_seconds,
    (t.runners[2]).place_overall,
    (t.runners[3]).athlete_id,
    (t.runners[3]).athlete_name,
    (t.runners[3]).time_seconds,
    (t.runners[3]).place_overall,
    (t.runners[4]).athlete_id,
    (t.runners[4]).athlete_name,
    (t.runners[4]).time_seconds,
    (t.runners[4]).place_overall,
    (t.runners[5]).athlete_id,
    (t.runners[5]).athlete_name,
    (t.runners[5]).time_seconds,
    (t.runners[5]).place_overall
  FROM top_5_per_race t
  ORDER BY t.total_time ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create custom type for runner data
CREATE TYPE team_runner AS (
  athlete_id UUID,
  athlete_name TEXT,
  time_seconds INT,
  place_overall INT
);
```

### Implementation Steps

1. Create route: `/app/schools/[id]/team-records/page.tsx`
2. Create SQL function for best team performance
3. Create custom type for runner data
4. Fetch all 4 records (Boys V/FS, Girls V/FS)
5. Build 4-section layout
6. Add course filter dropdown (optional)
7. Format times and scores
8. Add links to athletes/meets
9. Test with various schools

---

## ENHANCEMENT 4: SEASONS PAGE

### Purpose
List all seasons and show detailed athlete statistics for selected season with year-over-year improvement tracking.

### Priority
**MEDIUM** - Valuable for coaches tracking athlete development

### Time Estimate
6 hours

### URL
`/schools/[id]/seasons`

### User Interface

**Step 1: Season List**
```
┌─ WESTMONT HIGH SCHOOL ──────────────────────────────────────┠
│ Seasons
│
│ ┌─────────────────────────────────────────────────────────┠│
│ │ Season        Athletes    Meets    Top XC Time         ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ 2024          45          12       14:23.45 (Smith)    ││
│ │ 2023          42          11       14:45.12 (Johnson)  ││
│ │ 2022          38          10       15:02.34 (Lee)      ││
│ │ 2021          35          9        15:15.67 (Chen)     ││
│ └─────────────────────────────────────────────────────────┘│
```

**Step 2: Season Detail View**
```
┌─ WESTMONT HIGH SCHOOL - 2024 SEASON ────────────────────────┠
│
│ Filters: [All Genders â–¼] [All Grades â–¼]
│
│ Sort: [XC Time â–¼] [Improvement] [Name] [Grade] [Total Races]
│
│ ┌───────────────────────────────────────────────────────────────────┠│
│ │ Rank│Name         │Gr│XC Time│Avg Top 3│Last 3 Races  │Improve│  ││
│ ├─────┼─────────────┼──┼───────┼─────────┼──────────────┼───────┤  ││
│ │ 1   │John Smith   │12│14:23.4│14:35.12 │14:50,14:45,  │+5.2%  │  ││
│ │     │             │  │       │         │14:23         │       │  ││
│ ├─────┼─────────────┼──┼───────┼─────────┼──────────────┼───────┤  ││
│ │ 2   │Mike Johnson │11│14:35.1│14:48.23 │15:02,14:55,  │+8.1%  │  ││
│ │     │             │  │       │         │14:35         │       │  ││
│ ├─────┼─────────────┼──┼───────┼─────────┼──────────────┼───────┤  ││
│ │ 3   │Alex Kim     │11│15:12.3│15:25.45 │15:45,15:30,  │+3.4%  │  ││
│ │     │             │  │       │         │15:12         │       │  ││
│ └───────────────────────────────────────────────────────────────────┘│
│
│ Column Details:
│ • XC Time: Best XC time for this season
│ • Avg Top 3: Average of top 3 performances
│ • Last 3: Most recent 3 race times (chronological)
│ • Improve: % improvement from previous season's best XC time
```

### Data Structure

```typescript
interface SeasonSummary {
  year: number
  athlete_count: number
  meet_count: number
  best_xc_time: number
  best_athlete_name: string
}

interface AthleteSeasonStats {
  athlete_id: string
  athlete_name: string
  grade: number
  gender: string
  xc_time_pr: number  // Best XC time this season
  avg_top_3: number  // Average of top 3 performances
  last_3_races: number[]  // [most_recent, second, third]
  last_3_dates: string[]  // Dates of last 3 races
  total_races: number
  improvement_percent: number | null  // % vs prior season (null if no prior)
  prior_season_pr: number | null
}
```

### SQL Functions

```sql
-- Get all seasons for a school
CREATE OR REPLACE FUNCTION get_school_seasons(p_school_id UUID)
RETURNS TABLE (
  season_year INT,
  athlete_count BIGINT,
  meet_count BIGINT,
  best_xc_time NUMERIC,
  best_athlete_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH season_data AS (
    SELECT DISTINCT
      m.season_year,
      COUNT(DISTINCT r.athlete_id) as athletes,
      COUNT(DISTINCT m.id) as meets
    FROM results r
    JOIN athletes a ON a.id = r.athlete_id
    JOIN races ra ON ra.id = r.race_id
    JOIN meets m ON m.id = ra.meet_id
    WHERE a.current_school_id = p_school_id
    GROUP BY m.season_year
  ),
  best_times AS (
    SELECT 
      m.season_year,
      MIN(r.time_seconds * c.xc_time_rating) as best_time,
      (SELECT a2.first_name || ' ' || a2.last_name
       FROM results r2
       JOIN athletes a2 ON a2.id = r2.athlete_id
       JOIN races ra2 ON ra2.id = r2.race_id
       JOIN courses c2 ON c2.id = ra2.course_id
       JOIN meets m2 ON m2.id = ra2.meet_id
       WHERE a2.current_school_id = p_school_id
         AND m2.season_year = m.season_year
         AND r2.time_seconds * c2.xc_time_rating = MIN(r.time_seconds * c.xc_time_rating)
       LIMIT 1
      ) as athlete_name
    FROM results r
    JOIN athletes a ON a.id = r.athlete_id
    JOIN races ra ON ra.id = r.race_id
    JOIN courses c ON c.id = ra.course_id
    JOIN meets m ON m.id = ra.meet_id
    WHERE a.current_school_id = p_school_id
    GROUP BY m.season_year
  )
  SELECT 
    sd.season_year,
    sd.athletes,
    sd.meets,
    bt.best_time,
    bt.athlete_name
  FROM season_data sd
  JOIN best_times bt ON bt.season_year = sd.season_year
  ORDER BY sd.season_year DESC;
END;
$$ LANGUAGE plpgsql;

-- Get athlete stats for a specific season
CREATE OR REPLACE FUNCTION get_season_athlete_stats(
  p_school_id UUID,
  p_season_year INT,
  p_gender TEXT DEFAULT NULL,
  p_grade INT DEFAULT NULL
) RETURNS TABLE (
  athlete_id UUID,
  athlete_name TEXT,
  grade INT,
  gender TEXT,
  xc_time_pr NUMERIC,
  avg_top_3 NUMERIC,
  last_3_races INT[],
  last_3_dates DATE[],
  total_races BIGINT,
  improvement_percent NUMERIC,
  prior_season_pr NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH athlete_results AS (
    SELECT 
      a.id,
      a.first_name || ' ' || a.last_name as name,
      (12 - (a.graduation_year - p_season_year)) as grade,
      a.gender,
      r.time_seconds * c.xc_time_rating as xc_time,
      m.meet_date
    FROM results r
    JOIN athletes a ON a.id = r.athlete_id
    JOIN races ra ON ra.id = r.race_id
    JOIN courses c ON c.id = ra.course_id
    JOIN meets m ON m.id = ra.meet_id
    WHERE a.current_school_id = p_school_id
      AND m.season_year = p_season_year
      AND (p_gender IS NULL OR a.gender = p_gender)
      AND (p_grade IS NULL OR (12 - (a.graduation_year - p_season_year)) = p_grade)
  ),
  athlete_best AS (
    SELECT 
      id,
      MIN(xc_time) as pr
    FROM athlete_results
    GROUP BY id
  ),
  athlete_top_3 AS (
    SELECT 
      ar.id,
      AVG(ar.xc_time) as avg_top_3
    FROM (
      SELECT 
        id,
        xc_time,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY xc_time ASC) as rn
      FROM athlete_results
    ) ar
    WHERE ar.rn <= 3
    GROUP BY ar.id
  ),
  athlete_last_3 AS (
    SELECT 
      ar.id,
      ARRAY_AGG(ar.xc_time ORDER BY ar.meet_date DESC) as times,
      ARRAY_AGG(ar.meet_date ORDER BY ar.meet_date DESC) as dates
    FROM (
      SELECT 
        id,
        xc_time,
        meet_date,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY meet_date DESC) as rn
      FROM athlete_results
    ) ar
    WHERE ar.rn <= 3
    GROUP BY ar.id
  ),
  prior_season_best AS (
    SELECT 
      a.id,
      MIN(r.time_seconds * c.xc_time_rating) as prior_pr
    FROM results r
    JOIN athletes a ON a.id = r.athlete_id
    JOIN races ra ON ra.id = r.race_id
    JOIN courses c ON c.id = ra.course_id
    JOIN meets m ON m.id = ra.meet_id
    WHERE a.current_school_id = p_school_id
      AND m.season_year = p_season_year - 1
    GROUP BY a.id
  )
  SELECT 
    ar.id,
    ar.name,
    ar.grade,
    ar.gender,
    ab.pr,
    at3.avg_top_3,
    al3.times[1:3],
    al3.dates[1:3],
    COUNT(DISTINCT ar.meet_date),
    CASE 
      WHEN psb.prior_pr IS NOT NULL THEN
        ((psb.prior_pr - ab.pr) / psb.prior_pr * 100)::NUMERIC
      ELSE NULL
    END as improvement_percent,
    psb.prior_pr
  FROM athlete_results ar
  JOIN athlete_best ab ON ab.id = ar.id
  LEFT JOIN athlete_top_3 at3 ON at3.id = ar.id
  LEFT JOIN athlete_last_3 al3 ON al3.id = ar.id
  LEFT JOIN prior_season_best psb ON psb.id = ar.id
  GROUP BY 
    ar.id, ar.name, ar.grade, ar.gender, 
    ab.pr, at3.avg_top_3, al3.times, al3.dates,
    psb.prior_pr
  ORDER BY ab.pr ASC;
END;
$$ LANGUAGE plpgsql;
```

### Implementation Steps

1. Create route: `/app/schools/[id]/seasons/page.tsx` - Season list
2. Create route: `/app/schools/[id]/seasons/[year]/page.tsx` - Season detail
3. Create SQL functions for season data
4. Build season list table
5. Build athlete stats table with all columns
6. Add sortable columns
7. Add gender/grade filters
8. Format improvement as colored % (green = improved, red = slower)
9. Show "—" for athletes with no prior season
10. Test with various schools/years

---

## ENHANCEMENT 5: ALL RESULTS PAGE

### Purpose
Comprehensive listing of all athletes with results, ranked by XC Time PR within gender.

### Priority
**MEDIUM** - Useful overview page

### Time Estimate
3 hours

### URL
`/schools/[id]/all-results`

### User Interface

```
┌─ WESTMONT HIGH SCHOOL ──────────────────────────────────────┠
│ All Results
│
│ Filters: [All Genders â–¼] [Boys] [Girls]
│          [All Grades â–¼] [9th] [10th] [11th] [12th]
│          [All Seasons â–¼] [2024] [2023] [2022]
│
│ Sort: [Rank â–¼] [Name] [Grad Year] [Total Races] [XC Time PR]
│
│ ┌────────────────────────────────────────────────────────────┠│
│ │ Rank│Name         │Grad │Division│Total│XC Time PR│      ││
│ │     │             │Year │        │Races│          │      ││
│ ├─────┼─────────────┼─────┼────────┼─────┼──────────┼──────┤│
│ │ 1   │John Smith   │2025 │Boys    │ 23  │14:23.45  │      ││
│ │ 2   │Mike Johnson │2026 │Boys    │ 18  │14:35.12  │      ││
│ │ 3   │Alex Kim     │2026 │Boys    │ 15  │15:12.34  │      ││
│ ├─────┼─────────────┼─────┼────────┼─────┼──────────┼──────┤│
│ │ 1   │Jane Doe     │2024 │Girls   │ 25  │16:45.23  │      ││
│ │ 2   │Sue Chen     │2025 │Girls   │ 20  │17:12.45  │      ││
│ │ 3   │Amy Wong     │2027 │Girls   │ 12  │18:23.56  │      ││
│ └────────────────────────────────────────────────────────────┘│
│
│ Total Athletes: 45 (25 Boys, 20 Girls)
```

### Data Structure

```typescript
interface AthleteResult {
  rank: number  // Rank within gender
  athlete_id: string
  athlete_name: string
  graduation_year: number
  division: 'Boys' | 'Girls'
  total_races: number
  xc_time_pr: number
}
```

### SQL Function

```sql
CREATE OR REPLACE FUNCTION get_school_all_results(
  p_school_id UUID,
  p_gender TEXT DEFAULT NULL,
  p_grade INT DEFAULT NULL,
  p_season_year INT DEFAULT NULL
) RETURNS TABLE (
  rank_within_gender BIGINT,
  athlete_id UUID,
  athlete_name TEXT,
  graduation_year INT,
  division TEXT,
  total_races BIGINT,
  xc_time_pr NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH athlete_stats AS (
    SELECT 
      a.id,
      a.first_name || ' ' || a.last_name as name,
      a.graduation_year,
      a.gender,
      MIN(r.time_seconds * c.xc_time_rating) as pr,
      COUNT(DISTINCT r.id) as races
    FROM athletes a
    JOIN results r ON r.athlete_id = a.id
    JOIN races ra ON ra.id = r.race_id
    JOIN courses c ON c.id = ra.course_id
    JOIN meets m ON m.id = ra.meet_id
    WHERE a.current_school_id = p_school_id
      -- Optional filters
      AND (p_gender IS NULL OR a.gender = p_gender)
      AND (p_grade IS NULL OR (12 - (a.graduation_year - EXTRACT(YEAR FROM CURRENT_DATE))) = p_grade)
      AND (p_season_year IS NULL OR m.season_year = p_season_year)
    GROUP BY a.id, a.first_name, a.last_name, a.graduation_year, a.gender
  )
  SELECT 
    ROW_NUMBER() OVER (PARTITION BY gender ORDER BY pr ASC) as rank_within_gender,
    id,
    name,
    graduation_year,
    CASE WHEN gender = 'M' THEN 'Boys' ELSE 'Girls' END as division,
    races,
    pr
  FROM athlete_stats
  ORDER BY gender, pr ASC;
END;
$$ LANGUAGE plpgsql;
```

### Implementation Steps

1. Create route: `/app/schools/[id]/all-results/page.tsx`
2. Create SQL function
3. Build sortable table
4. Add gender/grade/season filters
5. Add rank calculation within gender
6. Show separate ranks for Boys/Girls
7. Format XC times
8. Add links to athlete pages
9. Show totals at bottom
10. Test with various schools

---

## COMMON COMPONENTS

### Reusable Components Across All Enhancements

```typescript
// components/AthleteLink.tsx
export function AthleteLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/athletes/${id}`} className="text-blue-600 hover:underline">
      {name}
    </Link>
  )
}

// components/SchoolLink.tsx
export function SchoolLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/schools/${id}`} className="text-green-600 hover:underline">
      {name}
    </Link>
  )
}

// components/TimeDisplay.tsx
export function TimeDisplay({ centiseconds }: { centiseconds: number }) {
  const seconds = centiseconds / 100
  const minutes = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(2).padStart(5, '0')
  return <span className="font-mono">{minutes}:{secs}</span>
}

// components/GenderBadge.tsx
export function GenderBadge({ gender }: { gender: 'M' | 'F' }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      gender === 'M' 
        ? 'bg-blue-100 text-blue-800' 
        : 'bg-pink-100 text-pink-800'
    }`}>
      {gender === 'M' ? 'Boys' : 'Girls'}
    </span>
  )
}

// components/ImprovementBadge.tsx
export function ImprovementBadge({ percent }: { percent: number | null }) {
  if (percent === null) return <span>—</span>
  
  const isImproved = percent > 0
  return (
    <span className={`font-medium ${
      isImproved ? 'text-green-600' : 'text-red-600'
    }`}>
      {isImproved ? '+' : ''}{percent.toFixed(1)}%
    </span>
  )
}

// components/SortableTable.tsx
export function SortableTable({
  columns,
  data,
  initialSort
}: {
  columns: Column[]
  data: any[]
  initialSort: string
}) {
  const [sortColumn, setSortColumn] = useState(initialSort)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // ... sorting logic
  
  return (
    <table className="min-w-full">
      <thead>
        <tr>
          {columns.map(col => (
            <th 
              key={col.key}
              onClick={() => handleSort(col.key)}
              className="cursor-pointer hover:bg-gray-50"
            >
              {col.label}
              {sortColumn === col.key && (
                <span>{sortDirection === 'asc' ? ' â†'' : ' â†"'}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map(row => (
          <tr key={row.id}>
            {columns.map(col => (
              <td key={col.key}>{col.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## TESTING CHECKLIST

For each enhancement:

- [ ] Data loads correctly
- [ ] Filters work as expected
- [ ] Sorting works for all columns
- [ ] Links navigate to correct pages
- [ ] Times display in correct format (MM:SS.CC)
- [ ] Responsive on mobile
- [ ] Loading states show during data fetch
- [ ] Empty states show when no data
- [ ] Error handling works
- [ ] Performance is acceptable (< 2s load)

---

## DEPLOYMENT SEQUENCE

Recommended order to implement:

1. **Top Performances** (2h) - Quick win, rename existing page
2. **All Results** (3h) - Simple list page
3. **Course Records** (4h) - More complex, needs SQL function
4. **Team Records** (3h) - Complex SQL, custom type needed
5. **Seasons** (6h) - Most complex, multiple views

**Total Time:** ~18 hours across all 5 enhancements

---

**Last Updated:** October 13, 2025  
**Status:** Specification Complete - Ready for Implementation
