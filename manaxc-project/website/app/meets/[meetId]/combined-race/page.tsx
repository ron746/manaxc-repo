'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'
import { ChevronLeft } from 'lucide-react'

interface Meet {
  id: string
  name: string
  meet_date: string
  venue: {
    name: string
  } | null
}

interface Course {
  id: string
  name: string
  difficulty_rating: number
  distance_meters: number
}

interface School {
  id: string
  name: string
}

interface Result {
  id: string
  time_cs: number
  place_overall: number | null
  athlete_id: string
  athlete_name: string
  school_id: string
  school_name: string
  race_id: string
  race_gender: string
  course_id: string
  original_difficulty: number
  normalized_time_cs: number
}

interface TeamScore {
  school_id: string
  school_name: string
  score: number
  team_time_cs: number
  scorers: Result[]
  displacement_runners: Result[]
  is_complete: boolean
  sixth_runner_place?: number
}

export default function CombinedRacePage() {
  const params = useParams()
  const router = useRouter()
  const meetId = params.meetId as string

  const [meet, setMeet] = useState<Meet | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [allResults, setAllResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const [selectedGenders, setSelectedGenders] = useState<Set<'M' | 'F'>>(new Set(['M', 'F']))
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set())
  const [targetCourseId, setTargetCourseId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [meetId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load meet info
      const { data: meetData } = await supabase
        .from('meets')
        .select(`
          id,
          name,
          meet_date,
          venue:venues(name)
        `)
        .eq('id', meetId)
        .single()

      if (meetData) setMeet(meetData as any)

      // Load all races with results
      const { data: racesData } = await supabase
        .from('races')
        .select(`
          id,
          name,
          gender,
          distance_meters,
          course_id,
          courses (
            id,
            name,
            difficulty_rating,
            distance_meters
          ),
          results (
            id,
            time_cs,
            place_overall,
            athlete:athletes (
              id,
              name,
              school:schools (
                id,
                name
              )
            )
          )
        `)
        .eq('meet_id', meetId)

      if (!racesData) return

      // Extract unique courses and schools
      const coursesMap = new Map<string, Course>()
      const schoolsMap = new Map<string, School>()
      const results: Result[] = []

      racesData.forEach(race => {
        const course = race.courses as any
        if (course) {
          coursesMap.set(course.id, {
            id: course.id,
            name: course.name,
            difficulty_rating: course.difficulty_rating || 5.0,
            distance_meters: course.distance_meters
          })
        }

        const courseDifficulty = course?.difficulty_rating || 5.0

        race.results?.forEach((result: any) => {
          if (result.athlete?.school) {
            schoolsMap.set(result.athlete.school.id, {
              id: result.athlete.school.id,
              name: result.athlete.school.name
            })

            // Calculate normalized time (difficulty 5.0 baseline)
            const normalizedTime = Math.round(result.time_cs * (1 - (courseDifficulty - 5.0) * 0.02))

            results.push({
              id: result.id,
              time_cs: result.time_cs,
              place_overall: result.place_overall,
              athlete_id: result.athlete.id,
              athlete_name: result.athlete.name,
              school_id: result.athlete.school.id,
              school_name: result.athlete.school.name,
              race_id: race.id,
              race_gender: race.gender,
              course_id: course?.id || '',
              original_difficulty: courseDifficulty,
              normalized_time_cs: normalizedTime
            })
          }
        })
      })

      const coursesList = Array.from(coursesMap.values())
      const schoolsList = Array.from(schoolsMap.values())

      setCourses(coursesList)
      setSchools(schoolsList)
      setAllResults(results)

      // Initialize selections
      setSelectedCourses(new Set(coursesList.map(c => c.id)))
      setSelectedSchools(new Set(schoolsList.map(s => s.id)))
      if (coursesList.length > 0) {
        setTargetCourseId(coursesList[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter results based on selections
  const filteredResults = useMemo(() => {
    return allResults.filter(result => {
      return (
        selectedCourses.has(result.course_id) &&
        selectedGenders.has(result.race_gender as 'M' | 'F') &&
        selectedSchools.has(result.school_id)
      )
    })
  }, [allResults, selectedCourses, selectedGenders, selectedSchools])

  // Project times to target course
  const projectedResults = useMemo(() => {
    if (!targetCourseId) return filteredResults

    const targetCourse = courses.find(c => c.id === targetCourseId)
    if (!targetCourse) return filteredResults

    return filteredResults.map(result => {
      // Project normalized time to target course difficulty
      const projectedTime = Math.round(
        result.normalized_time_cs / (1 - (targetCourse.difficulty_rating - 5.0) * 0.02)
      )

      return {
        ...result,
        time_cs: projectedTime
      }
    })
  }, [filteredResults, targetCourseId, courses])

  // Calculate combined standings by gender
  const calculateStandings = (gender: 'M' | 'F') => {
    const genderResults = projectedResults
      .filter(r => r.race_gender === gender)
      .sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)

    // Assign overall places
    const resultsWithPlaces = genderResults.map((result, index) => ({
      ...result,
      combined_place: index + 1
    }))

    // Group by school
    const bySchool = new Map<string, typeof resultsWithPlaces>()
    resultsWithPlaces.forEach(result => {
      if (!bySchool.has(result.school_id)) {
        bySchool.set(result.school_id, [])
      }
      bySchool.get(result.school_id)!.push(result)
    })

    // Calculate team scores
    const teamScores: TeamScore[] = []
    bySchool.forEach((schoolResults, schoolId) => {
      const sortedByPlace = [...schoolResults].sort((a, b) => a.combined_place - b.combined_place)
      const scorers = sortedByPlace.slice(0, 5)
      const displacers = sortedByPlace.slice(5, 7)

      if (scorers.length >= 5) {
        const score = scorers.reduce((sum, r) => sum + r.combined_place, 0)
        const teamTime = scorers.reduce((sum, r) => sum + r.time_cs, 0)

        teamScores.push({
          school_id: schoolId,
          school_name: schoolResults[0].school_name,
          score,
          team_time_cs: teamTime,
          scorers,
          displacement_runners: displacers,
          is_complete: true,
          sixth_runner_place: displacers[0]?.combined_place
        })
      } else {
        teamScores.push({
          school_id: schoolId,
          school_name: schoolResults[0].school_name,
          score: 0,
          team_time_cs: 0,
          scorers: sortedByPlace,
          displacement_runners: [],
          is_complete: false
        })
      }
    })

    // Sort teams by score (tiebreaker: 6th runner)
    return teamScores.sort((a, b) => {
      if (!a.is_complete && !b.is_complete) return 0
      if (!a.is_complete) return 1
      if (!b.is_complete) return -1
      if (a.score !== b.score) return a.score - b.score
      if (a.sixth_runner_place && b.sixth_runner_place) {
        return a.sixth_runner_place - b.sixth_runner_place
      }
      return 0
    })
  }

  const boysStandings = useMemo(() => calculateStandings('M'), [projectedResults])
  const girlsStandings = useMemo(() => calculateStandings('F'), [projectedResults])

  const toggleCourse = (courseId: string) => {
    const newSet = new Set(selectedCourses)
    if (newSet.has(courseId)) {
      newSet.delete(courseId)
    } else {
      newSet.add(courseId)
    }
    setSelectedCourses(newSet)
  }

  const toggleGender = (gender: 'M' | 'F') => {
    const newSet = new Set(selectedGenders)
    if (newSet.has(gender)) {
      newSet.delete(gender)
    } else {
      newSet.add(gender)
    }
    setSelectedGenders(newSet)
  }

  const toggleSchool = (schoolId: string) => {
    const newSet = new Set(selectedSchools)
    if (newSet.has(schoolId)) {
      newSet.delete(schoolId)
    } else {
      newSet.add(schoolId)
    }
    setSelectedSchools(newSet)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <button
          onClick={() => router.push(`/meets/${meetId}`)}
          className="flex items-center text-cyan-400 hover:text-cyan-300 mb-6"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Meet
        </button>

        <h1 className="text-4xl font-bold text-white mb-2">Combined Race Projection</h1>
        {meet && (
          <p className="text-zinc-400 mb-8">
            {meet.name} • {new Date(meet.meet_date).toLocaleDateString()}
          </p>
        )}

        {/* Main Content with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-1/4 bg-zinc-800/50 rounded-lg border border-zinc-700 p-6 self-start">
            <h3 className="text-xl font-bold text-white mb-6">Filters</h3>

            {/* Target Course Selection */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-300 mb-3">Project Times to Course:</h4>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name} (Diff: {course.difficulty_rating.toFixed(1)})
                  </option>
                ))}
              </select>
            </div>

            {/* Courses Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-300 mb-3">Include Races from Courses:</h4>
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                {courses.map(course => (
                  <label key={course.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedCourses.has(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                    />
                    <span className="text-zinc-300 text-sm">{course.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Gender Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-300 mb-3">Gender:</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedGenders.has('M')}
                    onChange={() => toggleGender('M')}
                    className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                  />
                  <span className="text-zinc-300">Boys</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedGenders.has('F')}
                    onChange={() => toggleGender('F')}
                    className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                  />
                  <span className="text-zinc-300">Girls</span>
                </label>
              </div>
            </div>

            {/* Schools Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-300 mb-3">Schools:</h4>
              <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
                {schools.map(school => (
                  <label key={school.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedSchools.has(school.id)}
                      onChange={() => toggleSchool(school.id)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                    />
                    <span className="text-zinc-300 text-sm">{school.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Combined Standings */}
          <div className="lg:w-3/4 space-y-8">
          {selectedGenders.has('M') && (
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
              <div className="bg-blue-600/20 border-b border-zinc-700 p-4">
                <h2 className="text-2xl font-bold text-white">Boys Combined Standings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-900/50">
                      <th className="py-4 px-6 text-center font-bold text-white">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-white">School</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Score</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Team Time</th>
                      <th className="py-4 px-6 text-left font-bold text-white">Top 5 Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boysStandings.map((team, index) => (
                      <tr key={team.school_id} className="border-b border-zinc-700 hover:bg-zinc-800/30">
                        <td className="py-4 px-6 text-center font-bold text-zinc-400">{index + 1}</td>
                        <td className="py-4 px-6">
                          <Link href={`/schools/${team.school_id}`} className="text-cyan-400 hover:text-cyan-300">
                            {team.school_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-cyan-400">
                          {team.is_complete ? team.score : 'Incomplete'}
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-zinc-300">
                          {team.is_complete ? formatTime(team.team_time_cs) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {team.scorers.map((scorer, i) => (
                              <span key={scorer.id} className="text-zinc-300 text-sm">
                                {i > 0 && '• '}
                                <Link href={`/athletes/${scorer.athlete_id}`} className="text-cyan-400 hover:text-cyan-300">
                                  {scorer.athlete_name}
                                </Link>
                                {' '}({(scorer as any).combined_place})
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedGenders.has('F') && (
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
              <div className="bg-pink-600/20 border-b border-zinc-700 p-4">
                <h2 className="text-2xl font-bold text-white">Girls Combined Standings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-900/50">
                      <th className="py-4 px-6 text-center font-bold text-white">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-white">School</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Score</th>
                      <th className="py-4 px-6 text-center font-bold text-white">Team Time</th>
                      <th className="py-4 px-6 text-left font-bold text-white">Top 5 Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {girlsStandings.map((team, index) => (
                      <tr key={team.school_id} className="border-b border-zinc-700 hover:bg-zinc-800/30">
                        <td className="py-4 px-6 text-center font-bold text-zinc-400">{index + 1}</td>
                        <td className="py-4 px-6">
                          <Link href={`/schools/${team.school_id}`} className="text-cyan-400 hover:text-cyan-300">
                            {team.school_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-cyan-400">
                          {team.is_complete ? team.score : 'Incomplete'}
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-zinc-300">
                          {team.is_complete ? formatTime(team.team_time_cs) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {team.scorers.map((scorer, i) => (
                              <span key={scorer.id} className="text-zinc-300 text-sm">
                                {i > 0 && '• '}
                                <Link href={`/athletes/${scorer.athlete_id}`} className="text-cyan-400 hover:text-cyan-300">
                                  {scorer.athlete_name}
                                </Link>
                                {' '}({(scorer as any).combined_place})
                              </span>
                            ))}
                          </div>
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
      </div>
    </div>
  )
}
