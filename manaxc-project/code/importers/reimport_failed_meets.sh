#!/bin/bash

# Re-import meets that had missing results due to trigger errors

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================================"
echo "🔄 Re-importing Meets with Missing Results"
echo "============================================================"
echo ""

echo -e "${RED}⚠️  CRITICAL: Verify triggers are DISABLED${NC}"
echo "Run this SQL in Supabase first:"
echo "  ALTER TABLE results DISABLE TRIGGER USER;"
echo ""
read -p "Press Enter when triggers are confirmed DISABLED..."
echo ""

# Meets to re-import (from check_imported_meets.py output)
MEETS=(
    "254419"  # Flat SAC
    "254321"  # Jackie Henderson Memorial
    "254307"  # Haystack Tune-Up
    "254306"  # Mariner XC Invitational
    "254322"  # Fighting Knights Joust
    "254535"  # Crystal Springs Invitational
)

MEET_NAMES=(
    "Flat SAC (1311 missing)"
    "Jackie Henderson Memorial (1150 missing)"
    "Haystack Tune-Up (1023 missing)"
    "Mariner XC Invitational (926 missing)"
    "Fighting Knights Joust (442 missing)"
    "Crystal Springs Invitational (266 missing)"
)

echo "Will re-import ${#MEETS[@]} meets with missing results:"
for i in "${!MEETS[@]}"; do
    echo "  ${MEETS[$i]}: ${MEET_NAMES[$i]}"
done
echo ""

SUCCESS=0
FAILED=0

for i in "${!MEETS[@]}"; do
    MEET_ID="${MEETS[$i]}"
    MEET_NAME="${MEET_NAMES[$i]}"

    echo ""
    echo -e "${YELLOW}[$((i+1))/${#MEETS[@]}] Re-importing $MEET_NAME...${NC}"

    # Find meet directory in processed
    MEET_DIR=$(find processed -type d -name "meet_${MEET_ID}_*" | head -1)

    if [ -z "$MEET_DIR" ]; then
        echo -e "${RED}❌ Could not find meet directory for ID $MEET_ID${NC}"
        FAILED=$((FAILED + 1))
        continue
    fi

    echo "   Found: $MEET_DIR"

    # Run import with 10-minute timeout
    if timeout 600 venv/bin/python3 import_csv_data.py "$MEET_DIR" 2>&1 | grep -E "(✅|❌|Inserted|Skipped|Created)"; then
        echo -e "${GREEN}✅ Success${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}❌ Failed${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "============================================================"
echo -e "${GREEN}📊 Re-import Summary${NC}"
echo "============================================================"
echo "Total: ${#MEETS[@]}"
echo "Successful: $SUCCESS"
echo "Failed: $FAILED"
echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
echo "1. Run check_imported_meets.py again to verify results"
echo "2. Go to https://mana-running.vercel.app/admin/batch"
echo "3. Click 'Run All' to rebuild derived tables"
echo "4. Re-enable triggers: ALTER TABLE results ENABLE TRIGGER USER;"
