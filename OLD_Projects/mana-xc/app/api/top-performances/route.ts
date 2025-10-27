// app/api/top-performances/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const gender = searchParams.get('gender'); // 'M' or 'F'
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    
    // Convert 'M'/'F' string filter to boolean for the database function
    const genderBool = gender === 'M' ? true : (gender === 'F' ? false : null);

    if (genderBool === null) {
        return NextResponse.json({ error: 'Invalid or missing gender filter.' }, { status: 400 });
    }

    const supabase = createClient();

    try {
        // Call the optimized RPC function
        const { data, error: rpcError } = await supabase.rpc('get_top_xc_performances', { 
            p_gender: genderBool,
            p_limit: limit,
        });

        if (rpcError) {
            console.error('Performance RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database query failed.', details: rpcError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, performances: data });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}