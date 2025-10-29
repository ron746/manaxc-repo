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

  if (loading) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="text-xl font-semibold text-zinc-900">Loading...</div></div>

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/schools" className="text-blue-600 hover:text-blue-800 font-medium">Schools</Link>
          <span className="text-zinc-400 mx-2">/</span>
          <Link href={`/schools/${schoolId}`} className="text-blue-600 hover:text-blue-800 font-medium">{school?.name}</Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700 font-medium">All Results</span>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-8 tracking-tight">{school?.name} - All Results</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Season</label>
              <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} className="w-full px-4 py-2 bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Seasons</option>
                {seasons.map((s: any) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-900 mb-2">Gender</label>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full px-4 py-2 bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All</option>
                <option value="M">Boys</option>
                <option value="F">Girls</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setSeasonFilter('all'); setGenderFilter('all') }} className="w-full px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors">Clear Filters</button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-zinc-600 font-medium">Showing {filteredResults.length} of {results.length} results</div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-zinc-200 bg-zinc-50">
                  <th className="py-4 px-6 text-left font-bold text-zinc-900">Date</th>
                  <th className="py-4 px-6 text-left font-bold text-zinc-900">Meet</th>
                  <th className="py-4 px-6 text-left font-bold text-zinc-900">Course</th>
                  <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete</th>
                  <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                  <th className="py-4 px-6 text-right font-bold text-zinc-900">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result: any) => (
                  <tr key={result.id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-6 text-zinc-700">{new Date(result.race?.meet?.meet_date).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-zinc-700">{result.race?.meet?.name}</td>
                    <td className="py-4 px-6 text-zinc-600 text-sm">{result.race?.meet?.course?.name || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <Link href={`/athletes/${result.athlete.id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">{result.athlete.name}</Link>
                    </td>
                    <td className="py-4 px-6 text-center text-zinc-700">{result.place_overall || '-'}</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-blue-600">{formatTime(result.time_cs)}</td>
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
