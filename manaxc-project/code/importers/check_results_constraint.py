#!/usr/bin/env python3
"""
Check what unique constraint exists on the results table.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Query to get constraint information
query = """
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    ARRAY_AGG(att.attname ORDER BY u.attposition) AS constraint_columns
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN UNNEST(con.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum
WHERE nsp.nspname = 'public'
  AND rel.relname = 'results'
  AND con.contype = 'u'  -- unique constraints
GROUP BY con.conname, con.contype
ORDER BY con.conname;
"""

print("Checking unique constraints on results table...\n")

try:
    # Execute raw SQL
    result = supabase.rpc('execute_sql', {'query': query}).execute()

    if result.data:
        print(f"Found {len(result.data)} unique constraints:\n")
        for constraint in result.data:
            print(f"Constraint: {constraint['constraint_name']}")
            print(f"  Type: {constraint['constraint_type']}")
            print(f"  Columns: {', '.join(constraint['constraint_columns'])}")
            print()
    else:
        print("No unique constraints found (or RPC not available)")
        print("\nYou'll need to run this SQL in Supabase SQL Editor:")
        print(query)
except Exception as e:
    print(f"Cannot query constraints via Python (expected)")
    print(f"Error: {e}")
    print(f"\n⚠ The SQL file needs to be run in Supabase SQL Editor")
    print(f"   File: /Users/ron/manaxc/manaxc-project/code/database/add_ariel_hung_duplicate.sql")
    print(f"\nThis SQL will:")
    print(f"  1. Disable triggers")
    print(f"  2. Drop old unique constraint")
    print(f"  3. Add second result (207460 cs)")
    print(f"  4. Create potential_duplicates record")
    print(f"  5. Add new unique constraint (includes time_cs)")
    print(f"  6. Re-enable triggers")
