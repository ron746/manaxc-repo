'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

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

interface Season {
  season_year: number
}

interface Result {
  id: string
  time_cs: number
  place_overall: number | null
  athlete_id: string
  athlete_name: string
  school_id: string
  school_name: string
  meet_id: string
  meet_name: string
  meet_date: string
  race_id: string
  race_gender: string
  course_id: string
  season_year: number
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

export default function SeasonPage() {
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [allResults, setAllResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const [selectedGenders, setSelectedGenders] = useState<Set<'M' | 'F'>>(new Set(['M', 'F']))
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set())
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set())
  const [targetCourseId, setTargetCourseId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // First, load all courses directly
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name, difficulty_rating, distance_meters')
        .order('name', { ascending: true })

      const coursesList = coursesData?.map(c => ({
        id: c.id,
        name: c.name,
        difficulty_rating: c.difficulty_rating || 5.0,
        distance_meters: c.distance_meters
      })) || []

      setCourses(coursesList)

      // Load all schools directly
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name')
        .order('name', { ascending: true })

      const schoolsList = schoolsData?.map(s => ({
        id: s.id,
        name: s.name
      })) || []

      setSchools(schoolsList)

      // Load all meets to get seasons
      const { data: meetsData } = await supabase
        .from('meets')
        .select('season_year')
        .order('season_year', { ascending: false })

      const uniqueSeasons = Array.from(
        new Set(meetsData?.map(m => m.season_year).filter(Boolean))
      ).map(year => ({ season_year: year as number }))
      setSeasons(uniqueSeasons)

      // Get most recent season
      const mostRecentSeason = uniqueSeasons.length > 0 ? uniqueSeasons[0].season_year : null

      // Load results for the most recent season only (for performance)
      const { data: resultsData } = await supabase
        .from('results')
        .select(`
          id,
          time_cs,
          place_overall,
          athlete:athletes!inner (
            id,
            name,
            school:schools!inner (
              id,
              name
            )
          ),
          race:races!inner (
            id,
            gender,
            course_id,
            meet:meets!inner (
              id,
              name,
              meet_date,
              season_year
            ),
            courses (
              id,
              name,
              difficulty_rating
            )
          )
        `)
        .eq('race.meet.season_year', mostRecentSeason)

      const results: Result[] = []

      resultsData?.forEach((result: any) => {
        const race = result.race
        const meet = race?.meet
        const course = race?.courses
        const athlete = result.athlete
        const school = athlete?.school

        if (race && meet && athlete && school) {
          const courseDifficulty = course?.difficulty_rating || 5.0
          const normalizedTime = Math.round(result.time_cs * (1 - (courseDifficulty - 5.0) * 0.02))

          results.push({
            id: result.id,
            time_cs: result.time_cs,
            place_overall: result.place_overall,
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            school_id: school.id,
            school_name: school.name,
            meet_id: meet.id,
            meet_name: meet.name,
            meet_date: meet.meet_date,
            race_id: race.id,
            race_gender: race.gender,
            course_id: course?.id || race.course_id || '',
            season_year: meet.season_year,
            original_difficulty: courseDifficulty,
            normalized_time_cs: normalizedTime
          })
        }
      })

      setAllResults(results)

      // Initialize selections - only most recent season, all courses, NO schools (user must select)
      setSelectedCourses(new Set(coursesList.map(c => c.id)))
      setSelectedSchools(new Set()) // Empty - user must select schools
      setSelectedSeasons(mostRecentSeason ? new Set([mostRecentSeason]) : new Set())
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
        selectedSchools.has(result.school_id) &&
        selectedSeasons.has(result.season_year)
      )
    })
  }, [allResults, selectedCourses, selectedGenders, selectedSchools, selectedSeasons])

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

  const toggleAllSchools = () => {
    if (selectedSchools.size === schools.length) {
      // All selected - deselect all
      setSelectedSchools(new Set())
    } else {
      // Some or none selected - select all
      setSelectedSchools(new Set(schools.map(s => s.id)))
    }
  }

  const toggleSeason = async (seasonYear: number) => {
    const newSet = new Set(selectedSeasons)
    if (newSet.has(seasonYear)) {
      newSet.delete(seasonYear)
    } else {
      newSet.add(seasonYear)

      // Load results for this season if we don't have them yet
      const hasResultsForSeason = allResults.some(r => r.season_year === seasonYear)
      if (!hasResultsForSeason) {
        try {
          const { data: resultsData } = await supabase
            .from('results')
            .select(`
              id,
              time_cs,
              place_overall,
              athlete:athletes!inner (
                id,
                name,
                school:schools!inner (
                  id,
                  name
                )
              ),
              race:races!inner (
                id,
                gender,
                course_id,
                meet:meets!inner (
                  id,
                  name,
                  meet_date,
                  season_year
                ),
                courses (
                  id,
                  name,
                  difficulty_rating
                )
              )
            `)
            .eq('race.meet.season_year', seasonYear)

          const newResults: Result[] = []

          resultsData?.forEach((result: any) => {
            const race = result.race
            const meet = race?.meet
            const course = race?.courses
            const athlete = result.athlete
            const school = athlete?.school

            if (race && meet && athlete && school) {
              const courseDifficulty = course?.difficulty_rating || 5.0
              const normalizedTime = Math.round(result.time_cs * (1 - (courseDifficulty - 5.0) * 0.02))

              newResults.push({
                id: result.id,
                time_cs: result.time_cs,
                place_overall: result.place_overall,
                athlete_id: athlete.id,
                athlete_name: athlete.name,
                school_id: school.id,
                school_name: school.name,
                meet_id: meet.id,
                meet_name: meet.name,
                meet_date: meet.meet_date,
                race_id: race.id,
                race_gender: race.gender,
                course_id: course?.id || race.course_id || '',
                season_year: meet.season_year,
                original_difficulty: courseDifficulty,
                normalized_time_cs: normalizedTime
              })
            }
          })

          setAllResults(prev => [...prev, ...newResults])
        } catch (error) {
          console.error('Error loading season data:', error)
        }
      }
    }
    setSelectedSeasons(newSet)
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
        <h1 className="text-4xl font-bold text-white mb-2">Season Combined Race Projection</h1>
        <p className="text-zinc-400 mb-8">
          Compare performances across multiple seasons and schools on any course
        </p>

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

            {/* Seasons Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-300 mb-3">Seasons:</h4>
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                {seasons.map(season => (
                  <label key={season.season_year} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedSeasons.has(season.season_year)}
                      onChange={() => toggleSeason(season.season_year)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                    />
                    <span className="text-zinc-300 text-sm">{season.season_year}</span>
                  </label>
                ))}
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-zinc-300">Schools:</h4>
                <button
                  onClick={toggleAllSchools}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {selectedSchools.size === schools.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
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
                  <p className="text-zinc-400 text-sm mt-1">
                    {filteredResults.filter(r => r.race_gender === 'M').length} performances from {selectedSeasons.size} season(s)
                  </p>
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
                  <p className="text-zinc-400 text-sm mt-1">
                    {filteredResults.filter(r => r.race_gender === 'F').length} performances from {selectedSeasons.size} season(s)
                  </p>
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
