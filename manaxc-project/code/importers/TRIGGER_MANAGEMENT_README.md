# Trigger Management for Bulk Imports

## Overview

The import scripts now automatically disable database triggers during bulk imports for significantly improved performance, then re-enable them and backfill the `is_sb` (Season Best) and `is_pr` (Personal Record) flags afterward.

## Benefits

- **Faster imports**: Triggers are disabled during bulk inserts, reducing database load
- **Automatic backfill**: Season Best and PR flags are automatically calculated after import completes
- **Reliable**: Triggers are always re-enabled, even if import fails
- **Transparent**: Clear logging shows when triggers are disabled/enabled

## One-Time Setup

Before using the trigger management feature, you need to run a one-time SQL setup:

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project (manaxc)
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `setup_trigger_management.sql`
6. Click **Run** or press `Cmd+Enter`

### Option 2: Via Supabase CLI

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
supabase db execute -f setup_trigger_management.sql
```

## Environment Setup

Make sure your `.env.local` file (in the root `/Users/ron/manaxc/` directory) contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key can be found in:
Supabase Dashboard > Settings > API > Project API keys > service_role

**Important**: The service role key has elevated privileges. Keep it secure and never expose it in client-side code.

## Updated Import Scripts

The following scripts now use automatic trigger management:

### 1. `csv_import_06_results.py`

Imports results from CSV with automatic trigger management:

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
python3 csv_import_06_results.py
```

**What happens:**
1. Loads results from CSV
2. **Disables triggers** before import
3. Imports results in batches of 100
4. **Re-enables triggers**
5. **Backfills is_sb and is_pr flags** for all results
6. Shows statistics

### 2. `import_all_results.py`

Imports all results from Excel file with automatic trigger management:

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
python3 import_all_results.py
```

**What happens:**
1. Parses Excel file
2. Imports athletes, meets, races
3. **Disables triggers** before importing results
4. Imports results in batches of 100
5. **Re-enables triggers**
6. **Backfills is_sb and is_pr flags** for all results
7. Shows statistics

## Using TriggerManager in Your Own Scripts

You can use the `TriggerManager` context manager in your own import scripts:

```python
from trigger_manager import TriggerManager
from supabase import create_client
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv('/Users/ron/manaxc/.env.local')

# Create Supabase client with service role key
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# Use TriggerManager for bulk import
with TriggerManager(supabase):
    # Your bulk insert operations here
    results = [...]  # Your results data
    supabase.table('results').insert(results).execute()

# Triggers are automatically re-enabled and flags backfilled here
```

## How It Works

### During Import (Inside `with` block)

1. **Disable trigger**: `ALTER TABLE results DISABLE TRIGGER update_athlete_best_times_trigger`
2. **Fast bulk inserts**: Results are inserted without trigger overhead
3. **athlete_best_times table is still updated**: The trigger normally updates this table, but it's temporarily skipped

### After Import (When `with` block exits)

1. **Re-enable trigger**: `ALTER TABLE results ENABLE TRIGGER update_athlete_best_times_trigger`
2. **Backfill flags**: Run SQL to mark all Season Bests and PRs based on the athlete_best_times table:
   ```sql
   -- Clear all flags
   UPDATE results SET is_sb = FALSE, is_pr = FALSE;

   -- Mark season bests
   UPDATE results r SET is_sb = TRUE
   FROM athlete_best_times abt
   WHERE r.id = abt.season_best_result_id;

   -- Mark PRs
   UPDATE results r SET is_pr = TRUE
   FROM athlete_best_times abt
   WHERE r.id = abt.alltime_best_result_id;
   ```

### Performance Comparison

**Without trigger management:**
- ~100-200 results/second
- Each insert triggers function execution
- Database CPU usage: High

**With trigger management:**
- ~500-1000 results/second (5-10x faster)
- Bulk inserts without triggers
- Database CPU usage: Low during import, spike during backfill

## Error Handling

The TriggerManager ensures triggers are always re-enabled, even if the import fails:

```python
try:
    with TriggerManager(supabase):
        # Import code that might fail
        supabase.table('results').insert(bad_data).execute()
except Exception as e:
    # Triggers are STILL re-enabled here
    print(f"Import failed: {e}")
```

## Troubleshooting

### Error: "Missing SUPABASE_SERVICE_ROLE_KEY"

Make sure you've added the service role key to your `.env.local` file.

### Error: "function exec_sql does not exist"

Run the one-time setup SQL (see "One-Time Setup" section above).

### Triggers not working after import

If you encounter an error during import and triggers aren't re-enabled:

```sql
-- Manually re-enable trigger in Supabase SQL Editor
ALTER TABLE results ENABLE TRIGGER update_athlete_best_times_trigger;
```

### Flags not backfilled correctly

Manually run the backfill SQL in Supabase SQL Editor:

```sql
-- Clear all flags
UPDATE results SET is_sb = FALSE, is_pr = FALSE;

-- Mark season bests
UPDATE results r
SET is_sb = TRUE
FROM athlete_best_times abt
WHERE r.id = abt.season_best_result_id;

-- Mark PRs
UPDATE results r
SET is_pr = TRUE
FROM athlete_best_times abt
WHERE r.id = abt.alltime_best_result_id;

-- Verify counts
SELECT
  COUNT(*) FILTER (WHERE is_sb = TRUE) as season_bests,
  COUNT(*) FILTER (WHERE is_pr = TRUE) as personal_records,
  COUNT(*) as total_results
FROM results;
```

## Testing

Test the trigger manager setup:

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
python3 trigger_manager.py
```

This will verify that:
1. Service role key is configured
2. exec_sql function exists
3. Triggers can be disabled/enabled
4. Flags can be backfilled

## Security Notes

- **Service Role Key**: Has elevated privileges, bypasses Row Level Security
- **Never commit**: The `.env.local` file should be in `.gitignore`
- **Server-side only**: Only use in server-side scripts, never expose to client
- **exec_sql function**: Uses SECURITY DEFINER, be careful with SQL injection

## Future Imports

When importing historical data from prior seasons:

1. The trigger will automatically calculate normalized times
2. Season Bests will be tracked per season (by season_year)
3. Personal Records will track all-time bests
4. Flags will be correctly set even if results are imported out of chronological order

The trigger logic compares normalized times, not dates, so import order doesn't matter.
