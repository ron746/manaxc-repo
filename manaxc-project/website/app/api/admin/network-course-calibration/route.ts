import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AthleteResult {
  athlete_id: string
  athlete_name: string
  course_id: string
  course_name: string
  time_cs: number
  distance_meters: number
  current_difficulty: number
  normalized_mile_cs: number
  meet_date: string
}

interface CourseCalibration {
  course_id: string
  course_name: string
  current_difficulty: number
  implied_difficulty: number
  confidence: number
  shared_athletes_count: number
  median_ratio: number
  method: 'direct' | 'indirect' | 'isolated'
  anchor_course?: string
}

const METERS_PER_MILE = 1609.344
const ANCHOR_COURSE_NAME = 'Crystal Springs, 2.95 Miles'

export async function POST(request: Request) {
  try {
    console.log('Starting network-based course calibration...')

    // Step 1: Find the anchor course (Crystal Springs 2.95)
    const { data: anchorCourse, error: anchorError } = await supabase
      .from('courses')
      .select('*')
      .eq('name', ANCHOR_COURSE_NAME)
      .single()

    if (anchorError || !anchorCourse) {
      return NextResponse.json({ error: 'Anchor course not found' }, { status: 404 })
    }

    console.log(`Anchor course: ${anchorCourse.name} (${anchorCourse.distance_meters}m, difficulty: ${anchorCourse.difficulty_rating})`)

    // Step 2: Get ALL results for the anchor course
    let anchorResults: AthleteResult[] = []
    let page = 0
    const PAGE_SIZE = 1000
    let hasMore = true

    while (hasMore) {
      const { data: pageResults, error } = await supabase
        .from('results')
        .select(`
          athlete_id,
          time_cs,
          athletes!inner(name),
          races!inner(course_id),
          meets!inner(meet_date)
        `)
        .eq('races.course_id', anchorCourse.id)
        .not('time_cs', 'is', null)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (error || !pageResults || pageResults.length === 0) {
        hasMore = false
      } else {
        anchorResults = anchorResults.concat(
          pageResults.map(r => ({
            athlete_id: r.athlete_id,
            athlete_name: r.athletes.name,
            course_id: anchorCourse.id,
            course_name: anchorCourse.name,
            time_cs: r.time_cs,
            distance_meters: anchorCourse.distance_meters,
            current_difficulty: anchorCourse.difficulty_rating,
            normalized_mile_cs: (r.time_cs * METERS_PER_MILE / anchorCourse.distance_meters) / anchorCourse.difficulty_rating,
            meet_date: r.meets.meet_date
          }))
        )
        if (pageResults.length < PAGE_SIZE) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    console.log(`Loaded ${anchorResults.length} results from anchor course`)

    // Step 3: Get ALL courses
    const { data: allCourses, error: coursesError } = await supabase
      .from('courses')
      .select('*')

    if (coursesError || !allCourses) {
      return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 })
    }

    console.log(`Analyzing ${allCourses.length} courses...`)

    // Step 4: For each course, calculate implied difficulty based on shared athletes
    const calibrations: CourseCalibration[] = []

    for (const course of allCourses) {
      if (course.id === anchorCourse.id) {
        // Skip the anchor itself
        calibrations.push({
          course_id: course.id,
          course_name: course.name,
          current_difficulty: course.difficulty_rating,
          implied_difficulty: course.difficulty_rating,
          confidence: 1.0,
          shared_athletes_count: anchorResults.length,
          median_ratio: 1.0,
          method: 'direct',
          anchor_course: 'ANCHOR'
        })
        continue
      }

      // Get all results for this course
      let courseResults: AthleteResult[] = []
      page = 0
      hasMore = true

      while (hasMore) {
        const { data: pageResults, error } = await supabase
          .from('results')
          .select(`
            athlete_id,
            time_cs,
            athletes!inner(name),
            races!inner(course_id),
            meets!inner(meet_date)
          `)
          .eq('races.course_id', course.id)
          .not('time_cs', 'is', null)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error || !pageResults || pageResults.length === 0) {
          hasMore = false
        } else {
          courseResults = courseResults.concat(
            pageResults.map(r => ({
              athlete_id: r.athlete_id,
              athlete_name: r.athletes.name,
              course_id: course.id,
              course_name: course.name,
              time_cs: r.time_cs,
              distance_meters: course.distance_meters,
              current_difficulty: course.difficulty_rating,
              normalized_mile_cs: (r.time_cs * METERS_PER_MILE / course.distance_meters) / course.difficulty_rating,
              meet_date: r.meets.meet_date
            }))
          )
          if (pageResults.length < PAGE_SIZE) {
            hasMore = false
          } else {
            page++
          }
        }
      }

      // Find shared athletes
      const sharedAthletes = new Set(
        anchorResults
          .filter(ar => courseResults.some(cr => cr.athlete_id === ar.athlete_id))
          .map(ar => ar.athlete_id)
      )

      if (sharedAthletes.size < 10) {
        // Not enough shared athletes for reliable calibration
        calibrations.push({
          course_id: course.id,
          course_name: course.name,
          current_difficulty: course.difficulty_rating,
          implied_difficulty: course.difficulty_rating,
          confidence: 0,
          shared_athletes_count: sharedAthletes.size,
          median_ratio: 1.0,
          method: 'isolated'
        })
        continue
      }

      // For each shared athlete, calculate the ratio of their performance
      const performanceRatios: number[] = []

      for (const athleteId of sharedAthletes) {
        const anchorPerfs = anchorResults.filter(r => r.athlete_id === athleteId)
        const coursePerfs = courseResults.filter(r => r.athlete_id === athleteId)

        // Use median performance on each course
        const anchorNorms = anchorPerfs.map(p => p.normalized_mile_cs).sort((a, b) => a - b)
        const courseNorms = coursePerfs.map(p => p.normalized_mile_cs).sort((a, b) => a - b)

        const anchorMedian = anchorNorms[Math.floor(anchorNorms.length / 2)]
        const courseMedian = courseNorms[Math.floor(courseNorms.length / 2)]

        // Ratio = how much faster/slower they are on this course vs anchor
        // If ratio > 1, they're slower on this course (harder course)
        // If ratio < 1, they're faster on this course (easier course)
        const ratio = courseMedian / anchorMedian
        performanceRatios.push(ratio)
      }

      // Calculate median ratio across all shared athletes
      performanceRatios.sort((a, b) => a - b)
      const medianRatio = performanceRatios[Math.floor(performanceRatios.length / 2)]

      // Implied difficulty = current difficulty * median ratio
      // If athletes are running faster here (ratio < 1), difficulty should be lower
      const impliedDifficulty = course.difficulty_rating * medianRatio

      // Confidence based on sample size and consistency
      const stdDev = Math.sqrt(
        performanceRatios.reduce((sum, r) => sum + Math.pow(r - medianRatio, 2), 0) / performanceRatios.length
      )
      const confidence = Math.min(1.0, sharedAthletes.size / 100) * (1 - Math.min(stdDev, 0.5))

      calibrations.push({
        course_id: course.id,
        course_name: course.name,
        current_difficulty: course.difficulty_rating,
        implied_difficulty: impliedDifficulty,
        confidence: confidence,
        shared_athletes_count: sharedAthletes.size,
        median_ratio: medianRatio,
        method: 'direct',
        anchor_course: anchorCourse.name
      })

      console.log(`${course.name}: ${sharedAthletes.size} shared athletes, ratio: ${medianRatio.toFixed(3)}, implied: ${impliedDifficulty.toFixed(9)}`)
    }

    // Sort by largest discrepancy
    calibrations.sort((a, b) => {
      const aDiff = Math.abs(a.implied_difficulty - a.current_difficulty)
      const bDiff = Math.abs(b.implied_difficulty - b.current_difficulty)
      return bDiff - aDiff
    })

    return NextResponse.json({
      success: true,
      anchor_course: {
        name: anchorCourse.name,
        difficulty: anchorCourse.difficulty_rating,
        total_results: anchorResults.length
      },
      calibrations: calibrations,
      summary: {
        total_courses: allCourses.length,
        directly_calibrated: calibrations.filter(c => c.method === 'direct' && c.confidence > 0.3).length,
        needs_review: calibrations.filter(c => Math.abs(c.implied_difficulty - c.current_difficulty) > 0.05).length
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
