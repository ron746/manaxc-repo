# Season Best (SB) and Personal Record (PR) Feature

## What's New

The home page now displays performance statistics for each meet:
- **Top line**: "XX Results" (total result count)
- **Bottom line**: "YY SBs • ZZ PRs" (Season Bests and Personal Records)

## What Was Done

### 1. Database Migration Created
Created `/website/supabase/migrations/20251031_add_is_sb_field.sql` which:
- Adds `is_sb` field to the results table (tracks Season Best performances)
- Updates the trigger function to automatically mark `is_sb` and `is_pr` flags
- Backfills existing results with the correct flags

### 2. Query Updates
Updated `getRecentMeets()` in `/website/lib/supabase/queries.ts` to return:
- `result_count` - Total results for the meet
- `sb_count` - Number of Season Best performances
- `pr_count` - Number of Personal Records

### 3. Home Page UI Updates
Updated `/website/app/page.tsx` to display:
- Result count on the top line
- SB and PR counts on the bottom line (e.g., "142 SBs • 37 PRs")

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project (manaxc)
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of:
   `/Users/ron/manaxc/manaxc-project/website/supabase/migrations/20251031_add_is_sb_field.sql`
6. Paste into the SQL editor
7. Click **Run** or press `Cmd+Enter`

### Option 2: Supabase CLI (if linked)

```bash
cd /Users/ron/manaxc/manaxc-project/website
supabase db push
```

## How It Works

### Automatic Updates
Once the migration is applied, the system automatically:
1. **When a new result is inserted**:
   - Calculates normalized time
   - Checks if it's a season best for that athlete
   - Checks if it's an all-time PR for that athlete
   - Sets `is_sb = TRUE` and/or `is_pr = TRUE` accordingly
   - Clears the flags from previous SB/PR results

2. **Previous records are updated**:
   - If a new SB is set, the old SB loses its `is_sb` flag
   - If a new PR is set, the old PR loses its `is_pr` flag

### Database Structure
- `results.is_sb` - Boolean flag marking Season Best performances
- `results.is_pr` - Boolean flag marking Personal Records (already existed)
- `athlete_best_times` - Table tracking each athlete's season and all-time bests

## Verification

After applying the migration, you can verify it worked by:

1. Check the migration output shows:
   ```
   Migration completed successfully! is_sb and is_pr flags are now automatically maintained.
   ```

2. Visit http://localhost:3000 (or your production URL)
   - The home page should show meet stats like "342 Results" and "142 SBs • 37 PRs"

3. Query the database to see flagged results:
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE is_sb = TRUE) as season_bests,
     COUNT(*) FILTER (WHERE is_pr = TRUE) as personal_records,
     COUNT(*) as total_results
   FROM results;
   ```

## Notes

- The home page code is already deployed (included in this commit)
- The database migration needs to be applied separately via Supabase Dashboard
- Once applied, all future results will automatically have SB/PR flags set
- Existing results were backfilled with the correct flags during migration
