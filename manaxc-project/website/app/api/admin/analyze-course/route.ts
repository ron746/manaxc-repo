import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Fetch course details
    const { data: course } = await supabase
      .from('courses')
      .select('id, name, location, distance_meters, difficulty_rating')
      .eq('id', courseId)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Fetch all results for this course with athlete and school info
    const { data: results } = await supabase
      .from('results')
      .select(`
        time_cs,
        place_overall,
        athlete:athletes!inner (
          name,
          grad_year,
          gender,
          school:schools!inner (
            name
          )
        ),
        race:races!inner (
          gender,
          meet:meets!inner (
            name,
            meet_date,
            season_year
          ),
          course_id
        )
      `)
      .eq('race.course_id', courseId)
      .order('time_cs', { ascending: true })
      .limit(500) // Get top 500 performances

    if (!results || results.length === 0) {
      return NextResponse.json({
        error: 'No race results found for this course',
        suggestion: 'Cannot analyze difficulty without race data'
      }, { status: 400 })
    }

    // Separate boys and girls results
    const boysResults = results.filter((r: any) => r.athlete?.gender === 'M')
    const girlsResults = results.filter((r: any) => r.athlete?.gender === 'F')

    // Calculate statistics for the prompt
    const formatTime = (cs: number) => {
      const min = Math.floor(cs / 6000)
      const sec = Math.floor((cs % 6000) / 100)
      const centisec = cs % 100
      return `${min}:${sec.toString().padStart(2, '0')}.${centisec.toString().padStart(2, '0')}`
    }

    const calculateStats = (results: any[]) => {
      if (results.length === 0) return null

      const times = results.map((r: any) => r.time_cs).sort((a, b) => a - b)
      const top10 = times.slice(0, 10)
      const median = times[Math.floor(times.length / 2)]

      return {
        count: times.length,
        fastest: formatTime(times[0]),
        median: formatTime(median),
        top10Avg: formatTime(Math.round(top10.reduce((sum, t) => sum + t, 0) / top10.length)),
        top10Times: top10.map(formatTime)
      }
    }

    const boysStats = calculateStats(boysResults)
    const girlsStats = calculateStats(girlsResults)

    // Get some other courses for comparison
    const { data: otherCourses } = await supabase
      .from('courses')
      .select('id, name, difficulty_rating, distance_meters')
      .neq('id', courseId)
      .not('difficulty_rating', 'is', null)
      .order('difficulty_rating', { ascending: true })
      .limit(10)

    // Group results by season for anomaly detection
    const resultsBySeason = new Map<number, any[]>()
    results.forEach((r: any) => {
      const season = r.race?.meet?.season_year
      if (season) {
        if (!resultsBySeason.has(season)) {
          resultsBySeason.set(season, [])
        }
        resultsBySeason.get(season)!.push(r)
      }
    })

    const seasonAnalysis = Array.from(resultsBySeason.entries()).map(([season, seasonResults]) => {
      const boysSeasonResults = seasonResults.filter((r: any) => r.athlete?.gender === 'M')
      const girlsSeasonResults = seasonResults.filter((r: any) => r.athlete?.gender === 'F')

      return {
        season,
        boysCount: boysSeasonResults.length,
        girlsCount: girlsSeasonResults.length,
        boysMedian: boysSeasonResults.length > 0
          ? boysSeasonResults.map((r: any) => r.time_cs).sort((a, b) => a - b)[Math.floor(boysSeasonResults.length / 2)]
          : null,
        girlsMedian: girlsSeasonResults.length > 0
          ? girlsSeasonResults.map((r: any) => r.time_cs).sort((a, b) => a - b)[Math.floor(girlsSeasonResults.length / 2)]
          : null
      }
    })

    // Build the AI prompt with pace-based rating system
    const prompt = `You are an expert in high school cross country course difficulty analysis. Your task is to analyze race results and suggest an optimal difficulty rating based on a PACE-BASED SYSTEM using methodology inspired by Malcolm Slaney's Bayesian probabilistic modeling research.

**CRITICAL: Pace-Based Difficulty Rating System**
This system measures the "effort multiplier" to run 1 mile on a track. The rating represents how much slower/harder the course is compared to ideal flat track conditions.

**Rating Scale (Pace Multiplier):**
- 1.0 = Perfect track conditions (theoretical baseline)
- 1.06 to 1.25 = Typical high school XC race course range
- 1.1044 = Fast course (1st quartile)
- 1.1336 = Typical/Average course (2nd quartile/median) **THIS IS YOUR BASELINE**
- 1.1618 = Moderately difficult course (3rd quartile)
- 1.3184 = Very difficult course (upper quartile)
- Above 1.32 = Extremely difficult (rare for HS courses)

**Context for Training Paces (for reference only):**
- 1.64181283199 = Easy slow jog training pace
- 0.711571513 = 100m sprint pace

**Malcolm Slaney's Research Insights (CRITICAL BASELINE DIFFERENCE):**
Malcolm Slaney's analysis of 70k+ boys and 63k+ girls high school race results using Bayesian probabilistic modeling (PyMC) provides valuable statistical methodology, BUT his baseline normalization is fundamentally different from ours:
- **Slaney's baseline**: Crystal Springs 2.95 mile course = 1.0
- **Our baseline**: Median HS XC course = 1.1336 (pace multiplier relative to flat track)
- **This means Slaney's ratings are NOT directly comparable to ours** - his 0.523 to 1.053 range maps to a completely different scale than our 1.06 to 1.25 range

**Applicable Slaney Insights (Statistical Methods Only):**
- Multiplicative course difficulty model approach
- Statistical robustness: 36 MCMC chains with 72,000 trace samples per course
- The concept of using seasonal and yearly improvement factors (but see gender-specific warnings below)

**CRITICAL: Gender-Specific Athlete Development Patterns**
DO NOT assume linear improvement for all athletes:

**Boys - Generally Consistent Improvement:**
- Seasonal improvement trends: typically improve through season
- Grade-to-grade improvement: generally consistent upward trajectory
- Slaney's ~10.5 sec/month and ~15.2 sec/year may be reasonable for boys
- Look for steady improvement patterns in the data

**Girls - HIGHLY VARIABLE Development Patterns:**
- Puberty effects are DRAMATIC and HIGHLY INDIVIDUAL
- Some girls maintain steady improvement throughout high school
- Some girls experience significant performance drops during puberty (hormonal changes, body composition changes)
- Some girls have higher testosterone levels and maintain improvement
- DO NOT assume linear improvement - look at actual individual trend data
- Early developers may peak as freshmen/sophomores
- Late developers may improve dramatically as juniors/seniors
- **When analyzing girls' times, look for TRENDS not assumptions**
- If you see performance drops between seasons, this may be biological, not course difficulty

**Analytical Approach:**
1. For boys: Seasonal/yearly improvement adjustments are generally safe
2. For girls: LOOK AT THE DATA PATTERNS - do not assume improvement
3. When you see inconsistent times across seasons for girls, consider biological factors
4. Use top performers (who have likely stabilized) as more reliable course difficulty indicators
5. Look at senior girls' times as more stable indicators than underclassmen

**Course Information:**
- Name: ${course.name}
- Location: ${course.location || 'Unknown'}
- Distance: ${course.distance_meters}m (${(course.distance_meters / 1609.34).toFixed(2)} miles)
- Current Rating: ${course.difficulty_rating}

**Boys Results (${boysStats?.count || 0} total performances):**
${boysStats ? `
- Fastest Time: ${boysStats.fastest}
- Median Time: ${boysStats.median}
- Top 10 Average: ${boysStats.top10Avg}
- Top 10 Times: ${boysStats.top10Times.join(', ')}
` : 'No boys results available'}

**Girls Results (${girlsStats?.count || 0} total performances):**
${girlsStats ? `
- Fastest Time: ${girlsStats.fastest}
- Median Time: ${girlsStats.median}
- Top 10 Average: ${girlsStats.top10Avg}
- Top 10 Times: ${girlsStats.top10Times.join(', ')}
` : 'No girls results available'}

**Season-by-Season Analysis (for anomaly detection):**
${seasonAnalysis.map(s => `- ${s.season}: ${s.boysCount} boys, ${s.girlsCount} girls | Boys median: ${s.boysMedian ? formatTime(s.boysMedian) : 'N/A'}, Girls median: ${s.girlsMedian ? formatTime(s.girlsMedian) : 'N/A'}`).join('\n')}

**Reference Courses for Comparison:**
${otherCourses?.map(c => `- ${c.name} (${c.distance_meters}m): Rating ${c.difficulty_rating}`).join('\n') || 'No reference courses available'}

**Analysis Instructions:**
1. **Calculate the pace multiplier** by comparing actual race times to expected flat track times
2. For a ${course.distance_meters}m course:
   - Expected flat track time (boys, top runners): ~${Math.round((course.distance_meters / 1609.34) * 300)} seconds (5:00/mile pace)
   - Expected flat track time (girls, top runners): ~${Math.round((course.distance_meters / 1609.34) * 360)} seconds (6:00/mile pace)
3. **Detect anomalies**: Look for significant variations between seasons that might indicate course changes
   - Check for median time shifts >5% between seasons
   - Look for changes in course distance or configuration
   - Consider weather conditions if dates show extreme differences
4. **Compare to reference courses** at similar distances
5. **Consider sample size and statistical confidence**:
   - Adequate: 50+ results per gender with multiple seasons
   - Limited: 10-49 results or single season only
   - Insufficient: <10 results (use extreme caution)
   - Slaney's benchmark: 3,919 boys across 443 courses (avg ~9 per course, but with cross-course normalization)
6. **Typical HS XC range**: 1.06 to 1.25 (most courses fall in 1.10 to 1.16)
7. **Baseline is 1.1336**: Courses faster than this are easier, slower are harder
8. **Statistical robustness checks**:
   - Look at consistency of top 10 times (should be tightly grouped for reliable courses)
   - Check if median and top-10 average tell a consistent story
   - Consider outliers - times that are 2+ standard deviations from mean may indicate errors or exceptional conditions
9. **Account for runner development** (GENDER-SPECIFIC APPROACH):
   - **For boys**: May apply seasonal (~10.5 sec/month) and yearly (~15.2 sec/year) improvement adjustments
   - **For girls**: DO NOT assume linear improvement - puberty causes highly individual patterns
     - Look for actual trends in the data for each athlete
     - Senior girls' times are more reliable indicators than underclassmen
     - Performance drops may be biological, not course-related
     - Some girls peak early (freshmen/sophomores), others late (juniors/seniors)
   - **When in doubt**: Use top performers who have likely stabilized as primary indicators
10. **BASELINE REMINDER**: Our system uses 1.1336 as median HS course (pace multiplier vs flat track)
    - This is FUNDAMENTALLY DIFFERENT from Slaney's Crystal Springs 2.95mi = 1.0 baseline
    - Do not try to map Slaney's 0.523-1.053 range to our 1.06-1.25 range
    - Use his statistical methodology, NOT his numeric ratings

**IMPORTANT: External Data Sources**
- Note: We cannot currently access Athletic.net or Milesplit APIs for additional data
- Analysis must be based solely on our internal database results
- Future enhancement: May integrate external data sources when available

**Output Format (JSON):**
{
  "suggestedRating": <number between 1.00 and 1.40, typically 1.06-1.25, use 10 decimal places for precision>,
  "confidence": "<high|medium|low>",
  "reasoning": "<2-3 sentences explaining the rating as a pace multiplier, referencing the statistical analysis>",
  "comparisonToBaseline": "<how this compares to baseline 1.1336 - state as percentage easier/harder>",
  "factors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "anomalies": ["<any unusual season-to-season variations that might indicate course changes>"],
  "seasonalVariance": {
    "detected": <boolean>,
    "description": "<if true, describe which seasons differ significantly and by how much>",
    "recommendation": "<if variance detected, recommend creating season-specific ratings or investigating course changes>"
  },
  "warnings": ["<any concerns about data quality or rating accuracy>"],
  "dataQuality": {
    "sampleSize": "<adequate|limited|insufficient>",
    "consistencyScore": "<how consistent are the times across seasons - provide specific metrics if possible>",
    "topTimesSpread": "<describe how tightly grouped the top 10 times are>",
    "outlierCount": "<number of significant outliers detected>"
  },
  "statisticalAnalysis": {
    "boysAnalysis": "<calculated pace multiplier for boys based on top performers vs expected track times>",
    "girlsAnalysis": "<calculated pace multiplier for girls based on top performers vs expected track times, noting any puberty-related variance patterns observed>",
    "genderSpecificNotes": "<any observations about boys showing consistent improvement vs girls showing variable patterns>",
    "weightedRecommendation": "<how you weighted boys vs girls data, seasonal factors, and sample sizes to reach final rating, noting if you prioritized senior girls or top performers due to biological variability>"
  },
  "slaneysMethodologyNotes": "<brief note on how this analysis uses Slaney's statistical methodology but NOT his numeric scale (his baseline: Crystal Springs 2.95mi = 1.0 vs our baseline: median HS course = 1.1336 pace multiplier)>"
}`

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawResponse: responseText
      }, { status: 500 })
    }

    const analysis = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        name: course.name,
        currentRating: course.difficulty_rating,
        distance: course.distance_meters
      },
      analysis,
      stats: {
        boys: boysStats,
        girls: girlsStats,
        totalResults: results.length
      }
    })

  } catch (error) {
    console.error('Error analyzing course:', error)
    return NextResponse.json({
      error: 'Failed to analyze course',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
