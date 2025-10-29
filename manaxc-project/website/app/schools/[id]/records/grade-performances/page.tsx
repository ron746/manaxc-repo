'use client'

import { useEffect, useState } from 'react'
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

interface Performance {
  athlete_id: string
  athlete_name: string
  time_cs: number
  meet_id: string
  race_id: string
  meet_name: string
  meet_date: string
  course_id: string
  course_name: string
  grad_year: number
  grade: number
  is_best_performance: boolean
}

interface GradePerformances {
  9: Performance[]
  10: Performance[]
  11: Performance[]
  12: Performance[]
}

export default function GradePerformancesPage() {
  const params = useParams()
  const schoolId = params.id as string

  const [school, setSchool] = useState<School | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [targetCourseId, setTargetCourseId] = useState<string>('')
  const [boysPerformances, setBoysPerformances] = useState<GradePerformances>({ 9: [], 10: [], 11: [], 12: [] })
  const [girlsPerformances, setGirlsPerformances] = useState<GradePerformances>({ 9: [], 10: [], 11: [], 12: [] })
  const [loading, setLoading] = useState(true)
  const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M')
  const [selectedGrade, setSelectedGrade] = useState<9 | 10 | 11 | 12>(9)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [jumpToPage, setJumpToPage] = useState<string>('')
  const PERFORMANCES_PER_PAGE = 50

  useEffect(() => {
    loadGradePerformances()
  }, [schoolId])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedGender, selectedGrade])

  const loadGradePerformances = async () => {
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

      if (coursesData) {
        const coursesList = coursesData.map(course => ({
          id: course.id,
          name: course.name,
          difficulty_rating: course.difficulty_rating || 5.0,
          distance_meters: course.distance_meters || 0
        }))
        setCourses(coursesList)

        if (coursesList.length > 0 && !targetCourseId) {
          setTargetCourseId(coursesList[0].id)
        }
      }

      // Load all results for this school
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          time_cs,
          meet_id,
          race_id,
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            gender
          ),
          race:races(
            course_id,
            meet:meets(
              name,
              meet_date,
              course:courses(
                id,
                name
              )
            )
          )
        `)
        .eq('athlete.school_id', schoolId)
        .order('time_cs', { ascending: true })
        .limit(1000)

      if (resultsError) throw resultsError

      if (!resultsData || resultsData.length === 0) {
        setBoysPerformances({ 9: [], 10: [], 11: [], 12: [] })
        setGirlsPerformances({ 9: [], 10: [], 11: [], 12: [] })
        return
      }

      // Calculate current season year
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      const seasonYear = currentMonth >= 7 ? currentYear + 1 : currentYear

      // Track best time for each athlete to identify their best performance
      const athleteBestTimes: { [athleteId: string]: number } = {}
      resultsData.forEach((result: any) => {
        if (!result.athlete || !result.time_cs || result.time_cs <= 0) return
        const athleteId = result.athlete.id
        if (!athleteBestTimes[athleteId] || result.time_cs < athleteBestTimes[athleteId]) {
          athleteBestTimes[athleteId] = result.time_cs
        }
      })

      // Organize performances by gender and grade
      const boysPerfs: GradePerformances = { 9: [], 10: [], 11: [], 12: [] }
      const girlsPerfs: GradePerformances = { 9: [], 10: [], 11: [], 12: [] }

      resultsData.forEach((result: any) => {
        if (!result.athlete || !result.time_cs || result.time_cs <= 0) return

        const athlete = result.athlete
        const race = result.race
        const meet = race?.meet
        const course = meet?.course

        // Calculate grade at time of race
        const grade = 12 - (athlete.grad_year - seasonYear)
        if (grade < 9 || grade > 12) return

        const performance: Performance = {
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          time_cs: result.time_cs,
          meet_id: result.meet_id || '',
          race_id: result.race_id || '',
          meet_name: meet?.name || 'Unknown Meet',
          meet_date: meet?.meet_date || '',
          course_id: course?.id || race?.course_id || '',
          course_name: course?.name || 'Unknown Course',
          grad_year: athlete.grad_year,
          grade: grade,
          is_best_performance: result.time_cs === athleteBestTimes[athlete.id]
        }

        if (athlete.gender === 'M') {
          boysPerfs[grade as 9 | 10 | 11 | 12].push(performance)
        } else if (athlete.gender === 'F') {
          girlsPerfs[grade as 9 | 10 | 11 | 12].push(performance)
        }
      })

      // Limit to top 100 per grade
      Object.keys(boysPerfs).forEach((gradeKey) => {
        const grade = parseInt(gradeKey) as 9 | 10 | 11 | 12
        boysPerfs[grade] = boysPerfs[grade].slice(0, 100)
      })

      Object.keys(girlsPerfs).forEach((gradeKey) => {
        const grade = parseInt(gradeKey) as 9 | 10 | 11 | 12
        girlsPerfs[grade] = girlsPerfs[grade].slice(0, 100)
      })

      setBoysPerformances(boysPerfs)
      setGirlsPerformances(girlsPerfs)
    } catch (error) {
      console.error('Error loading grade performances:', error)
      setBoysPerformances({ 9: [], 10: [], 11: [], 12: [] })
      setGirlsPerformances({ 9: [], 10: [], 11: [], 12: [] })
    } finally {
      setLoading(false)
    }
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

  const performances = selectedGender === 'M' ? boysPerformances[selectedGrade] : girlsPerformances[selectedGrade]
  const totalPages = Math.ceil(performances.length / PERFORMANCES_PER_PAGE)
  const startIndex = (currentPage - 1) * PERFORMANCES_PER_PAGE
  const endIndex = startIndex + PERFORMANCES_PER_PAGE
  const currentPerformances = performances.slice(startIndex, endIndex)

  const handleJumpToPage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(jumpToPage)
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        setCurrentPage(pageNum)
        setJumpToPage('')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading performances...</div>
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
          <Link href={`/schools/${schoolId}/records`} className="text-blue-600 hover:text-blue-800 font-medium">
            Records
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700 font-medium">Grade Level Performances</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">
                {school.name} Top Performances by Grade
              </h1>
              <p className="text-lg text-zinc-600">View the best times from each grade level</p>
            </div>
            <Link
              href={`/schools/${schoolId}/records/performances`}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              ← Back to Top Performances
            </Link>
          </div>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6 mb-8">
            <h3 className="font-bold text-zinc-900 mb-3">Normalize Times to Course</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Select a hypothetical course to normalize all times for fair comparison across different courses.
            </p>
            <select
              value={targetCourseId}
              onChange={(e) => setTargetCourseId(e.target.value)}
              className="w-full md:w-auto px-4 py-2 bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} (Difficulty: {course.difficulty_rating.toFixed(1)}, {(course.distance_meters / 1609.34).toFixed(2)} mi)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Gender Selector */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSelectedGender('M')}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedGender === 'M'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border-2 border-zinc-300'
            }`}
          >
            Boys
          </button>
          <button
            onClick={() => setSelectedGender('F')}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedGender === 'F'
                ? 'bg-pink-600 text-white shadow-md'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border-2 border-zinc-300'
            }`}
          >
            Girls
          </button>
        </div>

        {/* Grade Selector */}
        <div className="flex gap-4 mb-8 flex-wrap">
          {[9, 10, 11, 12].map((grade) => {
            const gradePerfs = selectedGender === 'M' ? boysPerformances[grade as 9 | 10 | 11 | 12] : girlsPerformances[grade as 9 | 10 | 11 | 12]
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade as 9 | 10 | 11 | 12)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedGrade === grade
                    ? selectedGender === 'M'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-pink-600 text-white shadow-md'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 border-2 border-zinc-300'
                }`}
              >
                {getGradeLabel(grade)} ({gradePerfs.length})
              </button>
            )
          })}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6 mb-8">
          <h3 className="font-bold text-zinc-900 mb-3">How This List Works</h3>
          <ul className="text-sm text-zinc-700 space-y-2">
            <li>• Shows up to top 100 performances for {getGradeLabel(selectedGrade)}s</li>
            <li>• <strong>Bold names</strong> indicate the athlete's personal best time</li>
            <li>• <em>Italic indented names</em> show subsequent performances by the same athlete</li>
            <li>• Click on times to view the full race results</li>
            <li>• Click on athlete names to view their profile</li>
            <li>• Click on course names to view course details</li>
          </ul>
        </div>

        {/* Performances Table */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-zinc-200">
          {performances.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-600 text-lg">
                No {selectedGender === 'M' ? 'boys' : 'girls'} {getGradeLabel(selectedGrade).toLowerCase()} performances found
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 bg-zinc-50">
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Rank</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Time</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Meet</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Course</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPerformances.map((performance, index) => {
                      const overallRank = startIndex + index + 1
                      return (
                        <tr
                          key={`${performance.athlete_id}-${performance.race_id}`}
                          className={`border-b border-zinc-200 hover:bg-zinc-50 transition-colors ${
                            overallRank === 1 ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="py-4 px-6 font-semibold text-zinc-900">
                            #{overallRank}
                          </td>
                          <td className="py-4 px-6">
                            {performance.meet_id && performance.race_id ? (
                              <Link
                                href={`/meets/${performance.meet_id}/races/${performance.race_id}`}
                                className="font-bold text-blue-600 hover:text-blue-800 font-mono hover:underline"
                              >
                                {formatTime(performance.time_cs)}
                              </Link>
                            ) : (
                              <span className="font-bold text-blue-600 font-mono">
                                {formatTime(performance.time_cs)}
                              </span>
                            )}
                          </td>
                          <td className={`py-4 px-6 ${performance.is_best_performance ? '' : 'pl-12'}`}>
                            <Link
                              href={`/athletes/${performance.athlete_id}`}
                              className={`text-blue-600 hover:text-blue-800 hover:underline transition-colors ${
                                performance.is_best_performance ? 'font-bold' : 'italic font-normal'
                              }`}
                            >
                              {performance.athlete_name}
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-zinc-700">
                            {performance.meet_name}
                          </td>
                          <td className="py-4 px-6">
                            {performance.course_id ? (
                              <Link
                                href={`/courses/${performance.course_id}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {performance.course_name}
                              </Link>
                            ) : (
                              <span className="text-zinc-700">{performance.course_name}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-zinc-600">
                            {formatDate(performance.meet_date)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="border-t-2 border-zinc-200 p-6 bg-zinc-50">
                  <div className="flex flex-col gap-4">
                    {/* Page Info */}
                    <div className="text-center text-sm text-zinc-600">
                      Showing {startIndex + 1}-{Math.min(endIndex, performances.length)} of {performances.length} performances
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {/* First Page */}
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === 1
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : selectedGender === 'M'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                        }`}
                      >
                        First
                      </button>

                      {/* Back 5 */}
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 5))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === 1
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : selectedGender === 'M'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                        }`}
                      >
                        -5
                      </button>

                      {/* Previous */}
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === 1
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : selectedGender === 'M'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                        }`}
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {(() => {
                          const pages = []
                          const startPage = Math.max(1, currentPage - 3)
                          const endPage = Math.min(totalPages, currentPage + 3)

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  i === currentPage
                                    ? selectedGender === 'M'
                                      ? 'bg-blue-700 text-white'
                                      : 'bg-pink-700 text-white'
                                    : 'bg-white text-zinc-700 hover:bg-zinc-100 border-2 border-zinc-300'
                                }`}
                              >
                                {i}
                              </button>
                            )
                          }
                          return pages
                        })()}
                      </div>

                      {/* Next */}
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === totalPages
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : selectedGender === 'M'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                        }`}
                      >
                        Next
                      </button>

                      {/* Forward 5 */}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 5))}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === totalPages
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : selectedGender === 'M'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                        }`}
                      >
                        +5
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === totalPages
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : selectedGender === 'M'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                        }`}
                      >
                        Last
                      </button>
                    </div>

                    {/* Jump to Page */}
                    <div className="flex items-center justify-center gap-2">
                      <label htmlFor="jumpToPage" className="text-sm text-zinc-700 font-medium">
                        Jump to page:
                      </label>
                      <input
                        id="jumpToPage"
                        type="number"
                        min="1"
                        max={totalPages}
                        value={jumpToPage}
                        onChange={(e) => setJumpToPage(e.target.value)}
                        onKeyDown={handleJumpToPage}
                        placeholder={`1-${totalPages}`}
                        className="w-24 px-3 py-2 border-2 border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-zinc-600">(Press Enter)</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation Links */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/schools/${schoolId}/records`}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ← Back to Records
          </Link>
        </div>
      </div>
    </div>
  )
}
