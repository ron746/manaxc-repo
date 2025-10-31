# Malcolm Slaney's Method - CORRECT Implementation

**Status:** Based on user's coaching expertise and understanding of Malcolm's research
**Date:** October 30, 2025

## What I Got Wrong

### My Original Implementation (INCORRECT)

```
1. Calculate median normalized time on target course
2. Calculate median normalized time on anchor course
3. Calculate RATIO = target / anchor
4. Multiply current difficulty by ratio
```

**Problems:**
- Uses ratios instead of differences
- Doesn't account for athlete improvement over time
- Assumes athletes are at same fitness level in both races
- Can produce nonsensical results

### The Correct Method (Per Your Explanation)

```
1. Calculate median normalized_time_cs on target course
2. Calculate median normalized_time_cs on anchor course
3. Calculate DIFFERENCE in centiseconds
4. Adjust for time between races (improvement factor)
5. Identify statistical outliers
6. If outliers exceed threshold → course miscalibrated
7. Calculate what normalized time SHOULD be
8. Reverse engineer difficulty rating
```

## Key Insights from Your Expertise

### 1. Athlete Improvement is Predictable

**Malcolm's assumption (from your explanation):**
- 3-mile race: ~5 seconds total improvement per 2 weeks
- Per-mile equivalent: ~1.5 seconds per 2 weeks

**Why this matters:**
- Athlete runs Crystal Springs on Sept 1
- Athlete runs Toro Park on Sept 15 (2 weeks later)
- Expected improvement: 1.5 seconds/mile
- If they're 5 seconds/mile faster → 3.5 sec anomaly
- Might indicate course miscalibration

### 2. Look for Outliers, Not Exact Calibrations

**Your recommendation:**
> "If you start to see lots of runners having oddly fast times on one course you have an issue"

This is about **outlier detection**, not precision calibration:
- If 5 out of 50 athletes are 3+ seconds off → probably individual variation
- If 40 out of 50 athletes are 3+ seconds off → course is miscalibrated

**My wrong approach:** Calculate exact implied difficulty for every course
**Your correct approach:** Flag courses with systematic outliers

### 3. Cross-Reference Through Anchor

**Your insight:**
> "if you compare that course for the runners who have been on crystal 2.95 miles (or even a course well cross-related to crystal 2.95, you have a valid comparison)"

Don't need direct comparison if:
- Course A has athletes who ran Crystal Springs
- Course B has athletes who ran Crystal Springs
- Can infer A vs B relationship through transitive property

### 4. Reverse Engineering from Predicted Normalized Time

**Your workflow:**
> "If there is indeed an outlier you would adjust the normalized_time_cs to the value the AI predicts and then reverse engineer the math to get the new difficulty rating"

Example:
```
Current situation:
- Athletes' median normalized: 36000 cs (6:00/mile)
- Expected (based on anchor): 36500 cs (6:05/mile)
- They're 5 seconds too fast

Reverse engineer:
ratio = expected / actual = 36500 / 36000 = 1.0139
new_difficulty = current_difficulty * ratio
new_difficulty = 1.10 * 1.0139 = 1.115

Result: Increase difficulty by 1.39%
```

## The New SQL Function

Created: `get_course_outlier_analysis()`

### What It Does

1. **Gets athlete medians on each course**
   ```sql
   PERCENTILE_CONT(0.5) WITHIN GROUP (
     ORDER BY normalized_time_cs
   )
   ```

2. **Calculates time-adjusted differences**
   ```sql
   adjusted_difference = (course_normalized - anchor_normalized) +
                         (days_between / 14) * improvement_per_two_weeks
   ```

3. **Identifies outliers**
   ```sql
   COUNT(CASE WHEN ABS(adjusted_difference) > 300 THEN 1 END)
   ```

4. **Reverse engineers difficulty**
   ```sql
   implied_difficulty = current_difficulty *
                        (predicted_normalized / actual_normalized)
   ```

### Parameters

- `anchor_course_name`: Default 'Crystal Springs, 2.95 Miles'
- `improvement_per_two_weeks_cs`: Default 150 (1.5 sec/mile)
- `outlier_threshold_cs`: Default 300 (3 sec/mile)

### Returns

For each course:
- `median_difference_cs`: How much faster/slower than anchor (adjusted for improvement)
- `outlier_count`: Number of athletes with large discrepancies
- `outlier_percentage`: Percent of athletes flagged as outliers
- `predicted_normalized_cs`: What normalized time SHOULD be
- `implied_difficulty`: Reverse-engineered difficulty rating

## Interpretation Guide

### Example Output

```
Course: Toro Park, 2.9 Miles
median_difference_cs: -500 (5 seconds faster than expected)
outlier_count: 35 out of 45 athletes (78%)
predicted_normalized_cs: 36500 (6:05/mile)
actual_normalized_cs: 36000 (6:00/mile)
implied_difficulty: 1.115 (vs current 1.100)
```

**Interpretation:**
- Athletes run 5 sec/mile faster than expected (accounting for improvement)
- 78% of athletes show this pattern (systematic, not random)
- Course is currently rated too easy
- Should increase difficulty from 1.100 to 1.115 (1.4% increase)

### Red Flags for Miscalibration

**High confidence course is miscalibrated:**
- `outlier_percentage > 60%`: Most athletes show anomaly
- `ABS(median_difference_cs) > 300`: More than 3 sec/mile off
- `athlete_count > 30`: Large sample size
- `std_dev_cs < 400`: Consistent across athletes

**Low confidence / need more data:**
- `outlier_percentage < 30%`: Could be random variation
- `ABS(median_difference_cs) < 150`: Less than 1.5 sec/mile
- `athlete_count < 15`: Small sample
- `std_dev_cs > 600`: High variability (mixed populations?)

## Comparison to My Wrong Method

### Test Case: Course where athletes run 5 sec/mile too fast

| Metric | My Method (Ratio) | Correct Method (Difference) |
|--------|------------------|----------------------------|
| **Athlete runs target** | 36000 cs (6:00/mile) | 36000 cs (6:00/mile) |
| **Athlete runs anchor** | 36500 cs (6:05/mile) | 36500 cs (6:05/mile) |
| **Calculation** | ratio = 36000/36500 = 0.986 | diff = 36000 - 36500 = -500 cs |
| **Adjustment for improvement** | None | If 2 weeks later: -500 + 150 = -350 cs |
| **Implied difficulty** | 1.10 × 0.986 = 1.085 | 1.10 × (36500/36000) = 1.115 |
| **Interpretation** | 1.4% easier | 1.4% harder (CORRECT) |

**My method got the direction backwards!** Because I used ratios, I thought athletes running faster meant easier course. Your method correctly identifies that if athletes are faster than expected (accounting for improvement), the course must be harder than rated.

## Why Distance Filtering Still Matters

Even with correct time-difference method, need to filter by distance because:
- Pacing strategy changes with distance
- 2-mile races: 95-100% effort sustainable
- 3-mile races: 90-95% effort sustainable
- This affects absolute normalized times, not just ratios

Your 15% tolerance (2.5 to 3.4 miles for 2.95 anchor) is correct.

## Integration with AI Analysis

Your suggested workflow:
1. **Run network analysis** → Identifies outliers
2. **For flagged courses, run AI analysis** → Predicts what normalized time should be
3. **AI provides reasoning** → Explains why (terrain, elevation, etc.)
4. **Reverse engineer difficulty** → Calculate new rating
5. **Manual review** → Coach approves based on domain knowledge

This is exactly what the recommendation system now does:
- Network analysis flags outliers
- AI provides detailed reasoning
- You manually approve/dismiss

## Next Steps

1. Apply new SQL function (`20251030_correct_malcolm_slaney_method.sql`)
2. Update route to use `get_course_outlier_analysis()` instead of `get_all_course_calibrations()`
3. Update UI to show:
   - Median difference (in seconds/mile, not ratio)
   - Outlier count and percentage
   - Predicted vs actual normalized times
4. Test with known courses to validate

## Questions for You

1. **Is 1.5 sec/mile per 2 weeks the right improvement factor?**
   - Boys might be different from girls
   - Early season vs late season?

2. **What should outlier threshold be?**
   - Currently 3 sec/mile
   - Too sensitive? Too loose?

3. **Should we account for gender-specific improvement patterns?**
   - You mentioned girls' improvement is highly variable due to puberty

4. **What about course familiarity effects?**
   - Athletes might run faster on home courses due to familiarity

---

**Key Takeaway:** Malcolm's method is about **outlier detection**, not exact calibration. Find courses where athletes systematically deviate from expected performance (accounting for improvement), then use AI to explain why and predict correct rating.
