// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime, calculatePace, formatPace, formatDistance as formatDistanceUtil } from '@/lib/utils/time'

interface Race {
  id: string
  name: string
  gender: string
  division: string | null
  distance_meters: number | null
  courses: {
    id: string
    name: string
    location: string | null
    distance_meters: number
  } | null
  meet: {
    id: string
    name: string
    meet_date: string
    venues: {
      name: string
      city: string | null
      state: string | null
    } | null
  }
}

interface Result {
  id: string
  time_cs: number
  place_overall: number | null
  place_gender: number | null
  place_team: number | null
  scored: boolean
  athlete: {
    id: string
    name: string
    grad_year: number
  }
  school: {
    id: string
    name: string
    short_name: string | null
  }
}

interface TeamScore {
  school_id: string
  school_name: string
  school_short_name: string | null
  score: number
  team_time_cs: number
  scorers: Result[]
  displacement_runners: Result[]
  is_complete: boolean
}

export default function RaceResultsPage() {
  const params = useParams()
  const meetId = params.meetId as string
  const raceId = params.raceId as string

  const [race, setRace] = useState<Race | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [teamScores, setTeamScores] = useState<TeamScore[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [jumpToPage, setJumpToPage] = useState<string>('')
  const RESULTS_PER_PAGE = 75

  useEffect(() => {
    loadRaceData()
  }, [raceId])

  const loadRaceData = async () => {
    try {
      setLoading(true)

      // Load race info with course and venue
      const { data: raceData, error: raceError } = await supabase
        .from('races')
        .select(`
          id,
          name,
          gender,
          division,
          distance_meters,
          courses (
            id,
            name,
            location,
            distance_meters
          ),
          meet:meets!inner(
            id,
            name,
            meet_date,
            venues (
              name,
              city,
              state
            )
          )
        `)
        .eq('id', raceId)
        .single()

      if (raceError) throw raceError
      setRace(raceData as Race)

      // Load all results for this race
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          place_overall,
          place_gender,
          place_team,
          scored,
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            school:schools!inner(
              id,
              name,
              short_name
            )
          )
        `)
        .eq('race_id', raceId)
        .order('time_cs', { ascending: true })

      if (resultsError) throw resultsError

      // Process results
      const processedResults: Result[] = resultsData?.map((r: any) => ({
        id: r.id,
        time_cs: r.time_cs,
        place_overall: r.place_overall,
        place_gender: r.place_gender,
        place_team: r.place_team,
        scored: r.scored ?? true,
        athlete: {
          id: r.athlete.id,
          name: r.athlete.name,
          grad_year: r.athlete.grad_year
        },
        school: {
          id: r.athlete.school.id,
          name: r.athlete.school.name,
          short_name: r.athlete.school.short_name
        }
      })) || []

      setResults(processedResults)

      // Calculate team scores
      calculateTeamScores(processedResults)
    } catch (error) {
      console.error('Error loading race:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTeamScores = (results: Result[]) => {
    // Group results by school
    const bySchool: { [schoolId: string]: Result[] } = {}

    results.forEach(result => {
      if (!bySchool[result.school.id]) {
        bySchool[result.school.id] = []
      }
      bySchool[result.school.id].push(result)
    })

    // Calculate scores for each school
    const scores: TeamScore[] = []

    Object.entries(bySchool).forEach(([schoolId, schoolResults]) => {
      // Sort by place (or time if no place)
      const sorted = [...schoolResults].sort((a, b) => {
        if (a.place_overall && b.place_overall) {
          return a.place_overall - b.place_overall
        }
        return a.time_cs - b.time_cs
      })

      // Top 5 are scorers, 6-7 are displacement runners
      const scorers = sorted.slice(0, 5)
      const displacement = sorted.slice(5, 7)

      // Calculate team score (sum of top 5 places)
      const score = scorers.reduce((sum, r) => sum + (r.place_overall || 0), 0)

      // Calculate team time (sum of top 5 times)
      const teamTime = scorers.reduce((sum, r) => sum + r.time_cs, 0)

      const isComplete = scorers.length >= 5 && scorers.every(s => s.place_overall)

      scores.push({
        school_id: schoolId,
        school_name: schoolResults[0].school.name,
        school_short_name: schoolResults[0].school.short_name,
        score: isComplete ? score : 0,
        team_time_cs: teamTime,
        scorers,
        displacement_runners: displacement,
        is_complete: isComplete
      })
    })

    // Sort by score (ascending - lowest score wins)
    const completeTeams = scores.filter(s => s.is_complete).sort((a, b) => a.score - b.score)
    const incompleteTeams = scores.filter(s => !s.is_complete)

    setTeamScores([...completeTeams, ...incompleteTeams])
  }

  const getGradeLabel = (gradYear: number) => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const seasonYear = currentMonth >= 7 ? currentYear + 1 : currentYear
    const grade = 12 - (gradYear - seasonYear)

    if (grade === 9) return 'FR'
    if (grade === 10) return 'SO'
    if (grade === 11) return 'JR'
    if (grade === 12) return 'SR'
    return `${grade}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get the actual distance - prefer race.distance_meters, fallback to course.distance_meters
  const getDistance = () => {
    return race?.distance_meters || race?.courses?.distance_meters || 5000
  }

  // Pagination
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE)
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE
  const endIndex = startIndex + RESULTS_PER_PAGE
  const currentResults = results.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading race results...</div>
      </div>
    )
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Race not found</h1>
          <Link href="/meets" className="text-cyan-600 hover:text-cyan-700 underline">
            Back to Meets
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/meets" className="text-cyan-600 hover:text-cyan-700 hover:underline">
            Meets
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <Link href={`/meets/${meetId}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
            {race.meet.name}
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700">{race.name}</span>
        </div>

        {/* Race Header */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8 border border-zinc-200">
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">{race.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-zinc-500 mb-1">Meet</div>
              <div className="text-zinc-900 font-medium">{race.meet.name}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-500 mb-1">Date</div>
              <div className="text-zinc-900 font-medium">{formatDate(race.meet.meet_date)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-500 mb-1">Distance</div>
              <div className="text-zinc-900 font-medium">{formatDistanceUtil(getDistance())}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-500 mb-1">Runners</div>
              <div className="text-zinc-900 font-medium">{results.length}</div>
            </div>
          </div>

          {(race.meet.venues || race.courses) && (
            <div className="mt-4 pt-4 border-t border-zinc-200 flex justify-between">
              {race.meet.venues && (
                <div>
                  <div className="text-sm text-zinc-500">Venue</div>
                  <div className="text-zinc-900 font-medium">{race.meet.venues.name}</div>
                  {(race.meet.venues.city || race.meet.venues.state) && (
                    <div className="text-sm text-zinc-600">
                      {[race.meet.venues.city, race.meet.venues.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              )}
              {race.courses && (
                <div className="text-right">
                  <div className="text-sm text-zinc-500">Course</div>
                  <Link
                    href={`/courses/${race.courses.id}`}
                    className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                  >
                    {race.courses.name}
                  </Link>
                  {race.courses.location && (
                    <div className="text-sm text-zinc-600">{race.courses.location}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team Standings */}
        {teamScores.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Team Standings</h2>

            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Score</th>
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Time</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Top 5 Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamScores.map((team, index) => (
                      <tr
                        key={team.school_id}
                        className={`border-b border-zinc-200 hover:bg-cyan-50 transition-colors ${
                          index === 0 && team.is_complete ? 'bg-yellow-50' : ''
                        } ${!team.is_complete ? 'opacity-60' : ''}`}
                      >
                        <td className="py-4 px-6 font-semibold text-zinc-900">
                          {team.is_complete ? index + 1 : '-'}
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/schools/${team.school_id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                          >
                            {team.school_short_name || team.school_name}
                          </Link>
                          {!team.is_complete && (
                            <span className="ml-2 text-xs text-zinc-500">(Incomplete)</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-cyan-600">
                          {team.is_complete ? team.score : 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-zinc-900">
                          {team.scorers.length >= 5 ? formatTime(team.team_time_cs) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-2">
                            {team.scorers.map((scorer, idx) => (
                              <span key={scorer.id} className="text-zinc-900">
                                {scorer.place_overall}
                                {idx < team.scorers.length - 1 ? ',' : ''}
                              </span>
                            ))}
                            {team.displacement_runners.length > 0 && (
                              <>
                                <span className="text-zinc-400">|</span>
                                {team.displacement_runners.map((runner, idx) => (
                                  <span key={runner.id} className="text-zinc-500 text-sm">
                                    ({runner.place_overall})
                                    {idx < team.displacement_runners.length - 1 ? ',' : ''}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-zinc-700">
                Team score is the sum of the top 5 finishers. Displacement runners (6th-7th) shown in parentheses.
              </p>
            </div>
          </div>
        )}

        {/* Individual Results */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Individual Results</h2>

          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
            {results.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-zinc-500 text-lg">No results found for this race</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Grade</th>
                      <th className="py-4 px-6 text-right font-bold text-zinc-900">Time</th>
                      <th className="py-4 px-6 text-right font-bold text-zinc-900">Pace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResults.map((result, index) => (
                      <tr
                        key={result.id}
                        className="border-b border-zinc-200 hover:bg-cyan-50 transition-colors"
                      >
                        <td className="py-4 px-6 text-center font-semibold text-zinc-900">
                          {result.place_overall || (startIndex + index + 1)}
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/athletes/${result.athlete.id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                          >
                            {result.athlete.name}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/schools/${result.school.id}`}
                            className="text-zinc-600 hover:text-cyan-600 hover:underline"
                          >
                            {result.school.short_name || result.school.name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-500 text-sm">
                          {getGradeLabel(result.athlete.grad_year)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-cyan-600">
                          {formatTime(result.time_cs)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-zinc-500 text-sm">
                          {formatPace(result.time_cs, getDistance())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Intelligent Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 bg-white rounded-xl shadow-xl border border-zinc-200 p-6">
            <div className="flex flex-col gap-4">
              {/* Primary Navigation */}
              <div className="flex flex-wrap justify-center items-center gap-2">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="First page"
                >
                  ««
                </button>

                {/* Back 5 */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 5))}
                  disabled={currentPage <= 5}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Back 5 pages"
                >
                  -5
                </button>

                {/* Previous */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (currentPage <= 4) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = currentPage - 3 + i
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          currentPage === pageNum
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                {/* Next */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Next
                </button>

                {/* Forward 5 */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 5))}
                  disabled={currentPage > totalPages - 5}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Forward 5 pages"
                >
                  +5
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Last page"
                >
                  »»
                </button>
              </div>

              {/* Jump to Page & Info */}
              <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-zinc-200">
                <div className="text-sm text-zinc-600">
                  Page <span className="font-semibold text-zinc-900">{currentPage}</span> of <span className="font-semibold text-zinc-900">{totalPages}</span>
                  <span className="mx-2">•</span>
                  Showing {startIndex + 1}-{Math.min(endIndex, results.length)} of <span className="font-semibold text-zinc-900">{results.length}</span> runners
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="jumpToPage" className="text-sm font-medium text-zinc-700">
                    Jump to page:
                  </label>
                  <input
                    id="jumpToPage"
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const page = parseInt(jumpToPage)
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page)
                          setJumpToPage('')
                        }
                      }
                    }}
                    placeholder={`1-${totalPages}`}
                    className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={() => {
                      const page = parseInt(jumpToPage)
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page)
                        setJumpToPage('')
                      }
                    }}
                    disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
