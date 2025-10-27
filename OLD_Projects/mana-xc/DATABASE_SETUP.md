# Database Schema Setup Guide

## Step 1: Update Supabase Schema

Your Supabase database needs additional columns to support the import features.

### How to Apply the Schema Update

1. **Go to Supabase Dashboard**
   - Visit https://app.supabase.com
   - Select your `mana-xc` project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Open the file `supabase-schema-update.sql` in this directory
   - Copy all the SQL code
   - Paste it into the SQL Editor
   - Click "Run" (or press Cmd+Enter)

4. **Verify Success**
   - You should see: "Schema update completed successfully!"
   - Check that the tables now have the new columns

## What This Migration Does

### Adds Missing Columns:
- `meets.athletic_net_id` - For duplicate detection when scraping
- `meets.ath_net_id` - Athletic.net school identifier
- `courses.distance_meters` - Race distance tracking
- `races.athletic_net_id` - Race tracking for scraper
- `races.distance_meters` - Race-specific distance
- `races.xc_time_rating` - Course difficulty rating (default: 1.000)
- `results.season_year` - Denormalized year for faster queries

### Creates Performance Indexes:
- Fast lookups by Athletic.net IDs
- Optimized athlete and race queries

### Creates Materialized View:
- `athlete_xc_times_v3` - Pre-computed normalized XC PRs
- Automatically applies course ratings
- Must be refreshed after data changes

## After Running the Migration

You can now:
1. ✅ Import data from Athletic.net scraper
2. ✅ Use the bulk import tool at `/admin/bulk-import`
3. ✅ Set course ratings at `/admin/course-ratings`
4. ✅ Analyze athlete performances

## Refreshing the Materialized View

After importing new data, refresh the view:

```sql
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;
```

Or use the Supabase dashboard to run this command.
