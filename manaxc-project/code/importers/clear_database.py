"""
Clear all data from the database tables.
USE WITH CAUTION - This will delete ALL data!
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")  # Use the anon key from .env
supabase: Client = create_client(url, key)

def clear_all_data():
    """Clear all data from database tables in correct order (respecting foreign keys)"""
    
    print("⚠️  WARNING: This will delete ALL data from the database!")
    print("=" * 60)
    
    confirmation = input("Type 'DELETE ALL DATA' to confirm: ")
    
    if confirmation != "DELETE ALL DATA":
        print("❌ Cancelled - data not deleted")
        return
    
    print("\n🗑️  Deleting all data...")
    
    # Delete in order to respect foreign key constraints
    tables = [
        'results',      # Has FKs to races, athletes, meets
        'races',        # Has FKs to meets, courses
        'meets',        # Has FK to venues
        'athletes',     # Has FK to schools
        'courses',      # Has FK to venues
        'schools',      # No dependencies
        'venues',       # No dependencies
    ]
    
    for table in tables:
        try:
            # Delete all rows
            response = supabase.table(table).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            print(f"  ✅ Cleared {table}")
        except Exception as e:
            print(f"  ❌ Error clearing {table}: {e}")
    
    print("\n✅ Database cleared successfully!")

if __name__ == "__main__":
    clear_all_data()
