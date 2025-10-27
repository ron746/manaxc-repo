'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

export default function SchoolAllResultsPage() {
  const params = useParams()
  const schoolId = params.id as string

  const [school, setSchool] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')

  useEffect(() => {
    loadResults()
  }, [schoolId])

  const loadResults = async () => {
    try {
      setLoading(true)

      const { data: schoolData } = await supabase.from('schools').select('*').eq('id', schoolId).single()
      if (schoolData) setSchool(schoolData)

      let query = supabase
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
              season_year,
              course:courses(name)
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
        .order('race.meet.meet_date', { ascending: false })
        .limit(500)

      const { data } = await query
      setResults(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = results.filter(r => {
    if (seasonFilter !== 'all' && r.race?.meet?.season_year?.toString() !== seasonFilter) return false
    if (genderFilter !== 'all' && r.athlete?.gender !== genderFilter) return false
    return true
  })

  const seasons = Array.from(new Set(results.map(r => r.race?.meet?.season_year).filter(Boolean))).sort((a: any, b: any) => b - a)

  if (loading) return <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center"><div className="text-white">Loading...</div></div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 text-sm">
          <Link href="/schools" className="text-cyan-400">Schools</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/schools/${schoolId}`} className="text-cyan-400">{school?.name}</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">All Results</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-8">{school?.name} - All Results</h1>

        <div className="bg-zinc-800/50 rounded-lg p-6 mb-6 border border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Season</label>
              <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white">
                <option value="all">All Seasons</option>
                {seasons.map((s: any) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Gender</label>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white">
                <option value="all">All</option>
                <option value="M">Boys</option>
                <option value="F">Girls</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setSeasonFilter('all'); setGenderFilter('all') }} className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg">Clear Filters</button>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-zinc-400">Showing {filteredResults.length} of {results.length} results</div>

        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-900/50">
                  <th className="py-4 px-6 text-left font-bold text-white">Date</th>
                  <th className="py-4 px-6 text-left font-bold text-white">Meet</th>
                  <th className="py-4 px-6 text-left font-bold text-white">Course</th>
                  <th className="py-4 px-6 text-left font-bold text-white">Athlete</th>
                  <th className="py-4 px-6 text-center font-bold text-white">Place</th>
                  <th className="py-4 px-6 text-right font-bold text-white">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result: any) => (
                  <tr key={result.id} className="border-b border-zinc-700 hover:bg-zinc-800/30">
                    <td className="py-4 px-6 text-zinc-300">{new Date(result.race?.meet?.meet_date).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-zinc-300">{result.race?.meet?.name}</td>
                    <td className="py-4 px-6 text-zinc-400 text-sm">{result.race?.meet?.course?.name || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <Link href={`/athletes/${result.athlete.id}`} className="text-cyan-400 hover:text-cyan-300">{result.athlete.name}</Link>
                    </td>
                    <td className="py-4 px-6 text-center text-zinc-300">{result.place_overall || '-'}</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-cyan-400">{formatTime(result.time_cs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
