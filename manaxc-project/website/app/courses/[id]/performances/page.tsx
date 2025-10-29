'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Performance {
  id: string
  time_cs: number
  athlete_id: string
  athlete_name: string
  athlete_grad_year: number
  school_id: string
  school_name: string
  meet_date: string
  meet_name: string
  meet_id: string
  race_id: string
  result_id: string
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

      // Load from optimized course_records table (top 100 per gender, we only need 50)
      const { data: courseRecordsData } = await supabase
        .from('course_records')
        .select('*')
        .eq('course_id', courseId)
        .eq('gender', selectedGender)
        .order('rank', { ascending: true })
        .limit(50)

      const processed: Performance[] = courseRecordsData?.map((r: any) => ({
        id: r.result_id,
        time_cs: r.time_cs,
        athlete_id: r.athlete_id,
        athlete_name: r.athlete_name,
        athlete_grad_year: r.athlete_grad_year,
        school_id: r.school_id,
        school_name: r.school_name,
        meet_date: r.meet_date,
        meet_name: r.meet_name,
        meet_id: r.meet_id,
        race_id: r.race_id,
        result_id: r.result_id
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
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><div className="text-xl text-zinc-900">Loading...</div></div>
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 text-sm">
          <Link href="/courses" className="text-cyan-600 hover:text-cyan-700 hover:underline">Courses</Link>
          <span className="text-zinc-400 mx-2">/</span>
          <Link href={`/courses/${courseId}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">{course?.name}</Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700">Top Performances</span>
        </div>

        <h1 className="text-4xl font-bold text-zinc-900 mb-8">Top 50 Performances - {course?.name}</h1>

        <div className="flex gap-4 mb-8">
          <button onClick={() => setSelectedGender('M')} className={`px-8 py-3 rounded-lg font-semibold transition-colors ${selectedGender === 'M' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-blue-600 hover:text-blue-600'}`}>Boys</button>
          <button onClick={() => setSelectedGender('F')} className={`px-8 py-3 rounded-lg font-semibold transition-colors ${selectedGender === 'F' ? 'bg-pink-600 text-white' : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-pink-600 hover:text-pink-600'}`}>Girls</button>
        </div>

        <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className={`border-b-2 border-zinc-200 ${selectedGender === 'M' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                <th className="py-4 px-6 text-center font-bold text-white">Rank</th>
                <th className="py-4 px-6 text-left font-bold text-white">Time</th>
                <th className="py-4 px-6 text-left font-bold text-white">Athlete</th>
                <th className="py-4 px-6 text-left font-bold text-white">School</th>
                <th className="py-4 px-6 text-center font-bold text-white">Grade</th>
                <th className="py-4 px-6 text-center font-bold text-white">Date</th>
                <th className="py-4 px-6 text-left font-bold text-white">Meet</th>
              </tr>
            </thead>
            <tbody>
              {performances.map((perf, index) => (
                <tr key={perf.id} className="border-b border-zinc-200 hover:bg-cyan-50 transition-colors">
                  <td className="py-4 px-6 text-center font-bold text-zinc-500">{index + 1}</td>
                  <td className="py-4 px-6 font-mono font-bold text-zinc-900">{formatTime(perf.time_cs)}</td>
                  <td className="py-4 px-6">
                    <Link href={`/athletes/${perf.athlete_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">{perf.athlete_name}</Link>
                  </td>
                  <td className="py-4 px-6">
                    <Link href={`/schools/${perf.school_id}`} className="text-zinc-700 hover:text-cyan-600 hover:underline">{perf.school_name}</Link>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-600">{getGradeLabel(perf.athlete_grad_year)}</td>
                  <td className="py-4 px-6 text-center text-zinc-600">
                    {new Date(perf.meet_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-4 px-6">
                    <Link href={`/meets/${perf.meet_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">{perf.meet_name}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
