# Database Migrations

This directory contains SQL migration files for the Mana XC database.

## Running Migrations

### Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of the migration file
4. Execute the SQL

### Via psql (if you have direct access)
```bash
psql -h your-supabase-host -U postgres -d postgres -f 001-add-normalized-times.sql
```

## Migrations

### 001-add-normalized-times.sql
**Date:** 2025-10-28
**Purpose:** Add normalized time calculations for performance optimization

**Changes:**
- Adds `normalized_time_cs` column to `results` table
- Creates `athlete_best_times` table for fast season/all-time best lookups
- Adds `calculate_normalized_time()` function
- Creates trigger to auto-maintain normalized times
- Backfills existing data

**Impact:**
- Season projection page will be 10-20x faster
- Enables efficient cross-course comparisons
- Required for all normalization features

**Rollback:**
```sql
DROP TRIGGER IF EXISTS update_athlete_best_times_trigger ON results;
DROP FUNCTION IF EXISTS update_athlete_best_times();
DROP FUNCTION IF EXISTS calculate_normalized_time(INTEGER, INTEGER, DECIMAL);
DROP TABLE IF EXISTS athlete_best_times;
ALTER TABLE results DROP COLUMN IF EXISTS normalized_time_cs;
```

## Migration Checklist

Before running a migration:
- [ ] Backup database (Supabase auto-backups enabled)
- [ ] Review SQL for your specific schema
- [ ] Test on development/staging first
- [ ] Check migration verification queries
- [ ] Update application code to use new tables

After running a migration:
- [ ] Verify data integrity with included queries
- [ ] Check application still works
- [ ] Monitor performance improvements
- [ ] Document any issues
