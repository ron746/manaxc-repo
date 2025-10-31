import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

export async function POST(request: Request) {
  try {
    const {
      courseId,
      newDifficulty,
      comment,
      changeType = 'automated_recommendation',
      anomalyContext
    } = await request.json()

    if (!courseId || !newDifficulty) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'courseId and newDifficulty are required'
      }, { status: 400 })
    }

    // Manual adjustments require a comment
    if (changeType === 'manual_adjustment' && !comment) {
      return NextResponse.json({
        error: 'Comment required',
        details: 'Manual adjustments must include a comment explaining the change'
      }, { status: 400 })
    }

    console.log(`Updating course ${courseId} difficulty to ${newDifficulty} (${changeType})`)

    // First, get the current difficulty
    const { data: courseData, error: fetchError } = await supabase
      .from('courses')
      .select('id, name, difficulty_rating')
      .eq('id', courseId)
      .single()

    if (fetchError || !courseData) {
      console.error('Error fetching course:', fetchError)
      return NextResponse.json({
        error: 'Course not found',
        details: `No course found with ID ${courseId}`
      }, { status: 404 })
    }

    const oldDifficulty = courseData.difficulty_rating

    // Log the change to history table
    const { error: historyError } = await supabase
      .from('course_difficulty_history')
      .insert({
        course_id: courseId,
        old_difficulty: oldDifficulty,
        new_difficulty: newDifficulty,
        change_type: changeType,
        comment: comment || null,
        elite_athlete_count: anomalyContext?.elite_athlete_count || null,
        outlier_percentage: anomalyContext?.outlier_percentage || null,
        difference_seconds_per_mile: anomalyContext?.difference_seconds_per_mile || null,
        suspicion_level: anomalyContext?.suspicion_level || null,
        changed_by: 'admin'
      })

    if (historyError) {
      console.error('Error logging to history:', historyError)
      return NextResponse.json({
        error: 'Failed to log change',
        details: historyError.message
      }, { status: 500 })
    }

    // Update the course difficulty rating
    const { data, error } = await supabase
      .from('courses')
      .update({ difficulty_rating: newDifficulty })
      .eq('id', courseId)
      .select()

    if (error) {
      console.error('Error updating course difficulty:', error)
      return NextResponse.json({
        error: 'Failed to update difficulty',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Successfully updated course difficulty and logged to history`)

    // Rebuild athlete_best_times to update team projections
    // The trigger already updates normalized_time_cs, but athlete_best_times needs manual rebuild
    console.log(`Rebuilding athlete_best_times table...`)
    const { data: rebuildData, error: rebuildError } = await supabase
      .rpc('batch_rebuild_athlete_best_times')

    if (rebuildError) {
      console.error('Warning: Failed to rebuild athlete_best_times:', rebuildError)
      // Don't fail the whole request, just log the warning
      return NextResponse.json({
        success: true,
        course: data[0],
        oldDifficulty,
        newDifficulty,
        warning: 'Difficulty updated but athlete_best_times rebuild failed. Run manual rebuild from Batch Operations page.'
      })
    }

    console.log(`Successfully rebuilt athlete_best_times (${rebuildData} records updated)`)

    return NextResponse.json({
      success: true,
      course: data[0],
      oldDifficulty,
      newDifficulty,
      athleteBestTimesRebuilt: rebuildData
    })

  } catch (error) {
    console.error('Unexpected error applying difficulty adjustment:', error)
    return NextResponse.json(
      {
        error: 'Failed to apply adjustment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
