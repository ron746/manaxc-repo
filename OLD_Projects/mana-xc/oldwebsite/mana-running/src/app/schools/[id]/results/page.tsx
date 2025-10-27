// src/app/schools/[id]/records/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'
import { schoolCRUD } from '@/lib/crud-operations'
import { formatTime } from '@/lib/utils'

interface School {
  id: string
  name: string
  state?: string
}

interface Course {
  id: string
  name: string
  distance_miles: number
  xc_time_rating?: number
  mile_difficulty?: number
}

interface CourseStats {
  race_count: number
  result_count: number
}

interface XCRecord {
  grade_level: string
  athlete_id: string
  athlete_name: string
  time_seconds: number
  xc_time: number
  course_id: string
  course_name: string
  race_date: string
  meet_name: string
  race_name: string
}

interface CourseRecord {
  grade_level: string
  athlete_id: string
  athlete_name: string
  time_seconds: number
  race_date: string
  meet_name: string
  race_name: string
}

interface Top10Performance {
  athlete_id: string
  first_name: string
  last_name: string
  time_seconds: number
  xc_time: number
  course_name: string
  meet_name: string
  race_date: string
  graduation_year: number
}

interface Props {
  params: {
    id: string
  }
}

export default function RecordsPage({ params }: Props) {
  const [school, setSchool] = useState<School | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // XC Records (using SQL functions)
  const [boysXCRecords, setBoysXCRecords] = useState<XCRecord[]>([])
  const [girlsXCRecords, setGirlsXCRecords] = useState<XCRecord[]>([])
  
  // Course Records (using SQL functions)
  const [boysCourseRecords, setBoysCourseRecords] = useState<CourseRecord[]>([])
  const [girlsCourseRecords, setGirlsCourseRecords] = useState<CourseRecord[]>([])
  
  // Top 10 (using SQL functions)
  const [boysTop10, setBoysTop10] = useState<Top10Performance[]>([])
  const [girlsTop10, setGirlsTop10] = useState<Top10Performance[]>([])

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadData()
  }, [params.id])

  useEffect(() => {
    if (selectedCourse) {
      loadCourseRecords(selectedCourse)
      loadCourseStats(selectedCourse)
    }
  }, [selectedCourse])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const schoolData = await schoolCRUD.getAll()
      const currentSchool = schoolData?.find(s => s.id === params.id)
      
      if (!currentSchool) {
        throw new Error('School not found')
      }
      
      setSchool(currentSchool)

      // Load courses this school has competed on
      const { data: schoolResults, error: resultsError } = await supabase
        .from('results')
        .select(`
          race:races!inner(
            course:courses!inner(
              id,
              name,
              distance_miles,
              xc_time_rating,
              mile_difficulty
            )
          ),
          athlete:athletes!inner(
            current_school_id
          )
        `)
        .eq('athlete.current_school_id', params.id)
        .limit(100)

      if (resultsError) throw resultsError

      const courseMap = new Map<string, Course>()
      
      schoolResults?.forEach((result) => {
        const race = Array.isArray(result.race) ? result.race[0] : result.race
        if (!race) return
        
        const course = Array.isArray(race.course) ? race.course[0] : race.course
        if (!course) return

        if (!courseMap.has(course.id)) {
          courseMap.set(course.id, {
            id: course.id,
            name: course.name,
            distance_miles: course.distance_miles,
            xc_time_rating: course.xc_time_rating,
            mile_difficulty: course.mile_difficulty
          })
        }
      })

      const uniqueCourses = Array.from(courseMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))

      setCourses(uniqueCourses)

      if (uniqueCourses.length > 0) {
        setSelectedCourse(uniqueCourses[0].id)
      }

      await loadXCRecords()
      await loadTop10()

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  const loadXCRecords = async () => {
    try {
      const { data: boysData, error: boysError } = await supabase
        .rpc('get_school_xc_records', {
          p_school_id: params.id,
          p_gender: 'M'
        })

      if (boysError) throw boysError
      setBoysXCRecords(boysData || [])

      const { data: girlsData, error: girlsError } = await supabase
        .rpc('get_school_xc_records', {
          p_school_id: params.id,
          p_gender: 'F'
        })

      if (girlsError) throw girlsError
      setGirlsXCRecords(girlsData || [])

    } catch (err) {
      console.error('Error loading XC records:', err)
    }
  }

  const loadTop10 = async () => {
    try {
      const { data: boysData, error: boysError } = await supabase
        .rpc('get_school_top10_xc', {
          p_school_id: params.id,
          p_gender: 'M'
        })

      if (boysError) throw boysError
      setBoysTop10(boysData || [])

      const { data: girlsData, error: girlsError } = await supabase
        .rpc('get_school_top10_xc', {
          p_school_id: params.id,
          p_gender: 'F'
        })

      if (girlsError) throw girlsError
      setGirlsTop10(girlsData || [])

    } catch (err) {
      console.error('Error loading top 10:', err)
    }
  }

  const loadCourseRecords = async (courseId: string) => {
    try {
      const { data: boysData, error: boysError } = await supabase
        .rpc('get_school_course_records', {
          p_school_id: params.id,
          p_course_id: courseId,
          p_gender: 'M'
        })

      if (boysError) throw boysError
      setBoysCourseRecords(boysData || [])

      const { data: girlsData, error: girlsError } = await supabase
        .rpc('get_school_course_records', {
          p_school_id: params.id,
          p_course_id: courseId,
          p_gender: 'F'
        })

      if (girlsError) throw girlsError
      setGirlsCourseRecords(girlsData || [])

    } catch (err) {
      console.error('Error loading course records:', err)
    }
  }

  const loadCourseStats = async (courseId: string) => {
    try {
      const { count: raceCount, error: raceError } = await supabase
        .from('races')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)

      if (raceError) throw raceError

      const { data: raceIds, error: raceIdsError } = await supabase
        .from('races')
        .select('id')
        .eq('course_id', courseId)

      if (raceIdsError) throw raceIdsError

      const raceIdList = raceIds?.map(r => r.id) || []

      const { count: resultCount, error: resultError } = await supabase
        .from('results')
        .select('id', { count: 'exact', head: true })
        .in('race_id', raceIdList)

      if (resultError) throw resultError

      setCourseStats({
        race_count: raceCount || 0,
        result_count: resultCount || 0
      })

    } catch (err) {
      console.error('Error loading course stats:', err)
      setCourseStats({ race_count: 0, result_count: 0 })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const selectedCourseData = courses.find(c => c.id === selectedCourse)

  const getDifficultyLabel = (rating?: number) => {
    if (!rating) return 'Unknown'
    if (rating < 1.05) return 'Easy'
    if (rating < 1.12) return 'Moderate'
    if (rating < 1.18) return 'Hard'
    return 'Very Hard'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Records...</div>
          <div className="text-gray-600">Getting school records...</div>
        </div>
      </div>
    )
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-xl font-semibold mb-2 text-red-600">Error</div>
          <div className="text-gray-600 mb-4">{error || 'School not found'}</div>
          <a 
            href="/schools"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Back to Schools
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="text-sm text-gray-600">
            <a href="/" className="hover:text-red-600">Home</a>
            <span className="mx-2">/</span>
            <a href="/schools" className="hover:text-red-600">Schools</a>
            <span className="mx-2">/</span>
            <a href={`/schools/${school.id}`} className="hover:text-red-600">{school.name}</a>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">Individual Records</span>
          </nav>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h1 className="text-3xl font-bold text-black mb-2">{school.name}</h1>
          <p className="text-lg text-gray-600">Individual Course Records</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <a 
                href={`/schools/${school.id}`}
                className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
              >
                Athletes
              </a>
              <div className="px-6 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                Individual Records
              </div>
              <a 
                href={`/schools/${school.id}/team-records`}
                className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
              >
                Team Records
              </a>
              <a 
                href={`/schools/${school.id}/seasons`}
                className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
              >
                Seasons
              </a>
              <a 
                href={`/schools/${school.id}/results`}
                className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
              >
                All Results
              </a>
            </nav>
          </div>
        </div>

        {/* Overall School Records - XC Time Based */}
        {(boysXCRecords.length > 0 || girlsXCRecords.length > 0) && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-2xl font-bold text-black mb-4">Overall School Records (XC Time)</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex items-start space-x-2">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800">
                  <strong>XC Time Records:</strong> These records use normalized XC Times to fairly compare performances across different courses.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Boys XC Records */}
              <div>
                <h3 className="text-xl font-bold text-blue-600 mb-4">Boys</h3>
                {boysXCRecords.length === 0 ? (
                  <div className="text-gray-500 text-sm">No XC Time records available</div>
                ) : (
                  <div className="space-y-3">
                    {boysXCRecords.map((record, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-700">
                            {record.grade_level === 'Overall' ? 'School Record' : `Grade ${record.grade_level}`}
                          </span>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">
                              {formatTime(record.xc_time)} <span className="text-xs text-gray-500">XC</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatTime(record.time_seconds)} <span className="text-xs text-gray-500">actual</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <div className="text-gray-600">
                            <a 
                              href={`/athletes/${record.athlete_id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {record.athlete_name}
                            </a>
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.meet_name}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                          <div>
                            <a 
                              href={`/courses/${record.course_id}`}
                              className="text-green-600 hover:text-green-800"
                            >
                              {record.course_name}
                            </a>
                          </div>
                          <div>{formatDate(record.race_date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Girls XC Records */}
              <div>
                <h3 className="text-xl font-bold text-pink-600 mb-4">Girls</h3>
                {girlsXCRecords.length === 0 ? (
                  <div className="text-gray-500 text-sm">No XC Time records available</div>
                ) : (
                  <div className="space-y-3">
                    {girlsXCRecords.map((record, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-700">
                            {record.grade_level === 'Overall' ? 'School Record' : `Grade ${record.grade_level}`}
                          </span>
                          <div className="text-right">
                            <div className="font-bold text-pink-600">
                              {formatTime(record.xc_time)} <span className="text-xs text-gray-500">XC</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatTime(record.time_seconds)} <span className="text-xs text-gray-500">actual</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <div className="text-gray-600">
                            <a 
                              href={`/athletes/${record.athlete_id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {record.athlete_name}
                            </a>
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.meet_name}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                          <div>
                            <a 
                              href={`/courses/${record.course_id}`}
                              className="text-green-600 hover:text-green-800"
                            >
                              {record.course_name}
                            </a>
                          </div>
                          <div>{formatDate(record.race_date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top 10 Performances */}
        {(boysTop10.length > 0 || girlsTop10.length > 0) && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-2xl font-bold text-black mb-4">Top 10 Performances (XC Time)</h2>
            <p className="text-sm text-gray-600 mb-6">
              Best individual performances across all courses, normalized by XC Time Rating
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Boys Top 10 */}
              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-3">Boys</h3>
                {boysTop10.length > 0 ? (
                  <div className="space-y-2">
                    {boysTop10.map((perf, idx) => (
                      <div key={`${perf.athlete_id}-${idx}`} className="border-b border-gray-100 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-black">
                              {idx + 1}. {perf.first_name} {perf.last_name} '{perf.graduation_year.toString().slice(-2)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {perf.course_name}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">
                              {formatTime(perf.xc_time)}
                            </div>
                            <div className="text-sm text-gray-500">
                              ({formatTime(perf.time_seconds)})
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No performances found</div>
                )}
              </div>

              {/* Girls Top 10 */}
              <div>
                <h3 className="text-lg font-semibold text-pink-600 mb-3">Girls</h3>
                {girlsTop10.length > 0 ? (
                  <div className="space-y-2">
                    {girlsTop10.map((perf, idx) => (
                      <div key={`${perf.athlete_id}-${idx}`} className="border-b border-gray-100 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-black">
                              {idx + 1}. {perf.first_name} {perf.last_name} '{perf.graduation_year.toString().slice(-2)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {perf.course_name}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-pink-600">
                              {formatTime(perf.xc_time)}
                            </div>
                            <div className="text-sm text-gray-500">
                              ({formatTime(perf.time_seconds)})
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No performances found</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Course Selector */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Course
          </label>
          {courses.length === 0 ? (
            <div className="text-gray-500">No courses found. This school hasn't competed yet.</div>
          ) : (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.distance_miles.toFixed(2)} miles)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Course Details */}
        {selectedCourseData && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-2xl font-bold text-black mb-2">
                {selectedCourseData.name}
              </h2>
              <div className="text-sm text-gray-600">
                {Math.round(selectedCourseData.distance_miles * 1609.34)}m ({selectedCourseData.distance_miles.toFixed(2)} mi)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Distance</div>
                <div className="text-lg font-semibold text-black">
                  {selectedCourseData.distance_miles.toFixed(2)} miles
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Difficulty Rating
                </div>
                {selectedCourseData.mile_difficulty ? (
                  <>
                    <div className="text-lg font-semibold text-black">
                      {getDifficultyLabel(selectedCourseData.mile_difficulty)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedCourseData.mile_difficulty.toFixed(3)} multiplier
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Not rated</div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  XC Time Rating
                </div>
                {selectedCourseData.xc_time_rating ? (
                  <>
                    <div className="text-lg font-semibold text-black">
                      {selectedCourseData.xc_time_rating.toFixed(3)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Crystal Springs conversion
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Not rated</div>
                )}
              </div>
            </div>

            {courseStats && (
              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-600">
                  {courseStats.race_count} {courseStats.race_count === 1 ? 'race' : 'races'} held • {courseStats.result_count} total {courseStats.result_count === 1 ? 'result' : 'results'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Course Records */}
        {selectedCourse && (boysCourseRecords.length > 0 || girlsCourseRecords.length > 0) ? (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-2xl font-bold text-black mb-4">School Course Records</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <div className="flex items-start space-x-2">
                <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> These are the fastest times by {school.name} athletes on this specific course.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Boys Records */}
              <div>
                <h3 className="text-xl font-bold text-blue-600 mb-4">Boys</h3>
                {boysCourseRecords.length === 0 ? (
                  <div className="text-gray-500 text-sm">No boys records on this course</div>
                ) : (
                  <div className="space-y-3">
                    {boysCourseRecords.map((record, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-700">
                            {record.grade_level === 'Overall' ? 'School Record' : `Grade ${record.grade_level}`}
                          </span>
                          <div className="font-bold text-black">
                            {formatTime(record.time_seconds)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <div className="text-gray-600">
                            <a 
                              href={`/athletes/${record.athlete_id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {record.athlete_name}
                            </a>
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.meet_name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(record.race_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Girls Records */}
              <div>
                <h3 className="text-xl font-bold text-pink-600 mb-4">Girls</h3>
                {girlsCourseRecords.length === 0 ? (
                  <div className="text-gray-500 text-sm">No girls records on this course</div>
                ) : (
                  <div className="space-y-3">
                    {girlsCourseRecords.map((record, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-700">
                            {record.grade_level === 'Overall' ? 'School Record' : `Grade ${record.grade_level}`}
                          </span>
                          <div className="font-bold text-black">
                            {formatTime(record.time_seconds)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <div className="text-gray-600">
                            <a 
                              href={`/athletes/${record.athlete_id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {record.athlete_name}
                            </a>
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.meet_name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(record.race_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : selectedCourse ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-500 mb-4">No records found on this course.</div>
          </div>
        ) : null}

        {/* Back Button */}
        <div className="mt-6">
          <a 
            href={`/schools/${school.id}`}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            ← Back to {school.name}
          </a>
        </div>
      </div>
    </div>
  )
}