'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface School {
  id: string
  name: string
  short_name: string | null
}

interface Course {
  id: string
  name: string
  difficulty_rating: number
  distance_meters: number
}

interface Record {
  grade: number
  best_time_cs: number
  athlete_name: string
  athlete_id: string
  athlete_grad_year: number
  meet_name: string
  meet_id: string
  race_id: string
  meet_date: string
  course_name: string
  course_id: string
}

interface RecordsByCourse {
  [courseId: string]: {
    boys: Record[]
    girls: Record[]
  }
}

export default function SchoolRecordsPage() {
  const params = useParams()
  const schoolId = params.id as string

  const [school, setSchool] = useState<School | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [recordsByCourse, setRecordsByCourse] = useState<RecordsByCourse>({})
  const [loading, setLoading] = useState(true)
  const [selectedGrades, setSelectedGrades] = useState<number[]>([9, 10, 11, 12])
  const [courseSearch, setCourseSearch] = useState<string>('')

  useEffect(() => {
    loadSchoolRecords()
  }, [schoolId])

  const loadSchoolRecords = async () => {
    try {
      setLoading(true)

      // Load school info
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name, short_name')
        .eq('id', schoolId)
        .single()

      if (schoolError) throw schoolError
      setSchool(schoolData)

      // Load all courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name, difficulty_rating, distance_meters')
        .order('name', { ascending: true })

      const coursesList = coursesData?.map(course => ({
        id: course.id,
        name: course.name,
        difficulty_rating: course.difficulty_rating || 5.0,
        distance_meters: course.distance_meters || 0
      })) || []

      if (coursesList.length > 0) {
        setCourses(coursesList)

        // Set default course to first one
        if (!selectedCourseId) {
          setSelectedCourseId(coursesList[0].id)
        }
      }

      // Load from optimized school_course_records table
      // (Best time per grade per course per gender - pre-computed by triggers)
      const { data: schoolRecordsData, error: resultsError } = await supabase
        .from('school_course_records')
        .select('*')
        .eq('school_id', schoolId)
        .order('course_id, gender, grade', { ascending: true })

      if (resultsError) {
        console.error('School records query error:', resultsError)
        throw resultsError
      }

      // If no results, set empty object and return
      if (!schoolRecordsData || schoolRecordsData.length === 0) {
        setRecordsByCourse({})
        return
      }

      // Organize records by course, then by gender
      const recordsByCourseTmp: RecordsByCourse = {}

      schoolRecordsData?.forEach((record: any) => {
        const courseId = record.course_id

        // Get course name from coursesList
        const course = coursesList.find(c => c.id === courseId)
        const courseName = course?.name || 'Unknown Course'

        // Recalculate grade using the correct athletic calendar (July 1 - June 30)
        const correctedGrade = record.athlete_grad_year && record.meet_date
          ? getGrade(record.athlete_grad_year, record.meet_date)
          : record.grade

        const recordData: Record = {
          grade: correctedGrade,
          best_time_cs: record.time_cs,
          athlete_name: record.athlete_name,
          athlete_id: record.athlete_id,
          athlete_grad_year: record.athlete_grad_year,
          meet_name: record.meet_name,
          meet_id: record.meet_id,
          race_id: record.race_id,
          meet_date: record.meet_date,
          course_name: courseName,
          course_id: courseId
        }

        // Initialize course records if not exists
        if (!recordsByCourseTmp[courseId]) {
          recordsByCourseTmp[courseId] = {
            boys: [],
            girls: []
          }
        }

        // Add record to appropriate gender array (already sorted by grade from query)
        if (record.gender === 'M') {
          recordsByCourseTmp[courseId].boys.push(recordData)
        } else if (record.gender === 'F') {
          recordsByCourseTmp[courseId].girls.push(recordData)
        }
      })

      setRecordsByCourse(recordsByCourseTmp)
    } catch (error) {
      console.error('Error loading school records:', error)
      setRecordsByCourse({})
    } finally {
      setLoading(false)
    }
  }

  // Helper function to calculate grade level from grad year (accounting for July 1 - June 30 athletic year)
  const getGrade = (gradYear: number, meetDate: string) => {
    const meetYear = new Date(meetDate).getFullYear()
    const meetMonth = new Date(meetDate).getMonth()
    // Cross country season spans fall, so use next year if after June (month >= 6)
    const seasonYear = meetMonth >= 6 ? meetYear + 1 : meetYear
    return 12 - (gradYear - seasonYear)
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
    const labels: { [key: number]: string } = {
      9: 'Freshman',
      10: 'Sophomore',
      11: 'Junior',
      12: 'Senior'
    }
    return labels[grade] || `Grade ${grade}`
  }

  const toggleGrade = (grade: number) => {
    if (selectedGrades.includes(grade)) {
      setSelectedGrades(selectedGrades.filter(g => g !== grade))
    } else {
      setSelectedGrades([...selectedGrades, grade].sort())
    }
  }

  // Filter courses based on search
  const filteredCourses = useMemo(() => {
    if (!courseSearch.trim()) return courses
    const search = courseSearch.toLowerCase()
    return courses.filter(course =>
      course.name.toLowerCase().includes(search)
    )
  }, [courses, courseSearch])

  // Get records for selected course and filtered by grade
  const currentRecords = useMemo(() => {
    if (!selectedCourseId || !recordsByCourse[selectedCourseId]) {
      return { boys: [], girls: [] }
    }

    const courseRecords = recordsByCourse[selectedCourseId]
    return {
      boys: courseRecords.boys.filter(r => selectedGrades.includes(r.grade)),
      girls: courseRecords.girls.filter(r => selectedGrades.includes(r.grade))
    }
  }, [recordsByCourse, selectedCourseId, selectedGrades])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading records...</div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">School not found</h1>
          <Link href="/schools" className="text-blue-600 hover:text-blue-800 font-medium">
            Back to Schools
          </Link>
        </div>
      </div>
    )
  }

  // Helper function to render a gender box
  const renderGenderBox = (gender: 'M' | 'F', records: Record[]) => {
    const genderLabel = gender === 'M' ? 'Boys' : 'Girls'
    const isBoys = gender === 'M'

    return (
      <div className="flex-1 min-w-0">
        <div className={`bg-white rounded-lg shadow-xl border-2 ${isBoys ? 'border-blue-200' : 'border-pink-200'} overflow-hidden`}>
          <div className={`${isBoys ? 'bg-blue-600' : 'bg-pink-600'} text-white px-6 py-4`}>
            <h2 className="text-2xl font-bold">{genderLabel} Records</h2>
          </div>
          {records.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-600 text-lg">
                No {genderLabel.toLowerCase()} records found for this course and grade selection
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-zinc-200 bg-zinc-50">
                    <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Grade</th>
                    <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Time</th>
                    <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Athlete</th>
                    <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Meet</th>
                    <th className="py-3 px-4 text-left font-bold text-zinc-900 text-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr
                      key={record.grade}
                      className={`border-b border-zinc-200 hover:bg-zinc-50 transition-colors ${
                        index === 0 ? (isBoys ? 'bg-blue-50' : 'bg-pink-50') : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-zinc-900 text-sm">
                        {getGradeLabel(record.grade)}
                      </td>
                      <td className="py-3 px-4">
                        {record.meet_id && record.race_id ? (
                          <Link
                            href={`/meets/${record.meet_id}/races/${record.race_id}`}
                            className={`font-bold ${isBoys ? 'text-blue-600 hover:text-blue-800' : 'text-pink-600 hover:text-pink-800'} font-mono hover:underline text-sm`}
                          >
                            {formatTime(record.best_time_cs)}
                          </Link>
                        ) : (
                          <span className={`font-bold ${isBoys ? 'text-blue-600' : 'text-pink-600'} font-mono text-sm`}>
                            {formatTime(record.best_time_cs)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/athletes/${record.athlete_id}`}
                          className={`${isBoys ? 'text-blue-600 hover:text-blue-800' : 'text-pink-600 hover:text-pink-800'} font-medium hover:underline transition-colors text-sm`}
                        >
                          {record.athlete_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-zinc-700 text-sm">
                        {record.meet_name}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 text-sm">
                        {formatDate(record.meet_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/schools" className="text-blue-600 hover:text-blue-800 font-medium">
            Schools
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <Link href={`/schools/${schoolId}`} className="text-blue-600 hover:text-blue-800 font-medium">
            {school.short_name || school.name}
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700 font-medium">Records</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">
                {school.name} XC Records
              </h1>
              <p className="text-lg text-zinc-600">Best times by grade level on each course</p>
            </div>
            <Link
              href={`/schools/${schoolId}/records/performances`}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              View Top Performances →
            </Link>
          </div>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6 mb-8">
            <h3 className="font-bold text-zinc-900 mb-3">Select Course</h3>
            <p className="text-sm text-zinc-600 mb-4">
              View records for a specific course. Use the search to filter courses by name.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full px-4 py-2 bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-4 py-2 bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {filteredCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name} (Difficulty: {course.difficulty_rating.toFixed(1)}, {(course.distance_meters / 1609.34).toFixed(2)} mi)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Grade Filters */}
        <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6 mb-8">
          <h3 className="font-bold text-zinc-900 mb-3">Filter by Grade</h3>
          <p className="text-sm text-zinc-600 mb-4">
            Select which grades to display in the records below.
          </p>
          <div className="flex flex-wrap gap-3">
            {[9, 10, 11, 12].map((grade) => (
              <button
                key={grade}
                onClick={() => toggleGrade(grade)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  selectedGrades.includes(grade)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                }`}
              >
                {getGradeLabel(grade)}
              </button>
            ))}
          </div>
        </div>

        {/* Records - Boys and Girls Side by Side */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {renderGenderBox('M', currentRecords.boys)}
          {renderGenderBox('F', currentRecords.girls)}
        </div>

        {/* Navigation Links */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/schools/${schoolId}`}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ← Back to Roster
          </Link>
        </div>
      </div>
    </div>
  )
}
