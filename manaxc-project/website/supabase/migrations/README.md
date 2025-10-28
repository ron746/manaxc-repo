# Database Migrations

## Running Migrations

To apply these migrations to your Supabase database:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (by date)

## Migration Files

### 20251028_add_normalized_time_cs.sql
**Purpose**: Adds `normalized_time_cs` column to the `results` table for performance optimization.

**What it does**:
- Adds `normalized_time_cs INTEGER` column to `results` table
- Creates an index for fast querying
- Calculates normalized time for all existing results
- Creates a trigger to automatically calculate on INSERT/UPDATE
- Formula: `time_cs / difficulty_rating / distance_meters * 1609.344`

**Benefits**:
- Pre-computed normalized times for instant comparisons
- Enables "fastest normalized times ever" queries
- Avoids client-side calculation overhead
- Consistent normalization across the platform

**Automatic**: The trigger ensures all future results get `normalized_time_cs` calculated automatically.

---

### 20251028_create_season_best_times_function.sql
**Purpose**: Creates a PostgreSQL function to efficiently retrieve season best times, bypassing Supabase's 1000-record limit.

**What it does**:
- Creates `get_season_best_times(school_id, season_year)` function
- Returns each athlete's best time for each course they ran
- Dramatically reduces data transfer (athletes × courses instead of all results)
- Creates performance index

**Benefits**:
- Solves the 1000-record Supabase limit
- Server-side aggregation is much faster
- Reduces bandwidth and client processing
- Production-ready for any scale

**Usage Example** (in TypeScript/Supabase client):
```typescript
const { data, error } = await supabase
  .rpc('get_season_best_times', {
    p_school_id: schoolId,
    p_season_year: 2025
  })
```

**Returns**:
- `athlete_id`, `athlete_name`, `athlete_gender`, `athlete_grad_year`
- `course_id`, `course_name`, `course_difficulty`, `course_distance`
- `best_time_cs`, `best_normalized_time_cs`
- `meet_id`, `race_id`, `result_id`, `meet_name`, `meet_date`

---

## Production Deployment Checklist

- [ ] Run 20251028_add_normalized_time_cs.sql
- [ ] Verify normalized_time_cs values look correct (spot check)
- [ ] Run 20251028_create_season_best_times_function.sql
- [ ] Test the function with sample data
- [ ] Update frontend code to use RPC function instead of direct queries
- [ ] Monitor query performance and adjust indexes if needed

## Rollback

If you need to rollback these changes:

```sql
-- Rollback normalized_time_cs
DROP TRIGGER IF EXISTS trigger_calculate_normalized_time_cs ON results;
DROP FUNCTION IF EXISTS calculate_normalized_time_cs();
ALTER TABLE results DROP COLUMN IF EXISTS normalized_time_cs;

-- Rollback season best times function
DROP FUNCTION IF EXISTS get_season_best_times(UUID, INTEGER);
```

## Notes

- The trigger automatically handles new imports
- Existing scraper code doesn't need modification
- The 1000-record limit workaround works for any table size
- Consider adding similar functions for other aggregation needs
