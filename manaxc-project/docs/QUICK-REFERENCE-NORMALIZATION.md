# Quick Reference: Time Normalization

**⚠️ THIS IS THE CORE ALGORITHM - NEVER MODIFY WITHOUT FULL UNDERSTANDING**

## The Formula (What You Need to Know)

### Converting Race Time to Track Mile (Normalization)
```typescript
const METERS_PER_MILE = 1609.344

pace_per_meter = time_cs / race_distance_meters
mile_pace = pace_per_meter * METERS_PER_MILE
normalized_time_cs = mile_pace / difficulty_rating
```

### Converting Track Mile to Any Course (Projection)
```typescript
pace_per_meter = normalized_time_cs / METERS_PER_MILE
scaled_time = pace_per_meter * target_distance_meters
projected_time = scaled_time * target_difficulty_rating
```

## Quick Example
**15:29 on a hilly 2.74mi course → 16:16 on a hilly 2.95mi course**

```
Input:  92,900 cs, 4410m, difficulty 1.205
Step 1: 92900 / 4410 = 21.07 cs/meter
Step 2: 21.07 * 1609.344 = 33,902 cs (mile pace)
Step 3: 33902 / 1.205 = 28,127 cs (normalized track mile)

Project to 4748m course with difficulty 1.177:
Step 1: 28127 / 1609.344 = 17.48 cs/meter
Step 2: 17.48 * 4748 = 82,984 cs
Step 3: 82984 * 1.177 = 97,685 cs (16:16.86)
```

## Automatic Updates

**When you add a new result:**
```
1. Insert result into results table
   ↓
2. Trigger automatically runs
   ↓
3. Calculates normalized_time_cs
   ↓
4. Compares to athlete's season best for that year
   ↓
5. Compares to athlete's all-time personal best
   ↓
6. Updates athlete_best_times table if improved
   ↓
7. Done! No manual maintenance needed
```

**Example:**
```sql
-- You just insert the result...
INSERT INTO results (athlete_id, race_id, time_cs, place_overall)
VALUES ('athlete-uuid', 'race-uuid', 92900, 15);

-- Trigger automatically:
-- ✓ Calculates normalized_time_cs (28,127)
-- ✓ Checks if 28,127 < current season best → Updates if better
-- ✓ Checks if 28,127 < all-time best → Updates if better
-- ✓ athlete_best_times table is now current
```

## When to Use

### Use Normalization When:
- Storing season-best times
- Comparing athletes across different courses
- Finding personal records
- Ranking athletes fairly

### Use Projection When:
- Displaying times for a specific target course
- Predicting race results
- Team scoring on hypothetical courses
- "What if" scenarios

## Constants

```typescript
const METERS_PER_MILE = 1609.344  // Never change this!
```

## Common Mistakes to Avoid

❌ **Wrong:** Using miles instead of meters
❌ **Wrong:** Forgetting times are in centiseconds
❌ **Wrong:** Using difficulty_rating - 5.0 (old formula)
❌ **Wrong:** Scaling distance before normalizing difficulty

✅ **Right:** Always meters, always centiseconds, always normalize then project

## Files to Check

If you need to modify time calculations:
1. Read `/docs/NORMALIZATION-ALGORITHM.md` first (REQUIRED)
2. Check database: `results.normalized_time_cs`
3. Update triggers: `/code/database/migrations/001-add-normalized-times.sql`
4. Update UI: `/website/app/season/page.tsx`

## Testing Your Changes

```typescript
// These MUST always be true:
const test = {
  time: 92900,
  distance: 4410,
  difficulty: 1.205297234
}

const normalized = normalize(test.time, test.distance, test.difficulty)
assert(Math.abs(normalized - 28127.55) < 1, 'Normalization broken!')

const projected = project(normalized, 4748, 1.177163037)
assert(Math.abs(projected - 97685) < 1, 'Projection broken!')
```

## Get Help

If you're unsure about time calculations:
1. Check `/docs/NORMALIZATION-ALGORITHM.md` (comprehensive)
2. Review test cases in that document
3. Ask Ron about course difficulty ratings
4. Never guess - this is the core value proposition

---

**Last Updated:** 2025-10-28
