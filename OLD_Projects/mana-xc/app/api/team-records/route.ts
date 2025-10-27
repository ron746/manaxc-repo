// app/api/team-records/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId'); 

    if (!schoolId) {
        return NextResponse.json({ error: 'Missing schoolId parameter.' }, { status: 400 });
    }

    const supabase = createClient();

    try {
        // Call the team records RPC function
        const { data, error: rpcError } = await supabase.rpc('get_school_team_records', { 
            p_school_id: schoolId,
        });

        if (rpcError) {
            console.error('Team Records RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database query failed.', details: rpcError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, records: data });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}