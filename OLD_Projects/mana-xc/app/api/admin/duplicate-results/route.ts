/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/duplicate-results/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. ACCESS CONTROL (Implicit admin check required on the front end)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Call the SQL function to retrieve duplicates
        const { data: duplicates, error: rpcError } = await supabase.rpc('admin_find_duplicate_results_v2');

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            return NextResponse.json({ error: 'Failed to retrieve duplicates from database.', details: rpcError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, duplicates });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}