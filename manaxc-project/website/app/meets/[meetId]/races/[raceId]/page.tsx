// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime, calculatePace, formatPace } from '@/lib/utils/time'

interface Race {
  id: string
  name: string
  gender: string
  division: string | null
  distance_meters: number
  meet: {
    id: string
    name: string
    meet_date: string
    course: {
      name: string
      location: string | null
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

  useEffect(() => {
    loadRaceData()
  }, [raceId])

  const loadRaceData = async () => {
    try {
      setLoading(true)

      // Load race info
      const { data: raceData, error: raceError } = await supabase
        .from('races')
        .select(`
          id,
          name,
          gender,
          division,
          distance_meters,
          meet:meets!inner(
            id,
            name,
            meet_date,
            course:courses(
              name,
              location
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

      const isComplete = scorers.length >= 5 && scorers.every(s => s.place_overall)

      scores.push({
        school_id: schoolId,
        school_name: schoolResults[0].school.name,
        school_short_name: schoolResults[0].school.short_name,
        score: isComplete ? score : 0,
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

  const formatDistance = (meters: number) => {
    if (meters === 5000) return '5K'
    if (meters === 3000) return '3K'
    if (meters === 4000) return '4K'
    const miles = meters / 1609.34
    if (Math.abs(miles - 3) < 0.01) return '3 Miles'
    if (Math.abs(miles - 2) < 0.01) return '2 Miles'
    return `${miles.toFixed(2)} mi`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading race results...</div>
      </div>
    )
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Race not found</h1>
          <Link href="/meets" className="text-cyan-400 hover:text-cyan-300">
            Back to Meets
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
          <Link href="/meets" className="text-cyan-400 hover:text-cyan-300">
            Meets
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/meets/${meetId}`} className="text-cyan-400 hover:text-cyan-300">
            {race.meet.name}
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">{race.name}</span>
        </div>

        {/* Race Header */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-8 mb-8 border border-zinc-700">
          <h1 className="text-4xl font-bold text-white mb-4">{race.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-zinc-400 mb-1">Meet</div>
              <div className="text-white font-medium">{race.meet.name}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Date</div>
              <div className="text-white font-medium">{formatDate(race.meet.meet_date)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Distance</div>
              <div className="text-white font-medium">{formatDistance(race.distance_meters)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Runners</div>
              <div className="text-white font-medium">{results.length}</div>
            </div>
          </div>

          {race.meet.course && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <div className="text-sm text-zinc-400">Course</div>
              <div className="text-white font-medium">{race.meet.course.name}</div>
              {race.meet.course.location && (
                <div className="text-sm text-zinc-500">{race.meet.course.location}</div>
              )}
            </div>
          )}
        </div>

        {/* Team Standings */}
        {teamScores.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Team Standings</h2>

            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden border border-zinc-700">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-900/50">
                      <th className="py-4 px-6 text-left font-bold text-white">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-white">School</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Score</th>
                      <th className="py-4 px-6 text-left font-bold text-white">Top 5 Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamScores.map((team, index) => (
                      <tr
                        key={team.school_id}
                        className={`border-b border-zinc-700 ${
                          index === 0 && team.is_complete ? 'bg-yellow-900/20' : ''
                        } ${!team.is_complete ? 'opacity-60' : ''}`}
                      >
                        <td className="py-4 px-6 font-semibold text-white">
                          {team.is_complete ? index + 1 : '-'}
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/schools/${team.school_id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            {team.school_short_name || team.school_name}
                          </Link>
                          {!team.is_complete && (
                            <span className="ml-2 text-xs text-zinc-500">(Incomplete)</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-cyan-400">
                          {team.is_complete ? team.score : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-2">
                            {team.scorers.map((scorer, idx) => (
                              <span key={scorer.id} className="text-zinc-300">
                                {scorer.place_overall}
                                {idx < team.scorers.length - 1 ? ',' : ''}
                              </span>
                            ))}
                            {team.displacement_runners.length > 0 && (
                              <>
                                <span className="text-zinc-500">|</span>
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

            <div className="mt-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <p className="text-sm text-zinc-400">
                Team score is the sum of the top 5 finishers. Displacement runners (6th-7th) shown in parentheses.
              </p>
            </div>
          </div>
        )}

        {/* Individual Results */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Individual Results</h2>

          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden border border-zinc-700">
            {results.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-zinc-400 text-lg">No results found for this race</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-900/50">
                      <th className="py-4 px-6 text-center font-bold text-white">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-white">Athlete</th>
                      <th className="py-4 px-6 text-left font-bold text-white">School</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Grade</th>
                      <th className="py-4 px-6 text-right font-bold text-white">Time</th>
                      <th className="py-4 px-6 text-right font-bold text-white">Pace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr
                        key={result.id}
                        className="border-b border-zinc-700 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-4 px-6 text-center font-semibold text-white">
                          {result.place_overall || index + 1}
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/athletes/${result.athlete.id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            {result.athlete.name}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/schools/${result.school.id}`}
                            className="text-zinc-300 hover:text-cyan-300"
                          >
                            {result.school.short_name || result.school.name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center text-zinc-400 text-sm">
                          {getGradeLabel(result.athlete.grad_year)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-cyan-400">
                          {formatTime(result.time_cs)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-zinc-400 text-sm">
                          {formatPace(calculatePace(result.time_cs, race.distance_meters))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
