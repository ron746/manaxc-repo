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
  cif_section: string | null
  cif_division: string | null
  league: string | null
  subleague: string | null
}

interface Result {
  id: string
  time_cs: number
  place_overall: number | null
  athlete_id: string
  athlete_name: string
  athlete_grad_year: number
  school_id: string
  school_name: string
  school_cif_section: string | null
  school_cif_division: string | null
  school_league: string | null
  school_subleague: string | null
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
  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set([9, 10, 11, 12]))
  const [selectedCifSections, setSelectedCifSections] = useState<Set<string>>(new Set())
  const [selectedCifDivisions, setSelectedCifDivisions] = useState<Set<string>>(new Set())
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set())
  const [selectedSubleagues, setSelectedSubleagues] = useState<Set<string>>(new Set())
  const [targetCourseId, setTargetCourseId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'team' | 'individual'>('team')
  const [boysCurrentPage, setBoysCurrentPage] = useState(1)
  const [girlsCurrentPage, setGirlsCurrentPage] = useState(1)
  const [boysJumpToPage, setBoysJumpToPage] = useState<string>('')
  const [girlsJumpToPage, setGirlsJumpToPage] = useState<string>('')
  const RESULTS_PER_PAGE = 75

  // Exclusion state for hypothetical adjustments (unchecked = excluded)
  // Initialize with top 7 per team included (all others excluded)
  const [excludedAthletes, setExcludedAthletes] = useState<Set<string>>(new Set())
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    loadData()
  }, [meetId])

  // Helper function to calculate grade level from grad year
  const getGrade = (gradYear: number, meetDate: string) => {
    const meetYear = new Date(meetDate).getFullYear()
    const meetMonth = new Date(meetDate).getMonth()
    // Cross country season spans fall, so use next year if after June
    const seasonYear = meetMonth >= 6 ? meetYear + 1 : meetYear
    return 12 - (gradYear - seasonYear)
  }

  const getGradeLabel = (grade: number) => {
    if (grade === 9) return 'FR'
    if (grade === 10) return 'SO'
    if (grade === 11) return 'JR'
    if (grade === 12) return 'SR'
    return ''
  }

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
              grad_year,
              school:schools (
                id,
                name,
                cif_section,
                cif_division,
                league,
                subleague
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
              name: result.athlete.school.name,
              cif_section: result.athlete.school.cif_section,
              cif_division: result.athlete.school.cif_division,
              league: result.athlete.school.league,
              subleague: result.athlete.school.subleague
            })

            // Calculate normalized time (difficulty 5.0 baseline)
            const normalizedTime = Math.round(result.time_cs * (1 - (courseDifficulty - 5.0) * 0.02))

            results.push({
              id: result.id,
              time_cs: result.time_cs,
              place_overall: result.place_overall,
              athlete_id: result.athlete.id,
              athlete_name: result.athlete.name,
              athlete_grad_year: result.athlete.grad_year,
              school_id: result.athlete.school.id,
              school_name: result.athlete.school.name,
              school_cif_section: result.athlete.school.cif_section,
              school_cif_division: result.athlete.school.cif_division,
              school_league: result.athlete.school.league,
              school_subleague: result.athlete.school.subleague,
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

      // Extract unique values for new filters
      const cifSections = new Set<string>()
      const cifDivisions = new Set<string>()
      const leagues = new Set<string>()
      const subleagues = new Set<string>()

      schoolsList.forEach(school => {
        if (school.cif_section) cifSections.add(school.cif_section)
        if (school.cif_division) cifDivisions.add(school.cif_division)
        if (school.league) leagues.add(school.league)
        if (school.subleague) subleagues.add(school.subleague)
      })

      // Initialize selections
      setSelectedCourses(new Set(coursesList.map(c => c.id)))
      setSelectedSchools(new Set(schoolsList.map(s => s.id)))
      setSelectedCifSections(cifSections)
      setSelectedCifDivisions(cifDivisions)
      setSelectedLeagues(leagues)
      setSelectedSubleagues(subleagues)
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
    if (!meet) return []
    return allResults.filter(result => {
      const grade = getGrade(result.athlete_grad_year, meet.meet_date)

      // Apply new filters - if filter is empty, allow all (no filtering)
      const cifSectionMatch = selectedCifSections.size === 0 ||
        (result.school_cif_section && selectedCifSections.has(result.school_cif_section))
      const cifDivisionMatch = selectedCifDivisions.size === 0 ||
        (result.school_cif_division && selectedCifDivisions.has(result.school_cif_division))
      const leagueMatch = selectedLeagues.size === 0 ||
        (result.school_league && selectedLeagues.has(result.school_league))
      const subleagueMatch = selectedSubleagues.size === 0 ||
        (result.school_subleague && selectedSubleagues.has(result.school_subleague))

      return (
        selectedCourses.has(result.course_id) &&
        selectedGenders.has(result.race_gender as 'M' | 'F') &&
        selectedSchools.has(result.school_id) &&
        selectedGrades.has(grade) &&
        cifSectionMatch &&
        cifDivisionMatch &&
        leagueMatch &&
        subleagueMatch
      )
    })
  }, [allResults, selectedCourses, selectedGenders, selectedSchools, selectedGrades,
      selectedCifSections, selectedCifDivisions, selectedLeagues, selectedSubleagues, meet])

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

  // Initialize excluded athletes to include only top 7 per team
  useEffect(() => {
    if (!isInitialized && projectedResults.length > 0) {
      const toExclude = new Set<string>()

      // Group by school and gender
      const bySchoolGender = new Map<string, Result[]>()
      projectedResults.forEach(result => {
        const key = `${result.school_id}-${result.race_gender}`
        if (!bySchoolGender.has(key)) {
          bySchoolGender.set(key, [])
        }
        bySchoolGender.get(key)!.push(result)
      })

      // For each team, sort by normalized time and exclude runners 8+
      bySchoolGender.forEach((results) => {
        const sorted = results.sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)
        // Exclude runners 8 and beyond (keep top 7)
        sorted.slice(7).forEach(result => {
          toExclude.add(result.id)
        })
      })

      setExcludedAthletes(toExclude)
      setIsInitialized(true)
    }
  }, [projectedResults, isInitialized])

  // Calculate combined standings by gender
  const calculateStandings = (gender: 'M' | 'F') => {
    const genderResults = projectedResults
      .filter(r => r.race_gender === gender && !excludedAthletes.has(r.id))
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

  const boysStandings = useMemo(() => calculateStandings('M'), [projectedResults, excludedAthletes])
  const girlsStandings = useMemo(() => calculateStandings('F'), [projectedResults, excludedAthletes])

  // Calculate individual results with team points
  const calculateIndividualResults = (gender: 'M' | 'F') => {
    // Get all results for this gender
    const allGenderResults = projectedResults
      .filter(r => r.race_gender === gender)
      .sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)

    // Get only included results for scoring
    const includedResults = allGenderResults.filter(r => !excludedAthletes.has(r.id))

    // Group by school to track runner positions per team (only for included)
    const bySchool = new Map<string, number>()
    includedResults.forEach(result => {
      if (!bySchool.has(result.school_id)) {
        bySchool.set(result.school_id, 0)
      }
    })

    // Calculate places and team points for included athletes
    let teamPoints = 1
    const placesMap = new Map<string, { overall_place: number, team_points: number | null, runner_role: 'scorer' | 'displacer' | 'none' }>()

    includedResults.forEach((result, index) => {
      const teamRunnerCount = bySchool.get(result.school_id)!
      bySchool.set(result.school_id, teamRunnerCount + 1)

      const runnerPosition = teamRunnerCount + 1 // 1-indexed position on team

      let thisRunnerPoints = null
      let role: 'scorer' | 'displacer' | 'none' = 'none'

      if (runnerPosition <= 7) {
        // Runners 1-7 get team points
        thisRunnerPoints = teamPoints
        teamPoints++

        if (runnerPosition <= 5) {
          role = 'scorer'
        } else {
          role = 'displacer'
        }
      }

      placesMap.set(result.id, {
        overall_place: index + 1,
        team_points: thisRunnerPoints,
        runner_role: role
      })
    })

    // Now apply places to all athletes (excluded ones get null values)
    const resultsWithTeamPoints = allGenderResults.map(result => {
      const placeInfo = placesMap.get(result.id)

      return {
        ...result,
        overall_place: placeInfo?.overall_place || null,
        team_points: placeInfo?.team_points || null,
        runner_role: placeInfo?.runner_role || 'none',
        is_excluded: excludedAthletes.has(result.id)
      }
    })

    return resultsWithTeamPoints
  }

  const boysIndividualResults = useMemo(() => calculateIndividualResults('M'), [projectedResults, excludedAthletes])
  const girlsIndividualResults = useMemo(() => calculateIndividualResults('F'), [projectedResults, excludedAthletes])

  // Pagination for boys individual results
  const boysTotalPages = Math.ceil(boysIndividualResults.length / RESULTS_PER_PAGE)
  const boysStartIndex = (boysCurrentPage - 1) * RESULTS_PER_PAGE
  const boysEndIndex = boysStartIndex + RESULTS_PER_PAGE
  const currentBoysResults = boysIndividualResults.slice(boysStartIndex, boysEndIndex)

  // Pagination for girls individual results
  const girlsTotalPages = Math.ceil(girlsIndividualResults.length / RESULTS_PER_PAGE)
  const girlsStartIndex = (girlsCurrentPage - 1) * RESULTS_PER_PAGE
  const girlsEndIndex = girlsStartIndex + RESULTS_PER_PAGE
  const currentGirlsResults = girlsIndividualResults.slice(girlsStartIndex, girlsEndIndex)

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
      // All selected, deselect all
      setSelectedSchools(new Set())
    } else {
      // Some or none selected, select all
      setSelectedSchools(new Set(schools.map(s => s.id)))
    }
  }

  const toggleGrade = (grade: number) => {
    const newSet = new Set(selectedGrades)
    if (newSet.has(grade)) {
      newSet.delete(grade)
    } else {
      newSet.add(grade)
    }
    setSelectedGrades(newSet)
  }

  const toggleAllGrades = () => {
    if (selectedGrades.size === 4) {
      // All selected, deselect all
      setSelectedGrades(new Set())
    } else {
      // Some or none selected, select all
      setSelectedGrades(new Set([9, 10, 11, 12]))
    }
  }

  // Get unique values from schools for filter lists
  const uniqueCifSections = useMemo(() => {
    const sections = new Set<string>()
    schools.forEach(s => { if (s.cif_section) sections.add(s.cif_section) })
    return Array.from(sections).sort()
  }, [schools])

  const uniqueCifDivisions = useMemo(() => {
    const divisions = new Set<string>()
    schools.forEach(s => { if (s.cif_division) divisions.add(s.cif_division) })
    return Array.from(divisions).sort()
  }, [schools])

  const uniqueLeagues = useMemo(() => {
    const leagues = new Set<string>()
    schools.forEach(s => { if (s.league) leagues.add(s.league) })
    return Array.from(leagues).sort()
  }, [schools])

  const uniqueSubleagues = useMemo(() => {
    const subleagues = new Set<string>()
    schools.forEach(s => { if (s.subleague) subleagues.add(s.subleague) })
    return Array.from(subleagues).sort()
  }, [schools])

  const toggleCifSection = (section: string) => {
    const newSet = new Set(selectedCifSections)
    if (newSet.has(section)) {
      newSet.delete(section)
    } else {
      newSet.add(section)
    }
    setSelectedCifSections(newSet)
  }

  const toggleAllCifSections = () => {
    if (selectedCifSections.size === uniqueCifSections.length && uniqueCifSections.length > 0) {
      setSelectedCifSections(new Set())
    } else {
      setSelectedCifSections(new Set(uniqueCifSections))
    }
  }

  const toggleCifDivision = (division: string) => {
    const newSet = new Set(selectedCifDivisions)
    if (newSet.has(division)) {
      newSet.delete(division)
    } else {
      newSet.add(division)
    }
    setSelectedCifDivisions(newSet)
  }

  const toggleAllCifDivisions = () => {
    if (selectedCifDivisions.size === uniqueCifDivisions.length && uniqueCifDivisions.length > 0) {
      setSelectedCifDivisions(new Set())
    } else {
      setSelectedCifDivisions(new Set(uniqueCifDivisions))
    }
  }

  const toggleLeague = (league: string) => {
    const newSet = new Set(selectedLeagues)
    if (newSet.has(league)) {
      newSet.delete(league)
    } else {
      newSet.add(league)
    }
    setSelectedLeagues(newSet)
  }

  const toggleAllLeagues = () => {
    if (selectedLeagues.size === uniqueLeagues.length && uniqueLeagues.length > 0) {
      setSelectedLeagues(new Set())
    } else {
      setSelectedLeagues(new Set(uniqueLeagues))
    }
  }

  const toggleSubleague = (subleague: string) => {
    const newSet = new Set(selectedSubleagues)
    if (newSet.has(subleague)) {
      newSet.delete(subleague)
    } else {
      newSet.add(subleague)
    }
    setSelectedSubleagues(newSet)
  }

  const toggleAllSubleagues = () => {
    if (selectedSubleagues.size === uniqueSubleagues.length && uniqueSubleagues.length > 0) {
      setSelectedSubleagues(new Set())
    } else {
      setSelectedSubleagues(new Set(uniqueSubleagues))
    }
  }

  // Toggle athlete exclusion with 7-runner limit per team
  // Unchecked = excluded, Checked = included
  const toggleAthleteExclusion = (resultId: string, schoolId: string, gender: 'M' | 'F') => {
    const newExcluded = new Set(excludedAthletes)

    if (newExcluded.has(resultId)) {
      // Currently excluded, trying to include (check the box)
      // Check 7-runner limit: count how many from this team are already included
      const includedCount = projectedResults.filter(r =>
        r.race_gender === gender &&
        r.school_id === schoolId &&
        !newExcluded.has(r.id) &&
        r.id !== resultId // Don't count this athlete yet
      ).length

      if (includedCount < 7) {
        // Team has fewer than 7 included, can add this one
        newExcluded.delete(resultId)
      }
      // else: Team already has 7 included, don't allow adding this one (do nothing)
    } else {
      // Currently included, trying to exclude (uncheck the box)
      // Excluding is always allowed
      newExcluded.add(resultId)
    }

    setExcludedAthletes(newExcluded)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl text-zinc-900">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <button
          onClick={() => router.push(`/meets/${meetId}`)}
          className="flex items-center text-cyan-600 hover:text-cyan-700 mb-6"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Meet
        </button>

        <h1 className="text-4xl font-bold text-zinc-900 mb-2">Combined Race Projection</h1>
        {meet && (
          <p className="text-zinc-600 mb-8">
            {meet.name} • {new Date(meet.meet_date).toLocaleDateString()}
          </p>
        )}

        {/* Main Content with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-1/4 bg-white rounded-xl shadow-xl border border-zinc-200 p-6 self-start">
            <h3 className="text-xl font-bold text-zinc-900 mb-6">Filters</h3>

            {/* Target Course Selection */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-700 mb-3">Project Times to Course:</h4>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full bg-white border-2 border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 font-medium text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
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
              <h4 className="font-semibold text-zinc-700 mb-3">Include Races from Courses:</h4>
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                {courses.map(course => (
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

            {/* Gender Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-700 mb-3">Gender:</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedGenders.has('M')}
                    onChange={() => toggleGender('M')}
                    className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                  />
                  <span className="text-zinc-700">Boys</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedGenders.has('F')}
                    onChange={() => toggleGender('F')}
                    className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                  />
                  <span className="text-zinc-700">Girls</span>
                </label>
              </div>
            </div>

            {/* Grade Level Filter */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-zinc-700">Grade Levels:</h4>
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
                {[
                  { grade: 9, label: 'Freshmen' },
                  { grade: 10, label: 'Sophomores' },
                  { grade: 11, label: 'Juniors' },
                  { grade: 12, label: 'Seniors' }
                ].map(({ grade, label }) => (
                  <label key={grade} className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedGrades.has(grade)}
                      onChange={() => toggleGrade(grade)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-700 text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CIF Section Filter */}
            {uniqueCifSections.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-zinc-700">CIF Section:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCifSections.size === uniqueCifSections.length}
                      onChange={toggleAllCifSections}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="space-y-2">
                  {uniqueCifSections.map(section => (
                    <label key={section} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCifSections.has(section)}
                        onChange={() => toggleCifSection(section)}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{section}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* CIF Division Filter */}
            {uniqueCifDivisions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-zinc-700">CIF Division:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCifDivisions.size === uniqueCifDivisions.length}
                      onChange={toggleAllCifDivisions}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="space-y-2">
                  {uniqueCifDivisions.map(division => (
                    <label key={division} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCifDivisions.has(division)}
                        onChange={() => toggleCifDivision(division)}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{division}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* League Filter */}
            {uniqueLeagues.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-zinc-700">League:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedLeagues.size === uniqueLeagues.length}
                      onChange={toggleAllLeagues}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="space-y-2">
                  {uniqueLeagues.map(league => (
                    <label key={league} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedLeagues.has(league)}
                        onChange={() => toggleLeague(league)}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{league}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Subleague Filter */}
            {uniqueSubleagues.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-zinc-700">Subleague:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedSubleagues.size === uniqueSubleagues.length}
                      onChange={toggleAllSubleagues}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="space-y-2">
                  {uniqueSubleagues.map(subleague => (
                    <label key={subleague} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSubleagues.has(subleague)}
                        onChange={() => toggleSubleague(subleague)}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{subleague}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Schools Filter */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-zinc-700">Schools:</h4>
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedSchools.size === schools.length && schools.length > 0}
                    onChange={toggleAllSchools}
                    className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                  />
                  <span className="text-zinc-600 text-xs font-medium">Select All</span>
                </label>
              </div>
              <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
                {schools.map(school => (
                  <label key={school.id} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedSchools.has(school.id)}
                      onChange={() => toggleSchool(school.id)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-700 text-sm">{school.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Results Area */}
          <div className="lg:w-3/4 space-y-8">
            {/* View Mode Toggle */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setViewMode('individual')}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                  viewMode === 'individual'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-cyan-600 hover:text-cyan-600'
                }`}
              >
                Individual Projections
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                  viewMode === 'team'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-cyan-600 hover:text-cyan-600'
                }`}
              >
                Team Projections
              </button>
            </div>

            {/* Individual Results */}
            {viewMode === 'individual' && (
              <>
                {/* Boys Team Scores */}
                {selectedGenders.has('M') && boysStandings.length > 0 && (
                  <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden mb-8">
                    <div className="bg-blue-600 p-4">
                      <h2 className="text-2xl font-bold text-white">Boys Team Scores</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                            <th className="py-3 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-3 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-3 px-6 text-center font-bold text-zinc-900">Score</th>
                            <th className="py-3 px-6 text-center font-bold text-zinc-900">Avg Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boysStandings.filter(team => team.is_complete).map((team, index) => (
                            <tr key={team.school_id} className="border-b border-zinc-200 hover:bg-cyan-50 transition-colors">
                              <td className="py-3 px-6 text-center font-bold text-zinc-900">{index + 1}</td>
                              <td className="py-3 px-6">
                                <Link href={`/schools/${team.school_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
                                  {team.school_name}
                                </Link>
                              </td>
                              <td className="py-3 px-6 text-center font-bold text-cyan-600">{team.score}</td>
                              <td className="py-3 px-6 text-center font-mono text-zinc-900">
                                {formatTime(Math.round(team.team_time_cs / 5))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Girls Team Scores */}
                {selectedGenders.has('F') && girlsStandings.length > 0 && (
                  <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden mb-8">
                    <div className="bg-pink-600 p-4">
                      <h2 className="text-2xl font-bold text-white">Girls Team Scores</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                            <th className="py-3 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-3 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-3 px-6 text-center font-bold text-zinc-900">Score</th>
                            <th className="py-3 px-6 text-center font-bold text-zinc-900">Avg Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {girlsStandings.filter(team => team.is_complete).map((team, index) => (
                            <tr key={team.school_id} className="border-b border-zinc-200 hover:bg-cyan-50 transition-colors">
                              <td className="py-3 px-6 text-center font-bold text-zinc-900">{index + 1}</td>
                              <td className="py-3 px-6">
                                <Link href={`/schools/${team.school_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
                                  {team.school_name}
                                </Link>
                              </td>
                              <td className="py-3 px-6 text-center font-bold text-cyan-600">{team.score}</td>
                              <td className="py-3 px-6 text-center font-mono text-zinc-900">
                                {formatTime(Math.round(team.team_time_cs / 5))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedGenders.has('M') && meet && (
                  <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
                    <div className="bg-blue-600 p-4">
                      <h2 className="text-2xl font-bold text-white">Boys Individual Projections</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Grade</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Time</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Pace</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Pts</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Include</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentBoysResults.map((result) => {
                            const grade = getGrade(result.athlete_grad_year, meet.meet_date)
                            const targetCourse = courses.find(c => c.id === targetCourseId)
                            const distanceMiles = targetCourse ? targetCourse.distance_meters / 1609.34 : 5000 / 1609.34
                            const pacePerMile = result.time_cs / distanceMiles / 100 // convert to seconds
                            const paceMin = Math.floor(pacePerMile / 60)
                            const paceSec = Math.floor(pacePerMile % 60)

                            const isExcluded = (result as any).is_excluded

                            return (
                              <tr key={result.id} className={`border-b border-zinc-200 transition-colors ${isExcluded ? 'bg-zinc-100 opacity-60' : 'hover:bg-cyan-50'}`}>
                                <td className={`py-4 px-6 text-center font-bold ${isExcluded ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                  {isExcluded ? '—' : result.overall_place}
                                </td>
                                <td className="py-4 px-6">
                                  <Link href={`/athletes/${result.athlete_id}`} className={`hover:underline ${isExcluded ? 'text-zinc-500' : 'text-cyan-600 hover:text-cyan-700'}`}>
                                    {result.athlete_name}
                                  </Link>
                                </td>
                                <td className="py-4 px-6">
                                  <Link href={`/schools/${result.school_id}`} className={`hover:underline ${isExcluded ? 'text-zinc-500' : 'text-zinc-700 hover:text-cyan-600'}`}>
                                    {result.school_name}
                                  </Link>
                                </td>
                                <td className={`py-4 px-6 text-center ${isExcluded ? 'text-zinc-400' : 'text-zinc-700'}`}>{getGradeLabel(grade)}</td>
                                <td className={`py-4 px-6 text-center font-mono font-semibold ${isExcluded ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                  {formatTime(result.time_cs)}
                                </td>
                                <td className={`py-4 px-6 text-center font-mono ${isExcluded ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                  {paceMin}:{paceSec.toString().padStart(2, '0')}
                                </td>
                                <td className={`py-4 px-6 text-center ${isExcluded ? 'text-zinc-400' : ''}`}>
                                  {isExcluded ? (
                                    <span className="text-zinc-400 text-sm">—</span>
                                  ) : (
                                    <>
                                      {result.runner_role === 'scorer' && (
                                        <span className="font-bold text-cyan-600">{result.team_points}</span>
                                      )}
                                      {result.runner_role === 'displacer' && (
                                        <span className="font-semibold text-zinc-500">({result.team_points})</span>
                                      )}
                                      {result.runner_role === 'none' && (
                                        <span className="text-zinc-400 text-sm">—</span>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <input
                                    type="checkbox"
                                    checked={!excludedAthletes.has(result.id)}
                                    onChange={() => toggleAthleteExclusion(result.id, result.school_id, 'M')}
                                    className="form-checkbox h-5 w-5 text-cyan-600 rounded border-zinc-300 cursor-pointer"
                                    title={excludedAthletes.has(result.id) ? 'Include in team scoring' : 'Exclude from team scoring'}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Boys Pagination */}
                    {boysTotalPages > 1 && (
                      <div className="p-6 border-t border-zinc-200">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap justify-center items-center gap-2">
                            <button onClick={() => setBoysCurrentPage(1)} disabled={boysCurrentPage === 1} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="First page">««</button>
                            <button onClick={() => setBoysCurrentPage(Math.max(1, boysCurrentPage - 5))} disabled={boysCurrentPage <= 5} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="Back 5 pages">-5</button>
                            <button onClick={() => setBoysCurrentPage(Math.max(1, boysCurrentPage - 1))} disabled={boysCurrentPage === 1} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Previous</button>
                            <div className="flex gap-2">
                              {Array.from({ length: Math.min(7, boysTotalPages) }, (_, i) => {
                                let pageNum = boysTotalPages <= 7 ? i + 1 : boysCurrentPage <= 4 ? i + 1 : boysCurrentPage >= boysTotalPages - 3 ? boysTotalPages - 6 + i : boysCurrentPage - 3 + i
                                return <button key={i} onClick={() => setBoysCurrentPage(pageNum)} className={`px-4 py-2 rounded-lg transition-colors font-medium ${boysCurrentPage === pageNum ? 'bg-blue-600 text-white shadow-md' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>{pageNum}</button>
                              })}
                            </div>
                            <button onClick={() => setBoysCurrentPage(Math.min(boysTotalPages, boysCurrentPage + 1))} disabled={boysCurrentPage === boysTotalPages} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Next</button>
                            <button onClick={() => setBoysCurrentPage(Math.min(boysTotalPages, boysCurrentPage + 5))} disabled={boysCurrentPage > boysTotalPages - 5} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="Forward 5 pages">+5</button>
                            <button onClick={() => setBoysCurrentPage(boysTotalPages)} disabled={boysCurrentPage === boysTotalPages} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="Last page">»»</button>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-zinc-200">
                            <div className="text-sm text-zinc-600">Page <span className="font-semibold text-zinc-900">{boysCurrentPage}</span> of <span className="font-semibold text-zinc-900">{boysTotalPages}</span> • Showing {boysStartIndex + 1}-{Math.min(boysEndIndex, boysIndividualResults.length)} of <span className="font-semibold text-zinc-900">{boysIndividualResults.length}</span> runners</div>
                            <div className="flex items-center gap-2">
                              <label htmlFor="boysJumpToPage" className="text-sm font-medium text-zinc-700">Jump to page:</label>
                              <input id="boysJumpToPage" type="number" min="1" max={boysTotalPages} value={boysJumpToPage} onChange={(e) => setBoysJumpToPage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { const page = parseInt(boysJumpToPage); if (page >= 1 && page <= boysTotalPages) { setBoysCurrentPage(page); setBoysJumpToPage('') } } }} placeholder={`1-${boysTotalPages}`} className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <button onClick={() => { const page = parseInt(boysJumpToPage); if (page >= 1 && page <= boysTotalPages) { setBoysCurrentPage(page); setBoysJumpToPage('') } }} disabled={!boysJumpToPage || parseInt(boysJumpToPage) < 1 || parseInt(boysJumpToPage) > boysTotalPages} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">Go</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedGenders.has('F') && meet && (
                  <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
                    <div className="bg-pink-600 p-4">
                      <h2 className="text-2xl font-bold text-white">Girls Individual Projections</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Grade</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Time</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Pace</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Pts</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Include</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentGirlsResults.map((result) => {
                            const grade = getGrade(result.athlete_grad_year, meet.meet_date)
                            const targetCourse = courses.find(c => c.id === targetCourseId)
                            const distanceMiles = targetCourse ? targetCourse.distance_meters / 1609.34 : 5000 / 1609.34
                            const pacePerMile = result.time_cs / distanceMiles / 100 // convert to seconds
                            const paceMin = Math.floor(pacePerMile / 60)
                            const paceSec = Math.floor(pacePerMile % 60)

                            const isExcluded = (result as any).is_excluded

                            return (
                              <tr key={result.id} className={`border-b border-zinc-200 transition-colors ${isExcluded ? 'bg-zinc-100 opacity-60' : 'hover:bg-cyan-50'}`}>
                                <td className={`py-4 px-6 text-center font-bold ${isExcluded ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                  {isExcluded ? '—' : result.overall_place}
                                </td>
                                <td className="py-4 px-6">
                                  <Link href={`/athletes/${result.athlete_id}`} className={`hover:underline ${isExcluded ? 'text-zinc-500' : 'text-cyan-600 hover:text-cyan-700'}`}>
                                    {result.athlete_name}
                                  </Link>
                                </td>
                                <td className="py-4 px-6">
                                  <Link href={`/schools/${result.school_id}`} className={`hover:underline ${isExcluded ? 'text-zinc-500' : 'text-zinc-700 hover:text-cyan-600'}`}>
                                    {result.school_name}
                                  </Link>
                                </td>
                                <td className={`py-4 px-6 text-center ${isExcluded ? 'text-zinc-400' : 'text-zinc-700'}`}>{getGradeLabel(grade)}</td>
                                <td className={`py-4 px-6 text-center font-mono font-semibold ${isExcluded ? 'text-zinc-400' : 'text-zinc-900'}`}>
                                  {formatTime(result.time_cs)}
                                </td>
                                <td className={`py-4 px-6 text-center font-mono ${isExcluded ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                  {paceMin}:{paceSec.toString().padStart(2, '0')}
                                </td>
                                <td className={`py-4 px-6 text-center ${isExcluded ? 'text-zinc-400' : ''}`}>
                                  {isExcluded ? (
                                    <span className="text-zinc-400 text-sm">—</span>
                                  ) : (
                                    <>
                                      {result.runner_role === 'scorer' && (
                                        <span className="font-bold text-cyan-600">{result.team_points}</span>
                                      )}
                                      {result.runner_role === 'displacer' && (
                                        <span className="font-semibold text-zinc-500">({result.team_points})</span>
                                      )}
                                      {result.runner_role === 'none' && (
                                        <span className="text-zinc-400 text-sm">—</span>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <input
                                    type="checkbox"
                                    checked={!excludedAthletes.has(result.id)}
                                    onChange={() => toggleAthleteExclusion(result.id, result.school_id, 'F')}
                                    className="form-checkbox h-5 w-5 text-cyan-600 rounded border-zinc-300 cursor-pointer"
                                    title={excludedAthletes.has(result.id) ? 'Include in team scoring' : 'Exclude from team scoring'}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Girls Pagination */}
                    {girlsTotalPages > 1 && (
                      <div className="p-6 border-t border-zinc-200">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap justify-center items-center gap-2">
                            <button onClick={() => setGirlsCurrentPage(1)} disabled={girlsCurrentPage === 1} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="First page">««</button>
                            <button onClick={() => setGirlsCurrentPage(Math.max(1, girlsCurrentPage - 5))} disabled={girlsCurrentPage <= 5} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="Back 5 pages">-5</button>
                            <button onClick={() => setGirlsCurrentPage(Math.max(1, girlsCurrentPage - 1))} disabled={girlsCurrentPage === 1} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Previous</button>
                            <div className="flex gap-2">
                              {Array.from({ length: Math.min(7, girlsTotalPages) }, (_, i) => {
                                let pageNum = girlsTotalPages <= 7 ? i + 1 : girlsCurrentPage <= 4 ? i + 1 : girlsCurrentPage >= girlsTotalPages - 3 ? girlsTotalPages - 6 + i : girlsCurrentPage - 3 + i
                                return <button key={i} onClick={() => setGirlsCurrentPage(pageNum)} className={`px-4 py-2 rounded-lg transition-colors font-medium ${girlsCurrentPage === pageNum ? 'bg-pink-600 text-white shadow-md' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>{pageNum}</button>
                              })}
                            </div>
                            <button onClick={() => setGirlsCurrentPage(Math.min(girlsTotalPages, girlsCurrentPage + 1))} disabled={girlsCurrentPage === girlsTotalPages} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Next</button>
                            <button onClick={() => setGirlsCurrentPage(Math.min(girlsTotalPages, girlsCurrentPage + 5))} disabled={girlsCurrentPage > girlsTotalPages - 5} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="Forward 5 pages">+5</button>
                            <button onClick={() => setGirlsCurrentPage(girlsTotalPages)} disabled={girlsCurrentPage === girlsTotalPages} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium" title="Last page">»»</button>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-zinc-200">
                            <div className="text-sm text-zinc-600">Page <span className="font-semibold text-zinc-900">{girlsCurrentPage}</span> of <span className="font-semibold text-zinc-900">{girlsTotalPages}</span> • Showing {girlsStartIndex + 1}-{Math.min(girlsEndIndex, girlsIndividualResults.length)} of <span className="font-semibold text-zinc-900">{girlsIndividualResults.length}</span> runners</div>
                            <div className="flex items-center gap-2">
                              <label htmlFor="girlsJumpToPage" className="text-sm font-medium text-zinc-700">Jump to page:</label>
                              <input id="girlsJumpToPage" type="number" min="1" max={girlsTotalPages} value={girlsJumpToPage} onChange={(e) => setGirlsJumpToPage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { const page = parseInt(girlsJumpToPage); if (page >= 1 && page <= girlsTotalPages) { setGirlsCurrentPage(page); setGirlsJumpToPage('') } } }} placeholder={`1-${girlsTotalPages}`} className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
                              <button onClick={() => { const page = parseInt(girlsJumpToPage); if (page >= 1 && page <= girlsTotalPages) { setGirlsCurrentPage(page); setGirlsJumpToPage('') } }} disabled={!girlsJumpToPage || parseInt(girlsJumpToPage) < 1 || parseInt(girlsJumpToPage) > girlsTotalPages} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">Go</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Team Standings */}
            {viewMode === 'team' && (
              <>
          {selectedGenders.has('M') && (
            <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
              <div className="bg-blue-600 p-4">
                <h2 className="text-2xl font-bold text-white">Boys Combined Standings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Score</th>
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Time</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Top 5 Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boysStandings.map((team, index) => (
                      <tr key={team.school_id} className="border-b border-zinc-200 hover:bg-cyan-50 transition-colors">
                        <td className="py-4 px-6 text-center font-bold text-zinc-900">{index + 1}</td>
                        <td className="py-4 px-6">
                          <Link href={`/schools/${team.school_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
                            {team.school_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-cyan-600">
                          {team.is_complete ? team.score : 'Incomplete'}
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-zinc-900">
                          {team.is_complete ? formatTime(team.team_time_cs) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {team.scorers.map((scorer, i) => (
                              <span key={scorer.id} className="text-zinc-700 text-sm">
                                {i > 0 && '• '}
                                <Link href={`/athletes/${scorer.athlete_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
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
            <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
              <div className="bg-pink-600 p-4">
                <h2 className="text-2xl font-bold text-white">Girls Combined Standings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 bg-zinc-100">
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Score</th>
                      <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Time</th>
                      <th className="py-4 px-6 text-left font-bold text-zinc-900">Top 5 Scorers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {girlsStandings.map((team, index) => (
                      <tr key={team.school_id} className="border-b border-zinc-200 hover:bg-cyan-50 transition-colors">
                        <td className="py-4 px-6 text-center font-bold text-zinc-900">{index + 1}</td>
                        <td className="py-4 px-6">
                          <Link href={`/schools/${team.school_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
                            {team.school_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-cyan-600">
                          {team.is_complete ? team.score : 'Incomplete'}
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-zinc-900">
                          {team.is_complete ? formatTime(team.team_time_cs) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {team.scorers.map((scorer, i) => (
                              <span key={scorer.id} className="text-zinc-700 text-sm">
                                {i > 0 && '• '}
                                <Link href={`/athletes/${scorer.athlete_id}`} className="text-cyan-600 hover:text-cyan-700 hover:underline">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
