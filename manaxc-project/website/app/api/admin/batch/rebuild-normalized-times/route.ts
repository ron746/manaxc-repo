import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Need service role for batch operations
      { auth: { persistSession: false } }
    )

    // Batch update normalized times for all results
    const { data, error } = await supabase.rpc('batch_rebuild_normalized_times')

    if (error) {
      console.error('Error rebuilding normalized times:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Normalized times rebuilt successfully',
      updatedCount: data
    })
  } catch (error: any) {
    console.error('Error in batch rebuild:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
