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
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Call the batch function to force recalculate ALL normalized times
    const { data, error } = await supabase.rpc('batch_force_recalculate_normalized_times')

    if (error) {
      console.error('Force recalculate normalized times error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All normalized times recalculated successfully',
      updatedCount: data,
    })
  } catch (error: any) {
    console.error('Force recalculate normalized times exception:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
