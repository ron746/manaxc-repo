// app/api/admin/resolve-duplicate/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    const { race_id, results_to_delete } = await req.json();
    const adminUserId = user.id;

    if (!race_id || !results_to_delete || results_to_delete.length === 0) {
        return NextResponse.json({ error: 'Invalid payload. Missing race_id or results_to_delete array.' }, { status: 400 });
    }

    try {
        // 2. Execute the Resolution RPC
        const { error: rpcError } = await supabase.rpc('admin_resolve_duplicate_results', { 
            p_race_id: race_id,
            p_results_to_delete: results_to_delete,
            p_admin_user_id: adminUserId,
        });

        if (rpcError) {
            console.error('Resolution RPC Error:', rpcError);
            return NextResponse.json({ error: 'Database resolution failed.', details: rpcError.message }, { status: 500 });
        }

        // 3. Success Response
        return NextResponse.json({ 
            success: true, 
            message: 'Duplicate records resolved successfully. Race counts and XC times updated.' 
        });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error', details: e.message }, { status: 500 });
    }
}