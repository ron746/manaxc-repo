'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Course {
  id: string
  name: string
  location: string | null
  venue: string | null
  distance_meters: number
  distance_display: string | null
  difficulty_rating: number | null
  elevation_gain_meters: number | null
  surface_type: string | null
  terrain_description: string | null
  notes: string | null
}

interface Meet {
  id: string
  name: string
  meet_date: string
  season_year: number
  meet_type: string | null
  race_count: number
}

interface TeamPerformance {
  school_id: string
  school_name: string
  school_short_name: string | null
  average_time_cs: number
  runner_count: number
}

export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [meets, setMeets] = useState<Meet[]>([])
  const [boysTeamPerf, setBoysTeamPerf] = useState<TeamPerformance[]>([])
  const [girlsTeamPerf, setGirlsTeamPerf] = useState<TeamPerformance[]>([])
  const [stats, setStats] = useState({ totalMeets: 0, totalResults: 0, boysCount: 0, girlsCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    try {
      setLoading(true)

      // Load course info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      // Load meets at this course's venue (via races that use this course)
      // Note: Meets don't have course_id, they have venue_id
      // We need to find meets through races that used this course
      const { data: racesWithMeets, error: racesError } = await supabase
        .from('races')
        .select(`
          meet:meets!inner(
            id,
            name,
            meet_date,
            season_year,
            meet_type
          )
        `)
        .eq('course_id', courseId)
        .order('meet.meet_date', { ascending: false })

      if (racesError) throw racesError

      // Extract unique meets from races (a meet may have multiple races on this course)
      const meetsMap = new Map<string, Meet>()

      racesWithMeets?.forEach((raceData: any) => {
        const meet = raceData.meet
        if (meet && !meetsMap.has(meet.id)) {
          meetsMap.set(meet.id, {
            id: meet.id,
            name: meet.name,
            meet_date: meet.meet_date,
            season_year: meet.season_year,
            meet_type: meet.meet_type,
            race_count: 0 // Will be calculated below
          })
        }
      })

      // Get race counts for each meet on this course
      const processedMeets: Meet[] = []
      for (const meet of meetsMap.values()) {
        const { count } = await supabase
          .from('races')
          .select('id', { count: 'exact', head: true })
          .eq('meet_id', meet.id)
          .eq('course_id', courseId)

        processedMeets.push({
          ...meet,
          race_count: count || 0
        })
      }

      // Sort by date descending
      processedMeets.sort((a, b) => new Date(b.meet_date).getTime() - new Date(a.meet_date).getTime())
      setMeets(processedMeets)

      // Load all results for this course (through races that use this course)
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          race:races!inner(
            id,
            gender,
            course_id
          ),
          athlete:athletes!inner(
            id,
            name,
            school:schools!inner(
              id,
              name,
              short_name
            )
          )
        `)
        .eq('race.course_id', courseId)

      if (resultsError) throw resultsError

      // Calculate statistics
      const boysResults = resultsData?.filter((r: any) => r.race.gender === 'M') || []
      const girlsResults = resultsData?.filter((r: any) => r.race.gender === 'F') || []

      setStats({
        totalMeets: processedMeets.length,
        totalResults: resultsData?.length || 0,
        boysCount: boysResults.length,
        girlsCount: girlsResults.length
      })

      // Calculate top 5 team performances (average of top 7 runners)
      calculateTeamPerformances(boysResults, 'M')
      calculateTeamPerformances(girlsResults, 'F')
    } catch (error) {
      console.error('Error loading course:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTeamPerformances = (results: any[], gender: string) => {
    // Group by school
    const bySchool: { [schoolId: string]: any[] } = {}

    results.forEach(r => {
      const schoolId = r.athlete.school.id
      if (!bySchool[schoolId]) {
        bySchool[schoolId] = []
      }
      bySchool[schoolId].push(r)
    })

    // Calculate average for top 7 runners per school
    const performances: TeamPerformance[] = []

    Object.entries(bySchool).forEach(([schoolId, schoolResults]) => {
      // Sort by time and take top 7
      const sorted = [...schoolResults].sort((a, b) => a.time_cs - b.time_cs)
      const top7 = sorted.slice(0, 7)

      if (top7.length >= 5) { // Need at least 5 runners
        const avgTime = Math.round(
          top7.reduce((sum, r) => sum + r.time_cs, 0) / top7.length
        )

        performances.push({
          school_id: schoolId,
          school_name: schoolResults[0].athlete.school.name,
          school_short_name: schoolResults[0].athlete.school.short_name,
          average_time_cs: avgTime,
          runner_count: top7.length
        })
      }
    })

    // Sort by average time
    performances.sort((a, b) => a.average_time_cs - b.average_time_cs)

    if (gender === 'M') {
      setBoysTeamPerf(performances.slice(0, 5))
    } else {
      setGirlsTeamPerf(performances.slice(0, 5))
    }
  }

  const formatDistance = (meters: number) => {
    if (meters === 5000) return '5K'
    if (meters === 3000) return '3K'
    if (meters === 4000) return '4K'
    const miles = meters / 1609.34
    if (Math.abs(miles - 3) < 0.01) return '3 Miles'
    if (Math.abs(miles - 2) < 0.01) return '2 Miles'
    return `${miles.toFixed(2)} mi`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDifficultyLabel = (rating: number | null) => {
    if (!rating) return 'Unknown'
    if (rating < 3) return 'Fast'
    if (rating < 5) return 'Moderate'
    if (rating < 7) return 'Challenging'
    if (rating < 9) return 'Difficult'
    return 'Very Difficult'
  }

  const getDifficultyColor = (rating: number | null) => {
    if (!rating) return 'bg-zinc-600'
    if (rating < 3) return 'bg-green-600'
    if (rating < 5) return 'bg-blue-600'
    if (rating < 7) return 'bg-yellow-600'
    if (rating < 9) return 'bg-orange-600'
    return 'bg-red-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading course...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Course not found</h1>
          <Link href="/courses" className="text-cyan-400 hover:text-cyan-300">
            Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/courses" className="text-cyan-400 hover:text-cyan-300">
            Courses
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">{course.name}</span>
        </div>

        {/* Course Header */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-8 mb-8 border border-zinc-700">
          <h1 className="text-4xl font-bold text-white mb-4">{course.name}</h1>

          {course.location && (
            <p className="text-zinc-300 text-lg mb-4">{course.location}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-zinc-400 mb-1">Distance</div>
              <div className="text-white font-bold text-xl">
                {course.distance_display || formatDistance(course.distance_meters)}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Difficulty</div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getDifficultyColor(course.difficulty_rating)}`}>
                  {getDifficultyLabel(course.difficulty_rating)}
                </span>
                {course.difficulty_rating && (
                  <span className="text-zinc-400 text-sm">({course.difficulty_rating}/10)</span>
                )}
              </div>
            </div>

            {course.elevation_gain_meters && (
              <div>
                <div className="text-sm text-zinc-400 mb-1">Elevation Gain</div>
                <div className="text-white font-medium">{course.elevation_gain_meters}m</div>
              </div>
            )}

            {course.surface_type && (
              <div>
                <div className="text-sm text-zinc-400 mb-1">Surface</div>
                <div className="text-white font-medium capitalize">{course.surface_type}</div>
              </div>
            )}
          </div>

          {course.terrain_description && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <div className="text-sm text-zinc-400 mb-1">Terrain</div>
              <p className="text-zinc-300">{course.terrain_description}</p>
            </div>
          )}

          {course.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <div className="text-sm text-zinc-400 mb-1">Notes</div>
              <p className="text-zinc-300">{course.notes}</p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
            <div className="text-zinc-400 text-sm mb-2">Total Meets</div>
            <div className="text-3xl font-bold text-cyan-400">{stats.totalMeets}</div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
            <div className="text-zinc-400 text-sm mb-2">Total Results</div>
            <div className="text-3xl font-bold text-cyan-400">{stats.totalResults}</div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
            <div className="text-zinc-400 text-sm mb-2">Boys Results</div>
            <div className="text-3xl font-bold text-blue-400">{stats.boysCount}</div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
            <div className="text-zinc-400 text-sm mb-2">Girls Results</div>
            <div className="text-3xl font-bold text-pink-400">{stats.girlsCount}</div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            href={`/courses/${courseId}/records`}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
          >
            View Course Records
          </Link>
          <Link
            href={`/courses/${courseId}/performances`}
            className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold transition-colors"
          >
            Top Performances
          </Link>
        </div>

        {/* Top Team Performances */}
        {(boysTeamPerf.length > 0 || girlsTeamPerf.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Top Team Performances</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Boys */}
              {boysTeamPerf.length > 0 && (
                <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">Boys</h3>
                  <div className="space-y-3">
                    {boysTeamPerf.map((team, index) => (
                      <div key={team.school_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 font-bold">{index + 1}.</span>
                          <Link
                            href={`/schools/${team.school_id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            {team.school_short_name || team.school_name}
                          </Link>
                          <span className="text-sm text-zinc-500">({team.runner_count} runners)</span>
                        </div>
                        <div className="font-mono font-bold text-cyan-400">
                          {formatTime(team.average_time_cs)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Girls */}
              {girlsTeamPerf.length > 0 && (
                <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
                  <h3 className="text-xl font-bold text-pink-400 mb-4">Girls</h3>
                  <div className="space-y-3">
                    {girlsTeamPerf.map((team, index) => (
                      <div key={team.school_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 font-bold">{index + 1}.</span>
                          <Link
                            href={`/schools/${team.school_id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            {team.school_short_name || team.school_name}
                          </Link>
                          <span className="text-sm text-zinc-500">({team.runner_count} runners)</span>
                        </div>
                        <div className="font-mono font-bold text-cyan-400">
                          {formatTime(team.average_time_cs)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <p className="text-sm text-zinc-400">
                Team performance is calculated as the average of the top 7 runners from each school on this course.
              </p>
            </div>
          </div>
        )}

        {/* Meets on this Course */}
        {meets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Meets on this Course</h2>

            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden border border-zinc-700">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-900/50">
                      <th className="py-4 px-6 text-left font-bold text-white">Date</th>
                      <th className="py-4 px-6 text-left font-bold text-white">Meet Name</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Season</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Type</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Races</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meets.map(meet => (
                      <tr key={meet.id} className="border-b border-zinc-700 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6 text-zinc-300">{formatDate(meet.meet_date)}</td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/meets/${meet.id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            {meet.name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-300">{meet.season_year}</td>
                        <td className="py-4 px-6 text-center text-zinc-400 capitalize">
                          {meet.meet_type || 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-300">{meet.race_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
