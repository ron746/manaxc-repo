#!/usr/bin/env python3
"""
Trigger Management Helper for Bulk Imports

This module provides utilities for managing database triggers during bulk imports
to improve performance. It disables triggers before bulk inserts, then re-enables
them and backfills the is_sb and is_pr flags afterward.

Usage:
    from trigger_manager import TriggerManager

    with TriggerManager(supabase):
        # Your bulk insert operations here
        supabase.table('results').insert(batch).execute()
    # Triggers are automatically re-enabled and flags backfilled on exit
"""

import os
from supabase import create_client, Client


class TriggerManager:
    """Context manager for disabling/enabling triggers during bulk imports"""

    def __init__(self, supabase_client: Client = None):
        """
        Initialize trigger manager

        Args:
            supabase_client: Existing Supabase client (optional). If not provided,
                           will create a new client using environment variables.
        """
        self.supabase = supabase_client
        self.trigger_was_enabled = False

        # If no client provided, create one with service role key
        if self.supabase is None:
            url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

            if not url or not key:
                raise ValueError(
                    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. "
                    "Add it to your .env.local file from Supabase Dashboard > Settings > API"
                )

            self.supabase = create_client(url, key)

    def disable_trigger(self):
        """Disable the update_athlete_best_times trigger"""
        print("\n🔧 Disabling triggers for bulk import...")
        try:
            # Execute raw SQL to disable trigger
            self.supabase.rpc('exec_sql', {
                'sql': 'ALTER TABLE results DISABLE TRIGGER update_athlete_best_times_trigger;'
            }).execute()
            self.trigger_was_enabled = True
            print("   ✅ Trigger disabled")
        except Exception as e:
            print(f"   ⚠️  Warning: Could not disable trigger: {e}")
            print("   ℹ️  Import will continue but may be slower")
            self.trigger_was_enabled = False

    def enable_trigger(self):
        """Re-enable the update_athlete_best_times trigger"""
        if not self.trigger_was_enabled:
            return

        print("\n🔧 Re-enabling triggers...")
        try:
            self.supabase.rpc('exec_sql', {
                'sql': 'ALTER TABLE results ENABLE TRIGGER update_athlete_best_times_trigger;'
            }).execute()
            print("   ✅ Trigger re-enabled")
        except Exception as e:
            print(f"   ❌ Error re-enabling trigger: {e}")
            raise

    def backfill_flags(self):
        """Backfill is_sb and is_pr flags for all results"""
        if not self.trigger_was_enabled:
            return

        print("\n🔄 Backfilling is_sb and is_pr flags...")
        try:
            # Clear all flags first, then mark based on athlete_best_times
            sql = """
                -- Clear all flags first
                UPDATE results SET is_sb = FALSE, is_pr = FALSE;

                -- Mark season bests
                UPDATE results r
                SET is_sb = TRUE
                FROM athlete_best_times abt
                WHERE r.id = abt.season_best_result_id;

                -- Mark all-time PRs
                UPDATE results r
                SET is_pr = TRUE
                FROM athlete_best_times abt
                WHERE r.id = abt.alltime_best_result_id;

                -- Return counts
                SELECT
                    COUNT(*) FILTER (WHERE is_sb = TRUE) as sb_count,
                    COUNT(*) FILTER (WHERE is_pr = TRUE) as pr_count,
                    COUNT(*) as total_count
                FROM results;
            """

            result = self.supabase.rpc('exec_sql', {'sql': sql}).execute()
            print("   ✅ Flags backfilled successfully")

            # Show counts
            counts = self._get_flag_counts()
            if counts:
                print(f"   📊 Season Bests: {counts['sb_count']:,}")
                print(f"   📊 Personal Records: {counts['pr_count']:,}")
                print(f"   📊 Total Results: {counts['total_count']:,}")

        except Exception as e:
            print(f"   ❌ Error backfilling flags: {e}")
            raise

    def _get_flag_counts(self):
        """Get counts of flagged results"""
        try:
            result = self.supabase.rpc('get_flag_counts').execute()
            return result.data
        except:
            # If RPC doesn't exist, query directly
            try:
                sb = self.supabase.table('results').select('id', count='exact').eq('is_sb', True).execute()
                pr = self.supabase.table('results').select('id', count='exact').eq('is_pr', True).execute()
                total = self.supabase.table('results').select('id', count='exact').execute()
                return {
                    'sb_count': sb.count or 0,
                    'pr_count': pr.count or 0,
                    'total_count': total.count or 0
                }
            except:
                return None

    def __enter__(self):
        """Enter context manager - disable triggers"""
        self.disable_trigger()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager - re-enable triggers and backfill flags"""
        try:
            self.enable_trigger()
            if exc_type is None:  # Only backfill if no exception occurred
                self.backfill_flags()
        except Exception as e:
            print(f"\n❌ Error in trigger cleanup: {e}")
            # Always try to re-enable trigger even if backfill fails
            try:
                self.enable_trigger()
            except:
                pass
            raise

        # Don't suppress exceptions from the with block
        return False


def ensure_exec_sql_function(supabase: Client):
    """
    Ensure the exec_sql function exists in the database.
    This function is required for trigger management.

    You only need to run this once. Add the exec_sql function to your database:

    1. Go to Supabase Dashboard > SQL Editor
    2. Run this SQL:

        CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
    """
    print("\n⚠️  SETUP REQUIRED:")
    print("=" * 80)
    print("The trigger manager requires an 'exec_sql' function in your database.")
    print("\nTo set it up:")
    print("1. Go to Supabase Dashboard > SQL Editor")
    print("2. Run this SQL:")
    print()
    print("    CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)")
    print("    RETURNS void")
    print("    LANGUAGE plpgsql")
    print("    SECURITY DEFINER")
    print("    AS $$")
    print("    BEGIN")
    print("      EXECUTE sql;")
    print("    END;")
    print("    $$;")
    print()
    print("=" * 80)
    print()


if __name__ == '__main__':
    """Test the trigger manager"""
    print("Testing Trigger Manager...")
    print("=" * 80)

    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('/Users/ron/manaxc/.env.local')

    try:
        with TriggerManager() as tm:
            print("\n✅ Trigger manager initialized successfully")
            print("   (Triggers are now disabled)")
            print("\n   Your bulk import code would go here...")

        print("\n✅ Trigger manager cleanup complete")
        print("   (Triggers have been re-enabled and flags backfilled)")

    except ValueError as e:
        if "exec_sql" in str(e) or "Missing SUPABASE_SERVICE_ROLE_KEY" in str(e):
            ensure_exec_sql_function(None)
        else:
            print(f"\n❌ Error: {e}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure you've set up the exec_sql function in Supabase.")
        ensure_exec_sql_function(None)
