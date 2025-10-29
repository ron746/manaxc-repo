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
  cif_section: string | null
  cif_division: string | null
  league: string | null
  subleague: string | null
}

interface Season {
  season_year: number
}

interface Athlete {
  id: string
  name: string
  school_id: string
  school_name: string
  school_cif_section: string | null
  school_cif_division: string | null
  school_league: string | null
  school_subleague: string | null
  gender: string
  season_best_cs: number
  normalized_time_cs: number
  season_year: number
  race_distance_meters: number
}

interface TeamScore {
  school_id: string
  school_name: string
  score: number
  team_time_cs: number
  scorers: (Athlete & { combined_place: number })[]
  displacement_runners: (Athlete & { combined_place: number })[]
  is_complete: boolean
  sixth_runner_place?: number
}

export default function SeasonPage() {
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [bestType, setBestType] = useState<'season' | 'alltime'>('season')
  const [selectedGenders, setSelectedGenders] = useState<Set<'M' | 'F'>>(new Set(['M', 'F']))
  const [selectedCifSections, setSelectedCifSections] = useState<Set<string>>(new Set())
  const [selectedCifDivisions, setSelectedCifDivisions] = useState<Set<string>>(new Set())
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set())
  const [selectedSubleagues, setSelectedSubleagues] = useState<Set<string>>(new Set())
  const [includeCifSectionNulls, setIncludeCifSectionNulls] = useState(false)
  const [includeCifDivisionNulls, setIncludeCifDivisionNulls] = useState(false)
  const [includeLeagueNulls, setIncludeLeagueNulls] = useState(false)
  const [includeSubleagueNulls, setIncludeSubleagueNulls] = useState(false)
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set())
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set())
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [targetCourseId, setTargetCourseId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'team' | 'individual'>('team')
  const [boysCurrentPage, setBoysCurrentPage] = useState(1)
  const [girlsCurrentPage, setGirlsCurrentPage] = useState(1)
  const [boysJumpToPage, setBoysJumpToPage] = useState<string>('')
  const [girlsJumpToPage, setGirlsJumpToPage] = useState<string>('')
  const RESULTS_PER_PAGE = 75

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load all courses
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

      // Load all schools
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name, cif_section, cif_division, league, subleague')
        .order('name', { ascending: true })

      const schoolsList = schoolsData?.map(s => ({
        id: s.id,
        name: s.name,
        cif_section: s.cif_section,
        cif_division: s.cif_division,
        league: s.league,
        subleague: s.subleague
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

      // Load results for the most recent season
      if (mostRecentSeason) {
        await loadSeasonResults([mostRecentSeason])
      }

      // Initialize selections
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

  const loadSeasonResults = async (seasonYears: number[], isAllTime: boolean = false) => {
    try {
      const athletes: Athlete[] = []

      if (isAllTime) {
        // Load all-time best times from optimized table
        // Get the best all-time normalized time for each athlete across all seasons
        const { data: bestTimesData } = await supabase
          .from('athlete_best_times')
          .select(`
            athlete_id,
            alltime_best_time_cs,
            alltime_best_normalized_cs,
            alltime_best_race_distance_meters,
            season_year,
            athlete:athletes!inner (
              id,
              name,
              gender,
              school:schools!inner (
                id,
                name,
                cif_section,
                cif_division,
                league,
                subleague
              )
            )
          `)

        // Group by athlete_id and find the absolute best across all seasons
        const athleteMap = new Map<string, any>()
        bestTimesData?.forEach((record: any) => {
          const existing = athleteMap.get(record.athlete_id)
          if (!existing || record.alltime_best_normalized_cs < existing.alltime_best_normalized_cs) {
            athleteMap.set(record.athlete_id, record)
          }
        })

        athleteMap.forEach((record) => {
          const athlete = record.athlete
          const school = athlete?.school

          if (athlete && school) {
            athletes.push({
              id: athlete.id,
              name: athlete.name,
              school_id: school.id,
              school_name: school.name,
              school_cif_section: school.cif_section,
              school_cif_division: school.cif_division,
              school_league: school.league,
              school_subleague: school.subleague,
              gender: athlete.gender,
              season_best_cs: record.alltime_best_time_cs,
              normalized_time_cs: record.alltime_best_normalized_cs,
              season_year: record.season_year,
              race_distance_meters: record.alltime_best_race_distance_meters
            })
          }
        })
      } else {
        // Load season-best times from optimized table for selected seasons
        const { data: bestTimesData } = await supabase
          .from('athlete_best_times')
          .select(`
            athlete_id,
            season_year,
            season_best_time_cs,
            season_best_normalized_cs,
            season_best_race_distance_meters,
            athlete:athletes!inner (
              id,
              name,
              gender,
              school:schools!inner (
                id,
                name,
                cif_section,
                cif_division,
                league,
                subleague
              )
            )
          `)
          .in('season_year', seasonYears)

        bestTimesData?.forEach((record: any) => {
          const athlete = record.athlete
          const school = athlete?.school

          if (athlete && school) {
            athletes.push({
              id: athlete.id,
              name: athlete.name,
              school_id: school.id,
              school_name: school.name,
              school_cif_section: school.cif_section,
              school_cif_division: school.cif_division,
              school_league: school.league,
              school_subleague: school.subleague,
              gender: athlete.gender,
              season_best_cs: record.season_best_time_cs,
              normalized_time_cs: record.season_best_normalized_cs,
              season_year: record.season_year,
              race_distance_meters: record.season_best_race_distance_meters
            })
          }
        })
      }

      setAllAthletes(athletes)
      // Auto-select all athletes initially
      setSelectedAthletes(new Set(athletes.map(a => a.id)))
    } catch (error) {
      console.error('Error loading season results:', error)
    }
  }

  // Reload results when seasons or best type changes
  useEffect(() => {
    if (bestType === 'alltime') {
      loadSeasonResults([], true)
    } else if (selectedSeasons.size > 0) {
      loadSeasonResults(Array.from(selectedSeasons), false)
    }
  }, [selectedSeasons, bestType])

  // Filter athletes based on selections
  const filteredAthletes = useMemo(() => {
    return allAthletes.filter(athlete => {
      // For season-best, only include athletes from selected seasons
      // For all-time, include all athletes regardless of season
      const seasonCheck = bestType === 'alltime' || selectedSeasons.has(athlete.season_year)

      const cifSectionMatch = selectedCifSections.size === 0 ||
        (athlete.school_cif_section && selectedCifSections.has(athlete.school_cif_section)) ||
        (!athlete.school_cif_section && includeCifSectionNulls)
      const cifDivisionMatch = selectedCifDivisions.size === 0 ||
        (athlete.school_cif_division && selectedCifDivisions.has(athlete.school_cif_division)) ||
        (!athlete.school_cif_division && includeCifDivisionNulls)
      const leagueMatch = selectedLeagues.size === 0 ||
        (athlete.school_league && selectedLeagues.has(athlete.school_league)) ||
        (!athlete.school_league && includeLeagueNulls)
      const subleagueMatch = selectedSubleagues.size === 0 ||
        (athlete.school_subleague && selectedSubleagues.has(athlete.school_subleague)) ||
        (!athlete.school_subleague && includeSubleagueNulls)

      return (
        selectedGenders.has(athlete.gender as 'M' | 'F') &&
        cifSectionMatch &&
        cifDivisionMatch &&
        leagueMatch &&
        subleagueMatch &&
        selectedSchools.has(athlete.school_id) &&
        seasonCheck &&
        selectedAthletes.has(athlete.id)
      )
    })
  }, [allAthletes, selectedGenders, selectedCifSections, selectedCifDivisions, selectedLeagues,
      selectedSubleagues, includeCifSectionNulls, includeCifDivisionNulls, includeLeagueNulls,
      includeSubleagueNulls, selectedSchools, selectedSeasons, selectedAthletes, bestType])

  // Project times to target course
  const projectedAthletes = useMemo(() => {
    if (!targetCourseId) return filteredAthletes

    const targetCourse = courses.find(c => c.id === targetCourseId)
    if (!targetCourse) return filteredAthletes

    const METERS_PER_MILE = 1609.344

    return filteredAthletes.map(athlete => {
      // normalized_time_cs is a track mile time (1609.344m at difficulty 1.0)
      // To project to target course:
      // 1. Convert to pace per meter: normalized_time_cs / 1609.344
      // 2. Scale to target distance: pace_per_meter * target_distance_meters
      // 3. Apply target difficulty: result * target_difficulty_rating

      const pacePerMeter = athlete.normalized_time_cs / METERS_PER_MILE
      const projectedTime = Math.round(
        pacePerMeter * targetCourse.distance_meters * targetCourse.difficulty_rating
      )

      return {
        ...athlete,
        season_best_cs: projectedTime
      }
    })
  }, [filteredAthletes, targetCourseId, courses])

  // Limit to 7 runners per school and calculate standings
  const calculateStandings = (gender: 'M' | 'F') => {
    const genderAthletes = projectedAthletes
      .filter(a => a.gender === gender)
      .sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)

    // Group by school and take top 7 per school
    const bySchool = new Map<string, typeof genderAthletes>()
    genderAthletes.forEach(athlete => {
      if (!bySchool.has(athlete.school_id)) {
        bySchool.set(athlete.school_id, [])
      }
      const schoolAthletes = bySchool.get(athlete.school_id)!
      if (schoolAthletes.length < 7) {
        schoolAthletes.push(athlete)
      }
    })

    // Flatten and assign overall places
    const allCompetingAthletes = Array.from(bySchool.values())
      .flat()
      .sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)

    const resultsWithPlaces = allCompetingAthletes.map((athlete, index) => ({
      ...athlete,
      combined_place: index + 1
    }))

    // Group by school for scoring
    const schoolResults = new Map<string, typeof resultsWithPlaces>()
    resultsWithPlaces.forEach(result => {
      if (!schoolResults.has(result.school_id)) {
        schoolResults.set(result.school_id, [])
      }
      schoolResults.get(result.school_id)!.push(result)
    })

    // Calculate team scores
    const teamScores: TeamScore[] = []
    schoolResults.forEach((athletes, schoolId) => {
      const sortedByPlace = [...athletes].sort((a, b) => a.combined_place - b.combined_place)
      const scorers = sortedByPlace.slice(0, 5)
      const displacers = sortedByPlace.slice(5, 7)

      if (scorers.length >= 5) {
        const score = scorers.reduce((sum, r) => sum + r.combined_place, 0)
        const teamTime = scorers.reduce((sum, r) => sum + r.season_best_cs, 0)

        teamScores.push({
          school_id: schoolId,
          school_name: athletes[0].school_name,
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
          school_name: athletes[0].school_name,
          score: 0,
          team_time_cs: 0,
          scorers: sortedByPlace,
          displacement_runners: [],
          is_complete: false
        })
      }
    })

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

  const boysStandings = useMemo(() => calculateStandings('M'), [projectedAthletes])
  const girlsStandings = useMemo(() => calculateStandings('F'), [projectedAthletes])

  // Calculate individual results with team points
  const calculateIndividualResults = (gender: 'M' | 'F') => {
    const genderAthletes = projectedAthletes
      .filter(a => a.gender === gender)
      .sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)

    // Group by school and take top 7 per school
    const bySchool = new Map<string, typeof genderAthletes>()
    genderAthletes.forEach(athlete => {
      if (!bySchool.has(athlete.school_id)) {
        bySchool.set(athlete.school_id, [])
      }
      const schoolAthletes = bySchool.get(athlete.school_id)!
      if (schoolAthletes.length < 7) {
        schoolAthletes.push(athlete)
      }
    })

    // Flatten and sort by normalized time
    const competingAthletes = Array.from(bySchool.values())
      .flat()
      .sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)

    // Track runner positions per team
    const teamRunnerCounts = new Map<string, number>()
    competingAthletes.forEach(athlete => {
      if (!teamRunnerCounts.has(athlete.school_id)) {
        teamRunnerCounts.set(athlete.school_id, 0)
      }
    })

    let teamPoints = 1
    const resultsWithTeamPoints = competingAthletes.map((athlete, index) => {
      const runnerCount = teamRunnerCounts.get(athlete.school_id)!
      teamRunnerCounts.set(athlete.school_id, runnerCount + 1)

      const runnerPosition = runnerCount + 1

      let thisRunnerPoints = null
      let role: 'scorer' | 'displacer' | 'none' = 'none'

      if (runnerPosition <= 7) {
        thisRunnerPoints = teamPoints
        teamPoints++

        if (runnerPosition <= 5) {
          role = 'scorer'
        } else {
          role = 'displacer'
        }
      }

      return {
        ...athlete,
        overall_place: index + 1,
        team_points: thisRunnerPoints,
        runner_role: role
      }
    })

    return resultsWithTeamPoints
  }

  const boysIndividualResults = useMemo(() => calculateIndividualResults('M'), [projectedAthletes])
  const girlsIndividualResults = useMemo(() => calculateIndividualResults('F'), [projectedAthletes])

  // Pagination
  const boysTotalPages = Math.ceil(boysIndividualResults.length / RESULTS_PER_PAGE)
  const boysStartIndex = (boysCurrentPage - 1) * RESULTS_PER_PAGE
  const boysEndIndex = boysStartIndex + RESULTS_PER_PAGE
  const currentBoysResults = boysIndividualResults.slice(boysStartIndex, boysEndIndex)

  const girlsTotalPages = Math.ceil(girlsIndividualResults.length / RESULTS_PER_PAGE)
  const girlsStartIndex = (girlsCurrentPage - 1) * RESULTS_PER_PAGE
  const girlsEndIndex = girlsStartIndex + RESULTS_PER_PAGE
  const currentGirlsResults = girlsIndividualResults.slice(girlsStartIndex, girlsEndIndex)

  // Get available athletes by school for selection
  const getAvailableAthletes = (schoolId: string, gender: 'M' | 'F') => {
    return allAthletes
      .filter(a =>
        a.school_id === schoolId &&
        a.gender === gender &&
        selectedSeasons.has(a.season_year)
      )
      .sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)
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
      setSelectedSchools(new Set())
    } else {
      setSelectedSchools(new Set(schools.map(s => s.id)))
    }
  }

  const toggleCifSection = (section: string) => {
    const newSet = new Set(selectedCifSections)
    if (newSet.has(section)) {
      newSet.delete(section)
    } else {
      newSet.add(section)
    }
    setSelectedCifSections(newSet)
  }

  const toggleAllCifSections = (uniqueSections: string[]) => {
    if (selectedCifSections.size === uniqueSections.length) {
      setSelectedCifSections(new Set())
    } else {
      setSelectedCifSections(new Set(uniqueSections))
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

  const toggleAllCifDivisions = (uniqueDivisions: string[]) => {
    if (selectedCifDivisions.size === uniqueDivisions.length) {
      setSelectedCifDivisions(new Set())
    } else {
      setSelectedCifDivisions(new Set(uniqueDivisions))
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

  const toggleAllLeagues = (uniqueLeagues: string[]) => {
    if (selectedLeagues.size === uniqueLeagues.length) {
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

  const toggleAllSubleagues = (uniqueSubleagues: string[]) => {
    if (selectedSubleagues.size === uniqueSubleagues.length) {
      setSelectedSubleagues(new Set())
    } else {
      setSelectedSubleagues(new Set(uniqueSubleagues))
    }
  }

  const toggleSeason = (seasonYear: number) => {
    const newSet = new Set(selectedSeasons)
    if (newSet.has(seasonYear)) {
      newSet.delete(seasonYear)
    } else {
      newSet.add(seasonYear)
    }
    setSelectedSeasons(newSet)
  }

  const toggleAthlete = (athleteId: string) => {
    const newSet = new Set(selectedAthletes)
    if (newSet.has(athleteId)) {
      newSet.delete(athleteId)
    } else {
      newSet.add(athleteId)
    }
    setSelectedAthletes(newSet)
  }

  // Get unique values from schools for filters
  const uniqueCifSections = useMemo(() => {
    const sections = schools.map(s => s.cif_section).filter(Boolean) as string[]
    return Array.from(new Set(sections)).sort()
  }, [schools])

  const uniqueCifDivisions = useMemo(() => {
    const divisions = schools.map(s => s.cif_division).filter(Boolean) as string[]
    return Array.from(new Set(divisions)).sort()
  }, [schools])

  const uniqueLeagues = useMemo(() => {
    const leagues = schools.map(s => s.league).filter(Boolean) as string[]
    return Array.from(new Set(leagues)).sort()
  }, [schools])

  const uniqueSubleagues = useMemo(() => {
    const subleagues = schools.map(s => s.subleague).filter(Boolean) as string[]
    return Array.from(new Set(subleagues)).sort()
  }, [schools])

  // Calculate blank counts for each filter type
  const blankCifSectionCount = useMemo(() => {
    return schools.filter(s => !s.cif_section).length
  }, [schools])

  const blankCifDivisionCount = useMemo(() => {
    return schools.filter(s => !s.cif_division).length
  }, [schools])

  const blankLeagueCount = useMemo(() => {
    return schools.filter(s => !s.league).length
  }, [schools])

  const blankSubleagueCount = useMemo(() => {
    return schools.filter(s => !s.subleague).length
  }, [schools])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">Season Championship Projection</h1>
        <p className="text-lg text-zinc-600 mb-8">
          Project team standings based on {bestType === 'season' ? 'season-best' : 'all-time personal-best'} performances
        </p>

        {/* Main Content with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-1/4 bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6 self-start">
            <h3 className="text-xl font-bold text-zinc-900 mb-6">Filters</h3>

            {/* Best Time Type Selection */}
            <div className="mb-6">
              <h4 className="font-bold text-zinc-900 mb-3">Best Time Type:</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={bestType === 'season'}
                    onChange={() => setBestType('season')}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="text-zinc-700 font-medium">Season Best</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={bestType === 'alltime'}
                    onChange={() => setBestType('alltime')}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="text-zinc-700 font-medium">Personal Best (All-Time)</span>
                </label>
              </div>
            </div>

            {/* Target Course Selection */}
            <div className="mb-6">
              <h4 className="font-bold text-zinc-900 mb-3">Project Times to Course:</h4>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name} (Diff: {course.difficulty_rating.toFixed(1)})
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="mb-6">
              <h4 className="font-bold text-zinc-900 mb-3">Gender:</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGenders.has('M')}
                    onChange={() => toggleGender('M')}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-zinc-700 font-medium">Boys</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGenders.has('F')}
                    onChange={() => toggleGender('F')}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-zinc-700 font-medium">Girls</span>
                </label>
              </div>
            </div>

            {/* CIF Section Filter */}
            {uniqueCifSections.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-zinc-900">CIF Section:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCifSections.size === uniqueCifSections.length}
                      onChange={() => toggleAllCifSections(uniqueCifSections)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {uniqueCifSections.map(section => (
                    <label key={section} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCifSections.has(section)}
                        onChange={() => toggleCifSection(section)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{section}</span>
                    </label>
                  ))}
                  {blankCifSectionCount > 0 && (
                    <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={includeCifSectionNulls}
                        onChange={(e) => setIncludeCifSectionNulls(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">Blank/Unknown ({blankCifSectionCount})</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* CIF Division Filter */}
            {uniqueCifDivisions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-zinc-900">CIF Division:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCifDivisions.size === uniqueCifDivisions.length}
                      onChange={() => toggleAllCifDivisions(uniqueCifDivisions)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {uniqueCifDivisions.map(division => (
                    <label key={division} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCifDivisions.has(division)}
                        onChange={() => toggleCifDivision(division)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{division}</span>
                    </label>
                  ))}
                  {blankCifDivisionCount > 0 && (
                    <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={includeCifDivisionNulls}
                        onChange={(e) => setIncludeCifDivisionNulls(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">Blank/Unknown ({blankCifDivisionCount})</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* League Filter */}
            {uniqueLeagues.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-zinc-900">League:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedLeagues.size === uniqueLeagues.length}
                      onChange={() => toggleAllLeagues(uniqueLeagues)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {uniqueLeagues.map(league => (
                    <label key={league} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedLeagues.has(league)}
                        onChange={() => toggleLeague(league)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{league}</span>
                    </label>
                  ))}
                  {blankLeagueCount > 0 && (
                    <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={includeLeagueNulls}
                        onChange={(e) => setIncludeLeagueNulls(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">Blank/Unknown ({blankLeagueCount})</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Subleague Filter */}
            {uniqueSubleagues.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-zinc-900">Subleague:</h4>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedSubleagues.size === uniqueSubleagues.length}
                      onChange={() => toggleAllSubleagues(uniqueSubleagues)}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                    />
                    <span className="text-zinc-600 text-xs font-medium">Select All</span>
                  </label>
                </div>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {uniqueSubleagues.map(subleague => (
                    <label key={subleague} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSubleagues.has(subleague)}
                        onChange={() => toggleSubleague(subleague)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">{subleague}</span>
                    </label>
                  ))}
                  {blankSubleagueCount > 0 && (
                    <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={includeSubleagueNulls}
                        onChange={(e) => setIncludeSubleagueNulls(e.target.checked)}
                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-700 text-sm">Blank/Unknown ({blankSubleagueCount})</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Schools Filter */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-zinc-900">Schools:</h4>
                <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedSchools.size === schools.length}
                    onChange={toggleAllSchools}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
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
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                Individual Projections
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                  viewMode === 'team'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                Team Projections
              </button>
            </div>

            {/* Individual Results */}
            {viewMode === 'individual' && (
              <>
                {selectedGenders.has('M') && (
                  <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
                    <div className="bg-blue-50 border-b-2 border-blue-200 p-4">
                      <h2 className="text-2xl font-bold text-zinc-900">Boys Individual Projections</h2>
                      <p className="text-zinc-600 text-sm mt-1">
                        {boysIndividualResults.length} athletes (max 7 per school)
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-50">
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Time</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Pace</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentBoysResults.map((result) => {
                            const targetCourse = courses.find(c => c.id === targetCourseId)
                            const distanceMiles = targetCourse ? targetCourse.distance_meters / 1609.34 : 5000 / 1609.34
                            const pacePerMile = result.season_best_cs / distanceMiles / 100
                            const paceMin = Math.floor(pacePerMile / 60)
                            const paceSec = Math.floor(pacePerMile % 60)

                            return (
                              <tr key={result.id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                                <td className="py-4 px-6 text-center font-bold text-zinc-900">{result.overall_place}</td>
                                <td className="py-4 px-6">
                                  <Link href={`/athletes/${result.id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                                    {result.name}
                                  </Link>
                                </td>
                                <td className="py-4 px-6">
                                  <Link href={`/schools/${result.school_id}`} className="text-zinc-700 hover:text-blue-600 hover:underline">
                                    {result.school_name}
                                  </Link>
                                </td>
                                <td className="py-4 px-6 text-center font-mono font-bold text-zinc-900">
                                  {formatTime(result.season_best_cs)}
                                </td>
                                <td className="py-4 px-6 text-center font-mono text-zinc-700">
                                  {paceMin}:{paceSec.toString().padStart(2, '0')}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  {result.runner_role === 'scorer' && (
                                    <span className="font-bold text-blue-600">{result.team_points}</span>
                                  )}
                                  {result.runner_role === 'displacer' && (
                                    <span className="font-semibold text-zinc-500">({result.team_points})</span>
                                  )}
                                  {result.runner_role === 'none' && (
                                    <span className="text-zinc-400 text-sm">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {boysTotalPages > 1 && (
                      <div className="p-6 border-t border-zinc-200">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap justify-center items-center gap-2">
                            <button onClick={() => setBoysCurrentPage(1)} disabled={boysCurrentPage === 1} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">««</button>
                            <button onClick={() => setBoysCurrentPage(Math.max(1, boysCurrentPage - 1))} disabled={boysCurrentPage === 1} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Previous</button>
                            <div className="flex gap-2">
                              {Array.from({ length: Math.min(7, boysTotalPages) }, (_, i) => {
                                let pageNum = boysTotalPages <= 7 ? i + 1 : boysCurrentPage <= 4 ? i + 1 : boysCurrentPage >= boysTotalPages - 3 ? boysTotalPages - 6 + i : boysCurrentPage - 3 + i
                                return <button key={i} onClick={() => setBoysCurrentPage(pageNum)} className={`px-4 py-2 rounded-lg transition-colors font-medium ${boysCurrentPage === pageNum ? 'bg-blue-600 text-white shadow-md' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>{pageNum}</button>
                              })}
                            </div>
                            <button onClick={() => setBoysCurrentPage(Math.min(boysTotalPages, boysCurrentPage + 1))} disabled={boysCurrentPage === boysTotalPages} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Next</button>
                            <button onClick={() => setBoysCurrentPage(boysTotalPages)} disabled={boysCurrentPage === boysTotalPages} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">»»</button>
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

                {selectedGenders.has('F') && (
                  <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
                    <div className="bg-red-50 border-b-2 border-red-200 p-4">
                      <h2 className="text-2xl font-bold text-zinc-900">Girls Individual Projections</h2>
                      <p className="text-zinc-600 text-sm mt-1">
                        {girlsIndividualResults.length} athletes (max 7 per school)
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-50">
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Time</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Pace</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentGirlsResults.map((result) => {
                            const targetCourse = courses.find(c => c.id === targetCourseId)
                            const distanceMiles = targetCourse ? targetCourse.distance_meters / 1609.34 : 5000 / 1609.34
                            const pacePerMile = result.season_best_cs / distanceMiles / 100
                            const paceMin = Math.floor(pacePerMile / 60)
                            const paceSec = Math.floor(pacePerMile % 60)

                            return (
                              <tr key={result.id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                                <td className="py-4 px-6 text-center font-bold text-zinc-900">{result.overall_place}</td>
                                <td className="py-4 px-6">
                                  <Link href={`/athletes/${result.id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                                    {result.name}
                                  </Link>
                                </td>
                                <td className="py-4 px-6">
                                  <Link href={`/schools/${result.school_id}`} className="text-zinc-700 hover:text-blue-600 hover:underline">
                                    {result.school_name}
                                  </Link>
                                </td>
                                <td className="py-4 px-6 text-center font-mono font-bold text-zinc-900">
                                  {formatTime(result.season_best_cs)}
                                </td>
                                <td className="py-4 px-6 text-center font-mono text-zinc-700">
                                  {paceMin}:{paceSec.toString().padStart(2, '0')}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  {result.runner_role === 'scorer' && (
                                    <span className="font-bold text-red-600">{result.team_points}</span>
                                  )}
                                  {result.runner_role === 'displacer' && (
                                    <span className="font-semibold text-zinc-500">({result.team_points})</span>
                                  )}
                                  {result.runner_role === 'none' && (
                                    <span className="text-zinc-400 text-sm">—</span>
                                  )}
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
                            <button onClick={() => setGirlsCurrentPage(1)} disabled={girlsCurrentPage === 1} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">««</button>
                            <button onClick={() => setGirlsCurrentPage(Math.max(1, girlsCurrentPage - 1))} disabled={girlsCurrentPage === 1} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Previous</button>
                            <div className="flex gap-2">
                              {Array.from({ length: Math.min(7, girlsTotalPages) }, (_, i) => {
                                let pageNum = girlsTotalPages <= 7 ? i + 1 : girlsCurrentPage <= 4 ? i + 1 : girlsCurrentPage >= girlsTotalPages - 3 ? girlsTotalPages - 6 + i : girlsCurrentPage - 3 + i
                                return <button key={i} onClick={() => setGirlsCurrentPage(pageNum)} className={`px-4 py-2 rounded-lg transition-colors font-medium ${girlsCurrentPage === pageNum ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}>{pageNum}</button>
                              })}
                            </div>
                            <button onClick={() => setGirlsCurrentPage(Math.min(girlsTotalPages, girlsCurrentPage + 1))} disabled={girlsCurrentPage === girlsTotalPages} className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">Next</button>
                            <button onClick={() => setGirlsCurrentPage(girlsTotalPages)} disabled={girlsCurrentPage === girlsTotalPages} className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">»»</button>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-zinc-200">
                            <div className="text-sm text-zinc-600">Page <span className="font-semibold text-zinc-900">{girlsCurrentPage}</span> of <span className="font-semibold text-zinc-900">{girlsTotalPages}</span> • Showing {girlsStartIndex + 1}-{Math.min(girlsEndIndex, girlsIndividualResults.length)} of <span className="font-semibold text-zinc-900">{girlsIndividualResults.length}</span> runners</div>
                            <div className="flex items-center gap-2">
                              <label htmlFor="girlsJumpToPage" className="text-sm font-medium text-zinc-700">Jump to page:</label>
                              <input id="girlsJumpToPage" type="number" min="1" max={girlsTotalPages} value={girlsJumpToPage} onChange={(e) => setGirlsJumpToPage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { const page = parseInt(girlsJumpToPage); if (page >= 1 && page <= girlsTotalPages) { setGirlsCurrentPage(page); setGirlsJumpToPage('') } } }} placeholder={`1-${girlsTotalPages}`} className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                              <button onClick={() => { const page = parseInt(girlsJumpToPage); if (page >= 1 && page <= girlsTotalPages) { setGirlsCurrentPage(page); setGirlsJumpToPage('') } }} disabled={!girlsJumpToPage || parseInt(girlsJumpToPage) < 1 || parseInt(girlsJumpToPage) > girlsTotalPages} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">Go</button>
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
                    <div className="bg-blue-50 border-b-2 border-blue-200 p-4">
                      <h2 className="text-2xl font-bold text-zinc-900">Boys Team Standings</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-50">
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Score</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Time</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">Top 5 Scorers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boysStandings.map((team, index) => (
                            <tr key={team.school_id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                              <td className="py-4 px-6 text-center font-bold text-zinc-900">{index + 1}</td>
                              <td className="py-4 px-6">
                                <Link href={`/schools/${team.school_id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                                  {team.school_name}
                                </Link>
                              </td>
                              <td className="py-4 px-6 text-center font-bold text-blue-600">
                                {team.is_complete ? team.score : 'Incomplete'}
                              </td>
                              <td className="py-4 px-6 text-center font-mono font-bold text-zinc-900">
                                {team.is_complete ? formatTime(team.team_time_cs) : 'N/A'}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex gap-2 flex-wrap">
                                  {team.scorers.map((scorer, i) => (
                                    <span key={scorer.id} className="text-zinc-700 text-sm">
                                      {i > 0 && '• '}
                                      <Link href={`/athletes/${scorer.id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                                        {scorer.name}
                                      </Link>
                                      {' '}({scorer.combined_place})
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
                    <div className="bg-red-50 border-b-2 border-red-200 p-4">
                      <h2 className="text-2xl font-bold text-zinc-900">Girls Team Standings</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b-2 border-zinc-200 bg-zinc-50">
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Place</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">School</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Score</th>
                            <th className="py-4 px-6 text-center font-bold text-zinc-900">Team Time</th>
                            <th className="py-4 px-6 text-left font-bold text-zinc-900">Top 5 Scorers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {girlsStandings.map((team, index) => (
                            <tr key={team.school_id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                              <td className="py-4 px-6 text-center font-bold text-zinc-900">{index + 1}</td>
                              <td className="py-4 px-6">
                                <Link href={`/schools/${team.school_id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                                  {team.school_name}
                                </Link>
                              </td>
                              <td className="py-4 px-6 text-center font-bold text-red-600">
                                {team.is_complete ? team.score : 'Incomplete'}
                              </td>
                              <td className="py-4 px-6 text-center font-mono font-bold text-zinc-900">
                                {team.is_complete ? formatTime(team.team_time_cs) : 'N/A'}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex gap-2 flex-wrap">
                                  {team.scorers.map((scorer, i) => (
                                    <span key={scorer.id} className="text-zinc-700 text-sm">
                                      {i > 0 && '• '}
                                      <Link href={`/athletes/${scorer.id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                                        {scorer.name}
                                      </Link>
                                      {' '}({scorer.combined_place})
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
