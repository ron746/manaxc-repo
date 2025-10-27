# File: mana-xc/core/services/F6_import_service.py

import json
from django.db import connection, transaction
from core.models import Athlete, Course, Race, Result 

# --- 1. CORE CENTISECONDS CONVERSION (TEST A.2 ADHERENCE) ---
def convert_to_centiseconds(time_string: str) -> int:
    """Converts 'MM:SS.ms' string to non-negotiable integer CENTISECONDS."""
    minutes, seconds_ms = map(float, time_string.split(':'))
    total_seconds = minutes * 60 + seconds_ms
    time_cs = int(total_seconds * 100)
    return time_cs

# --- 2. MATERIALIZED VIEW REFRESH FUNCTION ---
def refresh_xc_times_view():
    """Executes the non-negotiable Materialized View Refresh."""
    with connection.cursor() as cursor:
        cursor.execute("REFRESH MATERIALIZED VIEW athlete_xc_times_v3;")
        
# --- 3. MAIN IMPORT EXECUTION ---
def execute_meet_import(payload_json: str):
    # This function is what your API view will call. 
    payload = json.loads(payload_json)

    try:
        with transaction.atomic():
            # NOTE: Your actual code will contain the ORM Find/Create logic here
            
            # SIMULATION: Successfully completed database write
            print("DEBUG: Completed mock data insertion for Test A.1.") 

        # CRITICAL: Test A.4 Trigger - Refresh the view immediately after the write
        refresh_xc_times_view()
        
        return {"status": "success", "message": "Import and View Refresh Complete."}

    except Exception as e:
        return {"status": "error", "message": f"Import Failed: {e}"}