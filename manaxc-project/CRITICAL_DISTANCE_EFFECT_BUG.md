# CRITICAL BUG: Distance Effect in Network Calibration

**Status:** 🔴 CRITICAL BUG IDENTIFIED
**Impact:** Network calibration produces physically impossible results
**Found:** October 30, 2025 (continuation session)

## The Problem

Network calibration is showing:

```
Crystal Springs, 2.13 Miles
Current:  1.104178929 (10.4% harder than track)
Implied:  0.906980006 (9.3% EASIER than track)
Difference: -17.9%
Confidence: 0%
```

**This is physically impossible:** A 2.13 mile cross country course CANNOT be easier than a 1-mile flat track (difficulty = 1.0).

## Root Cause

Malcolm Slaney's anchor-based network calibration method **assumes you're comparing courses of similar distances**.

When we compare:
- **Anchor:** Crystal Springs 2.95 miles
- **Target:** Crystal Springs 2.13 miles

We introduce a **distance effect confounding variable**:
- Athletes run FASTER per-mile on shorter races (higher sustainable intensity)
- The ratio captures this distance effect, NOT terrain difficulty
- Results in nonsensical difficulty ratings

### Example of the Confounding

Athlete performance:
- Crystal Springs 2.95 mi: 18:00 → 6:06/mile normalized
- Crystal Springs 2.13 mi: 12:30 → 5:52/mile normalized

Ratio = 5:52 / 6:06 = 0.96 (4% faster on shorter course)

**Interpretation:**
- ❌ WRONG: "The 2.13 mile course is 4% easier terrain"
- ✅ CORRECT: "Athletes run 4% faster per-mile on shorter courses due to intensity management"

## The Fix

**Solution:** Only compare courses of **similar distances** (within ±15% tolerance)

### Distance Ranges

For Crystal Springs 2.95 miles anchor (4,748 meters):
- Min: 4,036 meters (2.51 miles)
- Max: 5,461 meters (3.39 miles)

**Excluded courses:**
- Crystal Springs 2.13 miles (3,429m) - TOO SHORT ❌
- Any 2-mile courses - TOO SHORT ❌
- Any 3.5+ mile courses - TOO LONG ❌

**Included courses:**
- Crystal Springs 2.95 miles (anchor) ✓
- Toro Park 2.9 miles ✓
- Courses between 2.5 and 3.4 miles ✓

## Implementation

### New SQL Function

Created: `20251030_fix_distance_comparison.sql`

**Key changes:**
1. Added `distance_tolerance_pct` parameter (default 15%)
2. Calculate min/max distance range
3. Filter courses in `all_course_medians` CTE:
   ```sql
   WHERE c.distance_meters BETWEEN min_distance AND max_distance
   ```

### Before vs After

**Before (BROKEN):**
- Compares ALL courses regardless of distance
- 2.13 mile vs 2.95 mile = invalid comparison
- Produces difficulty < 1.0 (impossible)

**After (FIXED):**
- Only compares courses within 15% distance range
- 2.51 to 3.39 miles for 2.95 mile anchor
- Crystal Springs 2.13 excluded from comparison
- All results will be physically plausible (difficulty > 1.0)

## Why This Matters for Your Coaching

### The Distance Effect is Real

From your documentation and coaching experience:
- **Shorter races (1-2 miles):** Athletes can sustain ~95-100% effort
- **Medium races (2.5-3.5 miles):** Athletes sustain ~90-95% effort
- **Longer races (5k+):** Athletes sustain ~85-90% effort

This is **normal physiology**, not course difficulty.

### What the Bug Was Doing

The bug was interpreting normal distance effects as course difficulty differences:
- Seeing athletes run faster on 2.13 miles than 2.95 miles
- Concluding: "2.13 mile course must be easier terrain"
- Recommending: Lower the difficulty rating to 0.907
- Result: Normalized times would be completely wrong

### Real-World Impact if Applied

If you had applied that 0.907 difficulty to Crystal Springs 2.13:
1. An athlete runs 12:30 for 2.13 miles
2. Normalized calculation: 12:30 × (1609.344 / 3429) / 0.907 = 6:28/mile equivalent
3. **This is SLOWER than reality** - should be ~5:52/mile
4. Rankings would be completely distorted

## Testing the Fix

### Step 1: Check Current Course Distances

Run in Supabase:
```sql
SELECT
  name,
  distance_meters,
  ROUND(distance_meters / 1609.344, 2) as miles,
  difficulty_rating
FROM courses
WHERE name LIKE '%Crystal Springs%'
ORDER BY distance_meters;
```

### Step 2: Apply the Migration

```sql
-- In Supabase SQL Editor:
[paste contents of 20251030_fix_distance_comparison.sql]
```

### Step 3: Test Distance Filtering

```sql
-- See which courses will be compared to 2.95 mile anchor
SELECT
  name,
  distance_meters,
  ROUND(distance_meters / 1609.344, 2) as miles,
  CASE
    WHEN distance_meters BETWEEN 4036 AND 5461 THEN '✓ Included'
    ELSE '✗ Excluded'
  END as comparison_status
FROM courses
ORDER BY distance_meters;
```

### Step 4: Re-run Network Calibration

1. Go to http://localhost:3000/admin/network-calibration
2. Click "Run Calibration"
3. Verify Crystal Springs 2.13 is NO LONGER in results
4. Verify all implied difficulties are > 1.0

## Expected Results After Fix

### Courses That Should Appear
- Only 3-mile courses (2.5 to 3.4 mile range)
- All implied difficulties > 1.0
- Reasonable discrepancies (±0.05 to ±0.15)

### Courses That Should NOT Appear
- Crystal Springs 2.13 miles (too short)
- Any 2-mile or shorter courses
- Any 3.5+ mile courses

### Typical Results (After Fix)

```
Toro Park, 2.9 Miles
Current:  1.150000000
Implied:  1.125000000
Difference: -0.025 (-2.2%)  ← Reasonable
Shared Athletes: 45
Confidence: 85%

North Monterey County, 3.1 Miles
Current:  1.225000000
Implied:  1.198000000
Difference: -0.027 (-2.2%)  ← Reasonable
Shared Athletes: 52
Confidence: 92%
```

## Alternative Solutions (If Needed)

### Option 1: Multiple Anchors by Distance

Instead of one anchor course, use:
- **1.5-2.5 miles:** Different anchor
- **2.5-3.5 miles:** Crystal Springs 2.95 (current)
- **3.5+ miles:** Another anchor

### Option 2: Distance Adjustment Factor

Calculate expected pace drop-off by distance:
```
pace_factor = 1.0 + (distance_diff * 0.02)  // 2% per 0.5 miles
adjusted_ratio = median_ratio / pace_factor
```

But Option 1 (distance filtering) is simpler and more reliable.

## Documentation Updates Needed

After applying the fix:

1. **Update `COURSE_CALIBRATION_COMPLETE.md`:**
   - Add section on distance filtering
   - Document the 15% tolerance rule

2. **Update `SESSION_HANDOFF_2025-10-30_EVENING.md`:**
   - Note this critical bug was found and fixed
   - List the new migration file

3. **Add to `CLAUDE_PROMPT.md`:**
   - Network calibration only compares similar-distance courses
   - Explain why distance effect confounding is a problem

## Key Takeaways

1. **Malcolm Slaney's method requires similar distances** - this is a fundamental assumption
2. **Distance effect is real** - athletes run faster per-mile on shorter races
3. **Always sanity-check results** - difficulty < 1.0 for XC course = bug
4. **The 0% confidence was a red flag** - indicated insufficient/invalid data

---

**Action Required:**
1. Apply `20251030_fix_distance_comparison.sql` migration
2. Re-run network calibration
3. Verify Crystal Springs 2.13 no longer appears
4. Verify all difficulties are > 1.0 and reasonable
