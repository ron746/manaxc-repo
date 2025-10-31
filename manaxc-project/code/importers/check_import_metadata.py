#!/usr/bin/env python3
"""
Check import metadata for meets 254332, 255929, and 254378.
"""

import os
import json
import glob
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

meet_ids = ['254332', '255929', '254378']

for meet_an_id in meet_ids:
    print(f"\n{'='*80}")
    print(f"MEET {meet_an_id}")
    print(f"{'='*80}")

    # Find metadata.json
    metadata_pattern = f'to-be-processed/meet_{meet_an_id}_*/metadata.json'
    metadata_files = glob.glob(metadata_pattern)

    if not metadata_files:
        metadata_pattern = f'processed/*/meet_{meet_an_id}_*/metadata.json'
        metadata_files = glob.glob(metadata_pattern)

    if metadata_files:
        metadata_file = metadata_files[0]
        print(f"✓ Found metadata: {metadata_file}")

        with open(metadata_file, 'r') as f:
            metadata = json.load(f)

        print(f"\n📊 Import Summary:")
        if 'import_summary' in metadata:
            summary = metadata['import_summary']
            for key, value in summary.items():
                print(f"  {key}: {value}")
        else:
            print(f"  Status: {metadata.get('status', 'unknown')}")
            print(f"  Timestamp: {metadata.get('timestamp', 'unknown')}")
    else:
        print(f"✗ No metadata.json found")

    # Check database
    meet = supabase.table('meets').select('id, name').eq('athletic_net_id', meet_an_id).execute()
    if meet.data:
        meet_id = meet.data[0]['id']
        results_count = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
        print(f"\n✓ Database: {results_count.count} results")
