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
  meet_name: string
  meet_id: string
  race_id: string
  result_id: string
}

interface OverallRecord {
  best_time_cs: number
  athlete_name: string
  athlete_id: string
  school_name: string
  school_id: string
  meet_date: string
  meet_name: string
  meet_id: string
  race_id: string
  result_id: string
}

export default function CourseRecordsPage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [boysRecords, setBoysRecords] = useState<Record[]>([])
  const [girlsRecords, setGirlsRecords] = useState<Record[]>([])
  const [boysOverallRecord, setBoysOverallRecord] = useState<OverallRecord | null>(null)
  const [girlsOverallRecord, setGirlsOverallRecord] = useState<OverallRecord | null>(null)
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
          id,
          time_cs,
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            gender,
            school:schools!inner(id, name)
          ),
          race:races!inner(
            id,
            course_id,
            meet:meets!inner(
              id,
              name,
              meet_date
            )
          )
        `)
        .eq('race.course_id', courseId)
        .order('time_cs', { ascending: true })

      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      const seasonYear = currentMonth >= 7 ? currentYear + 1 : currentYear

      const boysRecordsByGrade: { [grade: number]: Record } = {}
      const girlsRecordsByGrade: { [grade: number]: Record } = {}
      let boysOverall: OverallRecord | null = null
      let girlsOverall: OverallRecord | null = null

      resultsData?.forEach((result: any) => {
        if (!result.athlete || !result.time_cs) return

        const grade = 12 - (result.athlete.grad_year - seasonYear)

        const recordData = {
          best_time_cs: result.time_cs,
          athlete_name: result.athlete.name,
          athlete_id: result.athlete.id,
          school_name: result.athlete.school.name,
          school_id: result.athlete.school.id,
          meet_date: result.race?.meet?.meet_date || '',
          meet_name: result.race?.meet?.name || '',
          meet_id: result.race?.meet?.id || '',
          race_id: result.race?.id || '',
          result_id: result.id
        }

        if (result.athlete.gender === 'M') {
          // Update overall boys record
          if (!boysOverall || result.time_cs < boysOverall.best_time_cs) {
            boysOverall = recordData
          }

          // Update grade-specific record
          if (grade >= 9 && grade <= 12) {
            if (!boysRecordsByGrade[grade] || result.time_cs < boysRecordsByGrade[grade].best_time_cs) {
              boysRecordsByGrade[grade] = { ...recordData, grade }
            }
          }
        } else if (result.athlete.gender === 'F') {
          // Update overall girls record
          if (!girlsOverall || result.time_cs < girlsOverall.best_time_cs) {
            girlsOverall = recordData
          }

          // Update grade-specific record
          if (grade >= 9 && grade <= 12) {
            if (!girlsRecordsByGrade[grade] || result.time_cs < girlsRecordsByGrade[grade].best_time_cs) {
              girlsRecordsByGrade[grade] = { ...recordData, grade }
            }
          }
        }
      })

      setBoysRecords(Object.values(boysRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setGirlsRecords(Object.values(girlsRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setBoysOverallRecord(boysOverall)
      setGirlsOverallRecord(girlsOverall)
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Course not found</h1>
          <Link href="/courses" className="text-cyan-600 hover:text-cyan-700 underline">Back to Courses</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 text-sm">
          <Link href="/courses" className="text-cyan-600 hover:text-cyan-700 hover:underline">Courses</Link>
          <span className="text-zinc-400 mx-2">/</span>
          <Link href={`/courses/${courseId}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">{course.name}</Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700">Records</span>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 mb-2">{course.name} Records</h1>
          <p className="text-zinc-600">Best times by grade level</p>
        </div>

        {/* Overall Course Records */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Overall Course Records</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Boys Overall Record */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <div className="bg-blue-600 px-6 py-3">
                <h3 className="text-xl font-bold text-white">Boys</h3>
              </div>
              {boysOverallRecord ? (
                <div className="p-6">
                  <div className="mb-4">
                    <div className="text-sm text-zinc-500 mb-1">Time</div>
                    <Link
                      href={`/meets/${boysOverallRecord.meet_id}/races/${boysOverallRecord.race_id}`}
                      className="text-4xl font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                    >
                      {formatTime(boysOverallRecord.best_time_cs)}
                    </Link>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-zinc-500 mb-1">Athlete</div>
                    <Link
                      href={`/athletes/${boysOverallRecord.athlete_id}`}
                      className="text-lg font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
                    >
                      {boysOverallRecord.athlete_name}
                    </Link>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-zinc-500 mb-1">School</div>
                    <Link
                      href={`/schools/${boysOverallRecord.school_id}`}
                      className="text-zinc-700 hover:text-cyan-600 hover:underline"
                    >
                      {boysOverallRecord.school_name}
                    </Link>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-zinc-500 mb-1">Meet</div>
                    <Link
                      href={`/meets/${boysOverallRecord.meet_id}`}
                      className="text-zinc-700 hover:text-cyan-600 hover:underline"
                    >
                      {boysOverallRecord.meet_name}
                    </Link>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 mb-1">Date</div>
                    <div className="text-zinc-700">{formatDate(boysOverallRecord.meet_date)}</div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-500">No boys record found</div>
              )}
            </div>

            {/* Girls Overall Record */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <div className="bg-pink-600 px-6 py-3">
                <h3 className="text-xl font-bold text-white">Girls</h3>
              </div>
              {girlsOverallRecord ? (
                <div className="p-6">
                  <div className="mb-4">
                    <div className="text-sm text-zinc-500 mb-1">Time</div>
                    <Link
                      href={`/meets/${girlsOverallRecord.meet_id}/races/${girlsOverallRecord.race_id}`}
                      className="text-4xl font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                    >
                      {formatTime(girlsOverallRecord.best_time_cs)}
                    </Link>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-zinc-500 mb-1">Athlete</div>
                    <Link
                      href={`/athletes/${girlsOverallRecord.athlete_id}`}
                      className="text-lg font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
                    >
                      {girlsOverallRecord.athlete_name}
                    </Link>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-zinc-500 mb-1">School</div>
                    <Link
                      href={`/schools/${girlsOverallRecord.school_id}`}
                      className="text-zinc-700 hover:text-cyan-600 hover:underline"
                    >
                      {girlsOverallRecord.school_name}
                    </Link>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm text-zinc-500 mb-1">Meet</div>
                    <Link
                      href={`/meets/${girlsOverallRecord.meet_id}`}
                      className="text-zinc-700 hover:text-cyan-600 hover:underline"
                    >
                      {girlsOverallRecord.meet_name}
                    </Link>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500 mb-1">Date</div>
                    <div className="text-zinc-700">{formatDate(girlsOverallRecord.meet_date)}</div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-500">No girls record found</div>
              )}
            </div>
          </div>
        </div>

        {/* Records by Grade */}
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Records by Grade Level</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Boys Records */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <div className="bg-blue-600 px-6 py-3">
                <h3 className="text-xl font-bold text-white">Boys</h3>
              </div>
              {boysRecords.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-zinc-500 text-lg">No boys records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Grade</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Time</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Athlete</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">School</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Meet</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boysRecords.map((record) => (
                        <tr key={record.grade} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-zinc-900">{getGradeLabel(record.grade)}</td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/meets/${record.meet_id}/races/${record.race_id}`}
                              className="font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                            >
                              {formatTime(record.best_time_cs)}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/athletes/${record.athlete_id}`} className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline">
                              {record.athlete_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/schools/${record.school_id}`} className="text-zinc-700 hover:text-cyan-600 hover:underline">
                              {record.school_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/meets/${record.meet_id}`} className="text-zinc-700 hover:text-cyan-600 hover:underline text-sm">
                              {record.meet_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-zinc-600 text-sm">{formatDate(record.meet_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Girls Records */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <div className="bg-pink-600 px-6 py-3">
                <h3 className="text-xl font-bold text-white">Girls</h3>
              </div>
              {girlsRecords.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-zinc-500 text-lg">No girls records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Grade</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Time</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Athlete</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">School</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Meet</th>
                        <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {girlsRecords.map((record) => (
                        <tr key={record.grade} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-zinc-900">{getGradeLabel(record.grade)}</td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/meets/${record.meet_id}/races/${record.race_id}`}
                              className="font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                            >
                              {formatTime(record.best_time_cs)}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/athletes/${record.athlete_id}`} className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline">
                              {record.athlete_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/schools/${record.school_id}`} className="text-zinc-700 hover:text-cyan-600 hover:underline">
                              {record.school_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/meets/${record.meet_id}`} className="text-zinc-700 hover:text-cyan-600 hover:underline text-sm">
                              {record.meet_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-zinc-600 text-sm">{formatDate(record.meet_date)}</td>
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
    </div>
  )
}
