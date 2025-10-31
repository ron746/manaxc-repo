import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

interface CourseAnalysis {
  course_id: string
  course_name: string
  distance_meters: number
  current_difficulty: number
  total_results: number
  avg_time_cs: number
  median_time_cs: number
  avg_normalized_time_cs: number
  suggested_difficulty: number
  confidence_score: number
  reasoning: string[]
  // Calculated fields for display
  avg_time_with_new_rating_cs: number
  median_time_with_new_rating_cs: number
  avg_normalized_mile_current_cs: number
  avg_normalized_mile_proposed_cs: number
  time_difference_cs: number
  time_difference_seconds: number
  comparisons: {
    similar_courses: Array<{
      name: string
      difficulty: number
      avg_time_cs: number
      distance_meters: number
    }>
  }
  outliers: {
    unusually_fast: number
    unusually_slow: number
  }
  recommendations: {
    action: 'keep' | 'increase' | 'decrease'
    current: number
    suggested: number
    impact_description: string
    confidence: 'high' | 'medium' | 'low'
  }
}

export async function GET() {
  try {
    console.log('Starting comprehensive course difficulty analysis...')

    // Get all courses with their basic info
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, name, distance_meters, difficulty_rating')
      .order('name')

    if (coursesError) throw coursesError

    console.log(`Analyzing ${courses?.length} courses...`)

    const analyses: CourseAnalysis[] = []
    const METERS_PER_MILE = 1609.344

    for (const course of courses || []) {
      console.log(`Analyzing course: ${course.name}`)

      // Get all results for this course - paginate to avoid 1000 row limit
      let results: any[] = []
      let page = 0
      const PAGE_SIZE = 1000
      let hasMore = true

      while (hasMore) {
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data: pageResults, error: resultsError } = await supabase
          .from('results')
          .select(`
            time_cs,
            athlete_id,
            athletes!inner (
              gender,
              grad_year
            ),
            races!inner (
              course_id
            )
          `)
          .eq('races.course_id', course.id)
          .not('time_cs', 'is', null)
          .range(from, to)
          .order('time_cs')

        if (resultsError) {
          console.error(`Error loading results for ${course.name}:`, resultsError)
          break
        }

        if (!pageResults || pageResults.length === 0) {
          hasMore = false
        } else {
          results = results.concat(pageResults)
          if (pageResults.length < PAGE_SIZE) {
            hasMore = false
          } else {
            page++
          }
        }
      }

      console.log(`  Loaded ${results.length} results for ${course.name}`)

      if (results.length < 10) {
        console.log(`Skipping ${course.name} - insufficient data (${results.length} results)`)
        continue
      }

      // Calculate statistics
      const times = results.map(r => r.time_cs).filter(Boolean) as number[]
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
      const sortedTimes = [...times].sort((a, b) => a - b)
      const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)]

      // Calculate variance
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length
      const stdDev = Math.sqrt(variance)

      // Identify outliers (times more than 2 standard deviations from mean)
      const unusuallyFast = times.filter(t => t < avgTime - 2 * stdDev).length
      const unusuallySlow = times.filter(t => t > avgTime + 2 * stdDev).length

      // Get athlete best times to calculate normalized times
      const { data: athleteBests } = await supabase
        .from('athlete_best_times')
        .select('alltime_best_normalized_cs')
        .in('athlete_id', results.map(r => (r as any).athletes?.id).filter(Boolean))

      let avgNormalizedTime = 0
      if (athleteBests && athleteBests.length > 0) {
        const normalizedTimes = athleteBests
          .map(b => b.alltime_best_normalized_cs)
          .filter(Boolean) as number[]

        if (normalizedTimes.length > 0) {
          avgNormalizedTime = normalizedTimes.reduce((sum, t) => sum + t, 0) / normalizedTimes.length
        }
      }

      // Calculate implied difficulty from actual results
      // normalized_time represents a track mile (1609.344m at difficulty 1.0)
      // Formula: difficulty = (actual_time * 1609.344) / (normalized_time * distance)
      const impliedDifficulty = avgNormalizedTime > 0 && course.distance_meters > 0
        ? (avgTime * METERS_PER_MILE) / (avgNormalizedTime * course.distance_meters)
        : course.difficulty_rating

      // Find similar courses (same distance +/- 100 meters)
      const { data: similarCourses } = await supabase
        .from('courses')
        .select('id, name, distance_meters, difficulty_rating')
        .neq('id', course.id)
        .gte('distance_meters', course.distance_meters - 100)
        .lte('distance_meters', course.distance_meters + 100)
        .limit(5)

      const similarCoursesWithAvg = []
      for (const similar of similarCourses || []) {
        const { data: similarResults } = await supabase
          .from('results')
          .select('time_cs, races!inner(course_id)')
          .eq('races.course_id', similar.id)
          .not('time_cs', 'is', null)

        if (similarResults && similarResults.length > 10) {
          const similarAvg = similarResults.reduce((sum, r) => sum + (r.time_cs || 0), 0) / similarResults.length
          similarCoursesWithAvg.push({
            name: similar.name,
            difficulty: similar.difficulty_rating,
            avg_time_cs: Math.round(similarAvg),
            distance_meters: similar.distance_meters
          })
        }
      }

      // Generate reasoning
      const reasoning: string[] = []
      const diffDifference = impliedDifficulty - course.difficulty_rating
      const percentDiff = Math.abs(diffDifference / course.difficulty_rating) * 100

      // Confidence based on sample size and consistency
      let confidenceScore = 0
      if (results.length >= 100) confidenceScore += 0.4
      else if (results.length >= 50) confidenceScore += 0.3
      else if (results.length >= 20) confidenceScore += 0.2
      else confidenceScore += 0.1

      // Lower variance = higher confidence
      const coefficientOfVariation = stdDev / avgTime
      if (coefficientOfVariation < 0.1) confidenceScore += 0.3
      else if (coefficientOfVariation < 0.15) confidenceScore += 0.2
      else confidenceScore += 0.1

      // Consistency with similar courses
      if (similarCoursesWithAvg.length >= 2) {
        const avgSimilarDiff = similarCoursesWithAvg.reduce((sum, c) => sum + c.difficulty, 0) / similarCoursesWithAvg.length
        const similarityScore = 1 - Math.abs(impliedDifficulty - avgSimilarDiff) / avgSimilarDiff
        confidenceScore += similarityScore * 0.3
      }

      confidenceScore = Math.min(1, confidenceScore)

      // Build reasoning
      reasoning.push(`Based on ${results.length} race results`)

      // Calculate what the average time WOULD BE with current vs implied difficulty
      // If we have normalized times, we can reverse-calculate expected times
      if (avgNormalizedTime > 0) {
        const expectedTimeWithCurrentRating = Math.round((avgNormalizedTime / METERS_PER_MILE) * course.distance_meters * course.difficulty_rating)
        const expectedTimeWithImpliedRating = Math.round((avgNormalizedTime / METERS_PER_MILE) * course.distance_meters * impliedDifficulty)

        reasoning.push(`Expected avg time with current rating (${course.difficulty_rating.toFixed(9)}): ${formatTime(expectedTimeWithCurrentRating)}`)
        reasoning.push(`Actual average time: ${formatTime(Math.round(avgTime))}`)
        reasoning.push(`Expected with implied rating (${impliedDifficulty.toFixed(9)}): ${formatTime(expectedTimeWithImpliedRating)}`)
        reasoning.push(`Difference from current to implied: ${(percentDiff).toFixed(2)}%`)
      }

      if (Math.abs(diffDifference) > 0.01) {
        reasoning.push(`Current difficulty (${course.difficulty_rating.toFixed(9)}) appears ${diffDifference > 0 ? 'too low' : 'too high'}`)
      } else {
        reasoning.push(`Current difficulty rating appears accurate`)
      }

      if (coefficientOfVariation < 0.1) {
        reasoning.push(`Very consistent race times (CV: ${(coefficientOfVariation * 100).toFixed(2)}%)`)
      } else if (coefficientOfVariation > 0.2) {
        reasoning.push(`High variance in race times (CV: ${(coefficientOfVariation * 100).toFixed(2)}%) - results may be less reliable`)
      }

      if (unusuallyFast > 0 || unusuallySlow > 0) {
        reasoning.push(`${unusuallyFast} unusually fast results, ${unusuallySlow} unusually slow results (>2 std dev)`)
      }

      if (similarCoursesWithAvg.length > 0) {
        const avgSimilarDiff = similarCoursesWithAvg.reduce((sum, c) => sum + c.difficulty, 0) / similarCoursesWithAvg.length
        reasoning.push(`Similar courses average difficulty: ${avgSimilarDiff.toFixed(9)}`)
      }

      // Determine recommendation - be MUCH more conservative with the threshold
      let action: 'keep' | 'increase' | 'decrease' = 'keep'
      let suggestedDifficulty = course.difficulty_rating
      let impactDescription = 'No change recommended - current rating appears accurate'
      let confidence: 'high' | 'medium' | 'low' = 'low'

      if (confidenceScore >= 0.7) confidence = 'high'
      else if (confidenceScore >= 0.5) confidence = 'medium'

      // Only recommend changes if we have reasonable confidence and VERY significant difference
      // Since ratings are in a narrow range (e.g., 0.95-1.05), even 0.01 is significant
      const SIGNIFICANT_THRESHOLD = 0.02 // 2% difference
      if (confidenceScore >= 0.5 && Math.abs(diffDifference) > SIGNIFICANT_THRESHOLD) {
        if (diffDifference > SIGNIFICANT_THRESHOLD) {
          action = 'increase'
          // Suggest halfway between current and implied (conservative)
          suggestedDifficulty = course.difficulty_rating + (diffDifference / 2)

          const timeImpactCs = Math.abs(avgTime - ((avgNormalizedTime / METERS_PER_MILE) * course.distance_meters * suggestedDifficulty))
          impactDescription = `Increasing difficulty from ${course.difficulty_rating.toFixed(9)} to ${suggestedDifficulty.toFixed(9)} ` +
            `would change average normalized times by approximately ${(timeImpactCs / 100).toFixed(2)} seconds, ` +
            `affecting ${results.length} results. Athletes' performances on this course would be ` +
            `valued as ${(Math.abs(diffDifference / 2) * 100).toFixed(2)}% faster relative to other courses.`
        } else if (diffDifference < -SIGNIFICANT_THRESHOLD) {
          action = 'decrease'
          suggestedDifficulty = course.difficulty_rating + (diffDifference / 2)

          const timeImpactCs = Math.abs(avgTime - ((avgNormalizedTime / METERS_PER_MILE) * course.distance_meters * suggestedDifficulty))
          impactDescription = `Decreasing difficulty from ${course.difficulty_rating.toFixed(9)} to ${suggestedDifficulty.toFixed(9)} ` +
            `would change average normalized times by approximately ${(timeImpactCs / 100).toFixed(2)} seconds, ` +
            `affecting ${results.length} results. Athletes' performances on this course would be ` +
            `valued as ${(Math.abs(diffDifference / 2) * 100).toFixed(2)}% slower relative to other courses.`
        }
      } else if (Math.abs(diffDifference) > 0.01 && Math.abs(diffDifference) <= SIGNIFICANT_THRESHOLD) {
        impactDescription = `Small discrepancy detected (${(Math.abs(diffDifference) * 100).toFixed(2)}%) but not significant enough to recommend change with ${confidence} confidence`
      }

      // Calculate what times would be with new rating
      const avgTimeWithNewRating = avgNormalizedTime > 0
        ? Math.round((avgNormalizedTime / METERS_PER_MILE) * course.distance_meters * suggestedDifficulty)
        : avgTime
      const medianTimeWithNewRating = avgNormalizedTime > 0
        ? Math.round((medianTime * suggestedDifficulty) / course.difficulty_rating)
        : medianTime

      // Calculate normalized mile times (pace per mile equivalent)
      // Formula: (time_cs * (1609.344 / distance_meters)) / difficulty_rating
      // This gives the equivalent mile pace adjusted for course difficulty
      const avgNormalizedMileCurrent = (avgTime * METERS_PER_MILE / course.distance_meters) / course.difficulty_rating
      const avgNormalizedMileProposed = (avgTime * METERS_PER_MILE / course.distance_meters) / suggestedDifficulty

      const timeDifferenceCs = Math.abs(avgTime - avgTimeWithNewRating)
      const timeDifferenceSeconds = timeDifferenceCs / 100

      analyses.push({
        course_id: course.id,
        course_name: course.name,
        distance_meters: course.distance_meters,
        current_difficulty: course.difficulty_rating,
        total_results: results.length,
        avg_time_cs: Math.round(avgTime),
        median_time_cs: medianTime,
        avg_normalized_time_cs: Math.round(avgNormalizedTime),
        suggested_difficulty: impliedDifficulty,
        confidence_score: Math.round(confidenceScore * 100) / 100,
        reasoning,
        avg_time_with_new_rating_cs: avgTimeWithNewRating,
        median_time_with_new_rating_cs: medianTimeWithNewRating,
        avg_normalized_mile_current_cs: Math.round(avgNormalizedMileCurrent),
        avg_normalized_mile_proposed_cs: Math.round(avgNormalizedMileProposed),
        time_difference_cs: timeDifferenceCs,
        time_difference_seconds: timeDifferenceSeconds,
        comparisons: {
          similar_courses: similarCoursesWithAvg
        },
        outliers: {
          unusually_fast: unusuallyFast,
          unusually_slow: unusuallySlow
        },
        recommendations: {
          action,
          current: course.difficulty_rating,
          suggested: suggestedDifficulty,
          impact_description: impactDescription,
          confidence
        }
      })
    }

    // Sort by priority: recommendations first, then by confidence
    const sortedAnalyses = analyses.sort((a, b) => {
      if (a.recommendations.action !== 'keep' && b.recommendations.action === 'keep') return -1
      if (a.recommendations.action === 'keep' && b.recommendations.action !== 'keep') return 1
      return b.confidence_score - a.confidence_score
    })

    // Generate summary statistics
    const summary = {
      total_courses_analyzed: analyses.length,
      courses_with_recommendations: analyses.filter(a => a.recommendations.action !== 'keep').length,
      high_confidence_recommendations: analyses.filter(a =>
        a.recommendations.action !== 'keep' && a.recommendations.confidence === 'high'
      ).length,
      courses_by_action: {
        increase: analyses.filter(a => a.recommendations.action === 'increase').length,
        decrease: analyses.filter(a => a.recommendations.action === 'decrease').length,
        keep: analyses.filter(a => a.recommendations.action === 'keep').length
      },
      avg_confidence_score: Math.round(
        (analyses.reduce((sum, a) => sum + a.confidence_score, 0) / analyses.length) * 100
      ) / 100
    }

    return NextResponse.json({
      success: true,
      summary,
      analyses: sortedAnalyses
    })

  } catch (error) {
    console.error('Error analyzing course difficulties:', error)
    return NextResponse.json(
      { error: 'Failed to analyze course difficulties', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function formatTime(centiseconds: number): string {
  const totalSeconds = Math.floor(centiseconds / 100)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const cs = centiseconds % 100
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}
