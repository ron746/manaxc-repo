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

interface Performance {
  athlete_id: string
  athlete_name: string
  athlete_grade: number | null
  school_id: string
  school_name: string
  time_seconds: number
  race_date: string
  meet_name: string
  race_name: string
  result_id: string
}

interface RankedPerformance extends Performance {
  rank: number | null // null for repeat performances
  is_repeat: boolean
}

interface Props {
  params: {
    id: string
  }
}

export default function TopPerformancesPage({ params }: Props) {
  const [course, setCourse] = useState<Course | null>(null)
  const [boysPerformances, setBoysPerformances] = useState<RankedPerformance[]>([])
  const [girlsPerformances, setGirlsPerformances] = useState<RankedPerformance[]>([])
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('all')
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const loadTopPerformances = async (courseId: string, schoolId: string, gradeFilter: string) => {
    try {
      setLoading(true)
      setError(null)

      const allCourses = await courseCRUD.getAll()
      const currentCourse = allCourses?.find(c => c.id === courseId)
      
      if (!currentCourse) {
        throw new Error('Course not found')
      }
      
      setCourse(currentCourse)

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

      const resultsWithGrade = processedResults.map(result => {
        const raceDate = new Date(result.race.meet.meet_date)
        const raceYear = raceDate.getFullYear()
        const raceMonth = raceDate.getMonth()
        
        const schoolYearEnding = raceMonth >= 6 ? raceYear + 1 : raceYear
        const grade = 12 - (result.athlete.graduation_year - schoolYearEnding)
        
        return {
          ...result,
          calculated_grade: grade >= 9 && grade <= 12 ? grade : null
        }
      })

      const boysResults = resultsWithGrade
        .filter(r => r.race?.gender === 'Boys' || r.athlete?.gender === 'M')
        .map(r => ({
          athlete_id: r.athlete.id,
          athlete_name: `${r.athlete.first_name} ${r.athlete.last_name}`,
          athlete_grade: r.calculated_grade,
          school_id: r.athlete.school.id,
          school_name: r.athlete.school.name,
          time_seconds: r.time_seconds,
          race_date: r.race.meet.meet_date,
          meet_name: r.race.meet.name,
          race_name: r.race.name,
          result_id: r.id
        }))

      const girlsResults = resultsWithGrade
        .filter(r => r.race?.gender === 'Girls' || r.athlete?.gender === 'F')
        .map(r => ({
          athlete_id: r.athlete.id,
          athlete_name: `${r.athlete.first_name} ${r.athlete.last_name}`,
          athlete_grade: r.calculated_grade,
          school_id: r.athlete.school.id,
          school_name: r.athlete.school.name,
          time_seconds: r.time_seconds,
          race_date: r.race.meet.meet_date,
          meet_name: r.race.meet.name,
          race_name: r.race.name,
          result_id: r.id
        }))

      let filteredBoys = boysResults
      let filteredGirls = girlsResults

      if (gradeFilter !== 'all') {
        const gradeNum = parseInt(gradeFilter)
        filteredBoys = filteredBoys.filter(p => p.athlete_grade === gradeNum)
        filteredGirls = filteredGirls.filter(p => p.athlete_grade === gradeNum)
      }

      // Sort all performances by time
      filteredBoys.sort((a, b) => a.time_seconds - b.time_seconds)
      filteredGirls.sort((a, b) => a.time_seconds - b.time_seconds)

      // Rank performances: number first appearance of each athlete, mark repeats with *
      const rankPerformances = (performances: Performance[]): RankedPerformance[] => {
        const seenAthletes = new Set<string>()
        const ranked: RankedPerformance[] = []
        let currentRank = 1

        for (const perf of performances) {
          if (!seenAthletes.has(perf.athlete_id)) {
            // First time seeing this athlete - give them a rank
            seenAthletes.add(perf.athlete_id)
            ranked.push({
              ...perf,
              rank: currentRank,
              is_repeat: false
            })
            currentRank++
            
            // Stop after 50 unique athletes
            if (currentRank > 50) break
          } else {
            // Repeat performance - no rank, mark with *
            ranked.push({
              ...perf,
              rank: null,
              is_repeat: true
            })
          }
        }

        return ranked
      }

      setBoysPerformances(rankPerformances(filteredBoys))
      setGirlsPerformances(rankPerformances(filteredGirls))

    } catch (err) {
      console.error('Error loading top performances:', err)
      setError('Failed to load top performances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchoolsList(params.id)
  }, [params.id])

  useEffect(() => {
    loadTopPerformances(params.id, selectedSchool, selectedGrade)
  }, [params.id, selectedSchool, selectedGrade])

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
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Top Performances...</div>
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

  const PerformanceTable = ({ performances, gender }: { performances: RankedPerformance[], gender: 'Boys' | 'Girls' }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Grade
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              School
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Meet
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {performances.map((perf) => (
            <tr key={perf.result_id} className={perf.is_repeat ? 'hover:bg-gray-50 bg-gray-50' : 'hover:bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {perf.rank || ''}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-black font-mono">
                {formatTime(perf.time_seconds)}
              </td>
              <td className={`px-4 py-3 whitespace-nowrap text-sm ${perf.is_repeat ? 'pl-8' : ''}`}>
                {perf.is_repeat && <span className="text-gray-400 mr-1">*</span>}
                <a 
                  href={`/athletes/${perf.athlete_id}`}
                  className={`${!perf.is_repeat ? 'text-blue-600 hover:text-blue-800 font-medium' : 'text-blue-500 hover:text-blue-700'}`}
                >
                  {perf.athlete_name}
                </a>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {perf.athlete_grade || 'N/A'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <a 
                  href={`/schools/${perf.school_id}`}
                  className="text-green-600 hover:text-green-800"
                >
                  {perf.school_name}
                </a>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {perf.meet_name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {formatDate(perf.race_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {performances.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No {gender.toLowerCase()} performances found
        </div>
      )}
    </div>
  )

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
            <span className="text-black font-medium">Top Performers</span>
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h1 className="text-3xl font-bold text-black mb-2">Top 50 Performers</h1>
          <p className="text-gray-600 mb-3">
            {course.name} • {course.distance_miles?.toFixed(2)} miles ({course.distance_meters}m)
          </p>
          <p className="text-sm text-gray-500 italic">
            * Additional performances by ranked athletes shown in time order (not ranked separately)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                School:
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Schools</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Grade:
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Grades</option>
                <option value="9">9th Grade</option>
                <option value="10">10th Grade</option>
                <option value="11">11th Grade</option>
                <option value="12">12th Grade</option>
              </select>
            </div>

            {(selectedSchool !== 'all' || selectedGrade !== 'all') && (
              <button
                onClick={() => {
                  setSelectedSchool('all')
                  setSelectedGrade('all')
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-blue-600">
              Boys Top 50 Performers
              {selectedSchool !== 'all' && ` - ${schools.find(s => s.id === selectedSchool)?.name}`}
              {selectedGrade !== 'all' && ` - ${selectedGrade}th Grade`}
            </h2>
          </div>
          <PerformanceTable performances={boysPerformances} gender="Boys" />
        </div>

        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="px-6 py-4 bg-pink-50 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-pink-600">
              Girls Top 50 Performers
              {selectedSchool !== 'all' && ` - ${schools.find(s => s.id === selectedSchool)?.name}`}
              {selectedGrade !== 'all' && ` - ${selectedGrade}th Grade`}
            </h2>
          </div>
          <PerformanceTable performances={girlsPerformances} gender="Girls" />
        </div>

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