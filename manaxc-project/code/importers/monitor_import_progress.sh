#!/bin/bash
echo "Monitoring meet 256230 import progress..."
echo "Target: 10,870 results"
echo ""

while true; do
    count=$(venv/bin/python3 -c "
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')
supabase = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))

meet = supabase.table('meets').select('id, result_count').eq('athletic_net_id', '256230').execute()
if meet.data:
    print(meet.data[0]['result_count'] or 0)
else:
    print(0)
" 2>/dev/null)
    
    pct=$(awk "BEGIN {printf \"%.1f\", ($count/10870)*100}")
    echo "[$(date '+%H:%M:%S')] Progress: $count / 10,870 results ($pct%)"
    
    if [ "$count" -eq 10870 ]; then
        echo "✅ Import complete!"
        break
    fi
    
    sleep 30
done
