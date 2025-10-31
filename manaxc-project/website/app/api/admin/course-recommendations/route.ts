import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET: Fetch all saved course difficulty recommendations
 * Query params:
 *   - pending: if true, only return recommendations that haven't been applied or dismissed
 *   - course_id: if provided, only return recommendations for that course
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pendingOnly = searchParams.get('pending') === 'true'
    const courseId = searchParams.get('course_id')

    let query = supabase
      .from('course_difficulty_recommendations')
      .select(`
        *,
        courses(name, distance_meters, difficulty_rating)
      `)
      .order('created_at', { ascending: false })

    if (pendingOnly) {
      query = query.is('applied_at', null).is('dismissed_at', null)
    }

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching recommendations:', error)
      return NextResponse.json({
        error: 'Failed to fetch recommendations',
        details: error.message
      }, { status: 500 })
    }

    // Group by course_id and source for easier display
    const grouped = (data || []).reduce((acc: any, rec) => {
      if (!acc[rec.course_id]) {
        acc[rec.course_id] = {
          course_id: rec.course_id,
          course_name: rec.courses.name,
          distance_meters: rec.courses.distance_meters,
          current_difficulty: rec.courses.difficulty_rating,
          recommendations: {}
        }
      }
      acc[rec.course_id].recommendations[rec.source] = rec
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      recommendations: Object.values(grouped),
      total: data?.length || 0
    })

  } catch (error) {
    console.error('Error in course recommendations endpoint:', error)
    return NextResponse.json({
      error: 'Failed to fetch recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST: Apply or dismiss a recommendation
 * Body: { recommendation_id, action: 'apply' | 'dismiss', notes?: string, applied_by?: string }
 */
export async function POST(request: Request) {
  try {
    const { recommendation_id, action, notes, applied_by } = await request.json()

    if (!recommendation_id || !action) {
      return NextResponse.json({
        error: 'recommendation_id and action required'
      }, { status: 400 })
    }

    if (!['apply', 'dismiss'].includes(action)) {
      return NextResponse.json({
        error: 'action must be "apply" or "dismiss"'
      }, { status: 400 })
    }

    // Get the recommendation
    const { data: recommendation, error: fetchError } = await supabase
      .from('course_difficulty_recommendations')
      .select('*')
      .eq('id', recommendation_id)
      .single()

    if (fetchError || !recommendation) {
      return NextResponse.json({
        error: 'Recommendation not found',
        details: fetchError?.message
      }, { status: 404 })
    }

    if (action === 'apply') {
      // Update the course difficulty
      const { error: updateError } = await supabase
        .from('courses')
        .update({ difficulty_rating: recommendation.recommended_difficulty })
        .eq('id', recommendation.course_id)

      if (updateError) {
        console.error('Failed to update course difficulty:', updateError)
        return NextResponse.json({
          error: 'Failed to update course difficulty',
          details: updateError.message
        }, { status: 500 })
      }

      // Mark recommendation as applied
      const { error: markError } = await supabase
        .from('course_difficulty_recommendations')
        .update({
          applied_at: new Date().toISOString(),
          applied_by: applied_by || 'admin',
          notes
        })
        .eq('id', recommendation_id)

      if (markError) {
        console.error('Failed to mark recommendation as applied:', markError)
      }

      return NextResponse.json({
        success: true,
        message: 'Recommendation applied successfully'
      })
    } else {
      // Dismiss the recommendation
      const { error: dismissError } = await supabase
        .from('course_difficulty_recommendations')
        .update({
          dismissed_at: new Date().toISOString(),
          dismissed_by: applied_by || 'admin',
          notes
        })
        .eq('id', recommendation_id)

      if (dismissError) {
        console.error('Failed to dismiss recommendation:', dismissError)
        return NextResponse.json({
          error: 'Failed to dismiss recommendation',
          details: dismissError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Recommendation dismissed successfully'
      })
    }

  } catch (error) {
    console.error('Error processing recommendation:', error)
    return NextResponse.json({
      error: 'Failed to process recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
