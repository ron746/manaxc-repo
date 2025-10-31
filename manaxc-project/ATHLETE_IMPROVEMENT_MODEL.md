# Athlete-Specific Improvement Model

**Status:** ✅ IMPLEMENTED
**Based on:** User's coaching expertise
**Date:** October 30, 2025

## Key Insights from Coach

### 1. Improvement Rates Vary by Ability Level

> "Elite athletes will improve about 1 second a week. Slower runners will see greater returns."

**Translation:**
- **Elite** (< 5:20/mile): ~1 sec/week improvement
- **Slower runners**: 2-3+ sec/week improvement (counterintuitive but true!)
- Beginners have more room for improvement

### 2. Gender-Specific Patterns

> "Ladies will typically see a rise about the same and then you will notice a plateau and then a small to medium decline as their body changes and they become more tired, frustrated or iron-deficient"

**Translation:**
- Girls: Similar initial improvement as boys
- Mid-season: Plateau (performance flattens)
- Late season: Small-to-medium decline
- Causes: Physiological changes, fatigue, iron deficiency, frustration

**Implications:**
- Can't use fixed improvement rate for girls
- Must detect plateau/decline patterns
- Timing within season matters

## The Old (Wrong) Approach

**Fixed rate for everyone:**
```python
improvement = 1.5 sec/mile per 2 weeks  # Same for all athletes
adjusted_diff = raw_diff - (weeks * 1.5 * 100cs)
```

**Problems:**
- Elite athlete improves 1 sec/week, we assumed 0.75 sec/week → overestimate improvement
- Novice improves 2.5 sec/week, we assumed 0.75 sec/week → underestimate improvement
- Girls plateau/decline, we assumed linear improvement → completely wrong

## The New (Correct) Approach

**Athlete-specific rates:**
```python
# Calculate each athlete's actual improvement from their races
improvement_rate = calculate_athlete_improvement_rate(athlete_id)

# Use their personal rate
adjusted_diff = raw_diff - (weeks * athlete_improvement_rate)

# Fall back to performance-level defaults if not enough data
if confidence < 0.5:
    if level == 'elite': rate = -100cs/week
    if level == 'strong': rate = -125cs/week
    if level == 'developing': rate = -200cs/week
    if level == 'novice': rate = -250cs/week
```

## Performance Level Classification

Based on baseline normalized time (first 3 races average):

| Level | Normalized Time | Mile Pace | Improvement Rate |
|-------|----------------|-----------|------------------|
| **Elite** | < 32000cs | < 5:20/mile | 1.0 sec/week |
| **Strong** | 32000-36000cs | 5:20-6:00/mile | 1.25 sec/week |
| **Developing** | 36000-42000cs | 6:00-7:00/mile | 2.0 sec/week |
| **Novice** | > 42000cs | > 7:00/mile | 2.5 sec/week |

## Improvement Pattern Detection

Uses linear regression on athlete's race history:

### Linear Improvement
- R² > 0.7 (strong fit)
- Slope < -50cs/week (clear improvement)
- **Example:** Consistent 2 sec/week faster

### Gradual Improvement
- R² > 0.3 (moderate fit)
- Slope < -20cs/week (slow improvement)
- **Example:** Steady 0.5 sec/week faster

### Plateau
- |Slope| < 20cs/week
- **Example:** Times hovering around same pace
- **Common for:** Mid-season girls, peaked athletes

### Declining
- Slope > 20cs/week (getting slower)
- **Example:** Late-season fatigue, injury, burnout
- **Common for:** Late-season girls, overtrained athletes

### Inconsistent
- R² < 0.3 (poor fit)
- High variance
- **Example:** Erratic performances
- **Causes:** Illness, varying effort, mixed distances

## Calculating Athlete Improvement Rate

### SQL Function: `calculate_athlete_improvement_rate(athlete_id)`

**Returns:**
```sql
athlete_id uuid
athlete_name text
gender text
grad_year int
total_races int
season_span_weeks float
baseline_normalized_cs float       -- First 3 races avg
current_normalized_cs float        -- Last 3 races avg
total_improvement_cs float         -- Difference
improvement_per_week_cs float      -- Weekly rate
performance_level text             -- 'elite', 'strong', 'developing', 'novice'
improvement_pattern text           -- 'linear', 'plateau', 'declining'
confidence float                   -- 0.0 to 1.0
```

**Example output:**
```
athlete_id: abc-123
athlete_name: Sarah Johnson
gender: F
grad_year: 2025
total_races: 12
season_span_weeks: 14.3
baseline_normalized_cs: 38500 (6:25/mile)
current_normalized_cs: 36800 (6:08/mile)
total_improvement_cs: -1700 (17 seconds faster)
improvement_per_week_cs: -119 (1.19 sec/week)
performance_level: developing
improvement_pattern: linear
confidence: 0.88 (high)
```

**Interpretation:**
- Sarah started at 6:25/mile pace
- Now running 6:08/mile (17 seconds faster)
- Improving at 1.19 sec/week (typical for developing runner)
- Pattern is linear (no plateau yet)
- High confidence (12 races over 14 weeks)

## Gender-Specific Pattern Example

### Boys (Typical)
```
Week 0:  6:30/mile
Week 3:  6:27/mile (-3 sec, 1.0 sec/week)
Week 6:  6:24/mile (-3 sec, 1.0 sec/week)
Week 9:  6:21/mile (-3 sec, 1.0 sec/week)
Week 12: 6:18/mile (-3 sec, 1.0 sec/week)

Pattern: Linear improvement
Rate: -100cs/week (consistent)
```

### Girls (Typical - Plateau Pattern)
```
Week 0:  6:30/mile
Week 3:  6:27/mile (-3 sec, 1.0 sec/week) ← Initial rise
Week 6:  6:24/mile (-3 sec, 1.0 sec/week) ← Still improving
Week 9:  6:24/mile (0 sec, 0.0 sec/week) ← Plateau
Week 12: 6:26/mile (+2 sec, decline)     ← Small decline

Pattern: plateau
Rate: -50cs/week (averaged over season)
Detected: Slope near 0, R² moderate
```

### Girls (Typical - Decline Pattern)
```
Week 0:  6:15/mile
Week 3:  6:12/mile (-3 sec, improving)
Week 6:  6:10/mile (-2 sec, slowing)
Week 9:  6:13/mile (+3 sec, declining)
Week 12: 6:18/mile (+5 sec, declining)

Pattern: declining
Rate: +30cs/week (getting slower)
Causes: Fatigue, iron deficiency, body changes
```

## Using Athlete-Specific Rates in Comparisons

### Old Method (Fixed Rate)
```
Athlete ran Crystal Springs Sept 1: 18:30 (6:16/mile normalized)
Athlete ran Toro Park Sept 29: 18:00 (6:00/mile normalized)

Weeks between: 4
Fixed improvement: 4 weeks × 1.5 sec/mile = 6 seconds
Adjusted difference: (6:00 - 6:16) + 0:06 = -10 seconds
Interpretation: Toro Park is 10 seconds easier? (WRONG)
```

### New Method (Athlete-Specific Rate)
```
Athlete: Novice level (7:30/mile baseline)
Actual improvement rate: 2.5 sec/week (calculated from their races)
Confidence: 0.85 (high)

Weeks between: 4
Expected improvement: 4 × 2.5 = 10 seconds
Adjusted difference: (6:00 - 6:16) + 0:10 = -6 seconds
Interpretation: Toro Park is 6 seconds easier (more accurate)
```

## Confidence in Athlete Rate Estimate

**High confidence (> 0.7):**
- Athlete has 8+ races
- Strong linear fit (R² > 0.7)
- Use athlete-specific rate

**Medium confidence (0.4-0.7):**
- Athlete has 4-7 races
- Moderate fit (R² 0.3-0.7)
- Blend athlete-specific with level-based default

**Low confidence (< 0.4):**
- Athlete has < 4 races
- Poor fit (R² < 0.3)
- Use level-based default rate

## Integration with Course Calibration

### Updated Workflow

1. **Calculate athlete improvement rates** (one-time per athlete)
2. **For each comparison:**
   - Get athlete's specific rate (or level-based default)
   - Adjust time difference using their rate
   - Flag outliers based on adjusted difference
3. **Aggregate across all athletes:**
   - Median adjusted difference
   - Outlier count
   - Reverse engineer difficulty

### Example: Toro Park Analysis

```
Athletes analyzed: 45

Elite athletes (n=8):
- Avg rate: -98 cs/week
- Median adj diff: -150cs (1.5 sec faster than expected)

Developing athletes (n=22):
- Avg rate: -205 cs/week
- Median adj diff: -180cs (1.8 sec faster than expected)

Novice athletes (n=15):
- Avg rate: -245 cs/week
- Median adj diff: -160cs (1.6 sec faster than expected)

Overall median: -165cs (1.65 sec faster)
Outliers: 32/45 (71%)
Conclusion: Course rated too hard, lower difficulty by 4.5%
```

## Handling Girls' Plateau/Decline

### Detection Strategy

1. **Calculate overall trend** (entire season)
2. **Detect inflection points** (when slope changes)
3. **Segment season:**
   - Early season: Week 0-4 (improving)
   - Mid season: Week 5-8 (plateau)
   - Late season: Week 9+ (possible decline)

4. **Use appropriate rate for each segment**

### Example: Sarah's Season

```
Early season (Week 0-4):
- Rate: -120cs/week (improving)
- Pattern: linear

Mid season (Week 5-8):
- Rate: -20cs/week (plateau)
- Pattern: flat

Late season (Week 9-12):
- Rate: +40cs/week (declining)
- Pattern: declining
```

When comparing Sarah's races:
- If comparing early vs late season: Account for decline
- If comparing two mid-season races: Minimal adjustment
- If comparing to boys: Use their different pattern

## Database Schema

### No new tables needed

Uses existing:
- `results` - for athlete race times
- `athletes` - for gender, grad year
- `meets` - for race dates
- `courses` - for distance, difficulty

### New functions

**`calculate_athlete_improvement_rate(athlete_id)`**
- Calculates personal improvement from race history
- Returns rate, pattern, confidence

**`get_course_outlier_analysis_v2(anchor, threshold)`**
- Uses athlete-specific rates
- Replaces old fixed-rate version

## Next Steps

1. **Apply migration** - Add athlete improvement model
2. **Test with known athletes:**
   - Pick an elite athlete → should see ~1 sec/week
   - Pick a novice → should see ~2.5 sec/week
   - Pick a girl who plateaued → should detect it
3. **Validate against coaching intuition**
4. **Use in course calibration** - Better accuracy

## Key Takeaways

1. **Fixed rates are wrong** - Athletes improve at different rates
2. **Slower runners improve faster** - Counterintuitive but true
3. **Girls have unique patterns** - Plateau and decline are normal
4. **Use athlete-specific data** - When you have enough races
5. **Fall back to level-based defaults** - When data is insufficient

---

**Impact:** This makes course calibration much more accurate by accounting for individual athlete development patterns.
