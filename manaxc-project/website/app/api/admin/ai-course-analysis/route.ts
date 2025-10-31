import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const genAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null

interface CourseData {
  course_id: string
  course_name: string
  distance_meters: number
  current_difficulty: number
  athlete_performances: Array<{
    athlete_name: string
    athlete_id: string
    grad_year: number
    this_course_time: number
    this_course_normalized: number
    other_courses: Array<{
      course_name: string
      time: number
      normalized: number
      difficulty: number
      date?: string
    }>
    career_progression: {
      first_race_date?: string
      latest_race_date?: string
      improvement_trend?: string
    }
  }>
  course_statistics: {
    total_results: number
    avg_time: number
    median_time: number
    std_dev: number
  }
}

export async function POST(request: Request) {
  try {
    const { course_id, provider = 'claude' } = await request.json()

    if (!course_id) {
      return NextResponse.json({ error: 'course_id required' }, { status: 400 })
    }

    if (!['claude', 'gemini'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider. Must be claude or gemini' }, { status: 400 })
    }

    // Check if the requested provider is available
    if (provider === 'claude' && !anthropic) {
      return NextResponse.json({ error: 'Anthropic Claude API key not configured' }, { status: 400 })
    }
    if (provider === 'gemini' && !genAI) {
      return NextResponse.json({ error: 'Google Gemini API key not configured' }, { status: 400 })
    }

    console.log(`Starting AI analysis for course ${course_id}...`)

    // Get course info
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Get all results for this course - paginate to avoid 1000 row limit
    let allResults: any[] = []
    let page = 0
    const PAGE_SIZE = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data: pageResults, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          athletes!inner(name, grad_year, school_id),
          races!inner(course_id)
        `)
        .eq('races.course_id', course_id)
        .not('time_cs', 'is', null)
        .range(from, to)
        .order('time_cs')

      if (resultsError) {
        console.error('Error fetching results:', resultsError)
        return NextResponse.json({ error: 'Error fetching results: ' + resultsError.message }, { status: 500 })
      }

      if (!pageResults || pageResults.length === 0) {
        hasMore = false
      } else {
        allResults = allResults.concat(pageResults)
        if (pageResults.length < PAGE_SIZE) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    console.log(`Found ${allResults?.length || 0} results for course`)

    // COMPREHENSIVE ANALYSIS: Analyze ALL athletes, not just 30
    const athletePerformances: CourseData['athlete_performances'] = []
    const METERS_PER_MILE = 1609.344

    // Track comparative statistics across all athletes
    const athleteComparisons: Array<{
      athlete_name: string
      this_course_norm_mile_cs: number
      other_courses_median_norm_mile_cs: number
      difference_cs: number
      num_other_races: number
    }> = []

    console.log(`Analyzing using Malcolm Slaney's anchor-based method (OPTIMIZED SQL)...`)

    // CRITICAL: Use ANCHOR COURSE (Crystal Springs) for comparison via optimized SQL function
    const ANCHOR_COURSE_NAME = 'Crystal Springs, 2.95 Miles'

    // Use optimized SQL function to get all athlete comparisons in ONE query
    const { data: athleteStats, error: statsError } = await supabase.rpc(
      'get_athlete_course_comparisons_anchor_based',
      {
        target_course_id: course_id,
        anchor_course_name: ANCHOR_COURSE_NAME
      }
    )

    if (statsError) {
      console.error('Error calling SQL function:', statsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to analyze course',
        details: statsError.message
      }, { status: 500 })
    }

    if (!athleteStats || athleteStats.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data for anchor-based analysis',
        details: `No athletes found who have run both this course and the anchor course (${ANCHOR_COURSE_NAME}).`,
        recommendation: 'This course needs athletes who have also raced on the anchor course before AI analysis can provide reliable recommendations.'
      }, { status: 400 })
    }

    console.log(`Found ${athleteStats.length} athletes with both target and anchor course data`)

    // Get anchor course info for display
    const { data: anchorCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('name', ANCHOR_COURSE_NAME)
      .single()

    // Process SQL results into athleteComparisons array
    athleteStats.forEach((stat: any) => {
      athleteComparisons.push({
        athlete_name: stat.athlete_name,
        this_course_norm_mile_cs: stat.this_course_normalized,
        other_courses_median_norm_mile_cs: stat.anchor_course_median,
        difference_cs: stat.difference_cs,
        num_other_races: stat.anchor_race_count
      })
    })

    // Get detailed data for top 30 athletes (those with most anchor course races)
    const topAthletes = athleteStats
      .sort((a: any, b: any) => b.anchor_race_count - a.anchor_race_count)
      .slice(0, 30)

    for (const athleteStat of topAthletes) {
      const result = allResults.find(r => r.athlete_id === athleteStat.athlete_id)
      if (!result) continue

      // Get sample of other courses (just 5 examples) for context in AI prompt
      const { data: otherResults } = await supabase
        .from('results')
        .select(`
          time_cs,
          races!inner(
            courses!inner(name, distance_meters, difficulty_rating)
          ),
          meets!inner(date)
        `)
        .eq('athlete_id', athleteStat.athlete_id)
        .neq('race_id', result.race_id)
        .not('time_cs', 'is', null)
        .limit(5)

      const otherCourses = (otherResults || []).map((r: any) => ({
        course_name: r.races.courses.name,
        time: r.time_cs,
        normalized: (r.time_cs * METERS_PER_MILE / r.races.courses.distance_meters) / r.races.courses.difficulty_rating,
        difficulty: r.races.courses.difficulty_rating,
        date: r.meets?.date
      }))

      athletePerformances.push({
        athlete_name: result.athletes.name,
        athlete_id: result.athlete_id,
        grad_year: result.athletes.grad_year,
        this_course_time: result.time_cs,
        this_course_normalized: athleteStat.this_course_normalized,
        other_courses: otherCourses,
        career_progression: {
          first_race_date: otherCourses[0]?.date,
          latest_race_date: otherCourses[otherCourses.length - 1]?.date,
          improvement_trend: otherCourses.length > 1 ? 'data_available' : 'limited_data'
        }
      })
    }

    console.log(`Analyzed ${athleteComparisons.length} athletes with anchor course data`)

    // Check if we have enough data for anchor-based analysis
    if (athleteComparisons.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data for anchor-based analysis',
        details: `Only ${athleteComparisons.length} athletes have run both this course and the anchor course (${ANCHOR_COURSE_NAME}). Need at least 10 for reliable analysis.`,
        recommendation: 'This course needs more shared athletes with the anchor course before AI analysis can provide reliable recommendations.'
      }, { status: 400 })
    }

    // Calculate aggregate statistics
    const differences = athleteComparisons.map(a => a.difference_cs).sort((a, b) => a - b)
    const medianDifference = differences[Math.floor(differences.length / 2)]
    const avgDifference = differences.reduce((sum, d) => sum + d, 0) / differences.length

    // CRITICAL: Calculate RATIOS (Malcolm Slaney's method)
    const ratios = athleteComparisons.map(a => a.this_course_norm_mile_cs / a.other_courses_median_norm_mile_cs).sort((a, b) => a - b)
    const medianRatio = ratios[Math.floor(ratios.length / 2)]
    const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length
    const stdDevRatio = Math.sqrt(ratios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) / ratios.length)

    // Implied difficulty based on median ratio
    const impliedDifficulty = course.difficulty_rating * medianRatio

    // Count how many athletes are faster/slower
    const numFaster = differences.filter(d => d < -1000).length // More than 10 seconds faster
    const numSlower = differences.filter(d => d > 1000).length // More than 10 seconds slower
    const numSimilar = differences.length - numFaster - numSlower

    // Calculate basic statistics
    const times = allResults.map(r => r.time_cs)
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
    const sortedTimes = [...times].sort((a, b) => a - b)
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)]
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length
    const stdDev = Math.sqrt(variance)

    const courseData: CourseData = {
      course_id: course.id,
      course_name: course.name,
      distance_meters: course.distance_meters,
      current_difficulty: course.difficulty_rating,
      athlete_performances: athletePerformances,
      course_statistics: {
        total_results: allResults.length,
        avg_time: avgTime,
        median_time: medianTime,
        std_dev: stdDev
      }
    }

    // Prepare prompt for Claude
    const prompt = `You are an expert in cross country running performance analysis, with deep knowledge of:
- Course difficulty rating systems (like Malcolm Slaney's analysis)
- Athlete progression and improvement patterns throughout a season
- Environmental factors affecting performance (weather, elevation, course terrain)
- Statistical analysis of performance data
- Outlier detection and data quality assessment

TASK: Analyze the course difficulty rating for "${course.name}" and provide a detailed recommendation.

CURRENT RATING: ${course.difficulty_rating.toFixed(9)}
DISTANCE: ${course.distance_meters}m (${(course.distance_meters / 1609.344).toFixed(2)} miles)

COURSE STATISTICS:
- Total Results: ${courseData.course_statistics.total_results}
- Average Time: ${formatTime(Math.round(avgTime))}
- Median Time: ${formatTime(medianTime)}
- Standard Deviation: ${(stdDev / 100).toFixed(2)}s

ANCHOR-BASED NETWORK ANALYSIS (Malcolm Slaney's Method):
We analyzed ${athleteComparisons.length} athletes who ran BOTH this course AND the anchor course (${ANCHOR_COURSE_NAME}).
For each athlete, we calculated: RATIO = (their median normalized time HERE) / (their median normalized time on ANCHOR)

CRITICAL INTERPRETATION:
- If most athletes have ratio > 1.0: They run SLOWER here → this course is HARDER than anchor
- If most athletes have ratio < 1.0: They run FASTER here → this course is EASIER than anchor
- The median ratio tells us the EXACT calibration factor needed

KEY FINDINGS (THE CRITICAL DATA):
- **MEDIAN RATIO: ${medianRatio.toFixed(4)}** (THIS IS THE CALIBRATION FACTOR!)
- Average ratio: ${avgRatio.toFixed(4)}
- Standard deviation of ratios: ${stdDevRatio.toFixed(4)} (lower = more consistent = higher confidence)
- **IMPLIED DIFFICULTY: ${impliedDifficulty.toFixed(9)}** (current: ${course.difficulty_rating.toFixed(9)})
- Adjustment needed: ${((medianRatio - 1.0) * 100).toFixed(1)}% ${medianRatio > 1.0 ? 'HARDER' : 'EASIER'} than anchor
- Median time difference vs anchor: ${formatTime(Math.abs(Math.round(medianDifference)))} ${medianDifference < 0 ? 'FASTER' : 'SLOWER'} per mile
- ${numFaster} athletes (${((numFaster / athleteComparisons.length) * 100).toFixed(1)}%) ran 10+ seconds/mile FASTER here
- ${numSlower} athletes (${((numSlower / athleteComparisons.length) * 100).toFixed(1)}%) ran 10+ seconds/mile SLOWER here
- ${numSimilar} athletes (${((numSimilar / athleteComparisons.length) * 100).toFixed(1)}%) within 10 seconds/mile of anchor

SAMPLE ATHLETE DETAILS (showing 15 of ${athleteComparisons.length}):
${athletePerformances.slice(0, 15).map(ap => `
Athlete: ${ap.athlete_name} (Grad ${ap.grad_year})
- This Course: ${formatTime(ap.this_course_time)} → Normalized: ${formatTime(Math.round(ap.this_course_normalized))}
- Other Courses (${ap.other_courses.length} races):
${ap.other_courses.slice(0, 5).map(oc => `  • ${oc.course_name}: ${formatTime(oc.time)} → Normalized: ${formatTime(Math.round(oc.normalized))} (difficulty: ${oc.difficulty.toFixed(3)})`).join('\n')}
`).join('\n---\n')}

ANALYSIS REQUIREMENTS (Malcolm Slaney's Network Method):
1. Calculate the MEDIAN RATIO across all shared athletes (THIS_COURSE_NORMALIZED / ANCHOR_NORMALIZED)
2. The recommended difficulty = CURRENT_DIFFICULTY × MEDIAN_RATIO
3. Example: If median ratio is 0.90, it means athletes run 10% faster here, so difficulty should be 10% lower
4. DO NOT use time differences in seconds - use the RATIO method which accounts for difficulty properly
5. Confidence based on:
   - Sample size: 100+ shared athletes = HIGH, 50-100 = MEDIUM, <50 = LOW
   - Consistency: If std dev of ratios < 0.1 = HIGH, 0.1-0.2 = MEDIUM, >0.2 = LOW
6. Critical validation:
   - If ratio is 0.85-0.95: Course is 5-15% easier than anchor
   - If ratio is 1.05-1.15: Course is 5-15% harder than anchor
   - If ratio is 0.95-1.05: Course is properly calibrated
7. The anchor course (${ANCHOR_COURSE_NAME}) has difficulty ${anchorCourse?.difficulty_rating.toFixed(9)}
8. DO NOT be conservative - trust the median ratio calculation

OUTPUT FORMAT (JSON):
{
  "recommended_difficulty": <number with 9 decimals>,
  "confidence": "high" | "medium" | "low",
  "reasoning": [
    "detailed point 1",
    "detailed point 2",
    ...
  ],
  "key_findings": {
    "systematic_bias": "athletes consistently faster/slower than expected",
    "outliers": ["list of specific outlier cases"],
    "data_quality": "assessment of data reliability"
  },
  "impact_summary": "What changing the rating would mean for athlete rankings"
}

Provide your analysis:`

    console.log(`Sending to ${provider} API...`)

    let responseText = ''

    if (provider === 'claude') {
      const message = await anthropic!.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
      responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    } else if (provider === 'gemini') {
      // Use the -latest suffix for AI Studio API keys
      const model = genAI!.getGenerativeModel({
        model: 'gemini-1.5-flash-latest'
      })
      const result = await model.generateContent(prompt)
      responseText = result.response.text()
    }

    console.log(`Received response from ${provider}`)

    // Try to extract JSON from the response
    let analysis
    try {
      // Look for JSON in code blocks or raw
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } else {
        analysis = JSON.parse(responseText)
      }
    } catch (e) {
      console.error(`Failed to parse ${provider} response as JSON:`, e)
      analysis = {
        recommended_difficulty: course.difficulty_rating,
        confidence: 'low',
        reasoning: [responseText],
        key_findings: {
          systematic_bias: 'Unable to parse response',
          outliers: [],
          data_quality: 'Error in analysis'
        },
        impact_summary: 'Analysis failed to complete'
      }
    }

    // Save recommendation to database
    const confidenceMap: Record<string, number> = {
      'high': 0.8,
      'medium': 0.5,
      'low': 0.3
    }

    const recommendationToSave = {
      course_id: course.id,
      recommended_difficulty: analysis.recommended_difficulty,
      current_difficulty: course.difficulty_rating,
      source: 'ai_analysis',
      confidence: confidenceMap[analysis.confidence?.toLowerCase()] || 0.5,
      shared_athletes_count: athleteComparisons.length,
      median_ratio: medianRatio,
      reasoning: {
        provider,
        confidence_level: analysis.confidence,
        reasoning: analysis.reasoning || [],
        key_findings: analysis.key_findings || {},
        impact_summary: analysis.impact_summary || '',
        anchor_course: ANCHOR_COURSE_NAME,
        median_ratio: medianRatio,
        std_dev_ratio: stdDevRatio,
        athletes_analyzed: athleteComparisons.length
      }
    }

    const { error: upsertError } = await supabase
      .from('course_difficulty_recommendations')
      .upsert(recommendationToSave, {
        onConflict: 'course_id,source',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('Failed to save AI recommendation:', upsertError)
      // Don't fail the request, just log the error
    } else {
      console.log(`Saved AI recommendation for course ${course.name}`)
    }

    return NextResponse.json({
      success: true,
      course_name: course.name,
      current_difficulty: course.difficulty_rating,
      analysis,
      raw_response: responseText, // Include for debugging
      data_points_analyzed: athletePerformances.length,
      recommendation_saved: !upsertError
    })

  } catch (error) {
    console.error('Error in AI course analysis:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze course',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
