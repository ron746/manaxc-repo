# Import Directory Cleanup Instructions

## Files to DELETE (Temporary/Diagnostic Scripts)

```bash
cd /Users/ron/manaxc/manaxc-project/code/importers

# Old import scripts (superseded)
rm import_split_results_254378.py
rm import_split_results_254378_fast.py
rm disable_triggers.py

# Diagnostic scripts (no longer needed)
rm check_athlete_columns.py
rm check_bval_schools.py
rm check_grady_jenkins.py
rm check_recent_imports.py
rm check_specific_meet.py
rm check_stal_schools.py
rm check_duplicate_meet.py

# Temporary query scripts
rm find_all_orphaned.py
rm find_extra_result_254535.py
rm find_missing_result_254332.py
rm find_missing_results.py
rm find_orphaned_result.py
rm diagnose_missing_results.py

# Old meet-specific checks
rm check_meet_253413.py
rm check_meet_254032.py
rm check_meet_254032_results.py
rm check_meet_254332.py
rm check_meet_254467.py
rm check_meet_254535_duplicates.py
rm check_meet_254535_full.py
rm check_meet_256230_status.py
rm check_meet_256606.py
rm check_orphaned_best_times.py
rm check_orphaned_fast.py

# Delete operations
rm delete_duplicate_result_254535.py

# Import logs
rm import_001.log

# Strange files
rm echo
rm "Finished at: $(date)"
```

## Files to KEEP (Active/Useful)

### Current Working Scripts
- `import_single_result_file.py` - Single file import utility
- `update_races_254378_with_ids.py` - Backfill race IDs
- `delete_meet_254378_results.py` - Cleanup utility for meet 254378
- `check_meet_254378_races.py` - Diagnostic for meet 254378
- `import_csv_data.py` - Main CSV import script
- `athletic_net_scraper_v2.py` - Main scraper (PRODUCTION)
- `clear_database.py` - Database utility

### Utilities to Keep
- `import_batched_athletes.py`
- `import_batched_results.py`
- `import_foundation_only.py`
- `import_meet_batched.py`
- `import_results_optimized.py`
- `bulk_import_with_batch_updates.py`
- `bulk_import_with_trigger_management.sh`
- `monitored_import_256230.py`
- `resume_import_256230.py`

### Data Files to Keep
- `all_bval_schools.txt`
- `bval_non_stal_schools.txt`
- `bval_non_stal_schools_final.txt`
- `bval_non_stal_schools_with_ids.json`
- `bval_schools_to_scrape.txt`
- `bval_schools_to_scrape_names_only.txt`

### Shell Scripts to Keep
- `bulk_import_all_meets.sh`
- `reenable_triggers.sh`
- `reimport_failed_meets.sh`
- `run_batched_import_256230.sh`
- `monitor_import_progress.sh`

## Organize Remaining Files

### Create subdirectories:

```bash
# Create organization structure
mkdir -p utilities
mkdir -p archive
mkdir -p active
mkdir -p data

# Move utilities
mv import_batched_*.py utilities/
mv import_meet_batched.py utilities/
mv import_results_optimized.py utilities/
mv bulk_import_*.py utilities/
mv bulk_import_*.sh utilities/
mv monitored_import_*.py utilities/
mv resume_import_*.py utilities/

# Move reference data
mv *_schools*.txt data/
mv *_schools*.json data/

# Move shell scripts
mv *.sh utilities/

# Keep in root:
# - athletic_net_scraper_v2.py
# - import_csv_data.py
# - clear_database.py
# - import_single_result_file.py
```

## Split Result Files

**Location:** `to-be-processed/meet_254378_1761786641/results_*.csv`

**Action:** Keep for now (in case re-import needed)

**Future:** After confirming all 4,655 results imported, can delete split files and keep only original `results.csv`

## Processed Directories

Check if any can be archived:
```bash
ls -la processed/
```

Most appear to be old import attempts. Consider moving to `archive/` or deleting if confirmed imported.

## Summary

**Delete:** ~40 temporary/diagnostic files
**Keep:** ~20 active utilities and scripts
**Organize:** 3 subdirectories (utilities, archive, data)
**Result:** Clean working directory with clear structure
