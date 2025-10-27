// app/api/athlete-seasons/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const athleteId = searchParams.get('athleteId'); 

    if (!athleteId) {
        return NextResponse.json({ error: 'Missing athleteId parameter.' }, { status: 400 });
    }

    const supabase = createClient();

    try {
        // Call the season summary RPC function
        const { data, error: rpcError } = await supabase.rpc('get_athlete_season_summary', { 
            p_athlete_id: athleteId,
        });

        if (rpcError) {
            console.error('Season Summary RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database query failed.', details: rpcError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, seasons: data });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}