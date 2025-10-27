# Data Quality Notes

**Last Updated:** October 20, 2025

---

## Known Issues (Non-Critical)

### 1. Outlier Times - Athletic.net Data Entry Errors

**Issue:** Some times from Athletic.net appear to be data entry errors.

**Example:**
- **Woodward Park (3500m)**: Course record shows 1:25.00
- **Expected:** Should be ~11:25 or ~14:25 (typical 3500m times)
- **Cause:** Likely a typo when results were entered into Athletic.net

**Impact:**
- Low - These are rare outliers
- Affects course records display
- Does not impact athlete PRs significantly (athletes know their real times)

**Solution (Future):**
Add data quality validation during import:
- Flag times < 5:00 for courses > 2000m
- Flag times > 40:00 for any course
- Admin review dashboard for flagged results
- Manual correction or exclusion from records

---

## Data Quality Checks to Implement

### Import-Time Validation
```typescript
// app/api/admin/batch-import-v2/route.ts

function validateTime(time_cs: number, distance_meters: number): boolean {
  const minutes = time_cs / 6000;

  // Flag suspiciously fast times (< 2:30 per km)
  const minPacePerKm = 2.5;
  const minExpected = (distance_meters / 1000) * minPacePerKm * 60;

  // Flag suspiciously slow times (> 8:00 per km)
  const maxPacePerKm = 8.0;
  const maxExpected = (distance_meters / 1000) * maxPacePerKm * 60;

  return minutes >= minExpected && minutes <= maxExpected;
}
```

### Post-Import Analysis
- **Statistical outliers:** Times > 3 standard deviations from course mean
- **Impossible improvements:** Athlete improves by > 5 minutes between races
- **Missing data:** DNF/DNS not properly filtered

### Admin Dashboard Features
- `/admin/data-quality` route
- List flagged results with edit/exclude options
- Bulk correction tools
- Audit trail for manual edits

---

## Current Data Quality Status

✅ **GOOD:**
- Season years properly populated
- Graduation years calculated correctly
- Gender fields consistent
- Course-race linking working
- School associations accurate
- No duplicate results (Athletic.net meet ID tracking works)

⚠️ **NEEDS ATTENTION:**
- Outlier time validation (1-2% of results)
- DNF/DNS handling (currently filtered at scrape time)
- Course layout version tracking (currently all "standard")

---

## Data Integrity Checks (Run Periodically)

### Check 1: Orphaned Records
```sql
-- Results without valid race
SELECT COUNT(*) FROM results WHERE race_id NOT IN (SELECT id FROM races);

-- Athletes without valid school
SELECT COUNT(*) FROM athletes WHERE current_school_id NOT IN (SELECT id FROM schools);

-- Races without valid course
SELECT COUNT(*) FROM races WHERE course_id NOT IN (SELECT id FROM courses);
```

### Check 2: Missing Required Fields
```sql
-- Results missing times
SELECT COUNT(*) FROM results WHERE time_cs IS NULL OR time_cs = 0;

-- Results missing season
SELECT COUNT(*) FROM results WHERE season_year IS NULL;

-- Athletes missing graduation year
SELECT COUNT(*) FROM athletes WHERE graduation_year IS NULL;
```

### Check 3: Statistical Anomalies
```sql
-- Find outlier times (> 3 std devs from course mean)
WITH course_stats AS (
  SELECT
    course_id,
    AVG(time_cs) as mean_time,
    STDDEV(time_cs) as std_time
  FROM results r
  JOIN races ra ON ra.id = r.race_id
  GROUP BY course_id
)
SELECT
  r.id,
  a.full_name,
  r.time_cs,
  cs.mean_time,
  cs.std_time,
  ABS(r.time_cs - cs.mean_time) / cs.std_time as std_devs
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN course_stats cs ON cs.course_id = ra.course_id
JOIN athletes a ON a.id = r.athlete_id
WHERE ABS(r.time_cs - cs.mean_time) / cs.std_time > 3
ORDER BY std_devs DESC;
```

---

## Future Enhancements

### 1. Confidence Scoring
Add `confidence_score` to results table:
- **1.0:** Verified, no issues
- **0.8:** Slight anomaly but reasonable
- **0.5:** Statistical outlier, needs review
- **0.0:** Flagged for exclusion

### 2. Source Tracking
Add `data_source` and `verified_by`:
- Track whether data came from scraper vs manual entry
- Record who verified/corrected the data
- Enable rollback of bad corrections

### 3. Duplicate Detection
- Same athlete, same meet, multiple results
- Flag for review (legit if different races, error if same race)

### 4. Historical Comparison
- Track athlete progression for impossible improvements
- Flag 5K PR improving by > 2 min in one race
- Suggest verification for outliers

---

## Resolution Process

**When a data quality issue is found:**

1. **Document** in this file with example
2. **Quantify** impact (how many records affected?)
3. **Prioritize** based on user impact
4. **Implement** validation check (prevent future issues)
5. **Clean** existing data (manual or scripted correction)
6. **Verify** with SQL queries
7. **Update** this document

---

## Current Priority

**LOW** - The 1:25.00 outlier at Woodward Park is a display issue, not a system integrity issue.

**Next Session:**
- Build data quality dashboard (`/admin/data-quality`)
- Implement validation checks in batch-import-v2
- Add manual correction tools for outliers
- Create statistical anomaly detection queries

Focus remains on core feature development. Data quality improvements can be iterative.
