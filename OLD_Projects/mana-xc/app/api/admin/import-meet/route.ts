/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/import-meet/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Interface for the final payload received from the frontend wizard
interface ImportPayload {
    meetName: string;
    meetDate: string;
    location: string;
    seasonYear: number;
    // Array of configured races, including the results associated with each race
    races: Array<{
        name: string;
        distanceMeters: number;
        courseId: string;
        xcTimeRating: number;
        gender: 'M' | 'F' | 'Unknown';
        category: string;
        results: Array<{
            first_name: string;
            last_name: string;
            school_name: string;
            time_cs: number; // CRITICAL: Centiseconds
            place_overall: number;
            grade?: number;
            ath_net_id?: number;
        }>;
    }>;
}

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. ACCESS CONTROL: Ensure Admin Role
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single();
    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload: ImportPayload = await req.json();
    const adminUserId = user.id;

    try {
        // 2. TRANSACTIONAL EXECUTION: Call the single, large SQL function (created in Step 2)
        // This ensures if any part of the import fails (e.g., creating a meet or a result), 
        // the entire database operation is rolled back, preventing partial data insertion.
        const { data, error } = await supabase.rpc('admin_import_meet_results', { 
            p_meet_data: payload,
            p_admin_user_id: adminUserId,
        });

        if (error) {
            console.error('Import RPC Error:', error);
            // Return specific DB error to the user
            return NextResponse.json({ error: error.message, details: data }, { status: 500 });
        }

        // 3. Success Response
        return NextResponse.json({ 
            success: true, 
            meet_id: data, 
            message: 'Meet and all results imported successfully.' 
        });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error', details: e.message }, { status: 500 });
    }
}