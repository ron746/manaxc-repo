// app/api/school-roster/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const gender = searchParams.get('gender'); // 'M', 'F', or 'All'

    if (!schoolId) {
        return NextResponse.json({ error: 'Missing schoolId parameter.' }, { status: 400 });
    }

    // Convert string filter to boolean for the database function
    const genderBool = gender === 'M' ? true : (gender === 'F' ? false : null);

    const supabase = createClient();

    try {
        // Call the optimized RPC function
        const { data, error: rpcError } = await supabase.rpc('get_school_roster_ranked', { 
            p_school_id: schoolId,
            p_gender: genderBool,
        });

        if (rpcError) {
            console.error('Roster RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database query failed.', details: rpcError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, roster: data });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}