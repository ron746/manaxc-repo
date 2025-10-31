#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

meet = supabase.table('meets').select('id').eq('athletic_net_id', '254378').execute()
meet_id = meet.data[0]['id']

count = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
print(f"Meet 254378 DB count: {count.count}")
