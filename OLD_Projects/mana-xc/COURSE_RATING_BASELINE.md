# Course Rating Baseline: Crystal Springs 2.95 Mile

**Last Updated:** October 20, 2025
**Status:** Baseline course established

---

## The Baseline Standard

**Crystal Springs 2.95 Mile Course** is the **baseline course** for all XC time normalization in the Mana XC platform.

### Key Principles

1. **Crystal Springs 2.95 Mile = 1.000 rating (ALWAYS)**
   - This is the definition, not a calculation
   - All other courses are rated relative to this baseline
   - Rating > 1.000 = easier than Crystal Springs
   - Rating < 1.000 = harder than Crystal Springs

2. **Why Crystal Springs?**
   - Most frequently used course in California XC
   - Standard CIF championship venue
   - Well-maintained, consistent conditions
   - Large sample size of competitive runners
   - Widely recognized as a "neutral" difficulty course

3. **Rating Interpretation**
   - **1.000** = Crystal Springs (baseline)
   - **1.05** = 5% easier than Crystal Springs (e.g., Montgomery Hill)
   - **0.95** = 5% harder than Crystal Springs (e.g., Mt. SAC)
   - **1.10** = 10% easier (fast, flat course)
   - **0.90** = 10% harder (hilly, challenging course)

---

## How XC Time Normalization Works

### Formula
```
normalized_time_cs = actual_time_cs * course_rating
```

### Example: Same Athlete, Different Courses

| Course | Rating | Actual Time | Normalized Time | Interpretation |
|--------|--------|-------------|-----------------|----------------|
| **Crystal Springs 2.95** | **1.000** | **15:30.00** | **15:30.00** | Baseline performance |
| Montgomery Hill | 1.05 | 15:00.00 | 15:45.00 | Easier course, so time is "adjusted up" |
| Mt. SAC | 0.95 | 16:00.00 | 15:12.00 | Harder course, so time is "adjusted down" |

**Athlete's True XC PR:** 15:12.00 (the Mt. SAC performance normalized)

This means:
- Running 16:00 at Mt. SAC is **better** than running 15:30 at Crystal Springs
- Running 15:00 at Montgomery Hill is **worse** than running 15:30 at Crystal Springs
- All three performances can now be compared fairly

---

## AI/Statistical Model Requirements

To establish course ratings for all other courses, we need to:

### 1. Overlapping Runner Analysis
- Find athletes who raced at **both** Course X and Crystal Springs
- Compare their times at each venue
- Use Bayesian inference to estimate relative difficulty

### 2. Sample Size Requirements
- **Minimum:** 20 overlapping runners for reliable estimate
- **Ideal:** 50+ overlapping runners for high confidence
- **Gold Standard:** 100+ overlapping runners

### 3. Rating Calculation Process
For a new course (e.g., "Woodward Park"):
1. Find all athletes who raced at both Woodward Park AND Crystal Springs
2. For each athlete, calculate: `ratio = woodward_time / crystal_springs_time`
3. Take the median ratio across all athletes (robust to outliers)
4. This median becomes Woodward Park's rating
5. Validate with statistical tests (mean error < 500 cs)

### 4. Edge Cases
- **New courses with no overlapping runners:** Start with rating = 1.000, update as data accumulates
- **Courses with < 20 overlaps:** Flag as "unrated" or use regional averages
- **Course layout changes:** Treat as a new course (e.g., "Crystal Springs 2.95 - 2025 Layout")

---

## Database Schema

### Current State (Per-Course PRs Only)
```sql
-- athlete_course_prs materialized view
-- Tracks each athlete's best time at each course (NO normalization)
SELECT athlete_id, course_id, MIN(time_cs) as best_time_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
GROUP BY athlete_id, course_id;
```

### Future State (XC Time PRs with Normalization)
```sql
-- athlete_xc_times_v3 materialized view (COMING SOON)
-- Tracks each athlete's best NORMALIZED time across all courses
SELECT athlete_id, MIN(time_cs * course_rating) as best_xc_time_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE time_cs > 0
GROUP BY athlete_id;
```

**CRITICAL:** The `courses` table needs a `rating` column (NUMERIC, default 1.000).

---

## Implementation Plan

### Phase 1: Course Rating Model (AI Component)
- [ ] Build overlapping runner finder
- [ ] Implement Bayesian rating calculator
- [ ] Create statistical validation dashboard
- [ ] Generate initial ratings for all 17 courses
- [ ] Manual review and adjustment

### Phase 2: Database Schema Update
- [ ] Add `rating` column to `courses` table
- [ ] Set Crystal Springs 2.95 rating = 1.000 (locked)
- [ ] Populate ratings for other courses
- [ ] Add `rating_confidence` field (sample size indicator)
- [ ] Create audit log for rating changes

### Phase 3: XC Time PR Calculation
- [ ] Create `athlete_xc_times_v3` materialized view
- [ ] Build PR update triggers
- [ ] Create frontend components for normalized PRs
- [ ] Add "View Raw Times" toggle for transparency

### Phase 4: Continuous Improvement
- [ ] Auto-update ratings as new data arrives
- [ ] Flag courses with rating drift
- [ ] Seasonal rating adjustments (weather, course changes)
- [ ] Coach feedback mechanism for rating disputes

---

## Frontend Display Guidelines

### Always Show Both Raw and Normalized Times

**Athlete Profile Example:**
```
Personal Record (XC Time): 15:12.00 (normalized)
  ↳ 16:00.00 at Mt. SAC (rating: 0.95)

Course PRs:
  Crystal Springs 2.95: 15:30.00 (rating: 1.000)
  Montgomery Hill:      15:00.00 (rating: 1.05)
  Mt. SAC:              16:00.00 (rating: 0.95) ← XC Time PR
```

**Course Record Example:**
```
Course: Montgomery Hill (Rating: 1.05 - 5% easier than Crystal Springs)
Record Holder: John Doe, 14:30.00 (2024)
  XC Time Equivalent: 15:16.50 (normalized)
```

### Transparency is Key
- Always show the course rating next to normalized times
- Provide tooltips: "This time is normalized to Crystal Springs 2.95 mile baseline"
- Link to `/methodology` page explaining the system
- Allow users to toggle between "Raw Times" and "Normalized XC Times"

---

## Quality Assurance

### Red Flags for Rating Issues
- Mean error > 2000 cs (20 seconds) when validating with overlapping runners
- Rating changes > 0.10 between seasons for the same course
- Course rating < 0.80 or > 1.20 (extreme outliers)
- Sample size < 10 overlapping runners

### Manual Review Required
- New courses (no historical data)
- Courses with significant layout changes
- Courses with unusual conditions (altitude, heat, etc.)
- Coach-submitted rating disputes

---

## Resources

- **Methodology:** See `COURSE_RATING_METHODOLOGY.md` for statistical details
- **Validation Tool:** `/admin/course-ratings` dashboard
- **Reference:** Malcolm Slaney's Bayesian Course Difficulty Model
- **API Endpoint:** `/api/admin/rating-analysis` (coming soon)

---

## Key Takeaway

**Crystal Springs 2.95 Mile is the North Star.** All course difficulty ratings, all XC time normalizations, and all athlete PRs are ultimately answering the question:

> "What would this athlete have run at Crystal Springs 2.95 Mile?"

This creates a common language for comparing performances across the entire high school XC landscape.
