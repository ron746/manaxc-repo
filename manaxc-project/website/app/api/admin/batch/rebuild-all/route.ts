import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const results = {
      normalizedTimes: 0,
      athleteBestTimes: 0,
      courseRecords: 0,
      schoolHallOfFame: 0,
      schoolCourseRecords: 0
    }

    // 1. Rebuild normalized times
    const { data: norm, error: normError } = await supabase.rpc('batch_rebuild_normalized_times')
    if (normError) throw new Error(`Normalized times: ${normError.message}`)
    results.normalizedTimes = norm

    // 2. Rebuild athlete best times
    const { data: athlete, error: athleteError } = await supabase.rpc('batch_rebuild_athlete_best_times')
    if (athleteError) throw new Error(`Athlete best times: ${athleteError.message}`)
    results.athleteBestTimes = athlete

    // 3. Rebuild course records
    const { data: course, error: courseError } = await supabase.rpc('batch_rebuild_course_records')
    if (courseError) throw new Error(`Course records: ${courseError.message}`)
    results.courseRecords = course

    // 4. Rebuild school hall of fame
    const { data: hall, error: hallError } = await supabase.rpc('batch_rebuild_school_hall_of_fame')
    if (hallError) throw new Error(`School hall of fame: ${hallError.message}`)
    results.schoolHallOfFame = hall

    // 5. Rebuild school course records
    const { data: schoolCourse, error: schoolCourseError } = await supabase.rpc('batch_rebuild_school_course_records')
    if (schoolCourseError) throw new Error(`School course records: ${schoolCourseError.message}`)
    results.schoolCourseRecords = schoolCourse

    return NextResponse.json({
      success: true,
      message: 'All batch operations completed successfully',
      results
    })
  } catch (error: any) {
    console.error('Error in batch rebuild all:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
