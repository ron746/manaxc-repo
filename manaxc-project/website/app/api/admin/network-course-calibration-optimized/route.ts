import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

const ANCHOR_COURSE_NAME = 'Crystal Springs, 2.95 Miles'

/**
 * OPTIMIZED VERSION: Uses SQL to calculate all calibrations in parallel
 * Instead of loading all results for all courses (O(n²)), we use a single SQL query
 */
export async function POST(request: Request) {
  try {
    console.log('Starting OPTIMIZED network-based course calibration...')

    // Step 1: Find the anchor course
    const { data: anchorCourse, error: anchorError } = await supabase
      .from('courses')
      .select('*')
      .eq('name', ANCHOR_COURSE_NAME)
      .single()

    if (anchorError || !anchorCourse) {
      return NextResponse.json({ error: 'Anchor course not found' }, { status: 404 })
    }

    console.log(`Anchor course: ${anchorCourse.name} (difficulty: ${anchorCourse.difficulty_rating})`)

    // Step 2: Get count of anchor results
    const { count: anchorCount } = await supabase
      .from('results')
      .select('race_id, races!inner(course_id)', { count: 'exact', head: true })
      .eq('races.course_id', anchorCourse.id)

    console.log(`Anchor course has ${anchorCount} results`)

    // Step 3: Use optimized SQL function to get all calibrations at once
    // Only compares courses within ±15% distance to avoid distance-effect confounding
    const { data: calibrations, error: calibError } = await supabase.rpc(
      'get_all_course_calibrations',
      {
        anchor_course_name: ANCHOR_COURSE_NAME,
        distance_tolerance_pct: 0.15
      }
    )

    if (calibError) {
      console.error('Calibration error:', calibError)
      return NextResponse.json({
        error: 'Failed to calculate calibrations',
        details: calibError.message
      }, { status: 500 })
    }

    if (!calibrations || calibrations.length === 0) {
      console.log('No calibrations returned - may indicate no courses with sufficient shared athletes')
    }

    // Format results
    const formattedCalibrations = (calibrations || []).map((cal: any) => {
      // SQL function returns shared_athlete_count (singular with _count)
      const sharedAthletes = cal.shared_athlete_count || 0
      const confidence = Math.min(1.0, sharedAthletes / 100) * (1 - Math.min(cal.std_dev_ratio || 0.1, 0.5))

      return {
        course_id: cal.course_id,
        course_name: cal.course_name,
        current_difficulty: cal.current_difficulty,
        implied_difficulty: cal.implied_difficulty,
        confidence,
        shared_athletes_count: sharedAthletes,
        median_ratio: cal.median_ratio,
        method: 'direct',
        anchor_course: anchorCourse?.name || 'Crystal Springs, 2.95 Miles'
      }
    })

    // Add anchor course itself
    formattedCalibrations.unshift({
      course_id: anchorCourse.id,
      course_name: anchorCourse.name,
      current_difficulty: anchorCourse.difficulty_rating,
      implied_difficulty: anchorCourse.difficulty_rating,
      confidence: 1.0,
      shared_athletes_count: anchorCount || 0,
      median_ratio: 1.0,
      method: 'direct',
      anchor_course: 'ANCHOR'
    })

    const needsReview = formattedCalibrations.filter(
      (c: any) => Math.abs(c.implied_difficulty - c.current_difficulty) > 0.05
    ).length

    const highConfidence = formattedCalibrations.filter((c: any) => c.confidence > 0.3).length

    // Save recommendations to database (excluding anchor course)
    const recommendationsToSave = formattedCalibrations
      .filter((cal: any) => cal.anchor_course !== 'ANCHOR')
      .map((cal: any) => ({
        course_id: cal.course_id,
        recommended_difficulty: cal.implied_difficulty,
        current_difficulty: cal.current_difficulty,
        source: 'network_calibration',
        confidence: cal.confidence,
        shared_athletes_count: cal.shared_athletes_count,
        median_ratio: cal.median_ratio,
        reasoning: {
          method: 'anchor_based',
          anchor_course: anchorCourse.name,
          anchor_difficulty: anchorCourse.difficulty_rating
        }
      }))

    // Upsert recommendations (replace existing if present)
    if (recommendationsToSave.length > 0) {
      const { error: upsertError } = await supabase
        .from('course_difficulty_recommendations')
        .upsert(recommendationsToSave, {
          onConflict: 'course_id,source',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error('Failed to save recommendations:', upsertError)
        // Don't fail the request, just log the error
      } else {
        console.log(`Saved ${recommendationsToSave.length} recommendations to database`)
      }
    }

    return NextResponse.json({
      success: true,
      anchor_course: {
        name: anchorCourse.name,
        difficulty: anchorCourse.difficulty_rating,
        total_results: anchorCount || 0
      },
      calibrations: formattedCalibrations,
      summary: {
        total_courses: formattedCalibrations.length,
        directly_calibrated: highConfidence,
        needs_review: needsReview,
        recommendations_saved: recommendationsToSave.length
      }
    })

  } catch (error) {
    console.error('Error in optimized network calibration:', error)
    return NextResponse.json(
      {
        error: 'Failed to calibrate courses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
