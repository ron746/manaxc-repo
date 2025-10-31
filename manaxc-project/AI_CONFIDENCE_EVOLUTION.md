# AI-Driven Confidence Model Evolution

**Status:** DESIGN DOCUMENT
**Date:** October 31, 2025
**Key Insight:** "Crystal and Woodward Park will continue to have the best runners on the course in large volume"

## The Problem with Static Confidence

**Current approach:**
- Crystal Springs = 1.0 (manual override)
- All other courses calculated from fixed formula
- Doesn't learn from actual usage patterns

**Reality:**
- Elite programs repeatedly choose certain courses (Crystal Springs, Woodward Park)
- These courses naturally accumulate more elite runners
- Courses with consistent elite competition become more reliable anchors
- **The system should learn which courses are most trusted**

## Dynamic Confidence Components

### 1. Elite Runner Concentration (Self-Selection)

**Concept:** Courses where elite runners consistently compete are more reliable.

```sql
elite_runner_score =
  COUNT(athletes with normalized_time < 32000cs on this course) /
  TOTAL(athletes on this course)

-- Elite programs choose proven courses
-- Self-selection validates course quality
```

**Example:**
- Crystal Springs: 45% of runners are elite → High elite concentration
- Random small meet course: 5% elite → Low concentration

### 2. Consistent Volume Over Time

**Concept:** Courses that host large meets season after season gain confidence.

```sql
volume_trend =
  REGR_SLOPE(results_per_season, season_year)

-- Positive slope = growing usage = increasing trust
-- Flat high volume = established anchor
-- Declining volume = losing relevance
```

**Example:**
- Crystal Springs: 400+ results/year for 5+ years → Established anchor
- Woodward Park: Growing from 100 → 200 → 350 → Emerging anchor
- Small course: 50 results, then 0, then 30 → Unreliable

### 3. Network Centrality (Hub Courses)

**Concept:** Courses that share athletes with MANY other courses become hubs.

```sql
network_centrality =
  COUNT(DISTINCT other_courses with shared athletes) /
  TOTAL(courses in database)

-- Hub courses connect the network
-- Better for calibrating other courses
```

**Example:**
- Crystal Springs: Athletes also ran at 18 other courses → Hub
- Woodward Park: Athletes also ran at 15 other courses → Hub
- Isolated course: Athletes only ran here → Island

### 4. Cross-Validation Stability

**Concept:** Courses where multiple independent anchors agree on calibration.

```sql
cross_validation_score =
  1.0 - VARIANCE(
    implied_difficulty from anchor_1,
    implied_difficulty from anchor_2,
    implied_difficulty from anchor_3
  )

-- Multiple anchors agree = high confidence
-- Anchors disagree = need investigation
```

**Example:**
- Course A: Crystal Springs says 1.15, Woodward says 1.16 → High agreement (0.95 confidence)
- Course B: Crystal Springs says 1.10, Woodward says 1.25 → Disagreement (0.60 confidence)

## Automatic Anchor Promotion

### Criteria for Becoming an Anchor

A course automatically becomes an anchor when:

```sql
-- All criteria must be met:
1. confidence_score >= 0.85
2. total_results >= 500
3. seasons >= 3
4. elite_concentration >= 0.25 (25%+ elite runners)
5. network_centrality >= 0.30 (shared athletes with 30%+ of courses)
6. volume_trend >= 0 (stable or growing)
```

**Current anchors (manual):**
- Crystal Springs: 1.0 (50 years validation)

**Potential future anchors (automatic promotion):**
- Woodward Park: If hits thresholds → becomes 2nd anchor
- Other courses: As they accumulate data → potential anchors

## Multi-Anchor System

### Phase 1: Single Anchor (Current)
- Crystal Springs = 1.0
- All courses compared to Crystal Springs

### Phase 2: Dual Anchors (Soon)
- Crystal Springs = 1.0
- Woodward Park = 0.95 (automatically promoted)
- Use BOTH for calibration:
  ```
  implied_difficulty = WEIGHTED_AVERAGE(
    crystal_springs_implied * crystal_confidence,
    woodward_park_implied * woodward_confidence
  )
  ```

### Phase 3: Multi-Anchor Network (Future)
- 5-8 regional anchors
- Each course compared to nearest/most-connected anchors
- AI learns which anchor combinations are most reliable

## Learning Algorithm

### Step 1: Identify Emerging Anchors

```sql
-- Run monthly
SELECT
  c.id,
  c.name,
  calculate_elite_concentration(c.id) as elite_score,
  calculate_network_centrality(c.id) as network_score,
  calculate_volume_trend(c.id) as volume_score,
  current_confidence_score
FROM courses c
WHERE calculate_elite_concentration(c.id) > 0.25
  AND total_results > 300
ORDER BY current_confidence_score DESC;
```

### Step 2: Test Cross-Validation

```sql
-- For each emerging anchor candidate:
-- Compare its implied difficulties with current anchors
-- If agreement is high (variance < 0.05), promote

SELECT
  candidate_course,
  VARIANCE(ARRAY[
    crystal_implied_difficulty,
    candidate_implied_difficulty
  ]) as disagreement
FROM candidate_comparisons
HAVING VARIANCE < 0.05;
```

### Step 3: Gradual Promotion

```sql
-- Don't jump to 1.0 immediately
-- Gradual weight increase as validation accumulates

anchor_weight = MIN(1.0,
  0.5 +  -- Start at 0.5
  (years_validated * 0.1) +  -- +0.1 per year
  (cross_validation_score * 0.4)  -- +0.4 if validates well
);
```

**Example progression for Woodward Park:**
- Year 1: 0.65 (new anchor)
- Year 2: 0.75 (more validation)
- Year 3: 0.85 (established)
- Year 5: 0.95 (highly trusted)

## AI-Driven Insights

### Pattern Recognition

**AI should flag:**
1. **Emerging anchors:** "Woodward Park has hosted 450 results with 35% elite concentration. Consider promoting to anchor status."

2. **Declining courses:** "Montgomery Hill Park had 200 results/year 2020-2022, now only 40. Confidence decreasing."

3. **Network gaps:** "No anchor courses in North region. Crystal Springs 150 miles away. Need regional anchor."

4. **Calibration conflicts:** "Toro Park: Crystal Springs implies 1.18, Woodward Park implies 1.12. Investigation needed."

### Recommendation System

```
AI Analysis of Course Network (2025 Season):

PROMOTED TO ANCHOR:
✓ Woodward Park, 5000 Meters
  - 487 results across 3 seasons
  - 38% elite runner concentration
  - Shared athletes with 19/23 courses
  - Cross-validates with Crystal Springs (variance: 0.03)
  - Recommended weight: 0.85

EMERGING ANCHORS (watch list):
○ Toro Park, 3 Miles
  - 425 results, but only 1 season (need 2 more)
  - 28% elite concentration (good)
  - Shared athletes with 15/23 courses (good)
  - Estimated 2 years to anchor promotion

DECLINING COURSES (warning):
⚠ Small Park XC
  - Volume dropped 75% year-over-year
  - Only 3% elite concentration
  - Confidence decreasing: 0.45 → 0.32
```

## Implementation Phases

### Phase 1: Enhanced Confidence (This Week)
- ✅ Fix single-season penalty
- Add elite concentration metric
- Add network centrality metric

### Phase 2: Automatic Monitoring (Next Month)
- Monthly job to identify emerging anchors
- Dashboard showing anchor candidates
- Alert when course hits promotion thresholds

### Phase 3: Multi-Anchor System (3 Months)
- Allow multiple anchors with different weights
- Weighted average calibration
- Regional anchor detection

### Phase 4: Full AI Learning (6 Months)
- Pattern recognition for course quality
- Automatic anchor promotion/demotion
- Anomaly detection (course changed, weather patterns)
- Confidence evolution based on validation history

## Database Schema Changes Needed

```sql
-- Add anchor tracking
ALTER TABLE courses ADD COLUMN is_anchor boolean DEFAULT false;
ALTER TABLE courses ADD COLUMN anchor_weight numeric(3,2) DEFAULT 0.5;
ALTER TABLE courses ADD COLUMN anchor_promoted_date timestamptz;

-- Add computed metrics
ALTER TABLE courses ADD COLUMN elite_concentration numeric(3,2);
ALTER TABLE courses ADD COLUMN network_centrality numeric(3,2);
ALTER TABLE courses ADD COLUMN volume_trend numeric(5,2);
ALTER TABLE courses ADD COLUMN last_metrics_update timestamptz;

-- Track anchor performance
CREATE TABLE anchor_validation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_course_id uuid REFERENCES courses(id),
  target_course_id uuid REFERENCES courses(id),
  implied_difficulty numeric(12,9),
  cross_validation_variance numeric(8,6),
  calculated_at timestamptz DEFAULT now()
);
```

## Key Takeaways

1. **Confidence should evolve** - Not static formula
2. **Elite runners vote with their feet** - Self-selection matters
3. **Volume is a signal** - Consistent large meets = trusted course
4. **Multiple anchors are better** - Cross-validation reduces error
5. **AI should learn** - Pattern recognition identifies emerging anchors
6. **Regional anchors matter** - Can't compare California to Texas courses easily

## Your Coaching Insight Applied

> "Crystal and Woodward Park will continue to have the best runners on the course in large volume"

**This is self-reinforcing:**
- Elite programs choose proven courses
- Proven courses get more elite runners
- More elite runners = better calibration data
- Better data = higher confidence
- **The system learns which courses are truly reliable**

Instead of manually setting anchors, **let the data speak**:
- Crystal Springs earned 1.0 through 50 years of validation
- Woodward Park earning 0.85+ through current usage
- Future courses will earn anchor status through demonstrated reliability

---

**Next Step:** Should I implement Phase 1 (elite concentration + network centrality) now, or focus on getting the current system working first?
