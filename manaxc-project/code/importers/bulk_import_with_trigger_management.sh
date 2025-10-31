#!/bin/bash

# Bulk Import with Automatic Trigger Management
# This script disables triggers, runs all imports, then tells you to run batch ops

set -e  # Exit on error

echo "============================================================"
echo "🚀 Starting Bulk Import with Trigger Management"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase connection is available
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}ERROR: Supabase credentials not found in environment${NC}"
    echo "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo -e "${YELLOW}Step 1: Disabling triggers on results table...${NC}"
python3 - <<'PYTHON_DISABLE'
import os
from supabase import create_client

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# Disable triggers
result = supabase.rpc('exec_sql', {
    'sql': 'ALTER TABLE results DISABLE TRIGGER USER;'
}).execute()

print("✅ Triggers disabled")
PYTHON_DISABLE

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to disable triggers${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Counting meets to import...${NC}"
MEET_COUNT=$(find to-be-processed -name "metadata.json" -type f | wc -l | tr -d ' ')
echo "Found ${MEET_COUNT} meets to import"
echo ""

if [ "$MEET_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No meets to import!${NC}"
    exit 0
fi

echo -e "${YELLOW}Step 3: Starting imports...${NC}"
echo ""

# Counter for progress
IMPORTED=0
FAILED=0

# Find all meet directories and import them
for MEET_DIR in $(find to-be-processed -name "metadata.json" -type f -exec dirname {} \; | sort); do
    MEET_NAME=$(basename "$MEET_DIR")
    IMPORTED=$((IMPORTED + 1))

    echo ""
    echo -e "${GREEN}[${IMPORTED}/${MEET_COUNT}] Importing ${MEET_NAME}...${NC}"

    # Run import with timeout
    if timeout 600 venv/bin/python3 import_csv_data.py "$MEET_DIR" 2>&1; then
        echo -e "${GREEN}✅ ${MEET_NAME} imported successfully${NC}"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            echo -e "${RED}❌ ${MEET_NAME} timed out (>10 minutes)${NC}"
        else
            echo -e "${RED}❌ ${MEET_NAME} failed with exit code ${EXIT_CODE}${NC}"
        fi
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "============================================================"
echo -e "${GREEN}📊 Import Summary${NC}"
echo "============================================================"
echo "Total meets: ${MEET_COUNT}"
echo "Successful: $((IMPORTED - FAILED))"
echo "Failed: ${FAILED}"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT: Next Steps${NC}"
echo ""
echo "1. Go to your ManaXC admin panel: https://mana-running.vercel.app/admin/batch"
echo "2. Click 'Run All' to rebuild derived tables"
echo "3. After batch operations complete, run:"
echo "   ${GREEN}./reenable_triggers.sh${NC}"
echo ""
echo "Or run this SQL in Supabase:"
echo "   ${GREEN}ALTER TABLE results ENABLE TRIGGER USER;${NC}"
echo ""
echo "============================================================"
