'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface AthleteRanking {
  athlete_id: string
  athlete_name: string
  gender: string
  grad_year: number
  season_pr: number | null
  top_3_average: number | null
  last_3_average: number | null
  race_count: number
  recent_races: { time_cs: number; date: string; meet_name: string }[]
}

export default function SchoolSeasonDetailPage() {
  const params = useParams()
  const schoolId = params.id as string
  const year = params.year as string

  const [school, setSchool] = useState<any>(null)
  const [boysRankings, setBoysRankings] = useState<AthleteRanking[]>([])
  const [girlsRankings, setGirlsRankings] = useState<AthleteRanking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSeasonData()
  }, [schoolId, year])

  const loadSeasonData = async () => {
    try {
      setLoading(true)

      const { data: schoolData } = await supabase.from('schools').select('*').eq('id', schoolId).single()
      if (schoolData) setSchool(schoolData)

      // Load all results for this school and season
      const { data: resultsData } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          place_overall,
          race:races!inner(
            name,
            gender,
            meet:meets!inner(
              name,
              meet_date,
              season_year
            )
          ),
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            gender,
            school_id
          )
        `)
        .eq('athlete.school_id', schoolId)
        .eq('race.meet.season_year', parseInt(year))
        .order('time_cs', { ascending: true })

      if (!resultsData) {
        setBoysRankings([])
        setGirlsRankings([])
        return
      }

      // Group results by athlete
      const athleteResults = new Map<string, {
        athlete: any
        times: { time_cs: number; date: string; meet_name: string }[]
      }>()

      resultsData.forEach((result: any) => {
        const athlete = result.athlete
        const meet = result.race?.meet

        if (!athlete || !meet) return

        if (!athleteResults.has(result.athlete.id)) {
          athleteResults.set(result.athlete.id, {
            athlete,
            times: []
          })
        }

        athleteResults.get(result.athlete.id)!.times.push({
          time_cs: result.time_cs,
          date: meet.meet_date,
          meet_name: meet.name
        })
      })

      // Calculate statistics for each athlete
      const rankings: AthleteRanking[] = []

      athleteResults.forEach(({ athlete, times }) => {
        if (times.length === 0) return

        // Sort by time (fastest first)
        times.sort((a, b) => a.time_cs - b.time_cs)

        const season_pr = times[0].time_cs

        // Top 3 average
        const top3Times = times.slice(0, Math.min(3, times.length))
        const top_3_average = top3Times.length > 0
          ? Math.round(top3Times.reduce((sum, t) => sum + t.time_cs, 0) / top3Times.length)
          : null

        // Last 3 average (most recent)
        const sortedByDate = [...times].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const last3Times = sortedByDate.slice(0, Math.min(3, sortedByDate.length))
        const last_3_average = last3Times.length > 0
          ? Math.round(last3Times.reduce((sum, t) => sum + t.time_cs, 0) / last3Times.length)
          : null

        const recent_races = sortedByDate.slice(0, 5).map(race => ({
          time_cs: race.time_cs,
          date: race.date,
          meet_name: race.meet_name
        }))

        rankings.push({
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          gender: athlete.gender,
          grad_year: athlete.grad_year,
          season_pr,
          top_3_average,
          last_3_average,
          race_count: times.length,
          recent_races
        })
      })

      // Separate boys and girls, sort by season PR
      const boys = rankings
        .filter(r => r.gender === 'M')
        .sort((a, b) => (a.season_pr || Infinity) - (b.season_pr || Infinity))

      const girls = rankings
        .filter(r => r.gender === 'F')
        .sort((a, b) => (a.season_pr || Infinity) - (b.season_pr || Infinity))

      setBoysRankings(boys)
      setGirlsRankings(girls)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeLabel = (gradYear: number, seasonYear: number) => {
    const grade = 12 - (gradYear - seasonYear)
    const labels: { [key: number]: string } = {
      9: 'FR',
      10: 'SO',
      11: 'JR',
      12: 'SR'
    }
    return labels[grade] || `Grade ${grade}`
  }

  const renderTeamTable = (athletes: AthleteRanking[], title: string, genderColor: string) => {
    if (athletes.length === 0) return null

    return (
      <div className="mb-8">
        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-700">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} with race data this season
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-900/50">
                  <th className="py-4 px-4 text-center font-bold text-white w-16">#</th>
                  <th className="py-4 px-6 text-left font-bold text-white">Athlete Name</th>
                  <th className="py-4 px-4 text-center font-bold text-white">Class</th>
                  <th className="py-4 px-6 text-right font-bold text-white">Season PR</th>
                  <th className="py-4 px-6 text-right font-bold text-white">Top 3 Avg</th>
                  <th className="py-4 px-6 text-right font-bold text-white">Last 3 Avg</th>
                  <th className="py-4 px-4 text-center font-bold text-white">Races</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((athlete, index) => {
                  const isVarsity = index < 7
                  return (
                    <tr
                      key={athlete.athlete_id}
                      className={`border-b border-zinc-700 hover:bg-zinc-800/30 ${
                        isVarsity ? 'bg-cyan-900/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-center">
                        <span className={`font-bold ${isVarsity ? 'text-cyan-400' : 'text-zinc-500'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/athletes/${athlete.athlete_id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          {athlete.athlete_name}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-zinc-300 text-sm">
                          {getGradeLabel(athlete.grad_year, parseInt(year))}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-mono font-bold text-cyan-400">
                          {athlete.season_pr ? formatTime(athlete.season_pr) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-mono text-zinc-300">
                          {athlete.top_3_average ? formatTime(athlete.top_3_average) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-mono text-zinc-300">
                          {athlete.last_3_average ? formatTime(athlete.last_3_average) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-300">
                        {athlete.race_count}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {athletes.length > 7 && (
            <div className="px-6 py-3 bg-zinc-900/30 border-t border-zinc-700">
              <p className="text-xs text-zinc-400">
                <span className="text-cyan-400 font-bold">Top 7</span> highlighted in cyan (5 score + 2 alternates for varsity team)
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-white">Loading season data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/schools" className="text-cyan-400 hover:text-cyan-300">
            Schools
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/schools/${schoolId}`} className="text-cyan-400 hover:text-cyan-300">
            {school?.name}
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/schools/${schoolId}/seasons`} className="text-cyan-400 hover:text-cyan-300">
            Seasons
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">{year}</span>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-bold text-white mb-2">
          {school?.name} - {year} Season
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          Team selection and performance rankings
        </p>

        {/* Team Selection Guide */}
        {(boysRankings.length > 0 || girlsRankings.length > 0) && (
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-300 mb-3">Team Selection Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-200">
              <div>
                <h4 className="font-medium mb-2">Performance Metrics:</h4>
                <ul className="space-y-1 text-blue-300">
                  <li>• <strong>Season PR:</strong> Fastest time this season</li>
                  <li>• <strong>Top 3 Average:</strong> Average of 3 fastest times</li>
                  <li>• <strong>Last 3 Average:</strong> Average of 3 most recent times</li>
                  <li>• <strong>Races:</strong> Number of races competed this season</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Team Selection:</h4>
                <ul className="space-y-1 text-blue-300">
                  <li>• <strong>Varsity Team:</strong> Top 7 runners (5 score + 2 alternates)</li>
                  <li>• <strong>Top 7 highlighted:</strong> Potential varsity lineup in cyan</li>
                  <li>• <strong>Consistency:</strong> Compare Top 3 Avg vs Last 3 Avg for form</li>
                  <li>• <strong>Experience:</strong> More races = better race readiness</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Boys Team Selection */}
        {renderTeamTable(boysRankings, 'Boys Varsity Team Selection', 'blue')}

        {/* Girls Team Selection */}
        {renderTeamTable(girlsRankings, 'Girls Varsity Team Selection', 'pink')}

        {/* No Data Message */}
        {boysRankings.length === 0 && girlsRankings.length === 0 && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-12 text-center">
            <div className="text-zinc-400 mb-4">No race data available for this season.</div>
            <div className="text-sm text-zinc-500">
              Results will appear here once races are added for the {year} season.
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href={`/schools/${schoolId}/seasons`}
            className="inline-block px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            ← Back to All Seasons
          </Link>
        </div>
      </div>
    </div>
  )
}
