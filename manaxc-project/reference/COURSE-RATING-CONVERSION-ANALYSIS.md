# Course Rating Conversion Analysis
**Date:** October 22, 2025
**Source File:** Course Rating Logic.xlsx

---

## Overview

This document analyzes Ron's course rating conversion logic from the Excel file to understand how to convert old XC course ratings to the new `mile_difficulty` system.

---

## Excel File Structure

### Columns Present:
1. **Race Course** - Course name (e.g., "Track | 1 Mile", "Crystal Springs | 2.95 miles")
2. **Description** - Difficulty description (Fast, Normal XC, Hard, Very Hard)
3. **Distance in Miles** - Course distance as decimal miles
4. **Distance In Meters** - Course distance in meters
5. **Race Time** - Time value in Excel time format
6. **Race Time in Seconds** - Race time converted to seconds
7. **Race Time in Centeseconds** - Race time in centiseconds (our standard!)
8. **Mile Pace in Centeseconds** - Pace per mile in centiseconds
9. **Mile Pace** - Mile pace in Excel time format
10. **mile_difficulty** - **NEW RATING SYSTEM** (the target value)
11. **Mile Equiv** - Mile pace equivalent
12. **Distance Factor** - Calculated distance adjustment
13. **Rating Factor** - Difficulty multiplier
14. **OLD XC Rating** - Previous rating system
15. **XC Time** - Projected XC time
16. **XC Time in Seconds** - XC time in seconds
17. **XC Time in Centeseconds** - XC time in centiseconds
18. **xcTimeRating** - Calculated rating value

---

## Key Formula: xcTimeRating

From the shared strings XML, the core formula is:

```javascript
xcTimeRating = (4409.603 / meetData.distanceMeters) * (1.17747004342738 / mileDifficulty);
```

### Formula Breakdown:

**Components:**
- `4409.603` - Magic constant (likely derived from baseline mile time)
- `meetData.distanceMeters` - Race distance in meters (e.g., 5000 for 5K)
- `1.17747004342738` - Difficulty adjustment constant
- `mileDifficulty` - The new mile_difficulty rating we want to store

**What it does:**
1. Normalizes for distance: `4409.603 / distanceMeters`
2. Adjusts for course difficulty: `constant / mileDifficulty`
3. Combines both factors

---

## Reverse Engineering mile_difficulty

To **convert FROM old rating TO new mile_difficulty**, we need to reverse this formula.

Given:
```
xcTimeRating = (4409.603 / distanceMeters) * (1.17747004342738 / mileDifficulty)
```

Solving for `mileDifficulty`:
```
mileDifficulty = (4409.603 / distanceMeters) * (1.17747004342738 / xcTimeRating)
```

Or simplified:
```
mileDifficulty = (4409.603 * 1.17747004342738) / (distanceMeters * xcTimeRating)
mileDifficulty = 5192.846 / (distanceMeters * xcTimeRating)
```

---

## Sample Data from Excel

### Courses Present:

| Course Name | Distance (mi) | Distance (m) | mile_difficulty | Description |
|-------------|---------------|--------------|-----------------|-------------|
| Track \| 1 Mile | 1.0 | 1609.34 | 1.0000000 | Fast |
| Track \| 3 Mile | 3.0 | 4828.03 | 1.0769950 | Fast |
| Baylands Park \| 5k | 3.107 | 5000 | 1.1298165 | Normal XC |
| Crystal Springs \| 2.95 miles | 2.95 | 4748.5 | 1.1774700 | Very Hard |
| Montgomery Hill \| 2.74 miles | 2.74 | 4409.6 | ? | Hard |

### Key Insights:

1. **Track (1 Mile) = Baseline**
   - `mile_difficulty = 1.0` (the reference point)
   - All other courses rated relative to this

2. **Higher mile_difficulty = Harder Course**
   - Baylands (flat) = 1.13 (13% harder than track mile)
   - Crystal Springs (hilly) = 1.18 (18% harder than track mile)

3. **Precision: 9 Decimal Places**
   - Example: 1.1774700434 (matches our DECIMAL(12,9) fix!)

---

## Implementation Strategy

### 1. Database Function to Calculate mile_difficulty

```sql
CREATE OR REPLACE FUNCTION calculate_mile_difficulty(
  distance_meters INTEGER,
  xc_time_rating DECIMAL
)
RETURNS DECIMAL(12,9) AS $$
BEGIN
  IF distance_meters IS NULL OR distance_meters <= 0 THEN
    RETURN NULL;
  END IF;

  IF xc_time_rating IS NULL OR xc_time_rating <= 0 THEN
    RETURN NULL;
  END IF;

  -- Formula: mileDifficulty = 5192.846 / (distanceMeters * xcTimeRating)
  RETURN ROUND(
    5192.846::DECIMAL / (distance_meters::DECIMAL * xc_time_rating::DECIMAL),
    9
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 2. Migration Script to Convert Old Ratings

```sql
-- Assuming courses table has both old_xc_rating and mile_difficulty columns
UPDATE courses
SET mile_difficulty = calculate_mile_difficulty(distance_meters, old_xc_rating)
WHERE old_xc_rating IS NOT NULL
  AND mile_difficulty IS NULL;
```

### 3. Validation Query

```sql
-- Compare calculated vs expected values
SELECT
  name,
  distance_meters,
  old_xc_rating,
  mile_difficulty AS current_value,
  calculate_mile_difficulty(distance_meters, old_xc_rating) AS calculated_value,
  ABS(mile_difficulty - calculate_mile_difficulty(distance_meters, old_xc_rating)) AS difference
FROM courses
WHERE old_xc_rating IS NOT NULL
ORDER BY difference DESC;
```

---

## Questions for Ron

1. **Does the Excel file contain all courses?**
   - Should we import mile_difficulty values directly from Excel?
   - Or calculate them using the formula?

2. **What is the old_xc_rating column?**
   - Is this the previous rating system you want to phase out?
   - Should we store both old and new ratings during transition?

3. **Magic Constants:**
   - Where did `4409.603` come from? (Is this Montgomery Hill distance in meters?)
   - Where did `1.17747004342738` come from? (Crystal Springs difficulty?)

4. **Do we need to store xcTimeRating in the database?**
   - Or is mile_difficulty sufficient?

---

## Recommended Next Steps

1. Add `old_xc_rating` column to courses table (if not present)
2. Import Excel data with both old and new ratings
3. Create SQL function to calculate conversions
4. Validate calculations match Excel formulas
5. Run migration to populate mile_difficulty for all courses

---

## Related Files

- `/Users/ron/manaxc/manaxc-project/code/database/01-core-tables.sql` - Courses table schema
- `/Users/ron/manaxc/manaxc-project/reference/data/Course Rating Logic.xlsx` - Source data
- ADR-001: Time Storage in Centiseconds (establishes centiseconds as standard)

---

**End of Analysis**
