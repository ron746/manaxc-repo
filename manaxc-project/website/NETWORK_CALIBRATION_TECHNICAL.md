# Network-Based Course Calibration: Technical Documentation

## Overview

This system implements Malcolm Slaney's network-based approach to calibrating cross country course difficulty ratings. The key insight is that **athlete performances across multiple courses provide a network of constraints** that can be used to determine optimal difficulty ratings.

## Why Network Calibration?

### The Problem with Isolated Analysis
- Analyzing courses in isolation only looks at times on that one course
- Cannot detect systematic bias (course rated too hard/easy)
- Individual athlete improvements/declines create noise
- No way to validate if a rating makes sense relative to other courses

### The Network Solution
- Use athletes who ran multiple courses as "bridges" between courses
- If an athlete runs 16:30 (normalized to 5:20/mile) on Course A and 17:00 (normalized to 5:30/mile) on Course B, we know something is wrong
- Aggregate across ALL athletes to find the true relative difficulties
- Self-correcting: more data = more accurate

## Algorithm

### Step 1: Select Anchor Course

**Chosen: Crystal Springs, 2.95 Miles**

Why?
- **1,553 total results** (largest dataset)
- Used for many invitationals and league meets
- Geographically central to our data (Bay Area)
- Athletes from many schools have results here
- Stable course (doesn't change year-to-year)

### Step 2: Load All Anchor Course Results

```typescript
// Get ALL results for Crystal Springs 2.95
// Use pagination to handle 1000+ results
for (const result of anchorResults) {
  normalized_mile_cs = (time_cs * 1609.344 / distance_meters) / difficulty_rating
}
```

### Step 3: For Each Other Course

#### 3a. Find Shared Athletes

```typescript
const sharedAthletes = anchorResults.filter(ar =>
  courseResults.some(cr => cr.athlete_id === ar.athlete_id)
)
```

#### 3b. Calculate Performance Ratios

For each shared athlete:

```typescript
// Get median performance on anchor course
const anchorNorms = anchorResults
  .filter(r => r.athlete_id === athleteId)
  .map(r => r.normalized_mile_cs)
  .sort()
const anchorMedian = anchorNorms[Math.floor(anchorNorms.length / 2)]

// Get median performance on target course
const courseNorms = courseResults
  .filter(r => r.athlete_id === athleteId)
  .map(r => r.normalized_mile_cs)
  .sort()
const courseMedian = courseNorms[Math.floor(courseNorms.length / 2)]

// Calculate ratio
// If ratio > 1: athlete is slower on target course (harder)
// If ratio < 1: athlete is faster on target course (easier)
const ratio = courseMedian / anchorMedian
```

**Why median instead of mean?**
- Resistant to outliers (one bad race doesn't skew results)
- Accounts for improvement/decline over season
- More stable than using best time or average

#### 3c. Aggregate Across All Athletes

```typescript
// Get median ratio across ALL shared athletes
const performanceRatios = [...] // array of ratios
performanceRatios.sort()
const medianRatio = performanceRatios[Math.floor(performanceRatios.length / 2)]

// Calculate implied difficulty
const impliedDifficulty = currentDifficulty * medianRatio
```

**Example:**
- North Monterey County current difficulty: 1.225
- 247 shared athletes with Crystal Springs
- Median ratio: 0.89 (athletes run faster at North Monterey)
- Implied difficulty: 1.225 × 0.89 = **1.090**
- **Recommendation: Reduce difficulty by 11%**

### Step 4: Calculate Confidence Score

```typescript
const confidence = Math.min(1.0, sharedAthletes.size / 100) * (1 - Math.min(stdDev, 0.5))
```

Factors:
- **Sample size**: More shared athletes = higher confidence
  - 10 athletes: 10% base confidence
  - 50 athletes: 50% base confidence
  - 100+ athletes: 100% base confidence
- **Consistency**: Lower standard deviation = higher confidence
  - All athletes show same pattern: multiplier close to 1.0
  - Athletes vary widely: multiplier drops toward 0.5

### Step 5: Prioritize by Discrepancy

```typescript
calibrations.sort((a, b) => {
  const aDiff = Math.abs(a.implied_difficulty - a.current_difficulty)
  const bDiff = Math.abs(b.implied_difficulty - b.current_difficulty)
  return bDiff - aDiff // Largest discrepancy first
})
```

## Handling Special Cases

### Case 1: Insufficient Shared Athletes (<10)

- Mark as "isolated"
- Keep current difficulty
- Confidence: 0%
- Flag for manual review or wait for more data

### Case 2: Inconsistent Ratios (high std dev)

- Calculate implied difficulty but flag low confidence
- May indicate:
  - Course conditions vary significantly (weather, course changes)
  - Small sample of shared athletes not representative
  - Data quality issues

### Case 3: No Direct Connection to Anchor

**Future Enhancement: Multi-hop Calibration**

```
Course A → Crystal Springs (direct)
Course B → Course A (direct)
Course B → Crystal Springs (indirect, via Course A)
```

Currently not implemented, but can be added if needed.

## Validation Approach

### 1. Hold-Out Testing

1. Split data into training (80%) and testing (20%) sets
2. Calibrate using training set
3. Predict test set performances using calibrated ratings
4. Measure prediction accuracy

**Success Metric**: 90% of predictions within ±15 seconds

### 2. Cross-Validation

For courses with high athlete overlap:
1. Remove 20% of shared athletes
2. Recalibrate using remaining 80%
3. Check if rating changes significantly
4. Repeat 5 times with different 20% removed

**Success Metric**: Rating stable within ±0.02 across all folds

### 3. Sanity Checks

- Flat courses should have difficulty near 1.0
- Hilly courses should have difficulty > 1.1
- Course records should align (harder courses = slower records)
- Altitude courses should show higher difficulty

## API Endpoint

```typescript
POST /api/admin/network-course-calibration

Response:
{
  success: true,
  anchor_course: {
    name: "Crystal Springs, 2.95 Miles",
    difficulty: 1.177163037,
    total_results: 1553
  },
  calibrations: [
    {
      course_id: "...",
      course_name: "North Monterey County High School, 3 Miles",
      current_difficulty: 1.224853686,
      implied_difficulty: 1.090234567,
      confidence: 0.87,
      shared_athletes_count: 247,
      median_ratio: 0.890,
      method: "direct",
      anchor_course: "Crystal Springs, 2.95 Miles"
    },
    ...
  ],
  summary: {
    total_courses: 26,
    directly_calibrated: 22,
    needs_review: 8
  }
}
```

## UI Location

`/admin/network-calibration`

Features:
- Run calibration analysis
- View results sorted by discrepancy
- Filter by confidence level
- See shared athlete counts
- Export recommendations

## Database Impact

After validation, apply recommended ratings:

```sql
-- Example: Update North Monterey County
UPDATE courses
SET difficulty_rating = 1.090234567
WHERE id = '...' AND name = 'North Monterey County High School, 3 Miles';

-- Trigger will automatically recalculate all normalized times
-- No need to manually update results table
```

## Ongoing Maintenance

### After Each Meet Import

1. Re-run network calibration (automated)
2. Check for courses with confidence improvements (more shared athletes)
3. Flag courses with significant rating changes (>5%)
4. Review flagged courses before applying changes
5. Update ratings in batch once validated

### Quarterly Review

1. Validate prediction accuracy on recent meets
2. Identify courses with persistent issues
3. Consider adjusting anchor course if needed
4. Document any manual overrides

## Performance Considerations

### Current Implementation
- Loads all results for all courses (26 courses × ~1000 results avg = ~26,000 queries)
- Takes 30-60 seconds to complete
- Acceptable for admin tool, not for public API

### Future Optimizations
1. **Materialized View**: Pre-calculate athlete-course matrix
2. **Incremental Updates**: Only recalculate when new data added
3. **Caching**: Cache results for 24 hours, invalidate on data changes
4. **Batch Processing**: Run nightly, store results in database

## References

- Malcolm Slaney's CrossCountryStats: https://github.com/MalcolmSlaney/CrossCountryStats
- Academic paper on network-based rating systems: TrueSkill, Elo
- Statistical methods: Robust statistics, median absolute deviation

## Success Criteria

✅ **Phase 1 (Current)**: Network calibration system working
- Calculate implied difficulties based on shared athletes
- Display results with confidence scores
- Manual review and approval process

🔄 **Phase 2 (Next)**: Validation
- Hold-out testing shows ±15 second accuracy
- Cross-validation confirms stability
- Coach feedback: "predictions are useful"

⏳ **Phase 3 (Future)**: Automation
- Automatic calibration after imports
- Alerting for significant changes
- A/B testing of rating adjustments
- Continuous accuracy monitoring
