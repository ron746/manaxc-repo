import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    console.log(`Fetching courses with search="${search}", sort=${sortBy} ${sortOrder}`)

    // Get all courses with their statistics
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        distance_meters,
        difficulty_rating,
        races:races(
          id,
          results:results(
            id,
            normalized_time_cs
          )
        )
      `)
      .ilike('name', `%${search}%`)
      .order(sortBy === 'name' ? 'name' : 'distance_meters', { ascending: sortOrder === 'asc' })

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json({
        error: 'Failed to fetch courses',
        details: error.message
      }, { status: 500 })
    }

    // Calculate statistics for each course
    const coursesWithStats = courses.map(course => {
      const allNormalizedTimes = course.races
        .flatMap(race => race.results.map(r => r.normalized_time_cs))
        .filter(t => t !== null && t !== undefined)

      const resultCount = allNormalizedTimes.length

      let avgNormalizedMileTimeCs = null
      if (resultCount > 0) {
        const sum = allNormalizedTimes.reduce((acc, t) => acc + t, 0)
        avgNormalizedMileTimeCs = Math.round(sum / resultCount)
      }

      return {
        id: course.id,
        name: course.name,
        distance_meters: course.distance_meters,
        difficulty_rating: course.difficulty_rating,
        result_count: resultCount,
        avg_normalized_mile_time_cs: avgNormalizedMileTimeCs
      }
    })

    // Apply secondary sort if needed
    if (sortBy === 'results') {
      coursesWithStats.sort((a, b) => {
        const diff = b.result_count - a.result_count
        return sortOrder === 'asc' ? -diff : diff
      })
    } else if (sortBy === 'difficulty') {
      coursesWithStats.sort((a, b) => {
        const diff = (a.difficulty_rating || 0) - (b.difficulty_rating || 0)
        return sortOrder === 'asc' ? diff : -diff
      })
    } else if (sortBy === 'avgTime') {
      coursesWithStats.sort((a, b) => {
        const aTime = a.avg_normalized_mile_time_cs || 999999
        const bTime = b.avg_normalized_mile_time_cs || 999999
        const diff = aTime - bTime
        return sortOrder === 'asc' ? diff : -diff
      })
    }

    console.log(`Returning ${coursesWithStats.length} courses`)

    return NextResponse.json({
      success: true,
      courses: coursesWithStats
    })

  } catch (error) {
    console.error('Unexpected error listing courses:', error)
    return NextResponse.json(
      {
        error: 'Failed to list courses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
