// app/api/course-records/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId'); 

    if (!courseId) {
        return NextResponse.json({ error: 'Missing courseId parameter.' }, { status: 400 });
    }

    const supabase = createClient();

    try {
        // Call the course records RPC function
        const { data, error: rpcError } = await supabase.rpc('get_course_records', { 
            p_course_id: courseId,
        });

        if (rpcError) {
            console.error('Course Records RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database query failed.', details: rpcError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, records: data });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}