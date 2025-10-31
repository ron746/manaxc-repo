# Bulk Import Checklist

## Step 1: Disable Triggers ⚠️
**CRITICAL**: Run this in Supabase SQL Editor BEFORE importing:

```sql
ALTER TABLE results DISABLE TRIGGER USER;
```

Verify triggers are disabled:
```sql
SELECT
    tgname as trigger_name,
    CASE
        WHEN tgenabled = 'O' THEN 'ENABLED'
        WHEN tgenabled = 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END as status
FROM pg_trigger
WHERE tgrelid = 'results'::regclass
AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;
```

All triggers should show **DISABLED**.

## Step 2: Run Bulk Import

From `/Users/ron/manaxc/manaxc-project/code/importers/`:

```bash
./bulk_import_all_meets.sh
```

This will:
- Import all 21 remaining meets
- Show progress as each completes
- Skip/report any that timeout (>10 min)
- Save logs to `/tmp/import_*.log`

## Step 3: Run Batch Operations

After all imports complete:

1. Go to: https://mana-running.vercel.app/admin/batch
2. Click **"Run All"**
3. Wait for all operations to complete (should take 3-5 minutes)

This rebuilds:
- Normalized times
- Athlete best times
- Course records
- School hall of fame
- School course records

## Step 4: Re-enable Triggers

After batch operations complete, run in Supabase:

```sql
ALTER TABLE results ENABLE TRIGGER USER;
```

Verify triggers are enabled:
```sql
SELECT
    tgname as trigger_name,
    CASE
        WHEN tgenabled = 'O' THEN 'ENABLED'
        WHEN tgenabled = 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END as status
FROM pg_trigger
WHERE tgrelid = 'results'::regclass
AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;
```

All triggers should show **ENABLED**.

## Done! ✅

Your bulk import is complete and triggers are back online.

## Troubleshooting

### Triggers keep re-enabling
- Check if any migrations are running
- Check if database restarted
- Make sure you're using the Supabase SQL Editor, not the Dashboard

### Import times out
- Likely meet 254378 (state championship)
- Has 4,654 athletes with empty `athletic_net_id` fields
- Can skip this meet - it's not a BVAL/STAL meet

### Failed imports
- Check logs in `/tmp/import_<meet_name>.log`
- Most common issue: Data quality (missing fields, invalid data)
- Can usually skip and investigate later
