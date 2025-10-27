# ADMIN FEATURES - DETAILED SPECIFICATIONS

**Last Updated:** October 13, 2025

---

## OVERVIEW

These 6 admin features provide critical data management and quality control capabilities. All features should be:
- **Hidden from normal users** (admin-only access)
- **Safe** (confirmation prompts before destructive actions)
- **Comprehensive** (handle all edge cases)
- **Auditable** (log all admin actions)

**Access Control:** Check user role before rendering any admin routes

---

## FEATURE 1: FIND DUPLICATE RESULTS

### Purpose
Identify data errors where an athlete has multiple results in the same race. This indicates either:
- Import error (race imported twice)
- Data entry mistake
- Timing system glitch

### Priority
**CRITICAL** - Data integrity issue that affects team scoring and rankings

### Time Estimate
2 hours

### User Interface

**Location:** `/admin/duplicate-results`

**Page Layout:**
```
â"‚ ADMIN: Duplicate Results Finder
â"‚
â"‚ [Search Button] [Export CSV]
â"‚
â"‚ Results: 12 duplicate result sets found
â"‚
â"‚ ┌──────────────────────────────────────────────┬────────┬────────────┠
â"‚ │ Athlete               │ Race/Meet           │ Count  │ Actions    │
â"‚ ├──────────────────────────────────────────────┼────────┼────────────┤
â"‚ │ John Smith           │ Varsity Boys 5K     │ 2      │ [View]     │
â"‚ │ Westmont High School │ WCAL Championships  │        │ [Resolve]  │
â"‚ │                      │ Oct 15, 2024        │        │            │
â"‚ └──────────────────────────────────────────────┴────────┴────────────┘
```

**"View" Modal:**
Shows all duplicate results side-by-side:
```
Result 1:                  Result 2:
Time: 15:30.25            Time: 15:30.25
Place: 5th                Place: 5th
ID: abc-123               ID: def-456

[Keep Result 1] [Keep Result 2] [Cancel]
```

### Database Query

```sql
-- Find all duplicate results
CREATE OR REPLACE FUNCTION admin_find_duplicate_results()
RETURNS TABLE (
  athlete_id UUID,
  athlete_name TEXT,
  school_name TEXT,
  race_id UUID,
  race_name TEXT,
  meet_id UUID,
  meet_name TEXT,
  meet_date DATE,
  result_count BIGINT,
  result_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as athlete_id,
    a.first_name || ' ' || a.last_name as athlete_name,
    s.name as school_name,
    r.id as race_id,
    r.name as race_name,
    m.id as meet_id,
    m.name as meet_name,
    m.meet_date,
    COUNT(res.id) as result_count,
    ARRAY_AGG(res.id) as result_ids
  FROM results res
  JOIN athletes a ON a.id = res.athlete_id
  JOIN schools s ON s.id = a.current_school_id
  JOIN races r ON r.id = res.race_id
  JOIN meets m ON m.id = res.meet_id
  GROUP BY 
    a.id, a.first_name, a.last_name, s.name,
    r.id, r.name, m.id, m.name, m.meet_date
  HAVING COUNT(res.id) > 1
  ORDER BY COUNT(res.id) DESC, m.meet_date DESC;
END;
$$ LANGUAGE plpgsql;
```

### Resolution Process

When admin clicks "Keep Result X":
1. Delete the other result(s)
2. Update race participant count: `UPDATE races SET total_participants = total_participants - 1 WHERE id = race_id`
3. Refresh materialized view: `REFRESH MATERIALIZED VIEW athlete_xc_times`
4. Log action in admin_log table
5. Show success message

### Implementation Files

- `/app/admin/duplicate-results/page.tsx` - Main page
- `/app/api/admin/duplicate-results/route.ts` - API endpoint
- `/lib/admin/duplicates.ts` - Business logic

---

## FEATURE 2: SAFE DELETE FUNCTIONS

### Purpose
Provide admin tools to properly delete results, races, and meets while maintaining data integrity.

### Priority
**CRITICAL** - Essential for data cleanup and correction

### Time Estimate
3 hours

### User Interface

**Location:** `/admin/delete`

**Three Tabs:**
1. Delete Result
2. Delete Race
3. Delete Meet

**Tab 1: Delete Result**
```
┌─ Search by Athlete/Meet ────────────────────┠
│ Athlete Name: [___________] [Search]         │
│ OR                                            │
│ Meet: [___________] [Search]                  │
└───────────────────────────────────────────────┘

Results Found: 156
┌──────────────┬──────────┬──────────┬──────────┠
│ Athlete      │ Race     │ Time     │ Action   │
├──────────────┼──────────┼──────────┼──────────┤
│ John Smith   │ V Boys   │ 15:30.25 │ [Delete] │
└──────────────┴──────────┴──────────┴──────────┘
```

**Tab 2: Delete Race**
```
┌─ Search by Meet/Date ───────────────────────┠
│ Meet: [___________] [Search]                 │
│ Date: [___________]                          │
└──────────────────────────────────────────────┘

Races Found: 8
┌───────────────┬──────────────┬────────────┬──────────┠
│ Race          │ Participants │ Meet       │ Action   │
├───────────────┼──────────────┼────────────┼──────────┤
│ Varsity Boys  │ 142          │ WCAL Champ │ [Delete] │
│ ⚠️ Will delete 142 results                  │          │
└───────────────┴──────────────┴────────────┴──────────┘
```

**Tab 3: Delete Meet**
```
┌─ Search by Name/Date ───────────────────────┠
│ Name: [___________] [Search]                 │
│ Date Range: [_____] to [_____]               │
└──────────────────────────────────────────────┘

Meets Found: 3
┌──────────────┬────────┬─────────┬────────────┬──────────┠
│ Meet         │ Date   │ Races   │ Results    │ Action   │
├──────────────┼────────┼─────────┼────────────┼──────────┤
│ WCAL Champs  │ 10/15  │ 8       │ 523        │ [Delete] │
│ ⚠️ Will delete 8 races and 523 results       │          │
└──────────────┴────────┴─────────┴────────────┴──────────┘
```

### Delete Confirmation Modal

```
â"‚ ⚠️ CONFIRM DELETION
â"‚
â"‚ You are about to delete:
â"‚ Meet: WCAL Championships
â"‚ Date: October 15, 2024
â"‚
â"‚ This will CASCADE DELETE:
â"‚ • 8 races
â"‚ • 523 individual results
â"‚
â"‚ This action CANNOT be undone.
â"‚
â"‚ Type "DELETE" to confirm: [___________]
â"‚
â"‚ [Cancel] [Confirm Deletion]
```

### Database Functions

```sql
-- Delete a single result
CREATE OR REPLACE FUNCTION admin_delete_result(
  p_result_id UUID,
  p_admin_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_race_id UUID;
  v_athlete_id UUID;
BEGIN
  -- Get race_id and athlete_id before deleting
  SELECT race_id, athlete_id INTO v_race_id, v_athlete_id
  FROM results WHERE id = p_result_id;
  
  -- Delete the result
  DELETE FROM results WHERE id = p_result_id;
  
  -- Update race participant count
  UPDATE races 
  SET total_participants = (
    SELECT COUNT(*) FROM results WHERE race_id = v_race_id
  )
  WHERE id = v_race_id;
  
  -- Log the action
  INSERT INTO admin_log (admin_user_id, action, details)
  VALUES (p_admin_user_id, 'DELETE_RESULT', 
          jsonb_build_object('result_id', p_result_id, 'athlete_id', v_athlete_id));
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW athlete_xc_times;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Delete an entire race
CREATE OR REPLACE FUNCTION admin_delete_race(
  p_race_id UUID,
  p_admin_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_results_count INT;
BEGIN
  -- Count results before deleting
  SELECT COUNT(*) INTO v_results_count
  FROM results WHERE race_id = p_race_id;
  
  -- Delete all results (cascade)
  DELETE FROM results WHERE race_id = p_race_id;
  
  -- Delete the race
  DELETE FROM races WHERE id = p_race_id;
  
  -- Log the action
  INSERT INTO admin_log (admin_user_id, action, details)
  VALUES (p_admin_user_id, 'DELETE_RACE',
          jsonb_build_object('race_id', p_race_id, 'results_deleted', v_results_count));
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW athlete_xc_times;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Delete an entire meet
CREATE OR REPLACE FUNCTION admin_delete_meet(
  p_meet_id UUID,
  p_admin_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_races_count INT;
  v_results_count INT;
BEGIN
  -- Count races and results
  SELECT COUNT(*) INTO v_races_count FROM races WHERE meet_id = p_meet_id;
  SELECT COUNT(*) INTO v_results_count 
  FROM results WHERE race_id IN (SELECT id FROM races WHERE meet_id = p_meet_id);
  
  -- Delete all results in all races (cascade)
  DELETE FROM results WHERE race_id IN (
    SELECT id FROM races WHERE meet_id = p_meet_id
  );
  
  -- Delete all races
  DELETE FROM races WHERE meet_id = p_meet_id;
  
  -- Delete the meet
  DELETE FROM meets WHERE id = p_meet_id;
  
  -- Log the action
  INSERT INTO admin_log (admin_user_id, action, details)
  VALUES (p_admin_user_id, 'DELETE_MEET',
          jsonb_build_object(
            'meet_id', p_meet_id, 
            'races_deleted', v_races_count,
            'results_deleted', v_results_count
          ));
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW athlete_xc_times;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Admin Log Table

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

### Implementation Files

- `/app/admin/delete/page.tsx` - Main page with 3 tabs
- `/app/api/admin/delete/result/route.ts` - Delete result endpoint
- `/app/api/admin/delete/race/route.ts` - Delete race endpoint
- `/app/api/admin/delete/meet/route.ts` - Delete meet endpoint
- `/lib/admin/delete.ts` - Business logic

---

## FEATURE 3: MERGE ATHLETES

### Purpose
Combine duplicate athlete records that represent the same person. Common scenarios:
- Same athlete at different schools (transfer)
- Name variations (Bob vs Robert)
- Data entry errors

### Priority
**HIGH** - Important for data accuracy but less urgent than deletes

### Time Estimate
4 hours

### User Interface

**Location:** `/admin/merge-athletes`

**Step 1: Find Candidates**
```
┌─ Find Similar Athletes ──────────────────────┠
│ Search: [___________] [Find Similar]          │
│                                                │
│ OR                                             │
│                                                │
│ Manual Selection:                              │
│ Athlete 1: [___________] [Search]              │
│ Athlete 2: [___________] [Search]              │
│                                                │
│ [Preview Merge]                                │
└────────────────────────────────────────────────┘

Similar Athletes Found: 5 pairs
┌──────────────────┬────────────┬──────────────────┬────────────┬──────────┠
│ Athlete 1        │ School 1   │ Athlete 2        │ School 2   │ Action   │
├──────────────────┼────────────┼──────────────────┼────────────┼──────────┤
│ John Smith (2025)│ Westmont   │ John Smith (2025)│ Mitty      │ [Merge]  │
│ 23 results       │            │ 12 results       │            │          │
└──────────────────┴────────────┴──────────────────┴────────────┴──────────┘
```

**Step 2: Preview Merge**
```
â"‚ PREVIEW ATHLETE MERGE
â"‚
â"‚ Primary Athlete (KEEP):
â"‚ ┌────────────────────────────────────────┠
â"‚ │ John Smith                             │
â"‚ │ Current School: Westmont HS            │
â"‚ │ Graduation: 2025                       │
â"‚ │ Results: 23                            │
â"‚ │ Best XC Time: 15:23.45                 │
â"‚ └────────────────────────────────────────┘
â"‚
â"‚ Secondary Athlete (MERGE INTO PRIMARY):
â"‚ ┌────────────────────────────────────────┠
â"‚ │ John Smith                             │
â"‚ │ Current School: Mitty HS               │
â"‚ │ Graduation: 2025                       │
â"‚ │ Results: 12                            │
â"‚ │ Best XC Time: 15:45.12                 │
â"‚ └────────────────────────────────────────┘
â"‚
â"‚ After Merge:
â"‚ • 35 total results (23 + 12)
â"‚ • School transfers will be created
â"‚ • Best XC Time: 15:23.45 (from primary)
â"‚ • Secondary athlete record will be deleted
â"‚
â"‚ [Cancel] [Confirm Merge]
```

### Database Function

```sql
CREATE OR REPLACE FUNCTION admin_merge_athletes(
  p_primary_athlete_id UUID,
  p_secondary_athlete_id UUID,
  p_admin_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_primary_school UUID;
  v_secondary_school UUID;
  v_results_moved INT;
BEGIN
  -- Get current schools
  SELECT current_school_id INTO v_primary_school
  FROM athletes WHERE id = p_primary_athlete_id;
  
  SELECT current_school_id INTO v_secondary_school
  FROM athletes WHERE id = p_secondary_athlete_id;
  
  -- Create school transfer record if schools are different
  IF v_secondary_school IS DISTINCT FROM v_primary_school THEN
    -- Find earliest result date from secondary athlete
    INSERT INTO school_transfers (athlete_id, from_school_id, to_school_id, transfer_date)
    SELECT 
      p_primary_athlete_id,
      v_secondary_school,
      v_primary_school,
      MIN(m.meet_date)
    FROM results r
    JOIN races ra ON ra.id = r.race_id
    JOIN meets m ON m.id = ra.meet_id
    WHERE r.athlete_id = p_secondary_athlete_id;
  END IF;
  
  -- Move all results from secondary to primary
  UPDATE results
  SET athlete_id = p_primary_athlete_id
  WHERE athlete_id = p_secondary_athlete_id;
  
  GET DIAGNOSTICS v_results_moved = ROW_COUNT;
  
  -- Delete secondary athlete
  DELETE FROM athletes WHERE id = p_secondary_athlete_id;
  
  -- Log the action
  INSERT INTO admin_log (admin_user_id, action, details)
  VALUES (p_admin_user_id, 'MERGE_ATHLETES',
          jsonb_build_object(
            'primary_id', p_primary_athlete_id,
            'secondary_id', p_secondary_athlete_id,
            'results_moved', v_results_moved
          ));
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW athlete_xc_times;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Find Similar Athletes Query

```sql
CREATE OR REPLACE FUNCTION admin_find_similar_athletes()
RETURNS TABLE (
  athlete1_id UUID,
  athlete1_name TEXT,
  school1_name TEXT,
  grad1 INT,
  athlete2_id UUID,
  athlete2_name TEXT,
  school2_name TEXT,
  grad2 INT,
  similarity_score INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a1.id as athlete1_id,
    a1.first_name || ' ' || a1.last_name as athlete1_name,
    s1.name as school1_name,
    a1.graduation_year as grad1,
    a2.id as athlete2_id,
    a2.first_name || ' ' || a2.last_name as athlete2_name,
    s2.name as school2_name,
    a2.graduation_year as grad2,
    -- Simple similarity score
    CASE 
      WHEN LOWER(a1.first_name) = LOWER(a2.first_name) 
       AND LOWER(a1.last_name) = LOWER(a2.last_name)
       AND a1.graduation_year = a2.graduation_year THEN 100
      WHEN LOWER(a1.first_name) = LOWER(a2.first_name)
       AND LOWER(a1.last_name) = LOWER(a2.last_name) THEN 90
      WHEN similarity(LOWER(a1.first_name), LOWER(a2.first_name)) > 0.8
       AND similarity(LOWER(a1.last_name), LOWER(a2.last_name)) > 0.8 THEN 70
      ELSE 50
    END as similarity_score
  FROM athletes a1
  JOIN athletes a2 ON 
    LOWER(a1.first_name) = LOWER(a2.first_name)
    AND LOWER(a1.last_name) = LOWER(a2.last_name)
    AND a1.id < a2.id
  JOIN schools s1 ON s1.id = a1.current_school_id
  JOIN schools s2 ON s2.id = a2.current_school_id
  WHERE ABS(a1.graduation_year - a2.graduation_year) <= 1
    AND a1.current_school_id != a2.current_school_id
  ORDER BY similarity_score DESC, a1.last_name;
END;
$$ LANGUAGE plpgsql;
```

### Implementation Files

- `/app/admin/merge-athletes/page.tsx` - Main page
- `/app/api/admin/merge-athletes/route.ts` - Merge endpoint
- `/app/api/admin/find-similar/route.ts` - Find similar athletes
- `/lib/admin/merge.ts` - Business logic

---

## FEATURE 4: TEST COURSE RATING ACCURACY

### Purpose
Use AI to analyze athlete performance across multiple courses and flag course ratings that appear incorrect.

### Priority
**MEDIUM** - Important for data quality but not urgent

### Time Estimate
8 hours

### Methodology

For each course, find athletes who:
1. Ran on THIS course
2. Also ran on Crystal Springs (baseline course, rating = 1.0)
3. Calculate expected time difference based on course rating
4. Calculate actual time difference
5. Flag courses where expected vs actual differs by >5%

### User Interface

**Location:** `/admin/test-course-ratings`

```
â"‚ COURSE RATING ACCURACY TEST
â"‚
â"‚ [Run Analysis] [Export Report]
â"‚
â"‚ Analysis Complete: 45 courses analyzed
â"‚
â"‚ ┌────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┠
â"‚ │ Course         │ Current  │ Suggested│ Athletes │ Avg Diff │ Status   │
â"‚ │                │ Rating   │ Rating   │ Analyzed │          │          │
â"‚ ├────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
â"‚ │ Toro Park      │ 1.020    │ 1.045    │ 127      │ +2.5%    │ ⚠️       │
â"‚ │ Hayward HS     │ 0.980    │ 0.965    │ 89       │ -1.8%    │ âœ…       │
â"‚ │ Woodward Park  │ 1.050    │ 1.085    │ 234      │ +3.2%    │ ⚠️       │
â"‚ └────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
â"‚
â"‚ Legend:
â"‚ âœ… Accurate (< 2% difference)
â"‚ ⚠️ Needs Review (2-5% difference)
â"‚ 🚨 Incorrect (> 5% difference)
```

**Detail View (click on course):**
```
â"‚ TORO PARK - RATING ANALYSIS
â"‚
â"‚ Current Rating: 1.020
â"‚ Suggested Rating: 1.045
â"‚ Confidence: High (127 athletes analyzed)
â"‚
â"‚ Sample Athletes:
â"‚ ┌──────────────────┬──────────┬──────────┬──────────┬──────────┠
â"‚ │ Athlete          │ Crystal  │ Toro     │ Expected │ Actual   │
â"‚ │                  │ Springs  │ Park     │ Diff     │ Diff     │
â"‚ ├──────────────────┼──────────┼──────────┼──────────┼──────────┤
â"‚ │ John Smith       │ 15:30.00 │ 15:50.25 │ +20s     │ +20.25s  │
â"‚ │ Jane Doe         │ 18:45.12 │ 19:08.45 │ +23s     │ +23.33s  │
â"‚ └──────────────────┴──────────┴──────────┴──────────┴──────────┘
â"‚
â"‚ [Apply Suggested Rating] [Manual Adjust] [Dismiss]
```

### Database Function

```sql
CREATE OR REPLACE FUNCTION admin_analyze_course_rating(p_course_id UUID)
RETURNS TABLE (
  athlete_id UUID,
  athlete_name TEXT,
  crystal_springs_time INT,
  course_time INT,
  expected_diff NUMERIC,
  actual_diff INT,
  percent_diff NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH crystal_springs_results AS (
    -- Get each athlete's best time at Crystal Springs
    SELECT 
      r.athlete_id,
      MIN(r.time_seconds) as best_time
    FROM results r
    JOIN races ra ON ra.id = r.race_id
    JOIN courses c ON c.id = ra.course_id
    WHERE c.name = 'Crystal Springs'
      AND r.time_seconds > 0
    GROUP BY r.athlete_id
  ),
  course_results AS (
    -- Get each athlete's best time at target course
    SELECT 
      r.athlete_id,
      MIN(r.time_seconds) as best_time
    FROM results r
    JOIN races ra ON ra.id = r.race_id
    WHERE ra.course_id = p_course_id
      AND r.time_seconds > 0
    GROUP BY r.athlete_id
  )
  SELECT 
    a.id as athlete_id,
    a.first_name || ' ' || a.last_name as athlete_name,
    cs.best_time as crystal_springs_time,
    cr.best_time as course_time,
    -- Expected diff based on current rating
    (cs.best_time * (c.xc_time_rating - 1.0))::NUMERIC as expected_diff,
    -- Actual diff
    (cr.best_time - cs.best_time) as actual_diff,
    -- Percent difference
    ((cr.best_time - cs.best_time - (cs.best_time * (c.xc_time_rating - 1.0))) / cs.best_time * 100)::NUMERIC as percent_diff
  FROM crystal_springs_results cs
  JOIN course_results cr ON cr.athlete_id = cs.athlete_id
  JOIN athletes a ON a.id = cs.athlete_id
  JOIN courses c ON c.id = p_course_id
  ORDER BY ABS((cr.best_time - cs.best_time - (cs.best_time * (c.xc_time_rating - 1.0))) / cs.best_time * 100) DESC;
END;
$$ LANGUAGE plpgsql;

-- Get suggested rating for a course
CREATE OR REPLACE FUNCTION admin_suggest_course_rating(p_course_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_suggested_rating NUMERIC;
BEGIN
  WITH analysis AS (
    SELECT * FROM admin_analyze_course_rating(p_course_id)
  )
  SELECT 
    1.0 + (AVG(actual_diff)::NUMERIC / AVG(crystal_springs_time))
  INTO v_suggested_rating
  FROM analysis;
  
  RETURN ROUND(v_suggested_rating, 3);
END;
$$ LANGUAGE plpgsql;
```

### AI Integration (Optional Enhancement)

Use Claude API to analyze patterns:
```typescript
// Call Claude API with course analysis data
const prompt = `
Analyze these cross country course performance patterns:

Course: Toro Park
Current Rating: 1.020
Athletes Analyzed: 127

Sample Data:
${athleteData.map(a => `
  ${a.name}: Crystal Springs ${a.cs_time}, Toro ${a.toro_time}
`).join('\n')}

Based on this data, should the course rating be adjusted?
Consider:
1. Consistency across athletes
2. Statistical significance
3. Outliers
4. Weather/course condition factors

Provide: Suggested rating (with 95% confidence interval), confidence level, reasoning
`

// Parse Claude's response and display to admin
```

### Implementation Files

- `/app/admin/course-ratings/page.tsx` - Main analysis page
- `/app/admin/course-ratings/[id]/page.tsx` - Detail view for specific course
- `/app/api/admin/analyze-rating/route.ts` - Run analysis endpoint
- `/lib/admin/course-rating.ts` - Business logic
- `/lib/admin/claude-api.ts` - Optional Claude API integration

---

## FEATURE 5: UPDATE COURSE RATING

### Purpose
Manual adjustment tool for course difficulty ratings.

### Priority
**MEDIUM** - Useful but not critical

### Time Estimate
1 hour

### User Interface

**Location:** `/admin/update-course-rating`

```
┌─ Update Course Rating ───────────────────────┠
│                                               │
│ Course: [Select Course â–¼]                    │
│                                               │
│ Current Rating: 1.020                         │
│ Suggested Rating: 1.045 (from analysis)       │
│                                               │
│ New Rating: [_______]                         │
│                                               │
│ Impact:                                       │
│ • 1,234 results on this course                │
│ • 567 athletes will have XC times recalc      │
│                                               │
│ Reason for Change:                            │
│ [__________________________________]          │
│ [__________________________________]          │
│                                               │
│ [Cancel] [Update Rating]                      │
└───────────────────────────────────────────────┘
```

### Database Function

```sql
CREATE OR REPLACE FUNCTION admin_update_course_rating(
  p_course_id UUID,
  p_new_rating NUMERIC,
  p_reason TEXT,
  p_admin_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_rating NUMERIC;
  v_affected_athletes INT;
BEGIN
  -- Get old rating
  SELECT xc_time_rating INTO v_old_rating
  FROM courses WHERE id = p_course_id;
  
  -- Update the rating
  UPDATE courses
  SET xc_time_rating = p_new_rating,
      updated_at = NOW()
  WHERE id = p_course_id;
  
  -- Count affected athletes
  SELECT COUNT(DISTINCT r.athlete_id) INTO v_affected_athletes
  FROM results r
  JOIN races ra ON ra.id = r.race_id
  WHERE ra.course_id = p_course_id;
  
  -- Log the change
  INSERT INTO admin_log (admin_user_id, action, details)
  VALUES (p_admin_user_id, 'UPDATE_COURSE_RATING',
          jsonb_build_object(
            'course_id', p_course_id,
            'old_rating', v_old_rating,
            'new_rating', p_new_rating,
            'reason', p_reason,
            'affected_athletes', v_affected_athletes
          ));
  
  -- Refresh materialized view (this will recalculate all XC times)
  REFRESH MATERIALIZED VIEW athlete_xc_times;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Implementation Files

- `/app/admin/update-course-rating/page.tsx` - Main page
- `/app/api/admin/update-course-rating/route.ts` - Update endpoint
- `/lib/admin/course-rating.ts` - Business logic

---

## FEATURE 6: IMPORT MEET RESULTS

### Purpose
Bulk upload meet results from common timing system formats.

### Priority
**HIGH** - Critical for data entry efficiency

### Time Estimate
6 hours

### Supported Formats

1. **CSV (Generic)**
   - Required columns: `first_name`, `last_name`, `school`, `time`, `place`
   - Optional: `grade`, `gender`, `bib_number`

2. **Athletic.net Export**
   - Standard athletic.net CSV format
   - Auto-detects and maps columns

3. **Direct Timing** (future)
   - Direct Timing XML export

### User Interface

**Location:** `/admin/import-meet`

**Step 1: Meet Info**
```
┌─ Import Meet Results ────────────────────────┠
│                                               │
│ Meet Name: [___________________________]      │
│ Date: [__________]                            │
│ Host School: [Select â–¼]                      │
│ Location: [___________________________]       │
│                                               │
│ [Next Step]                                   │
└───────────────────────────────────────────────┘
```

**Step 2: Upload File**
```
┌─ Upload Results File ────────────────────────┠
│                                               │
│ File Format: [CSV â–¼]                         │
│                                               │
│ [Choose File] No file chosen                  │
│                                               │
│ OR                                            │
│                                               │
│ [Paste Data Here]                             │
│ [_________________________________]           │
│ [_________________________________]           │
│                                               │
│ [Back] [Parse File]                           │
└───────────────────────────────────────────────┘
```

**Step 3: Map Columns**
```
┌─ Map Columns ────────────────────────────────┠
│                                               │
│ CSV Column       â†'  Database Field           │
│ ─────────────────────────────────────────────┤
│ "First" [_____] â†'  first_name               │
│ "Last" [______] â†'  last_name                │
│ "School" [____] â†'  school                   │
│ "Time" [______] â†'  time                     │
│ "Place" [_____] â†'  place                    │
│ "Grade" [_____] â†'  grade (optional)         │
│                                               │
│ Preview (first 5 rows):                       │
│ John | Smith | Westmont | 15:30.25 | 1       │
│ Jane | Doe | Mitty | 18:45.12 | 2             │
│                                               │
│ [Back] [Next Step]                            │
└───────────────────────────────────────────────┘
```

**Step 4: Race Configuration**
```
┌─ Configure Races ────────────────────────────┠
│                                               │
│ Detected: 4 races                             │
│                                               │
│ Race 1:                                       │
│ Name: [Varsity Boys 5K____]                   │
│ Gender: [M â–¼]                                │
│ Distance: [5K â–¼]                             │
│ Category: [Varsity â–¼]                        │
│ Course: [Select Course â–¼]                    │
│ Athletes: 142                                 │
│                                               │
│ Race 2:                                       │
│ ... (repeat for each race)                    │
│                                               │
│ [Back] [Next Step]                            │
└───────────────────────────────────────────────┘
```

**Step 5: Validate & Match**
```
┌─ Validate Athletes ──────────────────────────┠
│                                               │
│ Status: 142 athletes found                    │
│                                               │
│ âœ… Matched: 128                               │
│ ⚠️ New Athletes: 14                            │
│ 🚨 Errors: 0                                  │
│                                               │
│ New Athletes (will be created):               │
│ ┌────────────┬──────────┬──────────┬─────────┠│
│ │ Name       │ School   │ Grade    │ Action  ││
│ ├────────────┼──────────┼──────────┼─────────┤│
│ │ Bob Jones  │ Westmont │ 10       │ [Edit]  ││
│ │ Sue Lee    │ Mitty    │ 9        │ [Edit]  ││
│ └────────────┴──────────┴──────────┴─────────┘│
│                                               │
│ [Back] [Import Results]                       │
└───────────────────────────────────────────────┘
```

**Step 6: Import Progress**
```
┌─ Importing Results ──────────────────────────┠
│                                               │
│ Progress: 85/142 results imported             │
│                                               │
│ [████████████████────────] 60%                │
│                                               │
│ Status: Creating race records...              │
│                                               │
└───────────────────────────────────────────────┘
```

**Step 7: Complete**
```
┌─ Import Complete ────────────────────────────┠
│                                               │
│ âœ… Successfully imported:                     │
│                                               │
│ • Meet: WCAL Championships                    │
│ • 4 races created                             │
│ • 142 results imported                        │
│ • 14 new athletes created                     │
│                                               │
│ [View Meet] [Import Another] [Done]           │
└───────────────────────────────────────────────┘
```

### Database Functions

```sql
-- Create or match athlete
CREATE OR REPLACE FUNCTION import_match_or_create_athlete(
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_name TEXT,
  p_graduation_year INT,
  p_gender TEXT
) RETURNS UUID AS $$
DECLARE
  v_school_id UUID;
  v_athlete_id UUID;
BEGIN
  -- Find school ID
  SELECT id INTO v_school_id
  FROM schools
  WHERE LOWER(name) = LOWER(p_school_name)
  LIMIT 1;
  
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'School not found: %', p_school_name;
  END IF;
  
  -- Try to find existing athlete
  SELECT id INTO v_athlete_id
  FROM athletes
  WHERE LOWER(first_name) = LOWER(p_first_name)
    AND LOWER(last_name) = LOWER(p_last_name)
    AND current_school_id = v_school_id
    AND graduation_year = p_graduation_year
  LIMIT 1;
  
  -- Create if not found
  IF v_athlete_id IS NULL THEN
    INSERT INTO athletes (first_name, last_name, current_school_id, graduation_year, gender)
    VALUES (p_first_name, p_last_name, v_school_id, p_graduation_year, p_gender)
    RETURNING id INTO v_athlete_id;
  END IF;
  
  RETURN v_athlete_id;
END;
$$ LANGUAGE plpgsql;

-- Import complete meet
CREATE OR REPLACE FUNCTION import_meet_results(
  p_meet_data JSONB,
  p_admin_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_meet_id UUID;
  v_race_id UUID;
  v_race JSONB;
  v_result JSONB;
  v_athlete_id UUID;
  v_total_results INT := 0;
  v_new_athletes INT := 0;
BEGIN
  -- Create the meet
  INSERT INTO meets (name, meet_date, host_school_id, location, season_year)
  VALUES (
    p_meet_data->>'name',
    (p_meet_data->>'date')::DATE,
    (p_meet_data->>'host_school_id')::UUID,
    p_meet_data->>'location',
    EXTRACT(YEAR FROM (p_meet_data->>'date')::DATE)
  )
  RETURNING id INTO v_meet_id;
  
  -- Loop through each race
  FOR v_race IN SELECT * FROM jsonb_array_elements(p_meet_data->'races')
  LOOP
    -- Create the race
    INSERT INTO races (meet_id, course_id, name, distance, gender, category)
    VALUES (
      v_meet_id,
      (v_race->>'course_id')::UUID,
      v_race->>'name',
      v_race->>'distance',
      v_race->>'gender',
      v_race->>'category'
    )
    RETURNING id INTO v_race_id;
    
    -- Loop through each result in this race
    FOR v_result IN SELECT * FROM jsonb_array_elements(v_race->'results')
    LOOP
      -- Match or create athlete
      BEGIN
        v_athlete_id := import_match_or_create_athlete(
          v_result->>'first_name',
          v_result->>'last_name',
          v_result->>'school',
          (v_result->>'graduation_year')::INT,
          v_result->>'gender'
        );
        
        IF (SELECT COUNT(*) FROM athletes WHERE id = v_athlete_id AND created_at > NOW() - INTERVAL '1 minute') > 0 THEN
          v_new_athletes := v_new_athletes + 1;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue
        RAISE NOTICE 'Error matching athlete: % %', v_result->>'first_name', v_result->>'last_name';
        CONTINUE;
      END;
      
      -- Insert the result
      INSERT INTO results (
        athlete_id,
        race_id,
        meet_id,
        time_seconds,
        place_overall,
        season_year
      )
      VALUES (
        v_athlete_id,
        v_race_id,
        v_meet_id,
        (v_result->>'time_centiseconds')::INT,
        (v_result->>'place')::INT,
        EXTRACT(YEAR FROM (p_meet_data->>'date')::DATE)
      );
      
      v_total_results := v_total_results + 1;
    END LOOP;
    
    -- Update race participant count
    UPDATE races
    SET total_participants = (SELECT COUNT(*) FROM results WHERE race_id = v_race_id)
    WHERE id = v_race_id;
  END LOOP;
  
  -- Log the import
  INSERT INTO admin_log (admin_user_id, action, details)
  VALUES (p_admin_user_id, 'IMPORT_MEET',
          jsonb_build_object(
            'meet_id', v_meet_id,
            'total_results', v_total_results,
            'new_athletes', v_new_athletes
          ));
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW athlete_xc_times;
  
  RETURN v_meet_id;
END;
$$ LANGUAGE plpgsql;
```

### CSV Parsing Logic

```typescript
// lib/admin/import-parser.ts

interface ParsedResult {
  first_name: string
  last_name: string
  school: string
  time_centiseconds: number
  place: number
  grade?: number
  gender?: string
  bib_number?: string
}

function parseTime(timeStr: string): number {
  // Handle formats: 15:30.25, 15:30, 930.25
  const parts = timeStr.split(':')
  
  if (parts.length === 2) {
    // MM:SS.CC format
    const minutes = parseInt(parts[0])
    const seconds = parseFloat(parts[1])
    return (minutes * 60 * 100) + (seconds * 100)
  } else {
    // Seconds only
    const seconds = parseFloat(timeStr)
    return seconds * 100
  }
}

function detectRaces(results: ParsedResult[]): Race[] {
  // Group by gender/category
  // Athletic.net typically has race sections
  // Detect by gaps in place numbers or changes in gender
  
  const races: Race[] = []
  let currentRace: ParsedResult[] = []
  let lastPlace = 0
  
  for (const result of results) {
    if (result.place < lastPlace || result.place - lastPlace > 2) {
      // New race detected
      if (currentRace.length > 0) {
        races.push(analyzeRace(currentRace))
      }
      currentRace = [result]
    } else {
      currentRace.push(result)
    }
    lastPlace = result.place
  }
  
  if (currentRace.length > 0) {
    races.push(analyzeRace(currentRace))
  }
  
  return races
}

function analyzeRace(results: ParsedResult[]): Race {
  // Determine gender (majority vote)
  const genders = results.map(r => r.gender).filter(Boolean)
  const maleCount = genders.filter(g => g === 'M').length
  const gender = maleCount > genders.length / 2 ? 'M' : 'F'
  
  // Determine category based on average grade
  const grades = results.map(r => r.grade).filter(Boolean)
  const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length
  
  let category = 'Varsity'
  if (avgGrade < 10.5) category = 'Frosh/Soph'
  if (avgGrade < 9.5) category = 'Freshman'
  
  return {
    name: `${category} ${gender === 'M' ? 'Boys' : 'Girls'} 5K`,
    gender,
    distance: '5K',
    category,
    results
  }
}
```

### Implementation Files

- `/app/admin/import-meet/page.tsx` - Multi-step import wizard
- `/app/api/admin/import-meet/route.ts` - Import endpoint
- `/lib/admin/import-parser.ts` - CSV parsing logic
- `/lib/admin/import-matcher.ts` - Athlete matching logic
- `/lib/admin/import-validator.ts` - Data validation

---

## ADMIN SECURITY & ACCESS CONTROL

### Role-Based Access

```typescript
// lib/admin/check-admin.ts

export async function checkAdminAccess(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .single()
  
  return profile?.role === 'admin'
}

// Middleware for admin routes
export async function adminMiddleware(req: Request) {
  const session = await getServerSession()
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const isAdmin = await checkAdminAccess(session.user.id)
  
  if (!isAdmin) {
    return new Response('Forbidden', { status: 403 })
  }
  
  return null // Allow request
}
```

### User Profiles Table

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'user',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('user', 'admin'))
);

-- Grant admin role to specific users
UPDATE user_profiles
SET role = 'admin'
WHERE email IN ('your-email@example.com');
```

---

## TESTING CHECKLIST

For each admin feature:

- [ ] Access control works (non-admins can't access)
- [ ] Validation catches all edge cases
- [ ] Confirmation prompts prevent accidental actions
- [ ] All database operations are transactional
- [ ] Errors are logged and displayed clearly
- [ ] Actions are logged in admin_log table
- [ ] Materialized view is refreshed after data changes
- [ ] UI is responsive and user-friendly

---

**Last Updated:** October 13, 2025  
**Status:** Specification Complete - Ready for Implementation
