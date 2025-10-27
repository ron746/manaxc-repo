// app/api/admin/rating-analysis/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. ACCESS CONTROL
    if (!user || (await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()).data?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { race_id } = await req.json();

    try {
        // 2. Fetch detailed runner-by-runner analysis
        const { data: analysisData, error: analysisError } = await supabase.rpc('admin_analyze_race_rating', { p_race_id: race_id });

        if (analysisError) throw analysisError;

        // 3. Fetch the suggested final aggregated rating
        const { data: suggestedRating, error: suggestError } = await supabase.rpc('admin_suggest_course_rating', { p_race_id: race_id });

        if (suggestError) throw suggestError;

        return NextResponse.json({ 
            success: true, 
            analysis: analysisData,
            suggested_rating: suggestedRating,
            runner_count: analysisData ? analysisData.length : 0
        });

    } catch (e: any) {
        console.error('Rating Analysis API Error:', e);
        return NextResponse.json({ error: 'Failed to run statistical analysis.', details: e.message }, { status: 500 });
    }
}