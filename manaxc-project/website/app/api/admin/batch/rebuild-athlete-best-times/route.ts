import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Batch rebuild athlete best times
    const { data, error } = await supabase.rpc('batch_rebuild_athlete_best_times')

    if (error) {
      console.error('Error rebuilding athlete best times:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Athlete best times rebuilt successfully',
      count: data
    })
  } catch (error: any) {
    console.error('Error in batch rebuild:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
