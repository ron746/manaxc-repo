import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get one athlete to see the schema
athlete = supabase.table('athletes').select('*').limit(1).execute()
if athlete.data:
    print("Athletes table columns:")
    for key in athlete.data[0].keys():
        print(f"  - {key}")
