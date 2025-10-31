'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'
import { useIsAdmin } from '@/lib/hooks/useIsAdmin'

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
  const { isAdmin } = useIsAdmin()

  const [courses, setCourses] = useState<Course[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [allAthletes, setAllAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [bestType, setBestType] = useState<'season' | 'alltime'>('season')
  const [raceType, setRaceType] = useState<'california' | 'section' | 'league' | 'custom'>('california')
  const [selectedCifSection, setSelectedCifSection] = useState<string>('')
  const [selectedCifDivisions, setSelectedCifDivisions] = useState<Set<string>>(new Set())
  const [selectedLeague, setSelectedLeague] = useState<string>('')
  const [selectedSubleague, setSelectedSubleague] = useState<string>('')
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set())
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set())
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [targetCourseId, setTargetCourseId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'boys-team' | 'girls-team' | 'boys-individual' | 'girls-individual'>('boys-team')
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
      setSelectedSeasons(mostRecentSeason ? new Set([mostRecentSeason]) : new Set())
      if (coursesList.length > 0) {
        setTargetCourseId(coursesList[0].id)
      }
      // Set initial race type to California State Championship
      // This will trigger the useEffect to load data
      setRaceType('california')
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSeasonResults = async (
    seasonYears: number[],
    isAllTime: boolean = false,
    filters?: {
      raceType: 'california' | 'section' | 'league' | 'custom'
      gender?: 'M' | 'F'
      cifSection?: string
      league?: string
      subleague?: string
      schoolIds?: Set<string>
      cifDivisions?: Set<string>
    }
  ) => {
    try {
      // Don't load anything if no race type is selected
      if (!filters?.raceType) {
        setAllAthletes([])
        return
      }

      console.log('Loading with filters:', {
        seasonYears,
        isAllTime,
        raceType: filters.raceType,
        gender: filters.gender,
        cifSection: filters.cifSection
      })

      const athletes: Athlete[] = []

      // Use the new efficient database function that gets top 12 per school
      const { data, error } = await supabase.rpc('get_top_athletes_per_school', {
        p_race_type: filters.raceType,
        p_gender: filters.gender || null,
        p_cif_section: filters.cifSection || null,
        p_cif_divisions: filters.cifDivisions && filters.cifDivisions.size > 0
          ? Array.from(filters.cifDivisions)
          : null,
        p_league: filters.league || null,
        p_subleague: filters.subleague || null,
        p_school_ids: filters.schoolIds && filters.schoolIds.size > 0
          ? Array.from(filters.schoolIds)
          : null,
        p_season_years: seasonYears.length > 0 ? seasonYears : null,
        p_is_alltime: isAllTime,
        p_top_n: 12  // Get top 12 per school to allow for alternates
      })

      if (error) {
        // Fall back to old method if function doesn't exist yet or any error occurs
        // Check if error has a message property before calling includes
        if (error?.message && (error.message.includes('function') && error.message.includes('does not exist'))) {
          console.warn('Database function not found, using fallback method')
          await loadSeasonResultsFallback(seasonYears, isAllTime, filters)
          return
        }
        // For any RPC error, fall back to old method
        console.warn('RPC call failed, using fallback method:', error?.message || JSON.stringify(error))
        await loadSeasonResultsFallback(seasonYears, isAllTime, filters)
        return
      }

      console.log('RPC returned:', data ? `${data.length} records` : 'no data')

      if (data) {
        data.forEach((record: any) => {
          athletes.push({
            id: record.athlete_id,
            name: record.athlete_name,
            school_id: record.school_id,
            school_name: record.school_name,
            school_cif_section: record.school_cif_section,
            school_cif_division: record.school_cif_division,
            school_league: record.school_league,
            school_subleague: record.school_subleague,
            gender: record.athlete_gender,
            season_best_cs: record.season_best_cs,
            normalized_time_cs: record.normalized_time_cs,
            season_year: record.season_year,
            race_distance_meters: record.race_distance_meters
          })
        })
      }

      console.log('Setting allAthletes with', athletes.length, 'athletes')
      setAllAthletes(athletes)
      setSelectedAthletes(new Set(athletes.map(a => a.id)))
    } catch (error) {
      console.error('Error loading season results:', error)
    }
  }

  // Fallback method using old approach (in case database function isn't deployed yet)
  const loadSeasonResultsFallback = async (
    seasonYears: number[],
    isAllTime: boolean = false,
    filters?: {
      raceType: 'california' | 'section' | 'league' | 'custom'
      gender?: 'M' | 'F'
      cifSection?: string
      league?: string
      subleague?: string
      schoolIds?: Set<string>
      cifDivisions?: Set<string>
    }
  ) => {
    try {
      const athletes: Athlete[] = []

      if (isAllTime) {
        // Load all-time best times from optimized table with pagination
        // Get the best all-time normalized time for each athlete across all seasons
        const PAGE_SIZE = 10000  // Increased to handle large datasets
        let page = 0
        let hasMore = true

        while (hasMore) {
          const from = page * PAGE_SIZE
          const to = from + PAGE_SIZE - 1

          let query = supabase
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

          // Apply gender filter
          if (filters?.gender) {
            query = query.eq('athlete.gender', filters.gender)
          }

          // Apply race type filters
          if (filters?.raceType === 'california') {
            query = query.not('athlete.school.cif_section', 'is', null)
          } else if (filters?.raceType === 'section' && filters.cifSection) {
            query = query.eq('athlete.school.cif_section', filters.cifSection)
          } else if (filters?.raceType === 'league') {
            if (filters.subleague) {
              query = query.eq('athlete.school.subleague', filters.subleague)
            } else if (filters.league) {
              query = query.eq('athlete.school.league', filters.league)
            }
          } else if (filters?.raceType === 'custom' && filters.schoolIds && filters.schoolIds.size > 0) {
            query = query.in('athlete.school.id', Array.from(filters.schoolIds))
          }

          // Apply CIF division filter (for California and Section races)
          if (filters?.cifDivisions && filters.cifDivisions.size > 0 &&
              (filters.raceType === 'california' || filters.raceType === 'section')) {
            query = query.in('athlete.school.cif_division', Array.from(filters.cifDivisions))
          }

          const { data: bestTimesData } = await query.range(from, to)

          if (!bestTimesData || bestTimesData.length === 0) {
            hasMore = false
          } else {
            // Group by athlete_id and find the absolute best across all seasons
            const athleteMap = new Map<string, any>()
            bestTimesData.forEach((record: any) => {
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

            if (bestTimesData.length < PAGE_SIZE) {
              hasMore = false
            } else {
              page++
            }
          }
        }
      } else {
        // Load season-best times from optimized table for selected seasons with pagination
        const PAGE_SIZE = 10000  // Increased to handle large datasets
        let page = 0
        let hasMore = true

        while (hasMore) {
          const from = page * PAGE_SIZE
          const to = from + PAGE_SIZE - 1

          let query = supabase
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

          // Apply gender filter
          if (filters?.gender) {
            query = query.eq('athlete.gender', filters.gender)
          }

          // Apply race type filters
          if (filters?.raceType === 'california') {
            query = query.not('athlete.school.cif_section', 'is', null)
          } else if (filters?.raceType === 'section' && filters.cifSection) {
            query = query.eq('athlete.school.cif_section', filters.cifSection)
          } else if (filters?.raceType === 'league') {
            if (filters.subleague) {
              query = query.eq('athlete.school.subleague', filters.subleague)
            } else if (filters.league) {
              query = query.eq('athlete.school.league', filters.league)
            }
          } else if (filters?.raceType === 'custom' && filters.schoolIds && filters.schoolIds.size > 0) {
            query = query.in('athlete.school.id', Array.from(filters.schoolIds))
          }

          // Apply CIF division filter (for California and Section races)
          if (filters?.cifDivisions && filters.cifDivisions.size > 0 &&
              (filters.raceType === 'california' || filters.raceType === 'section')) {
            query = query.in('athlete.school.cif_division', Array.from(filters.cifDivisions))
          }

          const { data: bestTimesData } = await query.range(from, to)

          if (!bestTimesData || bestTimesData.length === 0) {
            hasMore = false
          } else {
            bestTimesData.forEach((record: any) => {
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

            if (bestTimesData.length < PAGE_SIZE) {
              hasMore = false
            } else {
              page++
            }
          }
        }
      }

      setAllAthletes(athletes)
      // Auto-select all athletes initially
      setSelectedAthletes(new Set(athletes.map(a => a.id)))
    } catch (error) {
      console.error('Error loading season results:', error)
    }
  }

  // Manual launch function - user clicks button to load data
  const launchRaceProjection = async () => {
    setLoading(true)

    // Extract gender from viewMode
    const gender: 'M' | 'F' = viewMode.startsWith('boys-') ? 'M' : 'F'

    // Build filter object
    const filters = {
      raceType,
      gender,
      cifSection: selectedCifSection,
      league: selectedLeague,
      subleague: selectedSubleague,
      schoolIds: selectedSchools,
      cifDivisions: selectedCifDivisions
    }

    if (bestType === 'alltime') {
      await loadSeasonResults([], true, filters)
    } else if (selectedSeasons.size > 0) {
      await loadSeasonResults(Array.from(selectedSeasons), false, filters)
    }

    setLoading(false)
  }

  // Athletes are already filtered at database level, just pass through
  // The only client-side filtering needed is if the data was loaded before filters changed
  const filteredAthletes = useMemo(() => {
    // Since we reload data when filters change, allAthletes should already be filtered
    // But to be safe during transitions, apply gender filter based on viewMode
    const gender: 'M' | 'F' = viewMode.startsWith('boys-') ? 'M' : 'F'
    return allAthletes.filter(athlete => athlete.gender === gender)
  }, [allAthletes, viewMode])

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

  // Get subleagues for selected league
  const availableSubleagues = useMemo(() => {
    if (!selectedLeague) return []
    const subleagues = schools
      .filter(s => s.league === selectedLeague && s.subleague)
      .map(s => s.subleague as string)
    return Array.from(new Set(subleagues)).sort()
  }, [schools, selectedLeague])

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
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">Season Championship Projection</h1>
            <p className="text-lg text-zinc-600 mt-2 mb-8">
              Project team standings based on {bestType === 'season' ? 'season-best' : 'all-time personal-best'} performances
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </Link>
          )}
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-1/4 bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6 self-start">
            <h3 className="text-xl font-bold text-zinc-900 mb-6">Championship Setup</h3>

            {/* Race Type Selection */}
            <div className="mb-6">
              <h4 className="font-bold text-zinc-900 mb-3">Race Type:</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setRaceType('california')
                    setSelectedCifDivisions(new Set())
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    raceType === 'california'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-zinc-300 text-zinc-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  California State Championship
                  <p className="text-xs mt-1 text-zinc-600">All schools with CIF section</p>
                </button>
                <button
                  onClick={() => {
                    setRaceType('section')
                    setSelectedCifSection('')
                    setSelectedCifDivisions(new Set())
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    raceType === 'section'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-zinc-300 text-zinc-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  Section Championship
                  <p className="text-xs mt-1 text-zinc-600">Schools in specific CIF section</p>
                </button>
                <button
                  onClick={() => {
                    setRaceType('league')
                    setSelectedLeague('')
                    setSelectedSubleague('')
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    raceType === 'league'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-zinc-300 text-zinc-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  League Championship
                  <p className="text-xs mt-1 text-zinc-600">Schools in specific league</p>
                </button>
                <button
                  onClick={() => {
                    setRaceType('custom')
                    setSelectedSchools(new Set())
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    raceType === 'custom'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-zinc-300 text-zinc-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  Custom Race
                  <p className="text-xs mt-1 text-zinc-600">Select specific schools</p>
                </button>
              </div>
            </div>

            {/* Conditional Filters Based on Race Type */}
            <div className="mb-6 pb-6 border-b-2 border-zinc-300">
              {/* Section Selection for Section Championship */}
              {raceType === 'section' && (
                <div className="mb-4">
                  <h4 className="font-bold text-zinc-900 mb-3">Select CIF Section:</h4>
                  <select
                    value={selectedCifSection}
                    onChange={(e) => setSelectedCifSection(e.target.value)}
                    className="w-full bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Section --</option>
                    {uniqueCifSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* League Selection for League Championship */}
              {raceType === 'league' && (
                <>
                  <div className="mb-4">
                    <h4 className="font-bold text-zinc-900 mb-3">Select League:</h4>
                    <select
                      value={selectedLeague}
                      onChange={(e) => {
                        setSelectedLeague(e.target.value)
                        setSelectedSubleague('')
                      }}
                      className="w-full bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose League --</option>
                      {uniqueLeagues.map(league => (
                        <option key={league} value={league}>{league}</option>
                      ))}
                    </select>
                  </div>
                  {selectedLeague && availableSubleagues.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-bold text-zinc-900 mb-3">Filter by Subleague (Optional):</h4>
                      <select
                        value={selectedSubleague}
                        onChange={(e) => setSelectedSubleague(e.target.value)}
                        className="w-full bg-white text-zinc-900 font-medium border-2 border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Subleagues</option>
                        {availableSubleagues.map(subleague => (
                          <option key={subleague} value={subleague}>{subleague}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* CIF Division Filter for California and Section races */}
              {(raceType === 'california' || raceType === 'section') && uniqueCifDivisions.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-zinc-900">Filter by CIF Division:</h4>
                    <button
                      onClick={() => {
                        if (selectedCifDivisions.size === uniqueCifDivisions.length) {
                          setSelectedCifDivisions(new Set())
                        } else {
                          setSelectedCifDivisions(new Set(uniqueCifDivisions))
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {selectedCifDivisions.size === uniqueCifDivisions.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {uniqueCifDivisions.map(division => (
                      <label key={division} className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCifDivisions.has(division)}
                          onChange={() => toggleCifDivision(division)}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm font-medium">{division}</span>
                      </label>
                    ))}
                  </div>
                  {selectedCifDivisions.size === 0 && (
                    <p className="text-xs text-zinc-500 mt-2 italic">All divisions included</p>
                  )}
                </div>
              )}

              {/* School Selection for Custom Race */}
              {raceType === 'custom' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-zinc-900">Select Schools:</h4>
                    <button
                      onClick={toggleAllSchools}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {selectedSchools.size === schools.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto pr-2 space-y-1">
                    {schools.map(school => (
                      <label key={school.id} className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded">
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
                  <p className="text-xs text-zinc-600 mt-2">
                    {selectedSchools.size} school{selectedSchools.size !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
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

            {/* Launch Race Projection Button */}
            <div className="mb-6">
              <button
                onClick={launchRaceProjection}
                disabled={!raceType || (bestType === 'season' && selectedSeasons.size === 0) || loading}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
                  !raceType || (bestType === 'season' && selectedSeasons.size === 0) || loading
                    ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  'Launch Race Projection'
                )}
              </button>
              {(!raceType || (bestType === 'season' && selectedSeasons.size === 0)) && (
                <p className="text-xs text-zinc-500 mt-2 text-center italic">
                  {!raceType ? 'Select a race type above to continue' : 'Select at least one season to continue'}
                </p>
              )}
            </div>
          </aside>

          {/* Results Area */}
          <div className="lg:w-3/4 space-y-8">
            {/* View Mode Toggle with Gender */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-zinc-600 uppercase tracking-wide">Boys</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('boys-individual')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      viewMode === 'boys-individual'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-blue-600 hover:text-blue-600'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    onClick={() => setViewMode('boys-team')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      viewMode === 'boys-team'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-blue-600 hover:text-blue-600'
                    }`}
                  >
                    Team
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-zinc-600 uppercase tracking-wide">Girls</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('girls-individual')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      viewMode === 'girls-individual'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-red-600 hover:text-red-600'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    onClick={() => setViewMode('girls-team')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      viewMode === 'girls-team'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-zinc-700 border-2 border-zinc-300 hover:border-red-600 hover:text-red-600'
                    }`}
                  >
                    Team
                  </button>
                </div>
              </div>
            </div>

            {/* Boys Individual Results */}
            {viewMode === 'boys-individual' && (
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

            {/* Girls Individual Results */}
            {viewMode === 'girls-individual' && (
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

            {/* Boys Team Standings */}
            {viewMode === 'boys-team' && (
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

            {/* Girls Team Standings */}
            {viewMode === 'girls-team' && (
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
          </div>
        </div>
      </div>
    </div>
  )
}
