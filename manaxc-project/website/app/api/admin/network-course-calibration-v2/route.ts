import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

const ANCHOR_COURSE_NAME = 'Crystal Springs, 2.95 Miles'

/**
 * CORRECT Malcolm Slaney implementation:
 * - Compares normalized TIME DIFFERENCES (not ratios)
 * - Accounts for athlete improvement over time (~1.5 sec/mile per 2 weeks)
 * - Identifies statistical outliers
 * - Reverse engineers difficulty from predicted normalized times
 */
export async function POST(request: Request) {
  try {
    console.log('Starting CORRECT network-based course calibration (outlier analysis)...')

    const {
      improvement_per_two_weeks = 1.5,  // seconds per mile per 2 weeks
      outlier_threshold = 3.0  // seconds per mile
    } = await request.json().catch(() => ({}))

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

    // Step 2: Get anchor result count
    const { count: anchorCount } = await supabase
      .from('results')
      .select('*', { count: 'exact', head: true })
      .eq('races.course_id', anchorCourse.id)

    console.log(`Anchor course has ${anchorCount} results`)

    // Step 3: Use correct SQL function for outlier analysis
    const { data: analyses, error: analysisError } = await supabase.rpc(
      'get_course_outlier_analysis',
      {
        anchor_course_name: ANCHOR_COURSE_NAME,
        improvement_per_two_weeks_cs: improvement_per_two_weeks * 100,  // Convert to centiseconds
        outlier_threshold_cs: outlier_threshold * 100  // Convert to centiseconds
      }
    )

    if (analysisError) {
      console.error('Analysis error:', analysisError)
      return NextResponse.json({
        error: 'Failed to analyze courses',
        details: analysisError.message
      }, { status: 500 })
    }

    if (!analyses || analyses.length === 0) {
      console.log('No courses returned - may indicate insufficient shared athletes')
    }

    // Format results
    const formattedAnalyses = (analyses || []).map((analysis: any) => {
      const differenceSeconds = analysis.median_difference_cs / 100
      const needsAdjustment = Math.abs(differenceSeconds) > outlier_threshold &&
                              analysis.outlier_percentage > 50

      return {
        course_id: analysis.course_id,
        course_name: analysis.course_name,
        current_difficulty: analysis.current_difficulty,
        implied_difficulty: analysis.implied_difficulty,

        // Key metrics in human-readable format
        difference_seconds: differenceSeconds,  // Positive = slower than expected, negative = faster
        outlier_count: analysis.outlier_count,
        outlier_percentage: analysis.outlier_percentage,

        // Statistical measures
        confidence: analysis.confidence,
        shared_athletes_count: analysis.athlete_count,
        std_dev_seconds: analysis.std_dev_cs / 100,

        // For reverse engineering
        predicted_normalized_cs: analysis.predicted_normalized_cs,
        actual_normalized_cs: analysis.predicted_normalized_cs - analysis.median_difference_cs,

        // Classification
        needs_adjustment: needsAdjustment,
        severity: Math.abs(differenceSeconds) > 5 ? 'high' :
                  Math.abs(differenceSeconds) > 3 ? 'medium' : 'low',

        method: 'outlier_analysis',
        anchor_course: anchorCourse?.name || 'Crystal Springs, 2.95 Miles'
      }
    })

    // Add anchor course itself
    formattedAnalyses.unshift({
      course_id: anchorCourse.id,
      course_name: anchorCourse.name,
      current_difficulty: anchorCourse.difficulty_rating,
      implied_difficulty: anchorCourse.difficulty_rating,
      difference_seconds: 0,
      outlier_count: 0,
      outlier_percentage: 0,
      confidence: 1.0,
      shared_athletes_count: anchorCount || 0,
      std_dev_seconds: 0,
      predicted_normalized_cs: null,
      actual_normalized_cs: null,
      needs_adjustment: false,
      severity: 'none',
      method: 'anchor',
      anchor_course: 'ANCHOR'
    })

    // Save recommendations to database (excluding anchor)
    const recommendationsToSave = formattedAnalyses
      .filter((analysis: any) => analysis.anchor_course !== 'ANCHOR' && analysis.needs_adjustment)
      .map((analysis: any) => ({
        course_id: analysis.course_id,
        recommended_difficulty: analysis.implied_difficulty,
        current_difficulty: analysis.current_difficulty,
        source: 'network_calibration',
        confidence: analysis.confidence,
        shared_athletes_count: analysis.shared_athletes_count,
        median_ratio: analysis.implied_difficulty / analysis.current_difficulty,
        reasoning: {
          method: 'outlier_analysis',
          anchor_course: anchorCourse.name,
          anchor_difficulty: anchorCourse.difficulty_rating,
          difference_seconds: analysis.difference_seconds,
          outlier_count: analysis.outlier_count,
          outlier_percentage: analysis.outlier_percentage,
          severity: analysis.severity,
          improvement_factor: improvement_per_two_weeks,
          interpretation: analysis.difference_seconds > 0
            ? `Athletes run ${Math.abs(analysis.difference_seconds).toFixed(1)} sec/mile SLOWER than expected (accounting for improvement). Course may be rated TOO EASY.`
            : `Athletes run ${Math.abs(analysis.difference_seconds).toFixed(1)} sec/mile FASTER than expected (accounting for improvement). Course may be rated TOO HARD.`
        }
      }))

    // Upsert recommendations
    if (recommendationsToSave.length > 0) {
      const { error: upsertError } = await supabase
        .from('course_difficulty_recommendations')
        .upsert(recommendationsToSave, {
          onConflict: 'course_id,source',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error('Failed to save recommendations:', upsertError)
      } else {
        console.log(`Saved ${recommendationsToSave.length} recommendations to database`)
      }
    }

    const needsReview = formattedAnalyses.filter((a: any) => a.needs_adjustment).length
    const highConfidence = formattedAnalyses.filter((a: any) => a.confidence > 0.7).length

    return NextResponse.json({
      success: true,
      anchor_course: {
        name: anchorCourse.name,
        difficulty: anchorCourse.difficulty_rating,
        total_results: anchorCount || 0
      },
      analyses: formattedAnalyses,
      summary: {
        total_courses: formattedAnalyses.length,
        high_confidence: highConfidence,
        needs_review: needsReview,
        recommendations_saved: recommendationsToSave.length
      },
      parameters: {
        improvement_per_two_weeks_seconds: improvement_per_two_weeks,
        outlier_threshold_seconds: outlier_threshold
      }
    })

  } catch (error) {
    console.error('Error in network calibration:', error)
    return NextResponse.json(
      {
        error: 'Failed to calibrate courses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
