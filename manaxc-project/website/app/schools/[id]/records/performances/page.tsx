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
}

interface Performance {
  athlete_id: string
  athlete_name: string
  athlete_grad_year: number
  time_cs: number
  meet_id: string
  race_id: string
  meet_name: string
  meet_date: string
  course_id: string
  course_name: string
  grade: number
  gender: 'M' | 'F'
}

export default function SchoolTopPerformancesPage() {
  const params = useParams()
  const schoolId = params.id as string

  const [school, setSchool] = useState<School | null>(null)
  const [allPerformances, setAllPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M')

  // Filters
  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set([9, 10, 11, 12]))
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [jumpToPage, setJumpToPage] = useState<string>('')
  const PERFORMANCES_PER_PAGE = 50

  useEffect(() => {
    loadData()
  }, [schoolId])

  // Helper function to calculate grade level from grad year (accounting for July 1 - June 30 athletic year)
  const getGrade = (gradYear: number, meetDate: string) => {
    const meetYear = new Date(meetDate).getFullYear()
    const meetMonth = new Date(meetDate).getMonth()
    // Cross country season spans fall, so use next year if after June (month >= 6)
    const seasonYear = meetMonth >= 6 ? meetYear + 1 : meetYear
    return 12 - (gradYear - seasonYear)
  }

  const loadData = async () => {
    try {
      setLoading(true)

      // Load school info
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, short_name')
        .eq('id', schoolId)
        .single()

      if (schoolData) setSchool(schoolData)

      // Load from school_course_records table - these are the best performances per grade/course/gender
      const { data: recordsData, error } = await supabase
        .from('school_course_records')
        .select('*')
        .eq('school_id', schoolId)
        .order('time_cs', { ascending: true })

      if (error) {
        console.error('Error loading performances:', error)
        setAllPerformances([])
        return
      }

      if (!recordsData || recordsData.length === 0) {
        setAllPerformances([])
        return
      }

      // Transform the data and calculate correct grade
      const performances: Performance[] = recordsData.map((record: any) => {
        const correctedGrade = record.athlete_grad_year && record.meet_date
          ? getGrade(record.athlete_grad_year, record.meet_date)
          : record.grade

        return {
          athlete_id: record.athlete_id,
          athlete_name: record.athlete_name,
          athlete_grad_year: record.athlete_grad_year,
          time_cs: record.time_cs,
          meet_id: record.meet_id,
          race_id: record.race_id,
          meet_name: record.meet_name,
          meet_date: record.meet_date,
          course_id: record.course_id,
          course_name: record.course_name,
          grade: correctedGrade,
          gender: record.gender
        }
      })

      setAllPerformances(performances)

      // Initialize course filter with all courses
      const uniqueCourseIds = new Set(performances.map(p => p.course_id))
      setSelectedCourses(uniqueCourseIds)
    } catch (error) {
      console.error('Error:', error)
      setAllPerformances([])
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
      9: 'FR',
      10: 'SO',
      11: 'JR',
      12: 'SR'
    }
    return labels[grade] || `Grade ${grade}`
  }

  // Get unique courses from all performances
  const uniqueCourses = useMemo(() => {
    const coursesMap = new Map<string, string>()
    allPerformances.forEach(p => {
      if (p.course_id && p.course_name) {
        coursesMap.set(p.course_id, p.course_name)
      }
    })
    return Array.from(coursesMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allPerformances])

  // Toggle functions for filters
  const toggleGrade = (grade: number) => {
    const newSet = new Set(selectedGrades)
    if (newSet.has(grade)) {
      newSet.delete(grade)
    } else {
      newSet.add(grade)
    }
    setSelectedGrades(newSet)
    setCurrentPage(1)
  }

  const toggleAllGrades = () => {
    if (selectedGrades.size === 4) {
      setSelectedGrades(new Set())
    } else {
      setSelectedGrades(new Set([9, 10, 11, 12]))
    }
    setCurrentPage(1)
  }

  const toggleCourse = (courseId: string) => {
    const newSet = new Set(selectedCourses)
    if (newSet.has(courseId)) {
      newSet.delete(courseId)
    } else {
      newSet.add(courseId)
    }
    setSelectedCourses(newSet)
    setCurrentPage(1)
  }

  const toggleAllCourses = () => {
    if (selectedCourses.size === uniqueCourses.length) {
      setSelectedCourses(new Set())
    } else {
      setSelectedCourses(new Set(uniqueCourses.map(c => c.id)))
    }
    setCurrentPage(1)
  }

  // Filter performances
  const filteredPerformances = useMemo(() => {
    return allPerformances.filter(p => {
      const genderMatch = p.gender === selectedGender
      const gradeMatch = selectedGrades.size === 0 || selectedGrades.has(p.grade)
      const courseMatch = selectedCourses.size === 0 || selectedCourses.has(p.course_id)

      return genderMatch && gradeMatch && courseMatch
    })
  }, [allPerformances, selectedGender, selectedGrades, selectedCourses])

  // Pagination
  const totalPages = Math.ceil(filteredPerformances.length / PERFORMANCES_PER_PAGE)
  const startIndex = (currentPage - 1) * PERFORMANCES_PER_PAGE
  const endIndex = startIndex + PERFORMANCES_PER_PAGE
  const currentPerformances = filteredPerformances.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedGender])

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
          <span className="text-zinc-700 font-medium">Top Performances</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">
            {school.name} - Top Performances
          </h1>
          <p className="text-lg text-zinc-600">Best performances by grade level and course</p>
        </div>

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

        {/* Main Content - Filters and Table */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:w-1/4 bg-white rounded-xl shadow-lg border border-zinc-200 p-6 self-start">
            <h3 className="text-xl font-bold text-zinc-900 mb-6">Filters</h3>

            {/* Grade Level Filter */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-zinc-700">Grade Level:</h4>
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedGrades.size === 4}
                    onChange={toggleAllGrades}
                    className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                  />
                  <span className="text-zinc-600 text-xs font-medium">Select All</span>
                </label>
              </div>
              <div className="space-y-2">
                {[9, 10, 11, 12].map(grade => (
                  <label key={grade} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedGrades.has(grade)}
                      onChange={() => toggleGrade(grade)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-700 text-sm">{getGradeLabel(grade)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Courses Filter */}
            {uniqueCourses.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-zinc-700">Courses:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCourses.size === uniqueCourses.length}
                      onChange={toggleAllCourses}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {uniqueCourses.map(course => (
                    <label key={course.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCourses.has(course.id)}
                        onChange={() => toggleCourse(course.id)}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{course.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Performances Table */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-zinc-200">
              {filteredPerformances.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-zinc-600 text-lg">
                    No performances found matching your filters
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className={`border-b-2 border-zinc-200 ${selectedGender === 'M' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                          <th className="py-4 px-6 text-center font-bold text-white">#</th>
                          <th className="py-4 px-6 text-left font-bold text-white">Time</th>
                          <th className="py-4 px-6 text-left font-bold text-white">Athlete</th>
                          <th className="py-4 px-6 text-center font-bold text-white">Class</th>
                          <th className="py-4 px-6 text-left font-bold text-white">Meet</th>
                          <th className="py-4 px-6 text-left font-bold text-white">Course</th>
                          <th className="py-4 px-6 text-center font-bold text-white">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPerformances.map((performance, index) => {
                          const actualRank = startIndex + index + 1
                          return (
                            <tr
                              key={`${performance.athlete_id}-${performance.time_cs}-${index}`}
                              className={`border-b border-zinc-200 hover:bg-cyan-50 transition-colors ${
                                actualRank === 1 ? 'bg-yellow-50' : ''
                              }`}
                            >
                              <td className="py-4 px-6 text-center font-semibold text-zinc-600">
                                {actualRank}
                              </td>
                              <td className="py-4 px-6">
                                {performance.meet_id && performance.race_id ? (
                                  <Link
                                    href={`/meets/${performance.meet_id}/races/${performance.race_id}`}
                                    className={`font-bold font-mono hover:underline ${selectedGender === 'M' ? 'text-blue-600 hover:text-blue-800' : 'text-pink-600 hover:text-pink-800'}`}
                                  >
                                    {formatTime(performance.time_cs)}
                                  </Link>
                                ) : (
                                  <span className={`font-bold font-mono ${selectedGender === 'M' ? 'text-blue-600' : 'text-pink-600'}`}>
                                    {formatTime(performance.time_cs)}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <Link
                                  href={`/athletes/${performance.athlete_id}`}
                                  className={`font-medium hover:underline transition-colors ${selectedGender === 'M' ? 'text-blue-600 hover:text-blue-800' : 'text-pink-600 hover:text-pink-800'}`}
                                >
                                  {performance.athlete_name}
                                </Link>
                              </td>
                              <td className="py-4 px-6 text-center text-zinc-700 text-sm">
                                {getGradeLabel(performance.grade)}
                              </td>
                              <td className="py-4 px-6 text-zinc-700 text-sm">
                                {performance.meet_name}
                              </td>
                              <td className="py-4 px-6">
                                {performance.course_id ? (
                                  <Link
                                    href={`/courses/${performance.course_id}`}
                                    className="text-cyan-600 hover:text-cyan-700 hover:underline text-sm"
                                  >
                                    {performance.course_name}
                                  </Link>
                                ) : (
                                  <span className="text-zinc-700 text-sm">{performance.course_name}</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-center text-zinc-600 text-sm">
                                {formatDate(performance.meet_date)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="p-6 border-t border-zinc-200">
                      <div className="flex flex-col gap-4">
                        {/* Primary Navigation */}
                        <div className="flex flex-wrap justify-center items-center gap-2">
                          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">««</button>
                          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Previous</button>
                          <div className="flex gap-2">
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                              let pageNum = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i
                              return <button key={i} onClick={() => setCurrentPage(pageNum)} className={`px-4 py-2 rounded-lg transition-colors font-medium ${currentPage === pageNum ? 'bg-cyan-600 text-white shadow-md' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>{pageNum}</button>
                            })}
                          </div>
                          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Next</button>
                          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">»»</button>
                        </div>

                        {/* Page Info */}
                        <div className="text-center text-sm text-zinc-600">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredPerformances.length)} of {filteredPerformances.length} performances
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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
