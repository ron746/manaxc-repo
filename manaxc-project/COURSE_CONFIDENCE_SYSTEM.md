# Course Confidence Ranking System

**Status:** ✅ IMPLEMENTED
**Date:** October 30, 2025
**Priority:** HIGH - Essential for reliable difficulty calibration

## Overview

Not all courses are equally reliable for calibration. This system assigns confidence scores (0.0 to 1.0) to each course based on data quality, consistency, and testing depth.

## Key Insight from User

> "Always give greater weight to races compared directly against a highly tested course. As we build our database you should be able to apply confidence rankings on a courses difficulty rating."

**Translation:**
- Direct comparisons (Athlete ran both Course A and Crystal Springs) >> Transitive comparisons
- Well-tested courses = more reliable anchors
- Confidence should affect recommendation weighting

## Confidence Score Components

### 1. Result Count (up to 40% of score)

**Logic:** More data = more confidence
```
confidence += min(0.4, result_count / 500)
```

**Examples:**
- 500+ results: Full 0.4 points
- 250 results: 0.2 points
- 50 results: 0.04 points

### 2. Season Count (up to 20% of score)

**Logic:** Consistency across seasons = reliable course
```
confidence += min(0.2, season_count / 5)
```

**Examples:**
- 5+ seasons: Full 0.2 points
- 3 seasons: 0.12 points
- 1 season: 0.04 points

### 3. Low Variance (up to 20% of score)

**Logic:** Small season-to-season variance = course hasn't changed
```
confidence += max(0.0, 0.2 - (variance / 2500))
```

**Examples:**
- Variance < 250cs (2.5 sec): Full 0.2 points
- Variance = 500cs (5 sec): 0.1 points
- Variance > 500cs: Penalty increases

**Red flags:**
- High variance might indicate:
  - Course was altered between seasons
  - Extreme weather in some years
  - Data quality issues
  - Mixed populations (different skill levels)

### 4. Shared Athletes with Anchor (up to 20% of score)

**Logic:** More connections to high-confidence anchor = more reliable
```
confidence += min(0.2, shared_athlete_count / 100)
```

**Examples:**
- 100+ athletes ran both this course and Crystal Springs: Full 0.2 points
- 50 shared athletes: 0.1 points
- 10 shared athletes: 0.02 points

## Manual Overrides

**Crystal Springs, 2.95 Miles:**
- Confidence: **1.0000** (maximum)
- Reason: Primary anchor course, most tested
- Notes: "Primary anchor course - highest confidence"

## Season-to-Season Anomaly Detection

### Purpose

Identify seasons where course performance significantly deviates from historical average.

### Method

For each course:
1. Calculate median normalized time per season
2. Calculate overall mean and standard deviation
3. Identify seasons with z-score > 2.0 (2+ standard deviations from mean)
4. Flag possible causes

### Possible Causes of Anomalies

**Slower than usual (positive deviation > 300cs):**
- Hot weather (race on 90°F day vs usual 65°F)
- Course altered (made longer/harder)
- Weaker competition pool
- Poor course conditions (mud, standing water)

**Faster than usual (negative deviation > 300cs):**
- Ideal weather conditions
- Course altered (made shorter/easier)
- Stronger competition pool
- Course familiarity (athletes trained on it)

### Example Query

```sql
SELECT * FROM detect_season_anomalies('course_id_here');
```

**Output:**
```
season | result_count | median_normalized_cs | deviation_cs | z_score | is_anomaly | possible_causes
-------|-------------|---------------------|-------------|---------|-----------|------------------
2024   | 145         | 36200               | +500        | 2.3     | true      | {Hot weather, Course altered}
2023   | 138         | 35700               | 0           | 0.0     | false     | {Normal variation}
2022   | 142         | 35650               | -50         | -0.2    | false     | {Normal variation}
```

## Confidence-Weighted Comparisons

### The Problem

Old approach treated all comparisons equally:
- 10 athletes comparing Course A to Crystal Springs
- 10 athletes comparing Course A to an unreliable course

Both got same weight, but first is much more reliable.

### The Solution

**Final confidence formula:**
```
final_confidence =
  anchor_confidence *           // Crystal Springs = 1.0
  course_confidence *           // Target course confidence
  sample_size_factor *          // min(1.0, athlete_count / 100)
  consistency_factor *          // 1.0 - min(0.5, std_dev / 500)
  comparison_quality *          // avg(athlete_comparison_quality)
  high_quality_percentage       // % of athletes with 3+ races on each
```

### Example Calculation

**High-confidence comparison:**
```
Course: Toro Park (confidence 0.85)
Anchor: Crystal Springs (confidence 1.0)
Athletes: 75 shared
Std dev: 300cs (3 seconds)
Avg comparison quality: 0.9 (athletes have many races on each)
High-quality %: 85%

final_confidence =
  1.0 *          // Crystal Springs
  0.85 *         // Toro Park
  0.75 *         // 75 athletes (0.75 of max 100)
  0.88 *         // Consistency (1.0 - 300/2500)
  0.9 *          // Comparison quality
  0.85           // 85% high-quality
= 0.408 (41% confidence)
```

**Low-confidence comparison:**
```
Course: Obscure Park (confidence 0.30)
Anchor: Crystal Springs (confidence 1.0)
Athletes: 15 shared
Std dev: 600cs (6 seconds)
Avg comparison quality: 0.4 (athletes have few races on each)
High-quality %: 20%

final_confidence =
  1.0 *
  0.30 *
  0.15 *         // Only 15 athletes
  0.76 *         // Higher variance
  0.4 *
  0.20
= 0.007 (0.7% confidence - essentially unreliable)
```

## Using Confidence Scores

### For Recommendations

**High confidence (> 0.7):**
- Apply recommendation with confidence
- Large discrepancy + high confidence = definitely miscalibrated

**Medium confidence (0.4 - 0.7):**
- Review recommendation carefully
- Compare with AI analysis
- Consider running more meets on this course

**Low confidence (< 0.4):**
- Treat as suggestion only
- Need more data before applying
- Flag for manual investigation

### For AI Analysis

When AI analyzes a course, provide confidence context:
```
"This course has confidence score 0.85 (high), based on:
- 234 results across 4 seasons
- Low variance (season-to-season std dev: 2.8 seconds)
- 67 athletes also ran Crystal Springs
- No detected anomalies

This makes the comparison highly reliable."
```

vs

```
"This course has confidence score 0.32 (low), based on:
- Only 47 results from 1 season
- High variance (can't calculate season-to-season)
- Only 8 athletes also ran Crystal Springs
- Need more data for reliable calibration

Recommendation: Run more meets here before adjusting difficulty."
```

## Database Schema

### courses table (new columns)

```sql
confidence_score numeric(5,4) DEFAULT 0.5000
  -- 0.0000 to 1.0000
  -- Calculated based on result count, variance, shared athletes

confidence_notes text
  -- Human-readable explanation
  -- e.g., "High variance in 2023 season - possible course alteration"

last_confidence_update timestamptz
  -- When was confidence last recalculated
  -- Should update after each import
```

### Functions

**`calculate_course_confidence(course_id)`**
- Returns: numeric(5,4)
- Calculates confidence based on 4 factors
- Use after importing new results

**`detect_season_anomalies(course_id)`**
- Returns: table with season, deviation, z-score, causes
- Identifies seasons with unusual performance
- Helps spot course changes or extreme conditions

**`get_course_outlier_analysis(anchor, improvement, threshold)`**
- Now includes confidence weighting
- Returns: final_confidence for each recommendation
- Prioritizes high-confidence comparisons

## Updating Confidence Scores

### After Each Import

```sql
-- Update single course
UPDATE courses
SET
  confidence_score = calculate_course_confidence(id),
  last_confidence_update = NOW()
WHERE id = 'new_course_id';
```

### Bulk Update All Courses

```sql
DO $$
DECLARE
  course_record RECORD;
BEGIN
  FOR course_record IN SELECT id FROM courses LOOP
    UPDATE courses
    SET
      confidence_score = calculate_course_confidence(course_record.id),
      last_confidence_update = NOW()
    WHERE id = course_record.id;
  END LOOP;
END $$;
```

### When to Recalculate

1. **After importing new results** - More data changes confidence
2. **Start of new season** - Check for season-to-season variance
3. **Manual trigger** - When you suspect a course changed
4. **Quarterly** - Periodic maintenance

## UI Display

### Course Analysis Page

Show confidence with visual indicator:
```
Toro Park, 2.9 Miles
Confidence: ████████░░ 85% (High)
- 234 results across 4 seasons
- Consistent performance (low variance)
- 67 athletes also ran Crystal Springs
```

### Recommendation Cards

```
Network Calibration Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Toro Park: 1.150 → 1.125 (-2.2%)

Confidence: 85% ████████░░ HIGH
├─ Anchor confidence: 100% (Crystal Springs)
├─ Course confidence: 85%
├─ Sample size: 67 athletes
└─ Comparison quality: 92%

✓ Safe to apply
```

vs

```
Network Calibration Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Obscure Park: 1.200 → 1.150 (-4.2%)

Confidence: 32% ███░░░░░░░ LOW
├─ Anchor confidence: 100% (Crystal Springs)
├─ Course confidence: 30%
├─ Sample size: 8 athletes (too few!)
└─ Comparison quality: 40%

⚠️ Need more data before applying
```

## Seasonal Anomaly Report

Add to admin tools:
```
Season-to-Season Variance Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toro Park, 2.9 Miles
┌──────┬─────────┬──────────┬───────────┬────────────────────────┐
│Season│ Results │ Median   │ Deviation │ Possible Causes        │
├──────┼─────────┼──────────┼───────────┼────────────────────────┤
│ 2024 │   68    │ 6:05/mi  │  +8 sec   │ ⚠️ Hot weather year    │
│ 2023 │   62    │ 5:58/mi  │  +1 sec   │ Normal                 │
│ 2022 │   59    │ 5:57/mi  │   0 sec   │ Normal (baseline)      │
│ 2021 │   45    │ 5:55/mi  │  -2 sec   │ Normal                 │
└──────┴─────────┴──────────┴───────────┴────────────────────────┘

🔍 Investigation needed: 2024 season significantly slower
   → Check weather data for meets in 2024
   → Verify course was not altered
```

## Key Takeaways

1. **Not all courses are equal** - Crystal Springs is most reliable
2. **Direct comparisons preferred** - Athlete ran both courses
3. **Confidence compounds** - High-confidence anchor + high-confidence course = reliable recommendation
4. **Variance is a red flag** - High season-to-season variance needs investigation
5. **Use confidence in decisions** - Don't apply low-confidence recommendations

---

**Next Steps:**
1. Apply migration to add confidence columns
2. Calculate initial confidence scores
3. Update UI to display confidence
4. Build seasonal anomaly report
5. Use confidence in recommendation workflow
