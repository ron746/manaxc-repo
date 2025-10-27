// app/api/admin/update-rating/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. ACCESS CONTROL
    if (!user || (await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()).data?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { race_id, new_rating, reason } = await req.json();
    const adminUserId = user.id;

    if (!race_id || new_rating === undefined || !reason) {
        return NextResponse.json({ error: 'Invalid payload. Missing race ID, rating, or reason.' }, { status: 400 });
    }

    try {
        // 2. Execute the Update RPC
        const { error: rpcError } = await supabase.rpc('admin_update_race_rating', { 
            p_race_id: race_id,
            p_new_rating: parseFloat(new_rating),
            p_reason: reason,
            p_admin_user_id: adminUserId,
        });

        if (rpcError) {
            console.error('Update Rating RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database update failed.', details: rpcError.message }, { status: 500 });
        }

        // 3. Success Response
        return NextResponse.json({ 
            success: true, 
            message: 'Race rating updated successfully. All XC times recalculated.' 
        });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error', details: e.message }, { status: 500 });
    }
}