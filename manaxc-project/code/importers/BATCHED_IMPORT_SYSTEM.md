# Batched Import System for Large Meets

This system solves the HTTP/2 connection timeout issue by splitting large datasets into manageable batches.

## Problem

The standard import fails on large meets (10,000+ results) due to HTTP/2 connection limits after ~20,000 API requests during athlete lookup phase.

## Solution

Break athletes and results into batches of ~2,000 records each, importing them sequentially with connection resets between batches.

## Files Created

### 1. `split_csv_for_batched_import.py`
Splits athletes.csv and results.csv into smaller batch files.

**Usage:**
```bash
venv/bin/python3 split_csv_for_batched_import.py to-be-processed/meet_256230_1761716889 2000
```

**Output:**
- `to-be-processed/meet_256230_1761716889/athletes_batches/athletes_1.csv`
- `to-be-processed/meet_256230_1761716889/athletes_batches/athletes_2.csv`
- ... (5 batches total)
- `to-be-processed/meet_256230_1761716889/results_batches/results_1.csv`
- `to-be-processed/meet_256230_1761716889/results_batches/results_2.csv`
- ... (5 batches total)

### 2. `import_batched_athletes.py`
Imports all athlete batches sequentially, with 2-second pauses between batches.

**Features:**
- Loads school mappings first
- Checks for existing athletes (skips duplicates)
- Progress tracking per batch
- 2-second pause between batches to reset connections

**Usage:**
```bash
venv/bin/python3 import_batched_athletes.py to-be-processed/meet_256230_1761716889
```

### 3. `import_batched_results.py`
Imports all result batches sequentially, with athlete lookup caching.

**Features:**
- Caches athlete lookups across batches (massive performance boost)
- Duplicate detection using (time_cs, place_overall) pairs
- Progress tracking per batch
- 2-second pause between batches

**Usage:**
```bash
venv/bin/python3 import_batched_results.py to-be-processed/meet_256230_1761716889
```

### 4. `housekeeping_after_import.py`
Updates cached counts and performs cleanup after batched import.

**Tasks:**
- Updates `meets.result_count`
- Updates `races.result_count` for each race
- Summary statistics

**Usage:**
```bash
venv/bin/python3 housekeeping_after_import.py to-be-processed/meet_256230_1761716889
```

### 5. `run_batched_import_256230.sh`
Master script that orchestrates the entire workflow.

**Workflow:**
1. Checks for existing meet and offers to delete
2. Runs standard import for venues, courses, schools, meets, races (will fail at athletes - expected)
3. Splits CSVs into batches
4. Imports all athlete batches
5. Imports all result batches
6. Runs housekeeping tasks
7. Verifies final result count

**Usage:**
```bash
./run_batched_import_256230.sh
```

This is the **recommended** way to import meet 256230.

## Manual Workflow

If you prefer to run steps manually:

```bash
# Step 1: Delete existing partial import (if needed)
venv/bin/python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client
load_dotenv('.env')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
meet = supabase.table('meets').select('id').eq('athletic_net_id', '256230').execute()
if meet.data:
    supabase.table('meets').delete().eq('id', meet.data[0]['id']).execute()
    print('Deleted')
"

# Step 2: Import foundation (venues, courses, schools, meets, races)
# This will fail at athletes stage - that's expected
timeout 300 venv/bin/python3 import_csv_data.py to-be-processed/meet_256230_1761716889 || true

# Step 3: Split CSVs
venv/bin/python3 split_csv_for_batched_import.py to-be-processed/meet_256230_1761716889 2000

# Step 4: Import athletes
venv/bin/python3 import_batched_athletes.py to-be-processed/meet_256230_1761716889

# Step 5: Import results
venv/bin/python3 import_batched_results.py to-be-processed/meet_256230_1761716889

# Step 6: Housekeeping
venv/bin/python3 housekeeping_after_import.py to-be-processed/meet_256230_1761716889

# Step 7: Verify
venv/bin/python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client
load_dotenv('.env')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
meet = supabase.table('meets').select('result_count').eq('athletic_net_id', '256230').execute()
print(f\"Result count: {meet.data[0]['result_count'] if meet.data else 0}\")
"
```

## Expected Timeline

For meet 256230 (10,870 results):
- Split CSVs: ~5 seconds
- Import athletes (5 batches): ~10-15 minutes
- Import results (5 batches): ~20-30 minutes
- Housekeeping: ~2 minutes
- **Total: ~35-50 minutes**

## Key Features

1. **Connection Reset**: 2-second pauses between batches allow HTTP/2 connections to reset
2. **Caching**: Athlete lookup cache dramatically reduces API calls for results import
3. **Resume-Safe**: Each batch is independent - can restart from any batch if needed
4. **Progress Tracking**: Real-time progress display for each batch
5. **Error Handling**: Continues on errors, reports at end of each batch
6. **Duplicate Detection**: Uses (time_cs, place_overall) pairs to avoid duplicates

## Advantages Over Standard Import

| Feature | Standard Import | Batched Import |
|---------|----------------|----------------|
| Max dataset size | ~7,000 results | Unlimited |
| HTTP/2 timeout risk | High | None |
| Connection resets | Never | Every batch |
| Resume capability | No | Yes (per batch) |
| Progress visibility | Limited | Detailed |
| Memory usage | High | Low (batched) |

## Next Steps for Other Large Meets

This system can be reused for any large meet:

1. Copy `run_batched_import_256230.sh` to `run_batched_import_<meet_id>.sh`
2. Update `MEET_ID` and `FOLDER` variables
3. Run the script

Or use the individual scripts directly with any meet folder.

## Important Notes

- **athlete_best_times** and **course_records** are NOT updated during batched import
- These will be rebuilt in the batch operations step after ALL imports complete
- This is intentional - rebuilding after each result is too slow for large imports
- Run the global batch rebuild once at the end of all imports
