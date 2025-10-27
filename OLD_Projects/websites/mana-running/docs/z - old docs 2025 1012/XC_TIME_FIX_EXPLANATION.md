# XC Time Calculation Fix

## The Problem

Your code was querying `results.time_seconds` directly and treating it as the athlete's best time, but **XC Time is a CALCULATED value**, not a stored field.

## What XC Time Actually Is

**XC Time** normalizes race times across different courses to account for difficulty. The formula is:

```
XC Time = raw_time_in_centiseconds × course.xc_time_rating
```

- **raw_time_in_centiseconds**: The `results.time_seconds` field (despite the name, it's in centiseconds)
- **xc_time_rating**: A course difficulty multiplier (from the `courses` table)
- **Purpose**: Converts all times to a standard course difficulty (Crystal Springs baseline)

### Example:
- An athlete runs 15:30.00 (93000 centiseconds) on a difficult course with `xc_time_rating = 0.950`
- Their XC Time = 93000 × 0.950 = **88,350 centiseconds** (14:43.50 equivalent)
- This 88,350 is what should be compared across athletes

## What Was Wrong

### Old Query (INCORRECT):
```typescript
const { data: allResults } = await supabase
  .from('results')
  .select('athlete_id, time_seconds')
  .in('athlete_id', athleteIds)
  .order('time_seconds', { ascending: true })

// This just gets the fastest raw time, NOT the best XC Time!
```

This was pulling the fastest raw time, which doesn't account for course difficulty.

## The Fix

### New Query (CORRECT):
```typescript
const { data: allResults } = await supabase
  .from('results')
  .select(`
    athlete_id,
    time_seconds,
    race:races!inner(
      course:courses!inner(
        xc_time_rating
      )
    )
  `)
  .in('athlete_id', athleteIds)
  .not('time_seconds', 'is', null)
  .gt('time_seconds', 0)

// Then calculate XC Time for each result
allResults.forEach(result => {
  const race = Array.isArray(result.race) ? result.race[0] : result.race
  const course = race?.course ? (Array.isArray(race.course) ? race.course[0] : race.course) : null
  
  if (course?.xc_time_rating && result.time_seconds > 0) {
    // Calculate XC Time: raw time × course difficulty rating
    const xcTime = result.time_seconds * course.xc_time_rating
    
    // Keep the minimum (best) XC Time for each athlete
    const currentBest = bestXCTimeMap.get(result.athlete_id)
    if (!currentBest || xcTime < currentBest) {
      bestXCTimeMap.set(result.athlete_id, xcTime)
    }
  }
})
```

## What This Does

1. **Fetches all results** for athletes on the school roster
2. **Joins with races and courses** to get the `xc_time_rating` for each result's course
3. **Calculates XC Time** for each result (time × rating)
4. **Finds the minimum XC Time** per athlete (their best performance normalized to standard difficulty)
5. **Stores** this best XC Time in the `best_xc_time` field for display

## Important Notes

- **Time Format**: All times remain in centiseconds for calculation, but display still uses your existing `formatTime()` function
- **Null Handling**: Athletes without any valid results will have `null` XC Time (displays as "-")
- **Course Rating Required**: Results on courses without an `xc_time_rating` are excluded from XC Time calculation
- **Error Tolerance**: The query is wrapped in try/catch so missing course ratings don't crash the page

## Testing

After deploying this fix, verify:
1. Athletes with results now show XC Times in the table
2. The XC Times reflect their best performance (accounting for course difficulty)
3. Sorting by XC Time column works correctly
4. Athletes without results still show "-"

## Next Steps

Replace your current `src/app/schools/[id]/page.tsx` with the corrected version and deploy to see XC Times populate correctly.
