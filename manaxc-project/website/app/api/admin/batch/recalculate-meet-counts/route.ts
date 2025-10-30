import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key required' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { persistSession: false } }
    )

    // Call the recalculate function
    const { data, error } = await supabase.rpc('recalculate_all_meet_result_counts')

    if (error) {
      console.error('Recalculate meet counts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const updatedCount = data?.[0]?.updated_count || 0

    return NextResponse.json({
      success: true,
      message: `Successfully recalculated result counts for ${updatedCount} meets`,
      updatedCount,
    })
  } catch (error: any) {
    console.error('Recalculate meet counts exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
