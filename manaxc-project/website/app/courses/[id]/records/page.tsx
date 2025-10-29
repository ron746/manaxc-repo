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

interface TeamPerformance {
  school_id: string
  school_name: string
  school_short_name: string | null
  average_time_cs: number
  runner_count: number
  meet_id: string
  meet_name: string
  meet_date: string
  race_id: string
}

export default function CourseRecordsPage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [boysRecords, setBoysRecords] = useState<Record[]>([])
  const [girlsRecords, setGirlsRecords] = useState<Record[]>([])
  const [boysOverallRecord, setBoysOverallRecord] = useState<OverallRecord | null>(null)
  const [girlsOverallRecord, setGirlsOverallRecord] = useState<OverallRecord | null>(null)
  const [boysTeamPerf, setBoysTeamPerf] = useState<TeamPerformance | null>(null)
  const [girlsTeamPerf, setGirlsTeamPerf] = useState<TeamPerformance | null>(null)
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

      // Load from optimized course_records table (top 100 per gender)
      const { data: courseRecordsData } = await supabase
        .from('course_records')
        .select('*')
        .eq('course_id', courseId)
        .order('rank', { ascending: true })

      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      const seasonYear = currentMonth >= 7 ? currentYear + 1 : currentYear

      const boysRecordsByGrade: { [grade: number]: Record } = {}
      const girlsRecordsByGrade: { [grade: number]: Record } = {}
      let boysOverall: OverallRecord | null = null
      let girlsOverall: OverallRecord | null = null

      courseRecordsData?.forEach((record: any) => {
        if (!record.time_cs) return

        const grade = 12 - (record.athlete_grad_year - seasonYear)

        const recordData = {
          best_time_cs: record.time_cs,
          athlete_name: record.athlete_name,
          athlete_id: record.athlete_id,
          school_name: record.school_name,
          school_id: record.school_id,
          meet_date: record.meet_date,
          meet_name: record.meet_name,
          meet_id: record.meet_id,
          race_id: record.race_id,
          result_id: record.result_id
        }

        if (record.gender === 'M') {
          // Update overall boys record (rank 1 = fastest)
          if (!boysOverall || record.rank === 1) {
            boysOverall = recordData
          }

          // Update grade-specific record
          if (grade >= 9 && grade <= 12) {
            if (!boysRecordsByGrade[grade] || record.time_cs < boysRecordsByGrade[grade].best_time_cs) {
              boysRecordsByGrade[grade] = { ...recordData, grade }
            }
          }
        } else if (record.gender === 'F') {
          // Update overall girls record (rank 1 = fastest)
          if (!girlsOverall || record.rank === 1) {
            girlsOverall = recordData
          }

          // Update grade-specific record
          if (grade >= 9 && grade <= 12) {
            if (!girlsRecordsByGrade[grade] || record.time_cs < girlsRecordsByGrade[grade].best_time_cs) {
              girlsRecordsByGrade[grade] = { ...recordData, grade }
            }
          }
        }
      })

      setBoysRecords(Object.values(boysRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setGirlsRecords(Object.values(girlsRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setBoysOverallRecord(boysOverall)
      setGirlsOverallRecord(girlsOverall)

      // Load full results for team performance calculation
      // (Need complete race results to calculate team scores, not just top 100)
      const { data: teamResultsData } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          athlete:athletes!inner(
            id,
            gender,
            school:schools!inner(id, name, short_name)
          ),
          race:races!inner(
            id,
            gender,
            course_id,
            meet:meets!inner(id, name, meet_date)
          )
        `)
        .eq('race.course_id', courseId)
        .not('time_cs', 'is', null)
        .order('time_cs', { ascending: true })

      // Filter by gender for team performance calculations
      const boysResults = teamResultsData?.filter((r: any) => {
        const raceGender = r.race?.gender
        const athleteGender = r.athlete?.gender
        return raceGender === 'M' || raceGender === 'Boys' || athleteGender === 'M'
      }) || []

      const girlsResults = teamResultsData?.filter((r: any) => {
        const raceGender = r.race?.gender
        const athleteGender = r.athlete?.gender
        return raceGender === 'F' || raceGender === 'Girls' || athleteGender === 'F'
      }) || []

      calculateTeamPerformances(boysResults, 'M')
      calculateTeamPerformances(girlsResults, 'F')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTeamPerformances = (results: any[], gender: string) => {
    // Group by race first, then by school within each race
    const byRace: { [raceId: string]: { [schoolId: string]: any[] } } = {}

    results.forEach(r => {
      const raceId = r.race?.id
      if (!raceId) return

      if (!byRace[raceId]) {
        byRace[raceId] = {}
      }

      const schoolId = r.athlete.school.id
      if (!byRace[raceId][schoolId]) {
        byRace[raceId][schoolId] = []
      }
      byRace[raceId][schoolId].push(r)
    })

    // Calculate combined time for top 5 runners per school per race
    const allPerformances: TeamPerformance[] = []

    Object.entries(byRace).forEach(([raceId, schoolsInRace]) => {
      Object.entries(schoolsInRace).forEach(([schoolId, schoolResults]) => {
        // Sort by time and take top 5
        const sorted = [...schoolResults].sort((a, b) => a.time_cs - b.time_cs)
        const top5 = sorted.slice(0, 5)

        const schoolName = schoolResults[0].athlete.school.name
        const meetInfo = schoolResults[0].race?.meet

        if (top5.length === 5 && meetInfo) { // Need exactly 5 runners to count as a team score
          const combinedTime = top5.reduce((sum, r) => sum + r.time_cs, 0)

          allPerformances.push({
            school_id: schoolId,
            school_name: schoolName,
            school_short_name: schoolResults[0].athlete.school.short_name,
            average_time_cs: combinedTime,
            runner_count: 5,
            meet_id: meetInfo.id,
            meet_name: meetInfo.name,
            meet_date: meetInfo.meet_date,
            race_id: raceId
          })
        }
      })
    })

    // Sort by combined time and take top 1 performance
    allPerformances.sort((a, b) => a.average_time_cs - b.average_time_cs)

    if (gender === 'M') {
      setBoysTeamPerf(allPerformances[0] || null)
    } else {
      setGirlsTeamPerf(allPerformances[0] || null)
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
                      </tr>
                    </thead>
                    <tbody>
                      {boysRecords.map((record) => {
                        const isOverallRecord = boysOverallRecord && record.result_id === boysOverallRecord.result_id
                        return (
                          <tr key={record.grade} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-zinc-900">{getGradeLabel(record.grade)}</td>
                            <td className="py-3 px-4">
                              <div>
                                <Link
                                  href={`/meets/${record.meet_id}/races/${record.race_id}`}
                                  className="font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                                >
                                  {formatTime(record.best_time_cs)}{isOverallRecord && '*'}
                                </Link>
                                <div className="text-xs text-zinc-500 mt-1">
                                  <Link
                                    href={`/meets/${record.meet_id}`}
                                    className="hover:text-cyan-600 hover:underline"
                                  >
                                    {record.meet_name}
                                  </Link>
                                  {' • '}
                                  {formatDate(record.meet_date)}
                                </div>
                              </div>
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
                          </tr>
                        )
                      })}
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
                      </tr>
                    </thead>
                    <tbody>
                      {girlsRecords.map((record) => {
                        const isOverallRecord = girlsOverallRecord && record.result_id === girlsOverallRecord.result_id
                        return (
                          <tr key={record.grade} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-zinc-900">{getGradeLabel(record.grade)}</td>
                            <td className="py-3 px-4">
                              <div>
                                <Link
                                  href={`/meets/${record.meet_id}/races/${record.race_id}`}
                                  className="font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                                >
                                  {formatTime(record.best_time_cs)}{isOverallRecord && '*'}
                                </Link>
                                <div className="text-xs text-zinc-500 mt-1">
                                  <Link
                                    href={`/meets/${record.meet_id}`}
                                    className="hover:text-cyan-600 hover:underline"
                                  >
                                    {record.meet_name}
                                  </Link>
                                  {' • '}
                                  {formatDate(record.meet_date)}
                                </div>
                              </div>
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
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm text-zinc-600">
            * denotes Overall Course Record
          </div>
        </div>

        {/* Top Team Performances */}
        {(boysTeamPerf || girlsTeamPerf) && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Top Team Performances</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Boys */}
              {boysTeamPerf && (
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
                  <div className="bg-blue-600 px-6 py-3">
                    <h3 className="text-xl font-bold text-white">Boys</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="text-sm text-zinc-500 mb-1">Combined Time</div>
                      <Link
                        href={`/meets/${boysTeamPerf.meet_id}/races/${boysTeamPerf.race_id}`}
                        className="text-4xl font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                      >
                        {formatTime(boysTeamPerf.average_time_cs)}
                      </Link>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm text-zinc-500 mb-1">School</div>
                      <Link
                        href={`/schools/${boysTeamPerf.school_id}`}
                        className="text-lg font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
                      >
                        {boysTeamPerf.school_name}
                      </Link>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm text-zinc-500 mb-1">Meet</div>
                      <Link
                        href={`/meets/${boysTeamPerf.meet_id}`}
                        className="text-zinc-700 hover:text-cyan-600 hover:underline"
                      >
                        {boysTeamPerf.meet_name}
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-500 mb-1">Date</div>
                      <div className="text-zinc-700">{formatDate(boysTeamPerf.meet_date)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Girls */}
              {girlsTeamPerf && (
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
                  <div className="bg-pink-600 px-6 py-3">
                    <h3 className="text-xl font-bold text-white">Girls</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="text-sm text-zinc-500 mb-1">Combined Time</div>
                      <Link
                        href={`/meets/${girlsTeamPerf.meet_id}/races/${girlsTeamPerf.race_id}`}
                        className="text-4xl font-bold text-cyan-600 hover:text-cyan-700 hover:underline"
                      >
                        {formatTime(girlsTeamPerf.average_time_cs)}
                      </Link>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm text-zinc-500 mb-1">School</div>
                      <Link
                        href={`/schools/${girlsTeamPerf.school_id}`}
                        className="text-lg font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
                      >
                        {girlsTeamPerf.school_name}
                      </Link>
                    </div>
                    <div className="mb-3">
                      <div className="text-sm text-zinc-500 mb-1">Meet</div>
                      <Link
                        href={`/meets/${girlsTeamPerf.meet_id}`}
                        className="text-zinc-700 hover:text-cyan-600 hover:underline"
                      >
                        {girlsTeamPerf.meet_name}
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-500 mb-1">Date</div>
                      <div className="text-zinc-700">{formatDate(girlsTeamPerf.meet_date)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-zinc-100 rounded-lg border border-zinc-200">
              <p className="text-sm text-zinc-600">
                Team performance is calculated as the combined time of the top 5 runners from each school in a single race on this course.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
