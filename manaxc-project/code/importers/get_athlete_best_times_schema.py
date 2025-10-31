#!/usr/bin/env python3
"""Get the schema for athlete_best_times table."""

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get one row to see all columns
result = supabase.table('athlete_best_times').select('*').limit(1).execute()

if result.data:
    print("Columns in athlete_best_times table:")
    for column in sorted(result.data[0].keys()):
        print(f"  - {column}")
else:
    print("No rows in athlete_best_times table")
