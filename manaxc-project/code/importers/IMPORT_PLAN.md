# Import Plan to Fix Missing Results

## Problem Summary

You have 9 meets with missing results due to **triggers being enabled during import**:

### Catastrophic Losses (99% missing):
- **Flat SAC**: 3/1314 results (1311 missing)
- **Jackie Henderson Memorial**: 2/1152 results (1150 missing)
- **Haystack Tune-Up**: 2/1025 results (1023 missing)
- **Mariner XC Invitational**: 2/928 results (926 missing)
- **Fighting Knights Joust**: 7/449 results (442 missing)

### Significant Loss:
- **Crystal Springs Invitational**: 1125/1391 results (266 missing)

### Minor Losses:
- **Artichoke Invitational**: 1657/1658 results (1 missing)
- **Golden Eagle Invitational**: 1227/1228 results (1 missing)
- **Scrimmage**: 16/29 results (13 missing)

## Root Cause

When triggers are ENABLED during bulk imports:
1. Each result insert triggers calculations for athlete_best_times, course_records, etc.
2. These trigger-generated records reference the result being inserted
3. FK violations occur when derived tables don't exist yet
4. Duplicate key violations occur when triggers try to create the same record multiple times
5. The import fails silently for most results

## Solution: 3-Step Process

### Step 1: Re-import Failed Meets (with triggers DISABLED)

**CRITICAL**: First verify triggers are disabled in Supabase:
```sql
ALTER TABLE results DISABLE TRIGGER USER;
```

Then run:
```bash
./reimport_failed_meets.sh
```

This will re-import the 6 most severely affected meets.

### Step 2: Import Remaining New Meets

After re-imports complete, import the 20 remaining unprocessed meets:

```bash
./bulk_import_all_meets.sh
```

### Step 3: Run Batch Operations & Re-enable Triggers

1. Go to: https://mana-running.vercel.app/admin/batch
2. Click **"Run All"**
3. Wait for completion (3-5 minutes)
4. In Supabase SQL Editor:
   ```sql
   ALTER TABLE results ENABLE TRIGGER USER;
   ```

## Verification

After each step, verify results:
```bash
venv/bin/python3 check_imported_meets.py
```

Should show 0 discrepancies when done.

## Summary

- **Re-import**: 6 meets with catastrophic losses
- **New import**: 20 remaining meets
- **Batch ops**: Rebuild all derived tables
- **Re-enable**: Turn triggers back on

Total time estimate: 30-60 minutes depending on meet sizes.
