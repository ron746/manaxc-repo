// app/api/ingest-workout/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Interface for a single, normalized sensor reading
interface SensorReading {
    time: string;           // CRITICAL: ISO timestamp for TimescaleDB
    athlete_id: string;
    activity_id: string;    // Unique ID for the workout session
    heart_rate: number;
    cadence: number;
    speed: number;
}

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Access Control (Simulated: requires user login)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { readings, activity_id } = await req.json(); // Array of sensor readings

    if (!readings || readings.length === 0 || !activity_id) {
        return NextResponse.json({ error: 'Missing workout data or activity ID.' }, { status: 400 });
    }
    
    // NOTE: In a real system, the Integration Service (Python microservice) would 
    // handle the Garmin/Strava OAuth and FIT file parsing before sending this normalized JSON array.

    try {
        // 1. Bulk Insert into the training_sessions hypertable
        // TimescaleDB is engineered for this high-write volume.
        const { error: dbError } = await supabase
            .from('training_sessions')
            .insert(readings.map((r: SensorReading) => ({
                ...r,
                athlete_id: user.id, // Tie to the authenticated user's ID
            })));

        if (dbError) {
            console.error('TSDB Write Error:', dbError);
            return NextResponse.json({ error: 'Failed to write granular data to database.', details: dbError.message }, { status: 500 });
        }

        // 2. Log a summary of the activity to the main PostgreSQL table (future table: activities_summary)

        return NextResponse.json({ success: true, message: `Successfully ingested ${readings.length} sensor readings.` });

    } catch (_e) {
        console.error('Ingest workout error:', _e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}