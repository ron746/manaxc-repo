import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Search by slug
athlete = supabase.table('athletes').select('*').eq('slug', 'miguel-rodriguez-redwood-visalia-2028').execute()

if athlete.data:
    a = athlete.data[0]
    print(f"Found athlete:")
    print(f"  ID: {a['id']}")
    print(f"  Name: {a['name']}")
    print(f"  First: {a['first_name']}")
    print(f"  Last: {a['last_name']}")
    print(f"  School ID: {a['school_id']}")
    print(f"  Slug: {a['slug']}")
else:
    print("Not found")
