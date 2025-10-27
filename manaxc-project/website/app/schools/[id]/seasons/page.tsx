'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Season {
  year: number
  athlete_count: number
  boys_count: number
  girls_count: number
  race_count: number
  best_time_cs: number | null
}

export default function SchoolSeasonsPage() {
  const params = useParams()
  const schoolId = params.id as string

  const [school, setSchool] = useState<any>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSeasons()
  }, [schoolId])

  const loadSeasons = async () => {
    try {
      setLoading(true)

      const { data: schoolData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single()

      if (schoolData) setSchool(schoolData)

      const { data: resultsData } = await supabase
        .from('results')
        .select(`
          time_cs,
          race:races!inner(
            meet:meets!inner(
              season_year
            )
          ),
          athlete:athletes!inner(
            id,
            gender,
            school_id
          )
        `)
        .eq('athlete.school_id', schoolId)

      const byYear: { [year: number]: { athletes: Set<string>, boys: Set<string>, girls: Set<string>, times: number[], races: number } } = {}

      resultsData?.forEach((r: any) => {
        const year = r.race?.meet?.season_year
        if (!year) return

        if (!byYear[year]) {
          byYear[year] = { athletes: new Set(), boys: new Set(), girls: new Set(), times: [], races: 0 }
        }

        byYear[year].athletes.add(r.athlete.id)
        if (r.athlete.gender === 'M') byYear[year].boys.add(r.athlete.id)
        if (r.athlete.gender === 'F') byYear[year].girls.add(r.athlete.id)
        byYear[year].times.push(r.time_cs)
      })

      const processed: Season[] = Object.entries(byYear).map(([year, data]) => ({
        year: parseInt(year),
        athlete_count: data.athletes.size,
        boys_count: data.boys.size,
        girls_count: data.girls.size,
        race_count: data.times.length,
        best_time_cs: data.times.length > 0 ? Math.min(...data.times) : null
      })).sort((a, b) => b.year - a.year)

      setSeasons(processed)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center"><div className="text-white">Loading...</div></div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 text-sm">
          <Link href="/schools" className="text-cyan-400">Schools</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/schools/${schoolId}`} className="text-cyan-400">{school?.name}</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">Seasons</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-8">{school?.name} - Season History</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seasons.map(season => (
            <Link key={season.year} href={`/schools/${schoolId}/seasons/${season.year}`} className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700 hover:border-cyan-500 transition-all hover:shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-4">{season.year} Season</h2>
              <div className="space-y-2 text-zinc-300">
                <div className="flex justify-between"><span>Athletes:</span><span className="font-bold">{season.athlete_count}</span></div>
                <div className="flex justify-between"><span>Boys:</span><span className="text-blue-400 font-bold">{season.boys_count}</span></div>
                <div className="flex justify-between"><span>Girls:</span><span className="text-pink-400 font-bold">{season.girls_count}</span></div>
                <div className="flex justify-between"><span>Results:</span><span className="font-bold">{season.race_count}</span></div>
                {season.best_time_cs && (
                  <div className="flex justify-between pt-2 border-t border-zinc-700"><span>Best Time:</span><span className="text-cyan-400 font-mono font-bold">{formatTime(season.best_time_cs)}</span></div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
