#!/bin/bash
set -e  # Exit on error

FOLDER="to-be-processed/meet_256230_1761716889"
MEET_ID="256230"

echo "================================================================================"
echo "BATCHED IMPORT FOR MEET $MEET_ID"
echo "================================================================================"
echo ""
echo "This script will:"
echo "  1. Clean up any failed partial imports"
echo "  2. Run standard import for venues, courses, schools, meets, and races"
echo "  3. Split athletes.csv into batches of 2000"
echo "  4. Split results.csv into batches of 2000"
echo "  5. Import all athlete batches"
echo "  6. Import all result batches"
echo "  7. Run housekeeping tasks (update result_count, etc.)"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Step 1: Check if meet exists and delete if needed
echo "================================================================================"
echo "STEP 1: Cleanup"
echo "================================================================================"
echo ""

MEET_EXISTS=$(venv/bin/python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))

meet = supabase.table('meets').select('id').eq('athletic_net_id', '$MEET_ID').execute()
print('yes' if meet.data else 'no')
")

if [ "$MEET_EXISTS" = "yes" ]; then
    echo "⚠️  Meet $MEET_ID already exists in database"
    echo ""
    read -p "Delete and re-import? (y/n): " DELETE_CHOICE

    if [ "$DELETE_CHOICE" = "y" ]; then
        echo "Deleting meet $MEET_ID..."
        venv/bin/python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))

meet = supabase.table('meets').select('id').eq('athletic_net_id', '$MEET_ID').execute()
if meet.data:
    meet_id = meet.data[0]['id']
    supabase.table('meets').delete().eq('id', meet_id).execute()
    print('✅ Deleted')
"
        echo ""
    else
        echo "Aborted."
        exit 1
    fi
else
    echo "✅ No existing meet found"
    echo ""
fi

# Step 2: Run standard import for venues, courses, schools, meets, races only
echo "================================================================================"
echo "STEP 2: Import venues, courses, schools, meets, and races"
echo "================================================================================"
echo ""
echo "This uses the standard import script but will fail at athletes stage"
echo "That's expected - we'll import athletes and results separately"
echo ""

timeout 300 venv/bin/python3 import_csv_data.py "$FOLDER" 2>&1 | tee import_256230_stage1.log || true

echo ""
echo "✅ Foundation import complete (venues, courses, schools, meets, races)"
echo ""

# Step 3: Split CSVs
echo "================================================================================"
echo "STEP 3: Splitting CSVs into batches"
echo "================================================================================"
echo ""

venv/bin/python3 split_csv_for_batched_import.py "$FOLDER" 2000

echo ""

# Step 4: Import athlete batches
echo "================================================================================"
echo "STEP 4: Importing athlete batches"
echo "================================================================================"
echo ""

venv/bin/python3 import_batched_athletes.py "$FOLDER"

echo ""

# Step 5: Import result batches
echo "================================================================================"
echo "STEP 5: Importing result batches"
echo "================================================================================"
echo ""

venv/bin/python3 import_batched_results.py "$FOLDER"

echo ""

# Step 6: Housekeeping
echo "================================================================================"
echo "STEP 6: Housekeeping tasks"
echo "================================================================================"
echo ""

venv/bin/python3 housekeeping_after_import.py "$FOLDER"

echo ""

# Step 7: Final verification
echo "================================================================================"
echo "STEP 7: Final verification"
echo "================================================================================"
echo ""

venv/bin/python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))

meet = supabase.table('meets').select('id, name, result_count').eq('athletic_net_id', '$MEET_ID').execute()
if meet.data:
    m = meet.data[0]
    print(f\"✅ Meet imported successfully\")
    print(f\"   Name: {m['name']}\")
    print(f\"   Result count: {m['result_count']}\")
    print()

    expected = 10870
    actual = m['result_count'] or 0

    if actual == expected:
        print(f\"✅ PERFECT: All {expected} results imported!\")
    elif actual >= expected * 0.99:
        print(f\"✅ EXCELLENT: {actual}/{expected} results ({100*actual/expected:.1f}%)\")
    else:
        print(f\"⚠️  WARNING: Only {actual}/{expected} results ({100*actual/expected:.1f}%)\")
else:
    print('❌ Meet not found!')
"

echo ""
echo "================================================================================"
echo "BATCHED IMPORT COMPLETE"
echo "================================================================================"
echo ""
echo "Next steps:"
echo "  1. Move folder to processed/"
echo "  2. Continue with remaining meets"
echo "  3. Run batch operations after ALL imports complete"
