# Course Normalization Algorithm - CORE LOGIC

**THIS IS THE KEY DIFFERENTIATOR OF MANA XC**

This document describes the exact algorithm for normalizing cross country race times to a standard baseline (track mile at difficulty 1.0) and projecting times to any target course.

---

## Overview

The normalization process converts any race result to an equivalent **track mile time** (1609.344 meters at difficulty rating 1.0). This allows fair comparison of performances across different courses and accurate projection to hypothetical future races.

---

## Constants

```typescript
const METERS_PER_MILE = 1609.344
```

---

## Part 1: Normalization (Race Time → Track Mile Time)

### Purpose
Convert an actual race result to an equivalent track mile time, accounting for:
- Course distance (e.g., 5000m, 4410m, 4748m)
- Course difficulty rating (e.g., 1.13 for flat 5K, 1.205 for hilly 2.74 mile)

### Formula

```typescript
// Step 1: Get pace per meter
pace_per_meter = time_cs / race_distance_meters

// Step 2: Convert to mile pace (per 1609.344 meters)
mile_pace = pace_per_meter * METERS_PER_MILE

// Step 3: Normalize to difficulty 1.0 (track baseline)
normalized_time_cs = mile_pace / difficulty_rating
```

### Example Calculation

**Given:**
- Actual time: 15:29.00 = **92,900 centiseconds**
- Race distance: **4,410 meters** (2.74 mile course)
- Difficulty rating: **1.205297234**

**Calculate:**
```
pace_per_meter = 92,900 / 4,410 = 21.07 cs/meter

mile_pace = 21.07 * 1609.344 = 33,902.05 cs

normalized_time_cs = 33,902.05 / 1.205297234 = 28,127.55 cs
```

**Result:** 28,127.55 cs = **4:41.28** track mile equivalent

---

## Part 2: Projection (Track Mile Time → Target Course Time)

### Purpose
Project a normalized track mile time to what an athlete would run on any target course, accounting for:
- Target course distance
- Target course difficulty

### Formula

```typescript
// Step 1: Convert back to pace per meter
pace_per_meter = normalized_time_cs / METERS_PER_MILE

// Step 2: Scale to target distance
scaled_time = pace_per_meter * target_distance_meters

// Step 3: Apply target course difficulty
projected_time = scaled_time * target_difficulty_rating
```

### Example Calculation

**Given:**
- Normalized time: **28,127.55 cs** (4:41.28 track mile)
- Target course: **4,748 meters** (2.95 mile course)
- Target difficulty: **1.177163037**

**Calculate:**
```
pace_per_meter = 28,127.55 / 1609.344 = 17.48 cs/meter

scaled_time = 17.48 * 4,748 = 82,983.87 cs

projected_time = 82,983.87 * 1.177163037 = 97,685 cs
```

**Result:** 97,685 cs = **16:16.86** projected time

---

## Complete Code Implementation

### Normalization (when loading results)

```typescript
const METERS_PER_MILE = 1609.344

function normalizeTime(time_cs: number, distance_meters: number, difficulty_rating: number): number {
  // Step 1: Get pace per meter
  const pacePerMeter = time_cs / distance_meters

  // Step 2: Convert to mile pace
  const milePace = pacePerMeter * METERS_PER_MILE

  // Step 3: Normalize to difficulty 1.0
  const normalizedTime = milePace / difficulty_rating

  return Math.round(normalizedTime)
}
```

### Projection (when displaying/comparing times)

```typescript
function projectTime(
  normalized_time_cs: number,
  target_distance_meters: number,
  target_difficulty_rating: number
): number {
  // Step 1: Convert to pace per meter
  const pacePerMeter = normalized_time_cs / METERS_PER_MILE

  // Step 2: Scale to target distance
  const scaledTime = pacePerMeter * target_distance_meters

  // Step 3: Apply target difficulty
  const projectedTime = scaledTime * target_difficulty_rating

  return Math.round(projectedTime)
}
```

---

## Key Insights

### Why This Works

1. **Distance Independence**: By converting to a per-mile pace, we can compare performances across different race lengths (5K vs 3-mile vs 2.74-mile)

2. **Difficulty Normalization**: Dividing by difficulty rating normalizes harder courses down and easier courses up to a standard baseline

3. **Reversible**: The projection formula exactly reverses the normalization, so projecting back to the original course yields the original time

4. **Fair Comparisons**: An athlete's best normalized time across all courses represents their "true" ability

### Course Difficulty Ratings

- **1.0** = Track mile (baseline, theoretical minimum)
- **1.10-1.135** = Easiest quartile of XC courses (very flat, fast grass/dirt)
- **1.135-1.176** = Second quartile (mostly flat with minor elevation)
- **1.176-1.241** = Third quartile (rolling hills, moderate terrain)
- **~1.156** = Average difficulty (fairly flat 2.7 mile course)

Real Examples:
- Baylands Park 5K: **1.1298** (flat, fast - easiest quartile)
- Crystal Springs 2.95mi: **1.1772** (rolling hills - third quartile)
- Montgomery Hill 2.74mi: **1.2053** (hilly - third quartile)

**Note:** Most cross country courses fall between **1.10 and 1.25**. Track mile (1.0) is the theoretical baseline but actual XC courses are always harder due to grass, dirt, and elevation.

---

## Database Storage Strategy

### Current Implementation
- `results.time_cs` - Actual race time in centiseconds
- `normalized_time_cs` - Calculated on-the-fly in application code

### Recommended Optimization

#### 1. Add normalized_time_cs to results table

```sql
ALTER TABLE results
ADD COLUMN normalized_time_cs INTEGER;

CREATE INDEX idx_results_normalized ON results(normalized_time_cs);
```

#### 2. Create athlete_best_times table for fast lookups

```sql
CREATE TABLE athlete_best_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Season best
  season_year INTEGER NOT NULL,
  season_best_time_cs INTEGER NOT NULL,
  season_best_normalized_cs INTEGER NOT NULL,
  season_best_result_id UUID REFERENCES results(id),
  season_best_course_id UUID REFERENCES courses(id),
  season_best_race_distance_meters INTEGER NOT NULL,

  -- All-time personal best
  alltime_best_time_cs INTEGER NOT NULL,
  alltime_best_normalized_cs INTEGER NOT NULL,
  alltime_best_result_id UUID REFERENCES results(id),
  alltime_best_course_id UUID REFERENCES courses(id),
  alltime_best_race_distance_meters INTEGER NOT NULL,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(athlete_id, season_year)
);

CREATE INDEX idx_athlete_best_times_athlete ON athlete_best_times(athlete_id);
CREATE INDEX idx_athlete_best_times_season ON athlete_best_times(season_year);
CREATE INDEX idx_athlete_best_times_season_normalized ON athlete_best_times(season_best_normalized_cs);
CREATE INDEX idx_athlete_best_times_alltime_normalized ON athlete_best_times(alltime_best_normalized_cs);
```

#### 3. Trigger to maintain athlete_best_times

**How it works:**
- Every time a result is inserted or updated, the trigger automatically:
  1. Calculates the normalized time for that result
  2. Checks if it's better than the athlete's current season best for that year
  3. Checks if it's better than the athlete's all-time personal best
  4. Updates `athlete_best_times` table accordingly

**Benefits:**
- `athlete_best_times` is always current (no manual updates needed)
- Season bests and all-time bests are instantly available
- Fast queries for rankings, projections, and comparisons

```sql
CREATE OR REPLACE FUNCTION update_athlete_best_times()
RETURNS TRIGGER AS $$
DECLARE
  v_course RECORD;
  v_normalized_cs INTEGER;
  v_season_year INTEGER;
BEGIN
  -- Get course info and season
  SELECT
    c.distance_meters,
    c.difficulty_rating,
    m.season_year
  INTO v_course
  FROM races r
  JOIN courses c ON r.course_id = c.id
  JOIN meets m ON r.meet_id = m.id
  WHERE r.id = NEW.race_id;

  v_season_year := v_course.season_year;

  -- Calculate normalized time
  v_normalized_cs := ROUND(
    (NEW.time_cs::DECIMAL / v_course.distance_meters) * 1609.344 / v_course.difficulty_rating
  );

  -- Update results table
  NEW.normalized_time_cs := v_normalized_cs;

  -- Update or insert into athlete_best_times
  INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_normalized_cs,
    season_best_result_id,
    season_best_course_id,
    season_best_race_distance_meters,
    alltime_best_time_cs,
    alltime_best_normalized_cs,
    alltime_best_result_id,
    alltime_best_course_id,
    alltime_best_race_distance_meters
  )
  VALUES (
    NEW.athlete_id,
    v_season_year,
    NEW.time_cs,
    v_normalized_cs,
    NEW.id,
    v_course.id,
    v_course.distance_meters,
    NEW.time_cs,
    v_normalized_cs,
    NEW.id,
    v_course.id,
    v_course.distance_meters
  )
  ON CONFLICT (athlete_id, season_year) DO UPDATE
  SET
    season_best_time_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN NEW.time_cs
      ELSE athlete_best_times.season_best_time_cs
    END,
    season_best_normalized_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN v_normalized_cs
      ELSE athlete_best_times.season_best_normalized_cs
    END,
    season_best_result_id = CASE
      WHEN v_normalized_cs < athlete_best_times.season_best_normalized_cs
      THEN NEW.id
      ELSE athlete_best_times.season_best_result_id
    END,
    alltime_best_time_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN NEW.time_cs
      ELSE athlete_best_times.alltime_best_time_cs
    END,
    alltime_best_normalized_cs = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN v_normalized_cs
      ELSE athlete_best_times.alltime_best_normalized_cs
    END,
    alltime_best_result_id = CASE
      WHEN v_normalized_cs < athlete_best_times.alltime_best_normalized_cs
      THEN NEW.id
      ELSE athlete_best_times.alltime_best_result_id
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_athlete_best_times_trigger
BEFORE INSERT OR UPDATE ON results
FOR EACH ROW
EXECUTE FUNCTION update_athlete_best_times();
```

---

## Performance Benefits

### Without Optimization (Current)
- Season projection page: Load ALL results for selected seasons (1000+ rows)
- Calculate normalized time for EVERY result in JavaScript
- Filter to season-best per athlete in JavaScript
- **Slow, memory intensive**

### With Optimization (Proposed)
- Season projection page: Query `athlete_best_times` table (50-100 rows)
- `normalized_time_cs` already calculated and indexed
- Season-best and all-time-best already computed
- **Fast, efficient**

### Query Comparison

**Before:**
```typescript
// Load 1000+ results, calculate everything client-side
const { data } = await supabase
  .from('results')
  .select('*, races(*, courses(*)), athletes(*)')
  .in('races.meets.season_year', [2024, 2025])
```

**After:**
```typescript
// Load 50 pre-computed season-best records
const { data } = await supabase
  .from('athlete_best_times')
  .select('*, athletes(*, schools(*))')
  .eq('season_year', 2024)
```

---

## Testing the Algorithm

### Verification Script

```typescript
function verifyNormalization() {
  // Test case from your example
  const actual_time_cs = 92900 // 15:29.00
  const race_distance_meters = 4410 // 2.74 miles
  const difficulty_rating = 1.205297234

  const normalized = normalizeTime(actual_time_cs, race_distance_meters, difficulty_rating)

  console.log(`Normalized: ${normalized} cs (expected: 28127.55)`)
  console.assert(Math.abs(normalized - 28127.55) < 1, 'Normalization failed')

  // Test projection
  const target_distance = 4748 // 2.95 miles
  const target_difficulty = 1.177163037

  const projected = projectTime(normalized, target_distance, target_difficulty)

  console.log(`Projected: ${projected} cs (expected: 97685)`)
  console.assert(Math.abs(projected - 97685) < 1, 'Projection failed')

  console.log('✓ Algorithm verified!')
}
```

---

## Related Files

- `/Users/ron/manaxc/manaxc-project/website/app/season/page.tsx` - Season projection implementation
- `/Users/ron/manaxc/manaxc-project/reference/COURSE-RATING-CONVERSION-ANALYSIS.md` - Original Excel analysis
- `/Users/ron/manaxc/manaxc-project/docs/data-schema.md` - Database schema

---

**Last Updated:** 2025-10-28
**Version:** 1.0
**Status:** CRITICAL - DO NOT MODIFY WITHOUT UNDERSTANDING**
