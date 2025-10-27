// app/api/team-optimizer/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// NOTE: This assumes a separate utility function (or a server-side RPC) 
// that efficiently calls predict_race_time for an array of athletes.
// For demonstration, we will define a simplified RPC call here.

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. ACCESS CONTROL (Premium feature)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schoolId, targetRaceId, rosterIds, predictionDate } = await req.json();

    if (!schoolId || !targetRaceId || !rosterIds || rosterIds.length === 0) {
        return NextResponse.json({ error: 'Invalid payload. Missing school ID, race ID, or roster list.' }, { status: 400 });
    }

    try {
        // 2. Execute Prediction Batch RPC
        // NOTE: This function (get_optimized_team_predictions) must be created in the next step.
        const { data: predictedRoster, error: rpcError } = await supabase.rpc('get_optimized_team_predictions', { 
            p_school_id: schoolId,
            p_roster_ids: rosterIds, // Array of athlete UUIDs
            p_target_race_id: targetRaceId,
            p_prediction_date: predictionDate // Passed for grade/maturation calculation
        });

        if (rpcError) {
            console.error('Optimizer RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database prediction failed.', details: rpcError.message }, { status: 500 });
        }

        // 3. Application Layer: Sort, Score, and Format
        // Sort by predicted time (fastest first)
        predictedRoster.sort((a: any, b: any) => a.predicted_time_cs - b.predicted_time_cs);

        // Calculate Team Score and Total Time (Top 5)
        const scoringRoster = predictedRoster.slice(0, 5);
        const totalTimeCs = scoringRoster.reduce((sum: number, runner: any) => sum + runner.predicted_time_cs, 0);

        return NextResponse.json({ 
            success: true, 
            team_total_time_cs: totalTimeCs,
            scoring_roster: scoringRoster,
            full_roster: predictedRoster
        });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}