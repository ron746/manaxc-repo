'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Course {
  id: string
  name: string
  location: string | null
}

interface Record {
  grade: number
  best_time_cs: number
  athlete_name: string
  athlete_id: string
  school_name: string
  school_id: string
  meet_date: string
}

export default function CourseRecordsPage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [boysRecords, setBoysRecords] = useState<Record[]>([])
  const [girlsRecords, setGirlsRecords] = useState<Record[]>([])
  const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourseRecords()
  }, [courseId])

  const loadCourseRecords = async () => {
    try {
      setLoading(true)

      const { data: courseData } = await supabase
        .from('courses')
        .select('id, name, location')
        .eq('id', courseId)
        .single()

      if (courseData) setCourse(courseData)

      const { data: resultsData } = await supabase
        .from('results')
        .select(`
          time_cs,
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            gender,
            school:schools!inner(id, name)
          ),
          race:races!inner(
            meet:meets!inner(
              meet_date,
              course_id
            )
          )
        `)
        .eq('race.meet.course_id', courseId)
        .order('time_cs', { ascending: true })

      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      const seasonYear = currentMonth >= 7 ? currentYear + 1 : currentYear

      const boysRecordsByGrade: { [grade: number]: Record } = {}
      const girlsRecordsByGrade: { [grade: number]: Record } = {}

      resultsData?.forEach((result: any) => {
        if (!result.athlete || !result.time_cs) return

        const grade = 12 - (result.athlete.grad_year - seasonYear)
        if (grade < 9 || grade > 12) return

        const record: Record = {
          grade,
          best_time_cs: result.time_cs,
          athlete_name: result.athlete.name,
          athlete_id: result.athlete.id,
          school_name: result.athlete.school.name,
          school_id: result.athlete.school.id,
          meet_date: result.race?.meet?.meet_date || ''
        }

        if (result.athlete.gender === 'M') {
          if (!boysRecordsByGrade[grade] || result.time_cs < boysRecordsByGrade[grade].best_time_cs) {
            boysRecordsByGrade[grade] = record
          }
        } else if (result.athlete.gender === 'F') {
          if (!girlsRecordsByGrade[grade] || result.time_cs < girlsRecordsByGrade[grade].best_time_cs) {
            girlsRecordsByGrade[grade] = record
          }
        }
      })

      setBoysRecords(Object.values(boysRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setGirlsRecords(Object.values(girlsRecordsByGrade).sort((a, b) => a.grade - b.grade))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeLabel = (grade: number) => {
    const labels: { [key: number]: string } = { 9: 'Freshman', 10: 'Sophomore', 11: 'Junior', 12: 'Senior' }
    return labels[grade] || `Grade ${grade}`
  }

  const records = selectedGender === 'M' ? boysRecords : girlsRecords

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Course not found</h1>
          <Link href="/courses" className="text-cyan-400">Back to Courses</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 text-sm">
          <Link href="/courses" className="text-cyan-400 hover:text-cyan-300">Courses</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/courses/${courseId}`} className="text-cyan-400 hover:text-cyan-300">{course.name}</Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">Records</span>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{course.name} Records</h1>
          <p className="text-zinc-400">Best times by grade level</p>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSelectedGender('M')}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedGender === 'M' ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            Boys
          </button>
          <button
            onClick={() => setSelectedGender('F')}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedGender === 'F' ? 'bg-pink-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            Girls
          </button>
        </div>

        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden border border-zinc-700">
          {records.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-400 text-lg">No {selectedGender === 'M' ? 'boys' : 'girls'} records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-900/50">
                    <th className="py-4 px-6 text-left font-bold text-white">Grade</th>
                    <th className="py-4 px-6 text-left font-bold text-white">Time</th>
                    <th className="py-4 px-6 text-left font-bold text-white">Athlete</th>
                    <th className="py-4 px-6 text-left font-bold text-white">School</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={record.grade} className={`border-b border-zinc-700 hover:bg-zinc-800/30 ${index === 0 ? 'bg-cyan-900/20' : ''}`}>
                      <td className="py-4 px-6 font-semibold text-white">{getGradeLabel(record.grade)}</td>
                      <td className="py-4 px-6 font-bold text-cyan-400">{formatTime(record.best_time_cs)}</td>
                      <td className="py-4 px-6">
                        <Link href={`/athletes/${record.athlete_id}`} className="text-cyan-400 hover:text-cyan-300 font-medium">
                          {record.athlete_name}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <Link href={`/schools/${record.school_id}`} className="text-zinc-300 hover:text-cyan-300">
                          {record.school_name}
                        </Link>
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
  )
}
