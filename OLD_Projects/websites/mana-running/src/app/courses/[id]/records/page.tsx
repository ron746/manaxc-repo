'use client'

import { useEffect, useState } from 'react'
import { courseCRUD } from '@/lib/crud-operations'
import { supabase } from '@/lib/supabase'

interface Course {
  id: string
  name: string
  distance_meters: number
  distance_miles: number
}

interface CourseRecord {
  athlete_id: string
  athlete_name: string
  school_id: string
  school_name: string
  time_seconds: number
  race_date: string
  meet_name: string
  race_name: string
  grade: number | 'Overall'
}

interface Props {
  params: {
    id: string
  }
}

export default function CourseRecordsPage({ params }: Props) {
  const [course, setCourse] = useState<Course | null>(null)
  const [boysRecords, setBoysRecords] = useState<CourseRecord[]>([])
  const [girlsRecords, setGirlsRecords] = useState<CourseRecord[]>([])
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all schools for this course (once on mount)
  const loadSchoolsList = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          athlete:athletes!inner(
            school:schools!current_school_id(
              id,
              name
            )
          ),
          race:races!inner(
            course_id
          )
        `)
        .eq('race.course_id', courseId)

      if (error) throw error

      const schoolMap = new Map<string, string>()
      data?.forEach(r => {
        const athlete = Array.isArray(r.athlete) ? r.athlete[0] : r.athlete
        const school = athlete?.school
        const schoolData = Array.isArray(school) ? school[0] : school
        if (schoolData?.id && schoolData?.name) {
          schoolMap.set(schoolData.id, schoolData.name)
        }
      })

      const schoolsList = Array.from(schoolMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name))
      
      setSchools(schoolsList)
    } catch (err) {
      console.error('Error loading schools:', err)
    }
  }

  const loadCourseRecords = async (courseId: string, schoolId: string) => {
    try {
      setLoading(true)
      setError(null)

      const allCourses = await courseCRUD.getAll()
      const currentCourse = allCourses?.find(c => c.id === courseId)
      
      if (!currentCourse) {
        throw new Error('Course not found')
      }
      
      setCourse(currentCourse)

      // Build query with SERVER-SIDE filtering
      let query = supabase
        .from('results')
        .select(`
          id,
          time_seconds,
          race:races!inner(
            id,
            name,
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
            first_name,
            last_name,
            graduation_year,
            gender,
            school:schools!current_school_id(
              id,
              name
            )
          )
        `)
        .eq('race.course_id', courseId)
        .gt('time_seconds', 0)

      // Apply school filter SERVER-SIDE
      if (schoolId !== 'all') {
        query = query.eq('athlete.current_school_id', schoolId)
      }

      const { data: raceResults, error } = await query

      if (error) throw error

      const processedResults = raceResults
        ?.map(r => ({
          ...r,
          race: Array.isArray(r.race) ? r.race[0] : r.race,
          athlete: Array.isArray(r.athlete) ? r.athlete[0] : r.athlete
        }))
        .map(r => ({
          ...r,
          race: {
            ...r.race,
            meet: Array.isArray(r.race.meet) ? r.race.meet[0] : r.race.meet
          },
          athlete: {
            ...r.athlete,
            school: Array.isArray(r.athlete.school) ? r.athlete.school[0] : r.athlete.school
          }
        })) || []

      // Process boys records
      const boysResults = processedResults.filter(r => 
        r.race?.gender === 'Boys' || r.athlete?.gender === 'M'
      )
      
      const boysRecordsMap = new Map<string, CourseRecord>()
      
      if (boysResults.length > 0) {
        const fastest = boysResults.reduce((prev, curr) => 
          curr.time_seconds < prev.time_seconds ? curr : prev
        )
        boysRecordsMap.set('Overall', {
          athlete_id: fastest.athlete.id,
          athlete_name: `${fastest.athlete.first_name} ${fastest.athlete.last_name}`,
          school_id: fastest.athlete.school.id,
          school_name: fastest.athlete.school.name,
          time_seconds: fastest.time_seconds,
          race_date: fastest.race.meet.meet_date,
          meet_name: fastest.race.meet.name,
          race_name: fastest.race.name,
          grade: 'Overall'
        })
      }

      for (let targetGrade = 9; targetGrade <= 12; targetGrade++) {
        const gradeResults = boysResults.filter(result => {
          const raceDate = new Date(result.race.meet.meet_date)
          const raceYear = raceDate.getFullYear()
          const raceMonth = raceDate.getMonth()
          
          const schoolYearEnding = raceMonth >= 6 ? raceYear + 1 : raceYear
          const grade = 12 - (result.athlete.graduation_year - schoolYearEnding)
          
          return grade === targetGrade
        })

        if (gradeResults.length > 0) {
          const fastest = gradeResults.reduce((prev, curr) => 
            curr.time_seconds < prev.time_seconds ? curr : prev
          )
          boysRecordsMap.set(`grade${targetGrade}`, {
            athlete_id: fastest.athlete.id,
            athlete_name: `${fastest.athlete.first_name} ${fastest.athlete.last_name}`,
            school_id: fastest.athlete.school.id,
            school_name: fastest.athlete.school.name,
            time_seconds: fastest.time_seconds,
            race_date: fastest.race.meet.meet_date,
            meet_name: fastest.race.meet.name,
            race_name: fastest.race.name,
            grade: targetGrade
          })
        }
      }

      // Process girls records
      const girlsResults = processedResults.filter(r => 
        r.race?.gender === 'Girls' || r.athlete?.gender === 'F'
      )
      
      const girlsRecordsMap = new Map<string, CourseRecord>()
      
      if (girlsResults.length > 0) {
        const fastest = girlsResults.reduce((prev, curr) => 
          curr.time_seconds < prev.time_seconds ? curr : prev
        )
        girlsRecordsMap.set('Overall', {
          athlete_id: fastest.athlete.id,
          athlete_name: `${fastest.athlete.first_name} ${fastest.athlete.last_name}`,
          school_id: fastest.athlete.school.id,
          school_name: fastest.athlete.school.name,
          time_seconds: fastest.time_seconds,
          race_date: fastest.race.meet.meet_date,
          meet_name: fastest.race.meet.name,
          race_name: fastest.race.name,
          grade: 'Overall'
        })
      }

      for (let targetGrade = 9; targetGrade <= 12; targetGrade++) {
        const gradeResults = girlsResults.filter(result => {
          const raceDate = new Date(result.race.meet.meet_date)
          const raceYear = raceDate.getFullYear()
          const raceMonth = raceDate.getMonth()
          
          const schoolYearEnding = raceMonth >= 6 ? raceYear + 1 : raceYear
          const grade = 12 - (result.athlete.graduation_year - schoolYearEnding)
          
          return grade === targetGrade
        })

        if (gradeResults.length > 0) {
          const fastest = gradeResults.reduce((prev, curr) => 
            curr.time_seconds < prev.time_seconds ? curr : prev
          )
          girlsRecordsMap.set(`grade${targetGrade}`, {
            athlete_id: fastest.athlete.id,
            athlete_name: `${fastest.athlete.first_name} ${fastest.athlete.last_name}`,
            school_id: fastest.athlete.school.id,
            school_name: fastest.athlete.school.name,
            time_seconds: fastest.time_seconds,
            race_date: fastest.race.meet.meet_date,
            meet_name: fastest.race.meet.name,
            race_name: fastest.race.name,
            grade: targetGrade
          })
        }
      }

      const orderedBoysRecords: CourseRecord[] = []
      const orderedGirlsRecords: CourseRecord[] = []

      if (boysRecordsMap.has('Overall')) orderedBoysRecords.push(boysRecordsMap.get('Overall')!)
      for (let grade = 9; grade <= 12; grade++) {
        const key = `grade${grade}`
        if (boysRecordsMap.has(key)) orderedBoysRecords.push(boysRecordsMap.get(key)!)
      }

      if (girlsRecordsMap.has('Overall')) orderedGirlsRecords.push(girlsRecordsMap.get('Overall')!)
      for (let grade = 9; grade <= 12; grade++) {
        const key = `grade${grade}`
        if (girlsRecordsMap.has(key)) orderedGirlsRecords.push(girlsRecordsMap.get(key)!)
      }

      setBoysRecords(orderedBoysRecords)
      setGirlsRecords(orderedGirlsRecords)

    } catch (err) {
      console.error('Error loading course records:', err)
      setError('Failed to load course records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchoolsList(params.id)
  }, [params.id])

  useEffect(() => {
    loadCourseRecords(params.id, selectedSchool)
  }, [params.id, selectedSchool])

  const formatTime = (centiseconds: number): string => {
    const totalSeconds = centiseconds / 100
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    
    const secsStr = secs.toFixed(2).padStart(5, '0')
    
    return `${mins}:${secsStr}`
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Course Records...</div>
          <div className="text-gray-600">Getting fastest times...</div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-xl font-semibold mb-2 text-red-600">Error</div>
          <div className="text-gray-600 mb-4">{error || 'Course not found'}</div>
          <a 
            href={`/courses/${params.id}`}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Back to Course
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <nav className="text-sm text-gray-600">
            <a href="/" className="hover:text-green-600">Home</a>
            <span className="mx-2">/</span>
            <a href="/courses" className="hover:text-green-600">Courses</a>
            <span className="mx-2">/</span>
            <a href={`/courses/${params.id}`} className="hover:text-green-600">{course.name}</a>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">Course Records</span>
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h1 className="text-3xl font-bold text-black mb-2">Course Records</h1>
          <p className="text-gray-600">
            {course.name} • {course.distance_miles?.toFixed(2)} miles ({course.distance_meters}m)
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> These are the fastest times currently in our database, not official course records. Not all historical races have been imported yet.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by School:
            </label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Schools (Course Records)</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(boysRecords.length > 0 || girlsRecords.length > 0) ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {selectedSchool === 'all' 
                ? 'All-Time Course Records' 
                : `${schools.find(s => s.id === selectedSchool)?.name || 'School'} Records`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold text-blue-600 mb-4">Boys</h2>
                {boysRecords.length === 0 ? (
                  <p className="text-gray-500">No boys records found</p>
                ) : (
                  <div className="space-y-3">
                    {boysRecords.map((record, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-700">
                            {record.grade === 'Overall' ? 'Course Record' : `${record.grade}th Grade`}
                          </span>
                          <div className="font-bold text-black text-lg">
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
                            {' - '}
                            <a 
                              href={`/schools/${record.school_id}`}
                              className="text-green-600 hover:text-green-800"
                            >
                              {record.school_name}
                            </a>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                          <div>{formatDate(record.race_date)}</div>
                          <div>{record.meet_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-pink-600 mb-4">Girls</h2>
                {girlsRecords.length === 0 ? (
                  <p className="text-gray-500">No girls records found</p>
                ) : (
                  <div className="space-y-3">
                    {girlsRecords.map((record, index) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-700">
                            {record.grade === 'Overall' ? 'Course Record' : `${record.grade}th Grade`}
                          </span>
                          <div className="font-bold text-black text-lg">
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
                            {' - '}
                            <a 
                              href={`/schools/${record.school_id}`}
                              className="text-green-600 hover:text-green-800"
                            >
                              {record.school_name}
                            </a>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                          <div>{formatDate(record.race_date)}</div>
                          <div>{record.meet_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No course records found for this course.</p>
          </div>
        )}

        <div className="mt-6">
          <a 
            href={`/courses/${params.id}`}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            ← Back to Course
          </a>
        </div>
      </div>
    </div>
  )
}