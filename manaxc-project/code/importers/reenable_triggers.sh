#!/bin/bash

# Re-enable triggers after bulk import and batch operations are complete

echo "🔧 Re-enabling triggers on results table..."

python3 - <<'PYTHON_ENABLE'
import os
from supabase import create_client

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# Enable triggers
result = supabase.rpc('exec_sql', {
    'sql': 'ALTER TABLE results ENABLE TRIGGER USER;'
}).execute()

print("✅ Triggers re-enabled")

# Verify
verify_result = supabase.rpc('exec_sql', {
    'sql': """
    SELECT
        tgname as trigger_name,
        CASE
            WHEN tgenabled = 'O' THEN 'ENABLED'
            WHEN tgenabled = 'D' THEN 'DISABLED'
            ELSE tgenabled::text
        END as status
    FROM pg_trigger
    WHERE tgrelid = 'results'::regclass
    AND tgname NOT LIKE 'RI_%'
    ORDER BY tgname;
    """
}).execute()

print("\n📊 Trigger Status:")
for trigger in verify_result.data:
    status = "✅" if trigger['status'] == 'ENABLED' else "❌"
    print(f"  {status} {trigger['trigger_name']}: {trigger['status']}")
PYTHON_ENABLE

echo ""
echo "✅ Done! Triggers are back online."
