'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Meet {
  id: string
  name: string
  meet_date: string
  season_year: number
  meet_type: string | null
  venue: {
    name: string
    city: string | null
    state: string | null
  } | null
}

interface Race {
  id: string
  name: string
  gender: string
  division: string | null
  distance_meters: number
  result_count: number
  winning_time_cs: number | null
  winning_athlete: string | null
  course_difficulty: number | null
}

interface TopPerformance {
  athlete_name: string
  athlete_id: string
  school_name: string
  school_id: string
  time_cs: number
  normalized_time_cs: number
  race_name: string
  course_difficulty: number | null
}

interface TeamScore {
  school_id: string
  school_name: string
  score: number
  scorers: number
}

export default function MeetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const meetId = params.meetId as string

  const [meet, setMeet] = useState<Meet | null>(null)
  const [races, setRaces] = useState<Race[]>([])
  const [topBoys, setTopBoys] = useState<TopPerformance | null>(null)
  const [topGirls, setTopGirls] = useState<TopPerformance | null>(null)
  const [boysTeamWinner, setBoysTeamWinner] = useState<TeamScore | null>(null)
  const [girlsTeamWinner, setGirlsTeamWinner] = useState<TeamScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMeetData()
  }, [meetId])

  const loadMeetData = async () => {
    try {
      setLoading(true)

      // Load meet info
      const { data: meetData, error: meetError } = await supabase
        .from('meets')
        .select(`
          id,
          name,
          meet_date,
          season_year,
          meet_type,
          venue:venues(
            name,
            city,
            state
          )
        `)
        .eq('id', meetId)
        .single()

      if (meetError) throw meetError
      setMeet(meetData as any) // TODO: Fix type mismatch

      // Load races with complete result data including course difficulty
      const { data: racesData, error: racesError } = await supabase
        .from('races')
        .select(`
          id,
          name,
          gender,
          division,
          distance_meters,
          courses (
            difficulty_rating
          ),
          results(
            id,
            time_cs,
            place_overall,
            athlete:athletes(
              id,
              name,
              school:schools(
                id,
                name
              )
            )
          )
        `)
        .eq('meet_id', meetId)
        .order('name', { ascending: true })

      if (racesError) throw racesError

      // Process races and calculate normalized performances
      const processedRaces: Race[] = []
      const boysPerformances: TopPerformance[] = []
      const girlsPerformances: TopPerformance[] = []

      racesData?.forEach(race => {
        const results = race.results || []
        const courseDifficulty = (race.courses as any)?.difficulty_rating || 5.0
        const sortedResults = [...results].sort((a, b) => (a.place_overall || 999) - (b.place_overall || 999))
        const winner = sortedResults[0]

        processedRaces.push({
          id: race.id,
          name: race.name,
          gender: race.gender,
          division: race.division,
          distance_meters: race.distance_meters,
          result_count: results.length,
          winning_time_cs: winner?.time_cs || null,
          winning_athlete: (winner?.athlete as any)?.name || null,
          course_difficulty: courseDifficulty
        })

        // Calculate normalized times and track performances
        results.forEach((result: any) => {
          if (!result.time_cs || !result.athlete) return

          // Normalize time based on difficulty (baseline 5.0)
          // Higher difficulty = slower times, so we adjust down for harder courses
          const difficultyAdjustment = (courseDifficulty - 5.0) * 0.02 // 2% per difficulty point
          const normalizedTime = Math.round(result.time_cs * (1 - difficultyAdjustment))

          const performance: TopPerformance = {
            athlete_name: result.athlete.name,
            athlete_id: result.athlete.id,
            school_name: result.athlete.school?.name || 'Unknown',
            school_id: result.athlete.school?.id || '',
            time_cs: result.time_cs,
            normalized_time_cs: normalizedTime,
            race_name: race.name,
            course_difficulty: courseDifficulty
          }

          if (race.gender === 'M') {
            boysPerformances.push(performance)
          } else if (race.gender === 'F') {
            girlsPerformances.push(performance)
          }
        })
      })

      // Find top performers
      if (boysPerformances.length > 0) {
        boysPerformances.sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)
        setTopBoys(boysPerformances[0])
      }

      if (girlsPerformances.length > 0) {
        girlsPerformances.sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)
        setTopGirls(girlsPerformances[0])
      }

      // Calculate team winners using proper XC scoring
      const calculateTeamWinner = (performances: TopPerformance[]) => {
        if (performances.length === 0) return null

        // Sort all performances by normalized time to get overall placing
        const sortedPerformances = [...performances].sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)

        // Assign places (1st, 2nd, 3rd, etc.)
        const performancesWithPlace = sortedPerformances.map((perf, index) => ({
          ...perf,
          place: index + 1
        }))

        // Group by school
        const bySchool = new Map<string, typeof performancesWithPlace[0][]>()
        performancesWithPlace.forEach(perf => {
          if (!bySchool.has(perf.school_id)) {
            bySchool.set(perf.school_id, [])
          }
          bySchool.get(perf.school_id)!.push(perf)
        })

        // Calculate scores for teams with 5+ runners
        const teamScores: (TeamScore & { sixthPlace?: number })[] = []
        bySchool.forEach((runners, schoolId) => {
          if (runners.length < 5) return // Need at least 5 runners to score

          // Sort runners by place
          const sorted = [...runners].sort((a, b) => a.place - b.place)

          // Top 5 are scorers
          const top5 = sorted.slice(0, 5)
          const score = top5.reduce((sum, r) => sum + r.place, 0)

          // 6th and 7th are displacers (don't add to score but help in tiebreakers)
          const sixthRunner = sorted[5]

          teamScores.push({
            school_id: schoolId,
            school_name: runners[0].school_name,
            score,
            scorers: 5,
            sixthPlace: sixthRunner?.place
          })
        })

        if (teamScores.length === 0) return null

        // Sort by score (lowest wins), then by 6th runner place (tiebreaker)
        teamScores.sort((a, b) => {
          if (a.score !== b.score) {
            return a.score - b.score
          }
          // Tiebreaker: better (lower) 6th place wins
          if (a.sixthPlace !== undefined && b.sixthPlace !== undefined) {
            return a.sixthPlace - b.sixthPlace
          }
          // If one team has 6th runner and other doesn't, team with 6th wins
          if (a.sixthPlace !== undefined) return -1
          if (b.sixthPlace !== undefined) return 1
          return 0
        })

        return teamScores[0]
      }

      setBoysTeamWinner(calculateTeamWinner(boysPerformances))
      setGirlsTeamWinner(calculateTeamWinner(girlsPerformances))
      setRaces(processedRaces)
    } catch (error) {
      console.error('Error loading meet:', error)
    } finally {
      setLoading(false)
    }
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

  const formatMeetType = (type: string | null) => {
    if (!type) return 'N/A'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatDistance = (meters: number) => {
    if (meters === 5000) return '5K'
    if (meters === 3000) return '3K'
    if (meters === 4000) return '4K'
    const miles = meters / 1609.34
    if (miles === 3) return '3 Miles'
    if (miles === 2) return '2 Miles'
    return `${miles.toFixed(2)} mi`
  }

  const getGenderBadgeColor = (gender: string) => {
    if (gender === 'M') return 'bg-blue-600'
    if (gender === 'F') return 'bg-pink-600'
    return 'bg-zinc-600'
  }

  const getGenderLabel = (gender: string) => {
    if (gender === 'M') return 'Boys'
    if (gender === 'F') return 'Girls'
    return 'Mixed'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading meet...</div>
      </div>
    )
  }

  if (!meet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Meet not found</h1>
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
          <span className="text-zinc-300">{meet.name}</span>
        </div>

        {/* Meet Header */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-8 mb-8 border border-zinc-700">
          <h1 className="text-4xl font-bold text-white mb-2">{meet.name}</h1>
          <div className="text-lg text-zinc-300 mb-6">{formatDate(meet.meet_date)}</div>

          {/* Inline stats below date */}
          <div className="flex flex-wrap gap-6 text-sm mb-6">
            <div>
              <span className="text-zinc-400">Season:</span>{' '}
              <span className="text-white font-medium">{meet.season_year}</span>
            </div>
            <div>
              <span className="text-zinc-400">Type:</span>{' '}
              <span className="text-white font-medium">{formatMeetType(meet.meet_type)}</span>
            </div>
            <div>
              <span className="text-zinc-400">Total Races:</span>{' '}
              <span className="text-white font-medium">{races.length}</span>
            </div>
            <div>
              <span className="text-zinc-400">Total Participants:</span>{' '}
              <span className="text-white font-medium">
                {races.reduce((sum, race) => sum + race.result_count, 0)}
              </span>
            </div>
          </div>

          {/* Venue */}
          <div>
            <div className="text-sm text-zinc-400 mb-1">Venue</div>
            {meet.venue ? (
              <div>
                <div className="text-white font-medium">{meet.venue.name}</div>
                {(meet.venue.city || meet.venue.state) && (
                  <div className="text-sm text-zinc-500">
                    {[meet.venue.city, meet.venue.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-500">N/A</div>
            )}
          </div>
        </div>

        {/* Top Performances Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top Boys Performance */}
          <div className="bg-gradient-to-br from-blue-900/30 to-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-blue-700/50">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Top Performance - Boys</h2>
            {topBoys ? (
              <div>
                <div className="text-sm text-zinc-400 mb-1">Winning Time</div>
                <div className="text-4xl font-bold text-white mb-4">{formatTime(topBoys.time_cs)}</div>

                <Link
                  href={`/athletes/${topBoys.athlete_id}`}
                  className="text-xl text-cyan-400 hover:text-cyan-300 font-semibold block mb-1"
                >
                  {topBoys.athlete_name}
                </Link>

                <Link
                  href={`/schools/${topBoys.school_id}`}
                  className="text-zinc-300 hover:text-zinc-200 block mb-3"
                >
                  {topBoys.school_name}
                </Link>

                <div className="text-sm text-zinc-400 mb-1">
                  {topBoys.race_name}
                  {topBoys.course_difficulty && (
                    <span className="ml-2 text-zinc-500">
                      (Difficulty: {topBoys.course_difficulty.toFixed(1)}/10)
                    </span>
                  )}
                </div>

                {boysTeamWinner && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="text-sm text-zinc-400 mb-1">Team Winner</div>
                    <div className="text-lg font-bold text-blue-400">{boysTeamWinner.score} points</div>
                    <Link
                      href={`/schools/${boysTeamWinner.school_id}`}
                      className="text-white hover:text-cyan-400"
                    >
                      {boysTeamWinner.school_name}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-500">No boys races at this meet</div>
            )}
          </div>

          {/* Top Girls Performance */}
          <div className="bg-gradient-to-br from-pink-900/30 to-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-pink-700/50">
            <h2 className="text-xl font-bold text-pink-400 mb-4">Top Performance - Girls</h2>
            {topGirls ? (
              <div>
                <div className="text-sm text-zinc-400 mb-1">Winning Time</div>
                <div className="text-4xl font-bold text-white mb-4">{formatTime(topGirls.time_cs)}</div>

                <Link
                  href={`/athletes/${topGirls.athlete_id}`}
                  className="text-xl text-cyan-400 hover:text-cyan-300 font-semibold block mb-1"
                >
                  {topGirls.athlete_name}
                </Link>

                <Link
                  href={`/schools/${topGirls.school_id}`}
                  className="text-zinc-300 hover:text-zinc-200 block mb-3"
                >
                  {topGirls.school_name}
                </Link>

                <div className="text-sm text-zinc-400 mb-1">
                  {topGirls.race_name}
                  {topGirls.course_difficulty && (
                    <span className="ml-2 text-zinc-500">
                      (Difficulty: {topGirls.course_difficulty.toFixed(1)}/10)
                    </span>
                  )}
                </div>

                {girlsTeamWinner && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="text-sm text-zinc-400 mb-1">Team Winner</div>
                    <div className="text-lg font-bold text-pink-400">{girlsTeamWinner.score} points</div>
                    <Link
                      href={`/schools/${girlsTeamWinner.school_id}`}
                      className="text-white hover:text-cyan-400"
                    >
                      {girlsTeamWinner.school_name}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-500">No girls races at this meet</div>
            )}
          </div>
        </div>

        {/* Races Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Races</h2>
        </div>

        {races.length === 0 ? (
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-12 text-center border border-zinc-700">
            <p className="text-zinc-400 text-lg">No races found for this meet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {races.map((race) => (
              <Link
                key={race.id}
                href={`/meets/${meetId}/races/${race.id}`}
                className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700 hover:border-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/20 group"
              >
                {/* Race Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {race.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getGenderBadgeColor(race.gender)}`}>
                      {getGenderLabel(race.gender)}
                    </span>
                  </div>
                  {race.division && (
                    <div className="text-sm text-zinc-400">{race.division}</div>
                  )}
                </div>

                {/* Race Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Distance</span>
                    <span className="text-white font-medium">{formatDistance(race.distance_meters)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Participants</span>
                    <span className="text-white font-medium">{race.result_count}</span>
                  </div>

                  {race.winning_time_cs && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Winning Time</span>
                        <span className="text-cyan-400 font-bold">{formatTime(race.winning_time_cs)}</span>
                      </div>

                      {race.winning_athlete && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 text-sm">Winner</span>
                          <span className="text-white font-medium text-sm">{race.winning_athlete}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* View Results Link */}
                <div className="mt-4 pt-4 border-t border-zinc-700">
                  <span className="text-cyan-400 group-hover:text-cyan-300 text-sm font-medium">
                    View Results →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
