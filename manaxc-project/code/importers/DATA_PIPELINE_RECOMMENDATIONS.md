# Data Pipeline Improvements & Recommendations

## Current State Summary (Oct 24, 2025)

### Athletic.net Scraper Status
✅ **Working well** - Puppeteer-based Node.js scraper (`athletic-net-scraper-v3.js`)
- Automated scraping of meet results from Athletic.net
- Outputs CSV and JSON formats
- Properly converts times to centiseconds
- Tracks Athletic.net meet IDs for duplicate detection
- Handles distance extraction from race names (Miles, Meters, K formats)

### Course Difficulty Ratings - COMPLETED TODAY
✅ **Montgomery Hill 2.74 Miles**: Difficulty = 1.208 (20.8% harder than track)
✅ **Baylands Park 4K**: Difficulty = 0.920 (8.0% easier than track) - NEWLY ADDED
✅ **Crystal Springs 2.95 Miles**: Difficulty = 1.177 (17.7% harder than track)
✅ **Baylands Park 5K**: Difficulty = 1.130 (13.0% harder than track)

### Data Quality Analysis Completed
- Analyzed 67 athletes across Montgomery Hill and Crystal Springs courses
- Analyzed 30 athletes across Baylands 4K and other courses
- Confirmed that Baylands 4K is significantly easier (shorter, flatter) than Baylands 5K

---

## Priority 1: Fix Distance Parsing in Scraper

### Issue
The scraper's `extractDistanceMeters()` function has a bug with comma-formatted meters:

```javascript
// Current code (LINE 25):
return parseInt(metersMatch[1].replace(',', ''));

// Problem: Only replaces FIRST comma
// "4,000 Meters" → parseInt("4000") ✓ Works
// "10,000 Meters" → parseInt("10000") ✗ Fails (would be "10,00")

// Fix needed:
return parseInt(metersMatch[1].replace(/,/g, ''));  // Use regex to replace ALL commas
```

**Impact**: High - Affects 4K, 5K, 10K race distance parsing
**Effort**: Low - 1-line fix
**Priority**: HIGH

---

## Priority 2: Course Name Mapping Improvements

### Current Issues
1. **Database uses pipe delimiters**: `"Montgomery Hill | 2.74 Miles"`
2. **Race names vary**: `"2.74 Miles Varsity"`, `"4,000 Meters Freshmen"`
3. **No automatic mapping**: Manual course assignment required

### Recommended Solutions

#### Option A: Smart Course Matching Function
Create a fuzzy matching system that maps race names to courses:

```python
def match_race_to_course(race_name, venue_name, distance_meters):
    """
    Match Athletic.net race to database course

    Priority order:
    1. Exact venue + distance match
    2. Fuzzy venue match + distance match (±10m tolerance)
    3. Fallback to distance-only match for common courses
    """
    # Example:
    # race_name = "2.74 Miles Varsity"
    # venue_name = "Montgomery Hill Park"
    # distance_meters = 4410
    # → Returns course_id for "Montgomery Hill | 2.74 Miles"
```

#### Option B: Athletic.net ID Tracking
- Add `athletic_net_venue_id` to courses table
- Scraper captures venue ID from Athletic.net URL
- Direct mapping without fuzzy matching

**Recommended**: Start with Option A, add Option B later for precision

---

## Priority 3: Gender Detection Improvements

### Current State
The scraper and Crystal Springs predictions script both have gender detection logic:

**Scraper** (v3.js, line 48-52):
```javascript
function calculateGraduationYear(grade, seasonYear) {
    if (!grade || !seasonYear) return null;
    return seasonYear + (13 - parseInt(grade));
}
```

**Predictions Script** (crystal_springs_predictions.py, line 63-84):
```python
def determine_gender(race_name, athlete_name, grad_year, gender_map=None):
    # 1. Check gender map from CSV
    # 2. Check race name keywords ("boys", "girls", "(m)", "(f)")
    # 3. Check known female names list
    # 4. Default to Male
```

### Recommended Improvements
1. **Centralize gender data** in athletes CSV from Athletic.net scraper
2. **Add gender column** to scraper output (parse from race division)
3. **Create gender lookup table** in database for known athletes
4. **Track gender changes** (rare but happens with co-ed teams)

---

## Priority 4: Duplicate Detection & Data Integrity

### Current Gaps
1. **No athlete deduplication**: Same athlete with different name spellings
2. **No result deduplication**: Same race result imported multiple times
3. **No course validation**: Missing courses cause import failures

### Recommended Solutions

#### Athlete Deduplication
```python
def find_duplicate_athletes(name, grad_year, school_id):
    """
    Check for existing athlete before creating new record

    Matching criteria:
    1. Exact name + grad_year + school_id
    2. Fuzzy name (Levenshtein distance < 3) + grad_year + school_id
    3. Athletic.net ID (if available)
    """
```

#### Result Deduplication
```sql
-- Add unique constraint to results table
ALTER TABLE results
ADD CONSTRAINT unique_result
UNIQUE (athlete_id, race_id, time_cs);
```

#### Course Validation
```python
def validate_course_exists(course_name, distance_meters):
    """
    Check if course exists, create if missing with default difficulty

    Use course_rating_defaults table for initial difficulty estimates
    """
```

---

## Priority 5: Web Presentation Improvements

### Current Data Access Patterns
Based on CLAUDE.md, the web app uses:
- Next.js API routes → Supabase RPC functions
- Materialized view `athlete_xc_times_v3` for normalized times
- Course ratings (`xc_time_rating`) for cross-course comparisons

### Recommended Data Enhancements for Web

#### 1. Add "Season Best" Tracking
```sql
CREATE MATERIALIZED VIEW athlete_season_bests AS
SELECT
  athlete_id,
  season_year,
  MIN(time_cs) as season_best_time_cs,
  MIN(time_cs * races.xc_time_rating) as season_best_normalized_cs
FROM results
JOIN races ON races.id = results.race_id
GROUP BY athlete_id, season_year;
```

#### 2. Add "Course Records" View
```sql
CREATE MATERIALIZED VIEW course_records AS
SELECT DISTINCT ON (course_id, gender)
  c.id as course_id,
  c.name as course_name,
  r.gender,
  res.time_cs as record_time_cs,
  a.name as athlete_name,
  a.grad_year,
  res.season_year
FROM courses c
JOIN races r ON r.course_id = c.id
JOIN results res ON res.race_id = r.id
JOIN athletes a ON a.id = res.athlete_id
WHERE res.time_cs > 0
ORDER BY course_id, gender, res.time_cs ASC;
```

#### 3. Add "Most Improved" Tracking
```sql
CREATE MATERIALIZED VIEW athlete_improvements AS
SELECT
  a.id as athlete_id,
  a.name,
  a.school_id,
  curr.season_best_normalized_cs as current_season_best,
  prev.season_best_normalized_cs as previous_season_best,
  prev.season_best_normalized_cs - curr.season_best_normalized_cs as improvement_cs,
  ((prev.season_best_normalized_cs - curr.season_best_normalized_cs) / prev.season_best_normalized_cs * 100) as improvement_pct
FROM athletes a
JOIN athlete_season_bests curr ON curr.athlete_id = a.id AND curr.season_year = 2025
JOIN athlete_season_bests prev ON prev.athlete_id = a.id AND prev.season_year = 2024
WHERE prev.season_best_normalized_cs > curr.season_best_normalized_cs  -- Only improvements
ORDER BY improvement_cs DESC;
```

---

## Priority 6: Course Difficulty Rating Automation

### Current Process (Manual)
1. Manually analyze athlete performances across courses
2. Calculate difficulty using spreadsheets/Python scripts
3. Manually update database with new ratings

### Recommended Automation
Create an admin dashboard endpoint that:
1. **Analyzes all courses** with 20+ overlapping athletes
2. **Calculates difficulty** using Bayesian model (per COURSE_RATING_METHODOLOGY.md)
3. **Flags outliers** (mean error > 500cs)
4. **Suggests updates** with confidence intervals
5. **One-click apply** to update ratings

**Reference**: The `/admin/course-ratings` tool already exists but needs enhancement

---

## Priority 7: Data Validation & Testing

### Recommended Test Suite

#### Unit Tests
- Time parsing (MM:SS.ss → centiseconds)
- Distance extraction from race names
- Name splitting (Last, First → First Last)
- Graduation year calculation

#### Integration Tests
- Full scrape → import → database workflow
- Duplicate detection accuracy
- Course matching accuracy
- Gender detection accuracy

#### Data Quality Tests
```python
def test_data_quality():
    """Run after each import to catch issues early"""

    # 1. Check for orphaned records
    orphaned_results = results without valid athlete_id or race_id

    # 2. Check for invalid times
    invalid_times = time_cs < 0 or time_cs > 1000000  # ~2.7 hours

    # 3. Check for missing gender
    missing_gender = athletes where gender is NULL

    # 4. Check for impossible performances
    world_record_violations = time_cs / distance_meters < threshold

    # 5. Check for duplicate results
    duplicate_results = GROUP BY athlete_id, race_id HAVING COUNT(*) > 1
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (1-2 hours)
- [ ] Fix comma replacement in distance parsing (scraper v3.js line 25)
- [ ] Add unique constraint to results table
- [ ] Test Baylands 4K difficulty rating in predictions

### Phase 2: Course Mapping (2-3 hours)
- [ ] Create course matching function
- [ ] Add fuzzy matching library
- [ ] Test on 2024 and 2025 data
- [ ] Document course name conventions

### Phase 3: Web Enhancements (3-4 hours)
- [ ] Create season_bests materialized view
- [ ] Create course_records materialized view
- [ ] Create athlete_improvements materialized view
- [ ] Add refresh triggers for views

### Phase 4: Automation (4-6 hours)
- [ ] Enhance /admin/course-ratings dashboard
- [ ] Add batch rating analysis
- [ ] Create one-click update workflow
- [ ] Add confidence intervals to ratings

### Phase 5: Testing & Validation (2-3 hours)
- [ ] Write unit tests for parsers
- [ ] Write data quality tests
- [ ] Set up automated test runs
- [ ] Document testing procedures

---

## Summary

**Immediate Wins** (Today):
✅ Fixed Montgomery Hill difficulty rating (1.208)
✅ Added Baylands 4K course (0.920)
✅ Analyzed 67 athletes across courses
✅ Confirmed Baylands 4K is easier than 5K

**Next Session Priorities**:
1. Fix comma parsing bug in scraper (5 minutes)
2. Test updated difficulty ratings in predictions (10 minutes)
3. Create course matching function (30 minutes)
4. Add season_bests view for web (20 minutes)

**Long-term Goals**:
- Fully automated scraping → import → validation pipeline
- Real-time course difficulty updates based on new race data
- Comprehensive data quality dashboard
- Predictive analytics for team performance

---

## Questions for User

1. **Course Mapping**: Should we implement fuzzy matching or Athletic.net ID tracking first?
2. **Gender Data**: Is it okay to default unknown genders to Male, or should we flag them for manual review?
3. **Duplicate Athletes**: Should we auto-merge duplicates or require manual approval?
4. **Web Features**: Which materialized view would be most valuable: season_bests, course_records, or athlete_improvements?
5. **Testing**: Should we add automated tests now or after Phase 3 web enhancements?

