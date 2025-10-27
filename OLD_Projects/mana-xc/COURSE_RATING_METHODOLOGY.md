# Course Rating Methodology & Testing Guide

## Overview

The **XC Time Rating System** (also called "1-Mile Track Equivalent Factor") normalizes race times across different courses and distances. This allows fair comparison of athlete performance regardless of course difficulty.

**Key Concept**: A rating of 1.050 means the course is 5% harder than the baseline (Crystal Springs = 1.000), so times will be ~5% slower.

---

## Methodology Inspiration

This system is inspired by **Malcolm Slaney's Bayesian Course Difficulty Model**:
- Repository: https://github.com/MalcolmSlaney/CrossCountryStats
- Uses Bayesian modeling to estimate course difficulties across California
- Accounts for runner ability, course difficulty, and seasonal improvement
- Normalizes all courses to Crystal Springs (difficulty = 1.0)

### Malcolm Slaney's Formula

```
race_time = (average_race_time - race_month*month_slope - student_year*year_slope)
            * runner_ability * course_difficulty
```

**Variables:**
- `course_difficulty`: Multiplicative factor (>1 = harder, <1 = easier)
- `runner_ability`: Individual runner speed (<1 = faster, >1 = slower)
- `month_slope`: Average improvement per month during season
- `year_slope`: Average improvement per year (freshman → senior)

**Key Insight**: Uses overlapping race results (runners who compete on multiple courses) to solve for both runner abilities and course difficulties simultaneously using Bayesian inference.

---

## Mana XC Implementation

### Database Schema

**`races` table:**
- `xc_time_rating` (NUMERIC, default: 1.000): Course difficulty multiplier
- Higher values = harder courses = slower expected times
- Lower values = easier courses = faster expected times

**Example:**
- Crystal Springs: `xc_time_rating = 1.000` (baseline)
- Toro Park: `xc_time_rating = 1.050` (5% harder)
- Baylands: `xc_time_rating = 0.980` (2% easier)

### Normalization Formula

```sql
normalized_time_cs = raw_time_cs * xc_time_rating
```

**Example:**
- Runner's time at Toro Park: 17:30.0 (105,000 cs)
- Toro Park rating: 1.050
- Normalized time: 105,000 × 1.050 = 110,250 cs (18:22.5)
- This represents their "equivalent Crystal Springs time"

### Materialized View

```sql
CREATE MATERIALIZED VIEW athlete_xc_times_v3 AS
SELECT
  r.athlete_id,
  MIN(r.time_cs * ra.xc_time_rating) as best_xc_time_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
WHERE r.time_cs > 0
GROUP BY r.athlete_id;
```

**Purpose**: Pre-calculates each athlete's best normalized XC time for fast leaderboard queries.

**CRITICAL**: Must refresh after any rating changes:
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;
```

---

## Statistical Testing & Validation

### Admin Tool Location
**URL**: `http://localhost:3001/admin/course-ratings`

### Testing Methodology

The course rating validation system uses a **statistical analysis approach** similar to Malcolm Slaney's method:

1. **Identify Overlapping Runners**
   - Find runners who competed in multiple races at different courses
   - These runners serve as "calibration points" between courses

2. **Calculate Expected vs. Actual Performance**
   - For each runner who competed at multiple courses:
     ```
     expected_time_at_course_B = actual_time_at_course_A * (rating_B / rating_A)
     actual_time_at_course_B = runner's actual race time
     error = expected_time_at_course_B - actual_time_at_course_B
     ```

3. **Aggregate Analysis**
   - Mean error: Indicates systematic over/underestimation
   - Standard deviation: Indicates consistency of the rating
   - Outliers: Identify anomalies (injuries, wrong course, data errors)

4. **Suggested Rating Adjustment**
   - If mean error is significantly different from zero, suggest new rating
   - Use median or robust averaging to handle outliers
   - Confidence intervals based on sample size

### Supabase RPC Functions

**`admin_analyze_race_rating(p_race_id UUID)`**
- Returns runner-by-runner analysis for a specific race
- Shows each runner's:
  - Other races they competed in
  - Expected time vs. actual time
  - Prediction error
  - Contribution to rating estimate

**`admin_suggest_course_rating(p_race_id UUID)`**
- Returns aggregated statistics:
  - Current rating
  - Suggested new rating
  - Mean error (in centiseconds)
  - Standard deviation
  - Sample size (number of overlapping runners)
  - Confidence interval

### API Endpoint

**`POST /api/admin/rating-analysis`**

**Request:**
```json
{
  "race_id": "uuid-of-race"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": [
    {
      "runner_name": "John Doe",
      "reference_course": "Crystal Springs",
      "reference_time_cs": 105000,
      "expected_time_cs": 110250,
      "actual_time_cs": 112000,
      "error_cs": 1750,
      "error_percent": 1.6
    }
  ],
  "suggested_rating": {
    "current_rating": 1.050,
    "suggested_rating": 1.067,
    "mean_error_cs": 1750,
    "std_dev_cs": 3200,
    "sample_size": 45,
    "confidence_95_lower": 1.055,
    "confidence_95_upper": 1.079
  },
  "runner_count": 45
}
```

---

## Testing Workflow

### Step 1: Navigate to Course Ratings Tool
```
http://localhost:3001/admin/course-ratings
```

### Step 2: Select a Race to Test
- Choose a race with sufficient overlapping runners (>20 recommended)
- Races from large invitationals work best (e.g., "Baylands Invitational Varsity Boys")

### Step 3: Run Statistical Analysis
- Click "Analyze Rating" button
- System will:
  1. Find all runners who competed in this race AND other races
  2. Calculate expected times based on current ratings
  3. Compare expected vs. actual times
  4. Aggregate statistics across all runners

### Step 4: Review Results

**Check for:**
- **Sample Size**: Need at least 20 overlapping runners for reliable estimate
- **Mean Error**: Should be close to 0 cs (±500 cs acceptable)
  - Positive error → rating too low (course is harder than estimated)
  - Negative error → rating too high (course is easier than estimated)
- **Standard Deviation**: Lower is better (<5000 cs is good)
- **Outliers**: Runners with extreme errors (>10,000 cs) - investigate data quality

### Step 5: Adjust Rating (if needed)

**Acceptance Criteria:**
- Mean error < 500 cs → Rating is accurate, no change needed
- Mean error 500-2000 cs → Consider adjustment
- Mean error > 2000 cs → Definitely adjust rating

**How to Adjust:**
- Use suggested_rating from analysis
- OR manually calculate:
  ```
  new_rating = current_rating * (1 + mean_error_percent / 100)
  ```

**Example:**
- Current rating: 1.050
- Mean error: +1750 cs (1.6% too slow)
- New rating: 1.050 × 1.016 = 1.067

### Step 6: Apply and Refresh
1. Update the race's `xc_time_rating` field
2. **CRITICAL**: Run `REFRESH MATERIALIZED VIEW athlete_xc_times_v3;`
3. Verify leaderboard updates correctly

---

## Test Cases

### Test Case A: Well-Calibrated Course
**Expected Result:**
- Mean error: -50 cs (essentially zero)
- Std dev: 3500 cs
- Sample size: 67 runners
- **Action**: No change needed

### Test Case B: Systematic Underestimation
**Expected Result:**
- Mean error: +2400 cs (times consistently slower than expected)
- Current rating: 1.000
- Suggested rating: 1.023
- **Action**: Increase rating from 1.000 → 1.023

### Test Case C: Systematic Overestimation
**Expected Result:**
- Mean error: -1800 cs (times consistently faster than expected)
- Current rating: 1.080
- Suggested rating: 1.063
- **Action**: Decrease rating from 1.080 → 1.063

### Test Case D: Insufficient Data
**Expected Result:**
- Sample size: 8 runners
- **Action**: Do not adjust - wait for more race data

---

## Implementation Checklist

✅ **Database Schema**
- `races.xc_time_rating` field exists (NUMERIC, default 1.000)
- Materialized view `athlete_xc_times_v3` uses rating in calculation

✅ **Supabase RPC Functions**
- `admin_analyze_race_rating(p_race_id UUID)` implemented
- `admin_suggest_course_rating(p_race_id UUID)` implemented

✅ **API Endpoint**
- `/api/admin/rating-analysis` route exists
- Returns analysis + suggested rating
- Admin-only access control

✅ **Admin UI**
- `/admin/course-ratings` page exists
- Displays race list with current ratings
- "Analyze Rating" button triggers statistical test
- Shows runner-by-runner breakdown
- Displays aggregated statistics
- Allows manual rating adjustment

❓ **Needs Verification**
- [ ] Test with real race data (requires populated database)
- [ ] Verify statistical calculations are correct
- [ ] Ensure materialized view refresh is triggered after rating updates
- [ ] Test with various sample sizes (5, 20, 50, 100+ runners)
- [ ] Validate confidence interval calculations

---

## Future Enhancements

### 1. Bayesian Model Implementation
- Implement full Bayesian model like Malcolm Slaney
- Account for:
  - Month-to-month improvement during season
  - Year-to-year improvement (freshman → senior)
  - Weather conditions
  - Course condition changes

### 2. Automated Rating Updates
- Batch process to analyze all races after each meet
- Automatically suggest rating adjustments
- Flag races with high uncertainty for manual review

### 3. Weather Adjustments
- Track weather conditions during each race
- Adjust ratings based on:
  - Temperature
  - Wind speed
  - Precipitation
  - Course wetness

### 4. Historical Rating Tracking
- Store rating history over time
- Track when and why ratings changed
- Visualize rating evolution

### 5. Cross-Validation
- Hold out 20% of races for testing
- Validate model predictions on unseen data
- Calculate prediction accuracy metrics

---

## References

1. **Malcolm Slaney's Cross Country Stats**
   - GitHub: https://github.com/MalcolmSlaney/CrossCountryStats
   - Live Results: https://malcolmslaney.github.io/CrossCountryStats/
   - Methodology: Bayesian modeling with PyMC3

2. **Related Concepts**
   - ELO Rating System (chess)
   - TrueSkill (gaming)
   - PageRank (graph-based ranking)
   - Bradley-Terry Models (pairwise comparisons)

3. **Statistical Methods**
   - Bayesian Inference
   - Maximum Likelihood Estimation
   - Robust Statistics (handling outliers)
   - Bootstrap Confidence Intervals

---

## Quick Reference

### Essential Commands
```bash
# Navigate to admin tool
open http://localhost:3001/admin/course-ratings

# Refresh materialized view (after rating change)
psql -c "REFRESH MATERIALIZED VIEW athlete_xc_times_v3;"
```

### Key Formulas
```
# Normalize time to baseline
normalized_time = raw_time * xc_time_rating

# Predict time at different course
predicted_time_B = actual_time_A * (rating_B / rating_A)

# Calculate rating adjustment
new_rating = current_rating * (1 + mean_error_percent / 100)
```

### Acceptance Thresholds
- **Good**: Mean error < 500 cs (< 0.5%)
- **Acceptable**: Mean error < 2000 cs (< 2%)
- **Needs Adjustment**: Mean error > 2000 cs (> 2%)
- **Minimum Sample Size**: 20 overlapping runners

---

**Last Updated**: October 18, 2025
**Status**: System implemented, awaiting real-world testing
