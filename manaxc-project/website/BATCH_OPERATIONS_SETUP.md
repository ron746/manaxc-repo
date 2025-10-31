# Batch Operations Setup Guide

## Overview

The batch operations system provides both **manual on-demand** and **automated scheduled** execution of database maintenance tasks.

## What Was Created

### 1. API Routes (`/api/admin/batch/*`)

- `rebuild-normalized-times/route.ts` - Recalculate normalized times
- `rebuild-athlete-best-times/route.ts` - Rebuild athlete PR tables
- `rebuild-all/route.ts` - Run all batch operations in sequence

### 2. UI Page (`/admin/batch`)

- Visual interface for running batch operations
- Real-time operation logs
- Estimated duration for each operation
- "Run All" option for complete rebuild

### 3. Database Functions

- `batch_rebuild_normalized_times()` - SQL function
- `batch_rebuild_athlete_best_times()` - SQL function
- `batch_rebuild_course_records()` - SQL function
- `batch_rebuild_school_hall_of_fame()` - SQL function
- `batch_rebuild_school_course_records()` - SQL function

### 4. Scheduled Jobs

- Vercel Cron configuration for automated nightly runs
- Configurable schedule via `vercel.json`

## Setup Instructions

### Step 1: Run Database Migration

Open Supabase SQL Editor and run:

```sql
-- File: website/supabase/migrations/20251029_add_batch_rebuild_functions.sql
```

This creates the 5 batch rebuild functions that the API routes call.

### Step 2: Add Service Role Key

Add to your Vercel environment variables:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Get this from: Supabase Dashboard → Settings → API → service_role key (secret)

⚠️ **Never commit this key to git**

### Step 3: Configure Scheduling (Optional)

Edit `vercel.json` to customize the schedule:

```json
{
  "crons": [
    {
      "path": "/api/admin/batch/rebuild-all",
      "schedule": "0 2 * * *"  // Daily at 2:00 AM UTC
    }
  ]
}
```

Common schedule patterns:
- `0 2 * * *` - Daily at 2:00 AM UTC
- `0 2 * * 0` - Weekly on Sunday at 2:00 AM UTC
- `0 2 * * 1,4` - Twice weekly (Monday and Thursday at 2:00 AM UTC)
- `0 */6 * * *` - Every 6 hours

### Step 4: Deploy to Vercel

The cron jobs will automatically be configured on deployment.

## Usage

### Manual Execution

1. Navigate to `/admin/batch` in your browser
2. Click "Run" on any individual operation
3. Or click "Run All" to execute all operations in sequence
4. Monitor progress in the logs section

### Automated Execution

Batch operations run automatically based on your cron schedule. Check the logs in:
- Vercel Dashboard → Deployments → Functions → Cron Jobs

### After Bulk Imports

When importing large amounts of data with triggers disabled:

1. **During Import**: Disable triggers in Supabase
   ```sql
   ALTER TABLE results DISABLE TRIGGER ALL;
   ```

2. **Import Data**: Run your import scripts (fast!)

3. **Run Batch Operations**: Go to `/admin/batch` and click "Run All"

4. **Re-enable Triggers**: In Supabase
   ```sql
   ALTER TABLE results ENABLE TRIGGER ALL;
   ```

## Operation Details

### Rebuild Normalized Times
- **What**: Recalculates pace-adjusted times based on course difficulty
- **When**: After updating course difficulty ratings, or after bulk import
- **Duration**: ~1-2 minutes for 10K results

### Rebuild Athlete Best Times
- **What**: Recalculates season-best and all-time-best for each athlete
- **When**: After importing new results, or when PRs seem incorrect
- **Duration**: ~2-3 minutes for 10K results

### Rebuild Course Records
- **What**: Rebuilds top 100 leaderboards for each course (by gender)
- **When**: After importing new results, or when leaderboards are stale
- **Duration**: ~1-2 minutes

### Rebuild School Hall of Fame
- **What**: Rebuilds top 100 athletes per school (by gender, normalized times)
- **When**: After importing results or updating normalized times
- **Duration**: ~1-2 minutes

### Rebuild School Course Records
- **What**: Rebuilds best time per grade/course/gender/school
- **When**: After importing results or when school records seem incorrect
- **Duration**: ~2-3 minutes

## Monitoring

### Check Operation Status

1. **UI Logs**: View real-time logs in `/admin/batch`
2. **Vercel Logs**: Dashboard → Deployments → Functions → View Logs
3. **Database**: Query counts in derived tables

### Verify Results

After running batch operations, verify in Supabase:

```sql
-- Check counts
SELECT
  (SELECT COUNT(*) FROM results WHERE normalized_time_cs IS NOT NULL) as results_with_norm_time,
  (SELECT COUNT(*) FROM athlete_best_times) as athlete_best_times,
  (SELECT COUNT(*) FROM course_records) as course_records,
  (SELECT COUNT(*) FROM school_hall_of_fame) as school_hall_of_fame,
  (SELECT COUNT(*) FROM school_course_records) as school_course_records;
```

## Troubleshooting

### "Service role key required" error
- Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables
- Redeploy your application

### Operations timing out
- Vercel has 10-second timeout on Hobby plan
- Upgrade to Pro for 60-second timeout
- Or run operations individually instead of "Run All"

### Cron jobs not running
- Verify `vercel.json` is in project root
- Check cron syntax with [crontab.guru](https://crontab.guru/)
- View logs in Vercel Dashboard → Deployments → Cron Jobs

### Incorrect results after batch rebuild
- Verify course difficulty ratings are set correctly
- Check that meet dates and athlete grad years are accurate
- Re-run individual operations instead of "Run All"

## Best Practices

1. **After Bulk Imports**: Always run "Rebuild All" after importing 500+ results
2. **Weekly Maintenance**: Schedule automated runs weekly for data consistency
3. **Manual Verification**: After each batch run, spot-check a few records for accuracy
4. **Monitoring**: Set up alerts for failed cron jobs in Vercel
5. **Backup**: Always backup database before running batch operations on production

## Performance

Expected durations (based on 10K results):
- Individual operations: 1-3 minutes each
- "Run All": 5-10 minutes total
- With 100K results: 10-30 minutes total

The batch operations are optimized for performance using:
- Bulk SQL operations (no row-by-row processing)
- Indexed columns for fast joins
- TRUNCATE + INSERT for complete rebuilds
- Window functions for efficient ranking
