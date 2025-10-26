# Data Import Instructions

## Issue Discovered

Previous import attempts failed because Supabase **Row Level Security (RLS)** policies are blocking inserts from the anonymous key.

Error:
```
'new row violates row-level security policy for table "athletes"'
```

## Solution: Temporarily Disable RLS

Follow these steps to successfully import all Westmont XC data:

### Step 1: Disable RLS in Supabase

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `mdspteohgwkpttlmdayn`
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy and paste the contents of `DISABLE_RLS_FOR_IMPORT.sql`
6. Click **Run** (or press Cmd+Enter)
7. Verify the output shows `rowsecurity = false` for all tables

### Step 2: Run the Import Script

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
source venv/bin/activate  # Activate Python virtual environment
python3 import_all_results.py
```

When prompted "Import 6711 results? (yes/no):", type `yes` and press Enter.

### Step 3: Re-Enable RLS After Import

1. Go back to Supabase SQL Editor
2. Click **New query**
3. Copy and paste the contents of `ENABLE_RLS_AFTER_IMPORT.sql`
4. Click **Run** (or press Cmd+Enter)
5. Verify policies are created

## What Will Be Imported

- **Athletes:** 1,062 unique athletes
- **Courses:** 99 courses
- **Meets:** 422 meets
- **Results:** 6,711 race results

All from the Westmont XC Excel file spanning multiple years of competition.

## After Import

Once the import completes successfully:

1. **Check the website:** Visit https://manaxc.com
2. **Stats should update:** You should see non-zero counts for Athletes, Courses, and Results
3. **Rebuild if needed:** The website is static, so you may need to trigger a Cloudflare redeploy to see updated stats

## Security Notes

- RLS is **disabled only temporarily** for the import
- After import, RLS is re-enabled with read-only policies
- Read-only policies allow anyone to view data (which is what we want)
- No one can insert/update/delete data without proper authentication

## Troubleshooting

### If import still fails after disabling RLS:

1. Check the error message carefully
2. Verify you ran `DISABLE_RLS_FOR_IMPORT.sql` successfully
3. Check that the Excel file exists at `/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results.xlsx`
4. Look for specific constraint errors (foreign key, unique, etc.)

### If courses are missing:

Some courses may need to be created first. The import script will skip results for courses that don't exist in the database.

### If website stats don't update:

The landing page is statically generated. You'll need to:
1. Make a small change to trigger a rebuild (or just redeploy)
2. Wait for Cloudflare Pages to rebuild (~40-50 seconds)
3. Hard refresh the browser (Cmd+Shift+R)
