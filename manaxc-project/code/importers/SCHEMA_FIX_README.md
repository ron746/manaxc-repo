# Schema Fix - Apply to Supabase

## What This Fixes

The database schema needs to be updated to match the correct architecture:

**Architecture:**
- Meets → Venues (not courses)
- Courses → Venues
- Races → Courses
- All entities have `athletic_net_id` fields

## How to Apply

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your ManaXC project
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Run the Migration

1. Open `fix_schema.sql` in this directory
2. Copy the entire contents
3. Paste into the Supabase SQL editor
4. Click "Run" (or press Cmd/Ctrl + Enter)

### Step 3: Verify Success

The script will output verification tables showing:
- `venues` table has `athletic_net_id` column
- `courses` table has `venue_id` and `athletic_net_id` columns
- `meets` table has `venue_id` (not `course_id`) and `athletic_net_id`
- `races` table has `athletic_net_race_id` renamed to `athletic_net_race_id`
- All `ath_net_id` fields renamed to `athletic_net_id` for consistency

### Step 4: Test Import

Once the migration is complete, you can test the import:

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
venv/bin/python3 import_csv_data.py to-be-processed/meet_265306_1761610508
```

## What Changed

### 1. Added `athletic_net_id` to venues
```sql
ALTER TABLE venues ADD COLUMN athletic_net_id TEXT UNIQUE;
```

### 2. Fixed meets → venues relationship
```sql
ALTER TABLE meets ADD COLUMN venue_id UUID REFERENCES venues(id);
ALTER TABLE meets DROP COLUMN host_school_id;  -- Removed per Ron's request
```

### 3. Renamed all `ath_net_id` to `athletic_net_id`
For consistency across all tables:
- schools
- athletes
- meets
- courses
- venues

### 4. Renamed `ath_net_race_id` to `athletic_net_race_id`
For consistency with other tables.

## Rollback (if needed)

If something goes wrong, you can rollback by:

1. The script is idempotent (safe to run multiple times)
2. Data migration only copies existing relationships
3. Old columns are only dropped after new ones are populated

To manually rollback specific changes, reverse the ALTER TABLE statements in the SQL editor.

## Next Steps

After running this migration:

1. ✅ Schema will match correct architecture
2. ✅ Import script will work correctly
3. ✅ All Athletic.net IDs will be captured
4. ✅ Meets will correctly reference venues
5. ✅ Races will correctly reference courses

Then you can proceed with importing data from the scraped CSV files.
