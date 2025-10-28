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
  venue: string | null
  distance_meters: number
  distance_display: string | null
  difficulty_rating: number | null
  elevation_gain_meters: number | null
  surface_type: string | null
  terrain_description: string | null
  notes: string | null
}

interface Meet {
  id: string
  name: string
  meet_date: string
  season_year: number
  meet_type: string | null
  race_count: number
}

interface TeamPerformance {
  school_id: string
  school_name: string
  school_short_name: string | null
  average_time_cs: number
  runner_count: number
}

interface GradeRecord {
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

export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [meets, setMeets] = useState<Meet[]>([])
  const [boysTeamPerf, setBoysTeamPerf] = useState<TeamPerformance[]>([])
  const [girlsTeamPerf, setGirlsTeamPerf] = useState<TeamPerformance[]>([])
  const [boysRecords, setBoysRecords] = useState<GradeRecord[]>([])
  const [girlsRecords, setGirlsRecords] = useState<GradeRecord[]>([])
  const [boysOverallRecord, setBoysOverallRecord] = useState<OverallRecord | null>(null)
  const [girlsOverallRecord, setGirlsOverallRecord] = useState<OverallRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<'name' | 'meet_date' | 'meet_type'>('meet_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    try {
      setLoading(true)

      // Load course info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      // Load meets at this course's venue (via races that use this course)
      // Note: Meets don't have course_id, they have venue_id
      // We need to find meets through races that used this course
      const { data: racesWithMeets, error: racesError } = await supabase
        .from('races')
        .select(`
          meet:meets!inner(
            id,
            name,
            meet_date,
            season_year,
            meet_type
          )
        `)
        .eq('course_id', courseId)

      if (racesError) throw racesError

      // Extract unique meets from races (a meet may have multiple races on this course)
      const meetsMap = new Map<string, Meet>()

      racesWithMeets?.forEach((raceData: any) => {
        const meet = raceData.meet
        if (meet && !meetsMap.has(meet.id)) {
          meetsMap.set(meet.id, {
            id: meet.id,
            name: meet.name,
            meet_date: meet.meet_date,
            season_year: meet.season_year,
            meet_type: meet.meet_type,
            race_count: 0 // Will be calculated below
          })
        }
      })

      // Get race counts for each meet on this course
      const processedMeets: Meet[] = []
      for (const meet of meetsMap.values()) {
        const { count } = await supabase
          .from('races')
          .select('id', { count: 'exact', head: true })
          .eq('meet_id', meet.id)
          .eq('course_id', courseId)

        processedMeets.push({
          ...meet,
          race_count: count || 0
        })
      }

      // Sort by date descending
      processedMeets.sort((a, b) => new Date(b.meet_date).getTime() - new Date(a.meet_date).getTime())
      setMeets(processedMeets)

      // Load all results for this course (through races that use this course)
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          race:races!inner(
            id,
            gender,
            course_id,
            meet:meets!inner(
              id,
              name,
              meet_date
            )
          ),
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            gender,
            school:schools!inner(
              id,
              name,
              short_name
            )
          )
        `)
        .eq('race.course_id', courseId)
        .order('time_cs', { ascending: true })

      if (resultsError) throw resultsError

      // Calculate statistics
      // Check both race.gender and athlete.gender to handle different data structures
      const boysResults = resultsData?.filter((r: any) => {
        const raceGender = r.race?.gender
        const athleteGender = r.athlete?.gender
        return raceGender === 'M' || raceGender === 'Boys' || athleteGender === 'M'
      }) || []

      const girlsResults = resultsData?.filter((r: any) => {
        const raceGender = r.race?.gender
        const athleteGender = r.athlete?.gender
        return raceGender === 'F' || raceGender === 'Girls' || athleteGender === 'F'
      }) || []

      // Calculate course records
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      const seasonYear = currentMonth >= 7 ? currentYear + 1 : currentYear

      const boysRecordsByGrade: { [grade: number]: GradeRecord } = {}
      const girlsRecordsByGrade: { [grade: number]: GradeRecord } = {}
      let boysOverall: OverallRecord | null = null
      let girlsOverall: OverallRecord | null = null

      console.log('Total results for course:', resultsData?.length)
      console.log('Boys results count:', boysResults.length)
      console.log('Girls results count:', girlsResults.length)

      // Debug: Show sample of Willow Glen results specifically
      const willowGlenResults = resultsData?.filter((r: any) =>
        r.athlete?.school?.name?.toLowerCase().includes('willow glen')
      ) || []
      console.log('Willow Glen results count:', willowGlenResults.length)
      if (willowGlenResults.length > 0) {
        console.log('Sample Willow Glen results (first 5):')
        willowGlenResults.slice(0, 5).forEach((r: any) => {
          console.log('  -', r.athlete.name, ':', r.time_cs, 'cs (', formatTime(r.time_cs), '), Gender:', r.athlete.gender, ', Race ID:', r.race?.id, ', Meet:', r.race?.meet?.name)
        })
      }

      resultsData?.forEach((result: any) => {
        if (!result.athlete || !result.time_cs) return

        const grade = 12 - (result.athlete.grad_year - seasonYear)
        const athleteGender = result.athlete.gender

        // Debug: log first few records
        if (resultsData.indexOf(result) < 3) {
          console.log('Result athlete gender:', athleteGender, 'Grade:', grade, 'Time:', result.time_cs, formatTime(result.time_cs))
        }

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

        if (athleteGender === 'M') {
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
        } else if (athleteGender === 'F') {
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

      console.log('Boys overall record:', boysOverall)
      console.log('Girls overall record:', girlsOverall)
      console.log('Boys grade records:', Object.keys(boysRecordsByGrade))
      console.log('Girls grade records:', Object.keys(girlsRecordsByGrade))

      setBoysRecords(Object.values(boysRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setGirlsRecords(Object.values(girlsRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setBoysOverallRecord(boysOverall)
      setGirlsOverallRecord(girlsOverall)

      // Calculate top 5 team performances (average of top 7 runners)
      calculateTeamPerformances(boysResults, 'M')
      calculateTeamPerformances(girlsResults, 'F')
    } catch (error) {
      console.error('Error loading course:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTeamPerformances = (results: any[], gender: string) => {
    console.log(`\n=== Calculating ${gender === 'M' ? 'Boys' : 'Girls'} Team Performances ===`)
    console.log('Total results:', results.length)

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

    console.log('Unique races:', Object.keys(byRace).length)

    // Calculate combined time for top 5 runners per school per race
    const allPerformances: TeamPerformance[] = []

    Object.entries(byRace).forEach(([raceId, schoolsInRace]) => {
      console.log(`Race ${raceId}:`, Object.keys(schoolsInRace).length, 'schools')

      Object.entries(schoolsInRace).forEach(([schoolId, schoolResults]) => {
        // Sort by time and take top 5
        const sorted = [...schoolResults].sort((a, b) => a.time_cs - b.time_cs)
        const top5 = sorted.slice(0, 5)

        const schoolName = schoolResults[0].athlete.school.name

        if (top5.length === 5) { // Need exactly 5 runners to count as a team score
          const combinedTime = top5.reduce((sum, r) => sum + r.time_cs, 0)

          // Debug: Show Willow Glen specifically
          if (schoolName.toLowerCase().includes('willow glen')) {
            console.log(`  ✓ ${schoolName}: ${top5.length} runners, combined time: ${formatTime(combinedTime)}`)
            console.log('    Top 5 times:', top5.map(r => formatTime(r.time_cs)).join(', '))
          }

          allPerformances.push({
            school_id: schoolId,
            school_name: schoolName,
            school_short_name: schoolResults[0].athlete.school.short_name,
            average_time_cs: combinedTime, // This is now combined time, not average
            runner_count: 5
          })
        } else {
          // Debug: Show teams that didn't have enough runners
          if (schoolName.toLowerCase().includes('willow glen')) {
            console.log(`  ✗ ${schoolName}: Only ${top5.length} runners (need 5)`)
          }
        }
      })
    })

    console.log('Total valid team performances:', allPerformances.length)

    // Sort by combined time and take top 5 performances
    allPerformances.sort((a, b) => a.average_time_cs - b.average_time_cs)

    console.log('Top 5 team performances:')
    allPerformances.slice(0, 5).forEach((team, idx) => {
      console.log(`  ${idx + 1}. ${team.school_name}: ${formatTime(team.average_time_cs)}`)
    })

    if (gender === 'M') {
      setBoysTeamPerf(allPerformances.slice(0, 5))
    } else {
      setGirlsTeamPerf(allPerformances.slice(0, 5))
    }
  }

  const formatDistance = (meters: number) => {
    if (meters === 5000) return '5K'
    if (meters === 3000) return '3K'
    if (meters === 4000) return '4K'
    const miles = meters / 1609.34
    if (Math.abs(miles - 3) < 0.01) return '3 Miles'
    if (Math.abs(miles - 2) < 0.01) return '2 Miles'
    return `${miles.toFixed(2)} mi`
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

  const getGradeLabel = (grade: number) => {
    const labels: { [key: number]: string } = { 9: 'Freshman', 10: 'Sophomore', 11: 'Junior', 12: 'Senior' }
    return labels[grade] || `Grade ${grade}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading course...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Course not found</h1>
          <Link href="/courses" className="text-cyan-600 hover:text-cyan-700 underline">
            Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/courses" className="text-cyan-600 hover:text-cyan-700 hover:underline">
            Courses
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700">{course.name}</span>
        </div>

        {/* Course Header */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8 border border-zinc-200">
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">{course.name}</h1>

          {course.location && (
            <p className="text-zinc-600 text-lg mb-4">{course.location}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-zinc-500 mb-1">Distance</div>
              <div className="text-zinc-900 font-bold text-xl">
                {course.distance_display || formatDistance(course.distance_meters)}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-500 mb-1">Difficulty</div>
              <div className="text-zinc-900 font-bold text-xl">
                {course.difficulty_rating ? course.difficulty_rating.toFixed(3) : 'N/A'}
              </div>
            </div>

            {course.elevation_gain_meters && (
              <div>
                <div className="text-sm text-zinc-500 mb-1">Elevation Gain</div>
                <div className="text-zinc-900 font-medium">{course.elevation_gain_meters}m</div>
              </div>
            )}

            {course.surface_type && (
              <div>
                <div className="text-sm text-zinc-500 mb-1">Surface</div>
                <div className="text-zinc-900 font-medium capitalize">{course.surface_type}</div>
              </div>
            )}
          </div>

          {course.terrain_description && (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="text-sm text-zinc-500 mb-1">Terrain</div>
              <p className="text-zinc-700">{course.terrain_description}</p>
            </div>
          )}

          {course.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="text-sm text-zinc-500 mb-1">Notes</div>
              <p className="text-zinc-700">{course.notes}</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            href={`/courses/${courseId}/performances`}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors shadow-md"
          >
            Top Performances
          </Link>
        </div>

        {/* Course Records */}
        {(boysOverallRecord || girlsOverallRecord || boysRecords.length > 0 || girlsRecords.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Course Records</h2>

            {/* Overall Course Records */}
            {(boysOverallRecord || girlsOverallRecord) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-700 mb-3">Overall Records</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Boys Overall Record */}
                  {boysOverallRecord && (
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
                      <div className="bg-blue-600 px-6 py-3">
                        <h4 className="text-xl font-bold text-white">Boys</h4>
                      </div>
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
                    </div>
                  )}

                  {/* Girls Overall Record */}
                  {girlsOverallRecord && (
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
                      <div className="bg-pink-600 px-6 py-3">
                        <h4 className="text-xl font-bold text-white">Girls</h4>
                      </div>
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Records by Grade */}
            {(boysRecords.length > 0 || girlsRecords.length > 0) && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-700 mb-3">Records by Grade Level</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Boys Records */}
                  {boysRecords.length > 0 && (
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
                      <div className="bg-blue-600 px-6 py-3">
                        <h4 className="text-xl font-bold text-white">Boys</h4>
                      </div>
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
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Girls Records */}
                  {girlsRecords.length > 0 && (
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
                      <div className="bg-pink-600 px-6 py-3">
                        <h4 className="text-xl font-bold text-white">Girls</h4>
                      </div>
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
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Team Performances */}
        {(boysTeamPerf.length > 0 || girlsTeamPerf.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Top Team Performances</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Boys */}
              {boysTeamPerf.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-zinc-200">
                  <h3 className="text-xl font-bold text-blue-600 mb-4">Boys</h3>
                  <div className="space-y-3">
                    {boysTeamPerf.map((team, index) => (
                      <div key={team.school_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400 font-bold">{index + 1}.</span>
                          <Link
                            href={`/schools/${team.school_id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                          >
                            {team.school_short_name || team.school_name}
                          </Link>
                          <span className="text-sm text-zinc-500">({team.runner_count} runners)</span>
                        </div>
                        <div className="font-mono font-bold text-cyan-600">
                          {formatTime(team.average_time_cs)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Girls */}
              {girlsTeamPerf.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-zinc-200">
                  <h3 className="text-xl font-bold text-pink-600 mb-4">Girls</h3>
                  <div className="space-y-3">
                    {girlsTeamPerf.map((team, index) => (
                      <div key={team.school_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400 font-bold">{index + 1}.</span>
                          <Link
                            href={`/schools/${team.school_id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                          >
                            {team.school_short_name || team.school_name}
                          </Link>
                          <span className="text-sm text-zinc-500">({team.runner_count} runners)</span>
                        </div>
                        <div className="font-mono font-bold text-cyan-600">
                          {formatTime(team.average_time_cs)}
                        </div>
                      </div>
                    ))}
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

        {/* Meets on this Course */}
        {meets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Meets on this Course</h2>

            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <th
                        className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => {
                          if (sortField === 'name') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('name')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Meet
                          {sortField === 'name' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => {
                          if (sortField === 'meet_date') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('meet_date')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {sortField === 'meet_date' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => {
                          if (sortField === 'meet_type') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('meet_type')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Type
                          {sortField === 'meet_type' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...meets].sort((a, b) => {
                      let aVal: any = a[sortField]
                      let bVal: any = b[sortField]

                      if (sortField === 'meet_date') {
                        aVal = new Date(aVal).getTime()
                        bVal = new Date(bVal).getTime()
                      } else if (sortField === 'meet_type') {
                        aVal = aVal || ''
                        bVal = bVal || ''
                      }

                      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
                      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
                      return 0
                    }).map(meet => (
                      <tr key={meet.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="py-4 px-6">
                          <Link
                            href={`/meets/${meet.id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                          >
                            {meet.name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-zinc-700">{formatDate(meet.meet_date)}</td>
                        <td className="py-4 px-6 text-zinc-600 capitalize">
                          {meet.meet_type || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
