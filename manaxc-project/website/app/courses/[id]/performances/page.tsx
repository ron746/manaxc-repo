'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Performance {
  id: string
  time_cs: number
  place_overall: number | null
  athlete_id: string
  athlete_name: string
  athlete_grad_year: number
  school_id: string
  school_name: string
  meet_date: string
}

export default function CoursePerformancesPage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<any>(null)
  const [performances, setPerformances] = useState<Performance[]>([])
  const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPerformances()
  }, [courseId, selectedGender])

  const loadPerformances = async () => {
    try {
      setLoading(true)

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (courseData) setCourse(courseData)

      const { data: resultsData } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          place_overall,
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            gender,
            school:schools!inner(id, name)
          ),
          race:races!inner(
            course_id,
            meet:meets!inner(
              meet_date
            )
          )
        `)
        .eq('race.course_id', courseId)
        .eq('athlete.gender', selectedGender)
        .order('time_cs', { ascending: true })
        .limit(50)

      const processed: Performance[] = resultsData?.map((r: any) => ({
        id: r.id,
        time_cs: r.time_cs,
        place_overall: r.place_overall,
        athlete_id: r.athlete.id,
        athlete_name: r.athlete.name,
        athlete_grad_year: r.athlete.grad_year,
        school_id: r.athlete.school.id,
        school_name: r.athlete.school.name,
        meet_date: r.race?.meet?.meet_date || ''
      })) || []

      setPerformances(processed)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeLabel = (gradYear: number) => {
    const currentYear = new Date().getFullYear()
    const grade = 12 - (gradYear - currentYear - 1)
    if (grade === 9) return 'FR'
    if (grade === 10) return 'SO'
    if (grade === 11) return 'JR'
    if (grade === 12) return 'SR'
    return ''
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center"><div className="text-xl text-white">Loading...</div></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 text-sm">
          <Link href="/courses" className="text-cyan-400">Courses</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/courses/${courseId}`} className="text-cyan-400">{course?.name}</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">Top Performances</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-8">Top 50 Performances - {course?.name}</h1>

        <div className="flex gap-4 mb-8">
          <button onClick={() => setSelectedGender('M')} className={`px-8 py-3 rounded-lg font-semibold ${selectedGender === 'M' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>Boys</button>
          <button onClick={() => setSelectedGender('F')} className={`px-8 py-3 rounded-lg font-semibold ${selectedGender === 'F' ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>Girls</button>
        </div>

        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-900/50">
                <th className="py-4 px-6 text-center font-bold text-white">Rank</th>
                <th className="py-4 px-6 text-left font-bold text-white">Time</th>
                <th className="py-4 px-6 text-left font-bold text-white">Athlete</th>
                <th className="py-4 px-6 text-left font-bold text-white">School</th>
                <th className="py-4 px-6 text-center font-bold text-white">Grade</th>
              </tr>
            </thead>
            <tbody>
              {performances.map((perf, index) => (
                <tr key={perf.id} className="border-b border-zinc-700 hover:bg-zinc-800/30">
                  <td className="py-4 px-6 text-center font-bold text-zinc-400">{index + 1}</td>
                  <td className="py-4 px-6 font-mono font-bold text-cyan-400">{formatTime(perf.time_cs)}</td>
                  <td className="py-4 px-6">
                    <Link href={`/athletes/${perf.athlete_id}`} className="text-cyan-400 hover:text-cyan-300">{perf.athlete_name}</Link>
                  </td>
                  <td className="py-4 px-6">
                    <Link href={`/schools/${perf.school_id}`} className="text-zinc-300 hover:text-cyan-300">{perf.school_name}</Link>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-400">{getGradeLabel(perf.athlete_grad_year)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
