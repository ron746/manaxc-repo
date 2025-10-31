#!/bin/bash

# Simple Bulk Import Script for All Remaining Meets
# Make sure triggers are DISABLED before running this!

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================================"
echo "🚀 Bulk Import Script"
echo "============================================================"
echo ""

echo -e "${RED}⚠️  CRITICAL: Before running, verify triggers are DISABLED${NC}"
echo "Run this in Supabase SQL Editor:"
echo "  ALTER TABLE results DISABLE TRIGGER USER;"
echo ""
read -p "Press Enter when you've confirmed triggers are disabled..."
echo ""

echo -e "${YELLOW}Counting meets to import...${NC}"
MEET_COUNT=$(find to-be-processed -name "metadata.json" -type f | wc -l | tr -d ' ')
echo "Found ${MEET_COUNT} meets to import"
echo ""

if [ "$MEET_COUNT" -eq 0 ]; then
    echo "No meets to import!"
    exit 0
fi

IMPORTED=0
FAILED=0
FAILED_MEETS=()

echo -e "${YELLOW}Starting imports...${NC}"
echo ""

for MEET_DIR in $(find to-be-processed -name "metadata.json" -type f -exec dirname {} \; | sort); do
    MEET_NAME=$(basename "$MEET_DIR")
    IMPORTED=$((IMPORTED + 1))

    echo ""
    echo -e "${GREEN}[${IMPORTED}/${MEET_COUNT}] Importing ${MEET_NAME}...${NC}"

    if timeout 600 venv/bin/python3 import_csv_data.py "$MEET_DIR" 2>&1 | tee "/tmp/import_${MEET_NAME}.log"; then
        echo -e "${GREEN}✅ Success${NC}"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            echo -e "${RED}❌ Timed out (>10 min) - Likely empty athletic_net_ids${NC}"
        else
            echo -e "${RED}❌ Failed (exit code ${EXIT_CODE})${NC}"
        fi
        FAILED=$((FAILED + 1))
        FAILED_MEETS+=("$MEET_NAME")
    fi
done

echo ""
echo "============================================================"
echo -e "${GREEN}📊 Import Summary${NC}"
echo "============================================================"
echo "Total: ${MEET_COUNT}"
echo "Successful: $((IMPORTED - FAILED))"
echo "Failed: ${FAILED}"

if [ ${#FAILED_MEETS[@]} -gt 0 ]; then
    echo ""
    echo "Failed meets:"
    for meet in "${FAILED_MEETS[@]}"; do
        echo "  - $meet"
    done
fi

echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
echo "1. Go to: https://mana-running.vercel.app/admin/batch"
echo "2. Click 'Run All' to rebuild derived tables"
echo "3. After batch ops complete, re-enable triggers in Supabase:"
echo "   ${GREEN}ALTER TABLE results ENABLE TRIGGER USER;${NC}"
echo ""
