'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Athlete {
  id: string
  name: string
  grad_year: number
  gender: 'M' | 'F'
  school: {
    id: string
    name: string
    city?: string
    state?: string
  } | null
}

interface Result {
  id: string
  time_cs: number
  normalized_time_cs: number | null
  place_overall: number | null
  meet_id: string
  race_id: string
  race: {
    id: string
    name: string
    gender: string
    course: {
      id: string
      name: string
      distance_meters: number
      difficulty_rating: number
    } | null
    meet: {
      id: string
      name: string
      meet_date: string
      season_year: number
    }
  }
}

interface CoursePR {
  course_id: string
  course_name: string
  difficulty: number
  distance: number
  best_time_cs: number
  normalized_time_cs: number | null
  meet_name: string
  meet_date: string
  meet_id: string
  race_id: string
}

export default function AthleteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = params.id as string

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAthleteData()
  }, [athleteId])

  const loadAthleteData = async () => {
    try {
      setLoading(true)

      // Load athlete info
      const { data: athleteData } = await supabase
        .from('athletes')
        .select(`
          id,
          name,
          grad_year,
          gender,
          school:schools(id, name, city, state)
        `)
        .eq('id', athleteId)
        .single()

      if (athleteData) {
        setAthlete(athleteData as any)
      }

      // Load all results with normalized times
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          normalized_time_cs,
          place_overall,
          meet_id,
          race_id,
          race:races!inner(
            id,
            name,
            gender,
            course:courses(
              id,
              name,
              distance_meters,
              difficulty_rating
            ),
            meet:meets!inner(
              id,
              name,
              meet_date,
              season_year
            )
          )
        `)
        .eq('athlete_id', athleteId)

      if (resultsError) {
        console.error('Error loading results:', resultsError)
      }

      if (resultsData) {
        // Sort by meet date descending (most recent first)
        const sortedResults = (resultsData as any[]).sort((a, b) => {
          const dateA = new Date(a.race.meet.meet_date).getTime()
          const dateB = new Date(b.race.meet.meet_date).getTime()
          return dateB - dateA
        })
        setResults(sortedResults)
      }
    } catch (error) {
      console.error('Error loading athlete:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate career stats
  const careerStats = useMemo(() => {
    if (results.length === 0) return null

    const allTimes = results.map(r => r.time_cs)
    const allNormalizedTimes = results
      .map(r => r.normalized_time_cs)
      .filter((t): t is number => t !== null)

    const bestTime = Math.min(...allTimes)
    const bestNormalizedTime = allNormalizedTimes.length > 0 ? Math.min(...allNormalizedTimes) : null
    const avgTime = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)

    const seasons = Array.from(new Set(results.map(r => r.race.meet.season_year))).sort((a, b) => b - a)

    return {
      totalRaces: results.length,
      bestTime,
      bestNormalizedTime,
      avgTime,
      seasons
    }
  }, [results])

  // Course PRs - best time on each course with normalized time
  const coursePRs = useMemo((): CoursePR[] => {
    const courseMap = new Map<string, CoursePR>()

    results.forEach(result => {
      if (!result.race.course) return

      const courseId = result.race.course.id
      const existing = courseMap.get(courseId)

      if (!existing || result.time_cs < existing.best_time_cs) {
        courseMap.set(courseId, {
          course_id: courseId,
          course_name: result.race.course.name,
          difficulty: result.race.course.difficulty_rating,
          distance: result.race.course.distance_meters,
          best_time_cs: result.time_cs,
          normalized_time_cs: result.normalized_time_cs,
          meet_name: result.race.meet.name,
          meet_date: result.race.meet.meet_date,
          meet_id: result.meet_id,
          race_id: result.race_id
        })
      }
    })

    return Array.from(courseMap.values()).sort((a, b) => {
      // Sort by normalized time if available, otherwise by actual time
      const aTime = a.normalized_time_cs || a.best_time_cs
      const bTime = b.normalized_time_cs || b.best_time_cs
      return aTime - bTime
    })
  }, [results])

  // Season progression - group by season
  const seasonStats = useMemo(() => {
    const seasons = Array.from(new Set(results.map(r => r.race.meet.season_year))).sort((a, b) => b - a)

    return seasons.map(season => {
      const seasonResults = results.filter(r => r.race.meet.season_year === season)
      const times = seasonResults.map(r => r.time_cs)
      const normalizedTimes = seasonResults
        .map(r => r.normalized_time_cs)
        .filter((t): t is number => t !== null)

      return {
        season,
        races: seasonResults.length,
        bestTime: Math.min(...times),
        bestNormalizedTime: normalizedTimes.length > 0 ? Math.min(...normalizedTimes) : null,
        avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      }
    })
  }, [results])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-600">Loading athlete data...</div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-700 mb-4 font-medium">Athlete not found</p>
          <button onClick={() => router.push('/athletes')} className="text-blue-600 hover:text-blue-800 font-medium">
            Back to Athletes
          </button>
        </div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const academicYear = new Date().getMonth() >= 7 ? currentYear : currentYear - 1
  const grade = 12 - (athlete.grad_year - academicYear - 1)
  const gradeLabels: { [key: number]: string } = {
    9: 'Freshman',
    10: 'Sophomore',
    11: 'Junior',
    12: 'Senior'
  }
  const gradeLabel = gradeLabels[grade] || `Grade ${grade}`

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/athletes" className="text-blue-600 hover:text-blue-800 font-medium">
            Athletes
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700 font-medium">{athlete.name}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-3 tracking-tight">
            {athlete.name}
          </h1>
          <div className="flex flex-wrap gap-3 items-center text-zinc-700">
            <span className={`px-3 py-1 rounded-lg font-medium text-sm ${
              athlete.gender === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
            }`}>
              {athlete.gender === 'M' ? 'Boys' : 'Girls'}
            </span>
            <span className="font-medium">{gradeLabel}</span>
            <span className="text-zinc-500">•</span>
            <span>Class of {athlete.grad_year}</span>
            {athlete.school && (
              <>
                <span className="text-zinc-500">•</span>
                <Link href={`/schools/${athlete.school.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                  {athlete.school.name}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Career Stats */}
        {careerStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-zinc-600 mb-2">TOTAL RACES</h3>
              <p className="text-3xl font-bold text-zinc-900">{careerStats.totalRaces}</p>
            </div>
            <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-zinc-600 mb-2">CAREER BEST TIME</h3>
              <p className="text-3xl font-bold text-zinc-900">{formatTime(careerStats.bestTime)}</p>
            </div>
            <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-zinc-600 mb-2">BEST NORMALIZED TIME</h3>
              <p className="text-3xl font-bold text-green-700">
                {careerStats.bestNormalizedTime ? formatTime(careerStats.bestNormalizedTime) : 'N/A'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Difficulty-adjusted per-mile pace</p>
            </div>
            <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-zinc-600 mb-2">AVERAGE TIME</h3>
              <p className="text-3xl font-bold text-zinc-900">{formatTime(careerStats.avgTime)}</p>
            </div>
          </div>
        )}

        {/* Course PRs and Season Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Course PRs */}
          <div className="bg-white rounded-lg border-2 border-zinc-300 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-zinc-300 bg-zinc-50">
              <h2 className="text-2xl font-bold text-zinc-900">Course PRs</h2>
              <p className="text-sm text-zinc-600 mt-1">Best times on each course</p>
            </div>
            <div className="p-6">
              {coursePRs.length === 0 ? (
                <p className="text-zinc-500">No race results yet</p>
              ) : (
                <div className="space-y-4">
                  {coursePRs.map((pr) => (
                    <div key={pr.course_id} className="border-b border-zinc-200 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <Link
                            href={`/courses/${pr.course_id}`}
                            className="font-bold text-zinc-900 hover:text-blue-600"
                          >
                            {pr.course_name}
                          </Link>
                          <div className="flex gap-3 text-xs text-zinc-600 mt-1">
                            <span>Difficulty: {pr.difficulty.toFixed(2)}</span>
                            <span>•</span>
                            <span>{(pr.distance / 1609.34).toFixed(2)} mi</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Link
                            href={`/meets/${pr.meet_id}/races/${pr.race_id}`}
                            className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {formatTime(pr.best_time_cs)}
                          </Link>
                          {pr.normalized_time_cs && (
                            <div className="text-sm font-medium text-green-700">
                              {formatTime(pr.normalized_time_cs)} norm
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-600">
                        {pr.meet_name} • {new Date(pr.meet_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Season Progression */}
          <div className="bg-white rounded-lg border-2 border-zinc-300 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-zinc-300 bg-zinc-50">
              <h2 className="text-2xl font-bold text-zinc-900">Season Progression</h2>
              <p className="text-sm text-zinc-600 mt-1">Performance by season</p>
            </div>
            <div className="p-6">
              {seasonStats.length === 0 ? (
                <p className="text-zinc-500">No race results yet</p>
              ) : (
                <div className="space-y-4">
                  {seasonStats.map((season) => (
                    <div key={season.season} className="border-b border-zinc-200 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-zinc-900 text-lg">{season.season} Season</h3>
                          <p className="text-sm text-zinc-600">{season.races} races</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-zinc-900">{formatTime(season.bestTime)}</div>
                          {season.bestNormalizedTime && (
                            <div className="text-sm font-medium text-green-700">
                              {formatTime(season.bestNormalizedTime)} norm
                            </div>
                          )}
                          <div className="text-sm text-zinc-600">
                            Avg: {formatTime(season.avgTime)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Race History */}
        <div className="bg-white rounded-lg border-2 border-zinc-300 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-zinc-300 bg-zinc-50">
            <h2 className="text-2xl font-bold text-zinc-900">Race History</h2>
            <p className="text-sm text-zinc-600 mt-1">All race results</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-zinc-300 bg-zinc-100">
                  <th className="py-4 px-4 text-left font-bold text-zinc-900">Date</th>
                  <th className="py-4 px-6 text-left font-bold text-zinc-900">Meet</th>
                  <th className="py-4 px-6 text-left font-bold text-zinc-900">Course</th>
                  <th className="py-4 px-4 text-center font-bold text-zinc-900">Difficulty</th>
                  <th className="py-4 px-6 text-right font-bold text-zinc-900">Time</th>
                  <th className="py-4 px-6 text-right font-bold text-zinc-900">Normalized</th>
                  <th className="py-4 px-4 text-center font-bold text-zinc-900">Place</th>
                  <th className="py-4 px-4 text-center font-bold text-zinc-900">Season</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-zinc-500">
                      No race results found
                    </td>
                  </tr>
                ) : (
                  results.map((result) => (
                    <tr key={result.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                      <td className="py-4 px-4 text-zinc-700">
                        {new Date(result.race.meet.meet_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/meets/${result.meet_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {result.race.meet.name}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        {result.race.course ? (
                          <Link
                            href={`/courses/${result.race.course.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                          >
                            {result.race.course.name}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">Unknown</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-700">
                        {result.race.course ? result.race.course.difficulty_rating.toFixed(2) : '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/meets/${result.meet_id}/races/${result.race_id}`}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {formatTime(result.time_cs)}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-green-700">
                        {result.normalized_time_cs ? formatTime(result.normalized_time_cs) : '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-700">
                        {result.place_overall || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-700">
                        {result.race.meet.season_year}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href="/athletes"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ← Back to All Athletes
          </Link>
        </div>
      </div>
    </div>
  )
}
