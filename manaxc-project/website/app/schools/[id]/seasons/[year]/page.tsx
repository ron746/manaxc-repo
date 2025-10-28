'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Course {
  id: string
  name: string
  difficulty_rating: number
  distance_meters: number
}

interface AthleteRanking {
  athlete_id: string
  athlete_name: string
  gender: string
  grad_year: number
  season_pr: number | null
  season_pr_course_id: string
  season_pr_course_difficulty: number
  season_pr_course_distance: number
  season_pr_meet_id: string | null
  season_pr_race_id: string | null
  top_3_average: number | null
  last_3_average: number | null
  all_time_pb: number | null
  all_time_pb_normalized: number | null
  all_time_pb_course_id: string | null
  all_time_pb_course_difficulty: number | null
  all_time_pb_course_distance: number | null
  all_time_pb_meet_id: string | null
  all_time_pb_race_id: string | null
  race_count: number
  recent_races: { time_cs: number; date: string; meet_name: string }[]
  all_times: { time_cs: number; normalized_time_cs: number | null; course_id: string; course_difficulty: number; course_distance: number; date: string; meet_name: string; meet_id: string; race_id: string }[]
  all_time_results: { time_cs: number; normalized_time_cs: number | null; course_id: string; course_difficulty: number; course_distance: number; meet_id: string; race_id: string }[]
}

export default function SchoolSeasonDetailPage() {
  const params = useParams()
  const schoolId = params.id as string
  const year = params.year as string

  const [school, setSchool] = useState<any>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [targetCourseId, setTargetCourseId] = useState<string>('')
  const [boysRankings, setBoysRankings] = useState<AthleteRanking[]>([])
  const [girlsRankings, setGirlsRankings] = useState<AthleteRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBoys, setSelectedBoys] = useState<Set<string>>(new Set())
  const [selectedGirls, setSelectedGirls] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSeasonData()
  }, [schoolId, year])

  const loadSeasonData = async () => {
    try {
      setLoading(true)

      const { data: schoolData } = await supabase.from('schools').select('*').eq('id', schoolId).single()
      if (schoolData) setSchool(schoolData)

      // Load all courses from database
      const { data: allCoursesData } = await supabase
        .from('courses')
        .select('id, name, difficulty_rating, distance_meters')
        .order('name', { ascending: true })

      if (allCoursesData) {
        const coursesList = allCoursesData.map(course => ({
          id: course.id,
          name: course.name,
          difficulty_rating: course.difficulty_rating || 5.0,
          distance_meters: course.distance_meters || 0
        }))
        setCourses(coursesList)

        // Set default target course to first one
        if (coursesList.length > 0 && !targetCourseId) {
          setTargetCourseId(coursesList[0].id)
        }
      }

      // Load all results for this school and season
      // Use range to get all results (bypassing 1000 record limit)
      let allResults: any[] = []
      let start = 0
      const pageSize = 1000

      while (true) {
        const { data: resultsData, error } = await supabase
          .from('results')
          .select(`
            id,
            time_cs,
            normalized_time_cs,
            place_overall,
            race_id,
            meet_id,
            race:races!inner(
              name,
              gender,
              course:courses(
                id,
                name,
                difficulty_rating,
                distance_meters
              ),
              meet:meets!inner(
                name,
                meet_date,
                season_year
              )
            ),
            athlete:athletes!inner(
              id,
              name,
              grad_year,
              gender,
              school_id
            )
          `)
          .eq('athlete.school_id', schoolId)
          .eq('race.meet.season_year', parseInt(year))
          .range(start, start + pageSize - 1)
          .order('time_cs', { ascending: true })

        if (error || !resultsData || resultsData.length === 0) break

        allResults = allResults.concat(resultsData)

        if (resultsData.length < pageSize) break
        start += pageSize
      }

      if (!allResults || allResults.length === 0) {
        setBoysRankings([])
        setGirlsRankings([])
        return
      }

      // Group results by athlete and course
      const athleteResults = new Map<string, {
        athlete: any
        times: { time_cs: number; normalized_time_cs: number | null; course_id: string; course_difficulty: number; course_distance: number; date: string; meet_name: string; meet_id: string; race_id: string }[]
      }>()

      allResults.forEach((result: any) => {
        const athlete = result.athlete
        const meet = result.race?.meet
        const course = result.race?.course

        if (!athlete || !meet) return

        if (!athleteResults.has(result.athlete.id)) {
          athleteResults.set(result.athlete.id, {
            athlete,
            times: []
          })
        }

        athleteResults.get(result.athlete.id)!.times.push({
          time_cs: result.time_cs,
          normalized_time_cs: result.normalized_time_cs,
          course_id: course?.id || '',
          course_difficulty: course?.difficulty_rating || 5.0,
          course_distance: course?.distance_meters || 0,
          date: meet.meet_date,
          meet_name: meet.name,
          meet_id: result.meet_id,
          race_id: result.race_id
        })
      })

      // Calculate statistics for each athlete
      const rankings: AthleteRanking[] = []

      // For each athlete, fetch ALL their times from this season and earlier to find true all-time PB
      // (don't include future seasons)
      const athleteIds = Array.from(athleteResults.keys())
      const allTimeResults = new Map<string, Array<{time_cs: number, normalized_time_cs: number | null, course_id: string, course_difficulty: number, course_distance: number, meet_id: string, race_id: string}>>()

      for (const athleteId of athleteIds) {
        const { data: results } = await supabase
          .from('results')
          .select('time_cs, normalized_time_cs, meet_id, race_id, race:races!inner(course:courses(id, difficulty_rating, distance_meters), meet:meets!inner(season_year))')
          .eq('athlete_id', athleteId)
          .lte('race.meet.season_year', parseInt(year)) // Only results from this season or earlier
          .order('time_cs', { ascending: true })
          .limit(1000) // Get top 1000 times to ensure we have enough for normalization

        if (results && results.length > 0) {
          const allTimes = results.map(result => {
            const course = (result as any).race?.course
            return {
              time_cs: result.time_cs,
              normalized_time_cs: result.normalized_time_cs,
              course_id: course?.id || '',
              course_difficulty: course?.difficulty_rating || 0,
              course_distance: course?.distance_meters || 0,
              meet_id: result.meet_id,
              race_id: result.race_id
            }
          })
          allTimeResults.set(athleteId, allTimes)
        }
      }

      athleteResults.forEach(({ athlete, times }) => {
        if (times.length === 0) return

        // Sort by time (fastest first)
        times.sort((a, b) => a.time_cs - b.time_cs)

        const season_pr = times[0].time_cs
        const season_pr_course_id = times[0].course_id
        const season_pr_course_difficulty = times[0].course_difficulty
        const season_pr_course_distance = times[0].course_distance
        const season_pr_meet_id = times[0].meet_id
        const season_pr_race_id = times[0].race_id

        // Top 3 average - use normalized times
        const top3Times = times.slice(0, Math.min(3, times.length))
        const top_3_average = top3Times.length > 0
          ? Math.round(top3Times.reduce((sum, t) => sum + (t.normalized_time_cs || t.time_cs), 0) / top3Times.length)
          : null

        // Last 3 average (most recent) - use normalized times
        const sortedByDate = [...times].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const last3Times = sortedByDate.slice(0, Math.min(3, sortedByDate.length))
        const last_3_average = last3Times.length > 0
          ? Math.round(last3Times.reduce((sum, t) => sum + (t.normalized_time_cs || t.time_cs), 0) / last3Times.length)
          : null

        const recent_races = sortedByDate.slice(0, 5).map(race => ({
          time_cs: race.time_cs,
          date: race.date,
          meet_name: race.meet_name
        }))

        // Get all-time results for this athlete
        const athleteAllTimeResults = allTimeResults.get(athlete.id) || []

        rankings.push({
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          gender: athlete.gender,
          grad_year: athlete.grad_year,
          season_pr,
          season_pr_course_id,
          season_pr_course_difficulty,
          season_pr_course_distance,
          season_pr_meet_id,
          season_pr_race_id,
          top_3_average,
          last_3_average,
          all_time_pb: null, // Will be calculated in memo based on target course
          all_time_pb_normalized: null,
          all_time_pb_course_id: null,
          all_time_pb_course_difficulty: null,
          all_time_pb_course_distance: null,
          all_time_pb_meet_id: null,
          all_time_pb_race_id: null,
          race_count: times.length,
          recent_races,
          all_times: times,
          all_time_results: athleteAllTimeResults
        })
      })

      // Separate boys and girls, sort by season PR
      const boys = rankings
        .filter(r => r.gender === 'M')
        .sort((a, b) => (a.season_pr || Infinity) - (b.season_pr || Infinity))

      const girls = rankings
        .filter(r => r.gender === 'F')
        .sort((a, b) => (a.season_pr || Infinity) - (b.season_pr || Infinity))

      setBoysRankings(boys)
      setGirlsRankings(girls)

      // Auto-select top 5 for each gender
      if (boys.length >= 5) {
        setSelectedBoys(new Set(boys.slice(0, 5).map(a => a.athlete_id)))
      }
      if (girls.length >= 5) {
        setSelectedGirls(new Set(girls.slice(0, 5).map(a => a.athlete_id)))
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeLabel = (gradYear: number, seasonYear: number) => {
    // XC season is in fall, so the academic year for the season is the same as the season year
    // For example, 2025 XC season runs Aug-Nov 2025, which is 2025-2026 academic year
    // A senior graduating in 2026 would be in 12th grade during the 2025 XC season
    const grade = 12 - (gradYear - seasonYear - 1)
    const labels: { [key: number]: string} = {
      9: 'FR',
      10: 'SO',
      11: 'JR',
      12: 'SR'
    }
    return labels[grade] || `Grade ${grade}`
  }

  const toggleSelectedBoy = (athleteId: string) => {
    setSelectedBoys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(athleteId)) {
        newSet.delete(athleteId)
      } else {
        if (newSet.size < 5) {
          newSet.add(athleteId)
        }
      }
      return newSet
    })
  }

  const toggleSelectedGirl = (athleteId: string) => {
    setSelectedGirls(prev => {
      const newSet = new Set(prev)
      if (newSet.has(athleteId)) {
        newSet.delete(athleteId)
      } else {
        if (newSet.size < 5) {
          newSet.add(athleteId)
        }
      }
      return newSet
    })
  }

  const calculateTeamTime = (athletes: AthleteRanking[], selectedSet: Set<string>) => {
    if (selectedSet.size !== 5) return null
    const selectedAthletes = athletes.filter(a => selectedSet.has(a.athlete_id) && a.season_pr)
    if (selectedAthletes.length !== 5) return null
    return selectedAthletes.reduce((sum, athlete) => sum + (athlete.season_pr || 0), 0)
  }

  // Normalize time to per-mile pace, then project to target course
  // Formula: time_cs / course_difficulty / distance_meters * 1609.344 = normalized_time_cs_per_mile
  // Then: normalized_time_cs_per_mile * target_distance_meters / 1609.344 * target_difficulty = projected_time_cs
  const normalizeTime = (
    time_cs: number,
    sourceDifficulty: number,
    sourceDistance: number,
    targetDifficulty: number,
    targetDistance: number
  ): number => {
    if (sourceDistance === 0 || targetDistance === 0 || sourceDifficulty === 0 || targetDifficulty === 0) return time_cs

    const METERS_PER_MILE = 1609.344

    // Step 1: Calculate normalized pace per mile
    // Divide by difficulty to get base effort, divide by distance, multiply by meters per mile
    const normalized_pace_per_mile_cs = (time_cs / sourceDifficulty / sourceDistance) * METERS_PER_MILE

    // Step 2: Project to target course
    // Multiply by target distance, divide by meters per mile, multiply by target difficulty
    const projected_time_cs = (normalized_pace_per_mile_cs * targetDistance / METERS_PER_MILE) * targetDifficulty

    return Math.round(projected_time_cs)
  }

  // Compute normalized rankings when target course changes
  const normalizedBoysRankings = useMemo(() => {
    if (!targetCourseId || courses.length === 0) return boysRankings

    const targetCourse = courses.find(c => c.id === targetCourseId)
    if (!targetCourse) return boysRankings

    const METERS_PER_MILE = 1609.344

    // For each athlete, normalize ALL their times to the target course and find the best
    const normalized = boysRankings.map(athlete => {
      // Normalize all times to target course
      const normalizedTimes = athlete.all_times.map(time => {
        // If this time is already on the target course, use it directly
        if (time.course_id === targetCourseId) {
          return {
            normalized_time_cs: time.time_cs,
            meet_id: time.meet_id,
            race_id: time.race_id,
            original_time_cs: time.time_cs,
            course_id: time.course_id,
            date: time.date
          }
        } else {
          // Use the pre-computed normalized_time_cs from database (difficulty-normalized per-mile pace)
          // Formula from DB: time_cs / difficulty / distance_meters * 1609.344
          // To project to target course: normalized_time_cs * target_difficulty * target_distance / 1609.344
          let projectedTime: number

          if (time.normalized_time_cs && targetCourse.distance_meters > 0) {
            projectedTime = Math.round(
              time.normalized_time_cs * targetCourse.difficulty_rating * targetCourse.distance_meters / METERS_PER_MILE
            )
          } else {
            // Fallback to client-side calculation if normalized_time_cs is missing
            projectedTime = normalizeTime(
              time.time_cs,
              time.course_difficulty,
              time.course_distance,
              targetCourse.difficulty_rating,
              targetCourse.distance_meters
            )
          }

          return {
            normalized_time_cs: projectedTime,
            meet_id: time.meet_id,
            race_id: time.race_id,
            original_time_cs: time.time_cs,
            course_id: time.course_id,
            date: time.date
          }
        }
      })

      // Find the best normalized time
      const bestNormalizedTime = normalizedTimes.sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)[0]

      // Recalculate Top 3 Avg with normalized times
      const sortedNormalizedTimes = [...normalizedTimes].sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)
      const top3Times = sortedNormalizedTimes.slice(0, Math.min(3, sortedNormalizedTimes.length))
      const top_3_average = top3Times.length > 0
        ? Math.round(top3Times.reduce((sum, t) => sum + t.normalized_time_cs, 0) / top3Times.length)
        : null

      // Recalculate Last 3 Avg with normalized times (sort by race date)
      const sortedByDate = [...normalizedTimes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const last3Times = sortedByDate.slice(0, Math.min(3, sortedByDate.length))
      const last_3_average = last3Times.length > 0
        ? Math.round(last3Times.reduce((sum, t) => sum + t.normalized_time_cs, 0) / last3Times.length)
        : null

      // Normalize ALL all-time results to target course and find the best one
      let best_all_time_pb = null
      let best_all_time_pb_meet_id = null
      let best_all_time_pb_race_id = null

      if (athlete.all_time_results && athlete.all_time_results.length > 0) {
        const normalizedAllTimeResults = athlete.all_time_results.map(result => {
          if (result.course_id === targetCourseId) {
            return {
              normalized_time_cs: result.time_cs,
              meet_id: result.meet_id,
              race_id: result.race_id
            }
          } else if (result.normalized_time_cs && targetCourse.distance_meters > 0) {
            return {
              normalized_time_cs: Math.round(
                result.normalized_time_cs * targetCourse.difficulty_rating * targetCourse.distance_meters / METERS_PER_MILE
              ),
              meet_id: result.meet_id,
              race_id: result.race_id
            }
          } else {
            return null
          }
        }).filter(r => r !== null) as Array<{normalized_time_cs: number, meet_id: string, race_id: string}>

        if (normalizedAllTimeResults.length > 0) {
          const bestResult = normalizedAllTimeResults.sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)[0]
          best_all_time_pb = bestResult.normalized_time_cs
          best_all_time_pb_meet_id = bestResult.meet_id
          best_all_time_pb_race_id = bestResult.race_id
        }
      }

      return {
        ...athlete,
        season_pr: bestNormalizedTime ? bestNormalizedTime.normalized_time_cs : athlete.season_pr,
        season_pr_meet_id: bestNormalizedTime ? bestNormalizedTime.meet_id : athlete.season_pr_meet_id,
        season_pr_race_id: bestNormalizedTime ? bestNormalizedTime.race_id : athlete.season_pr_race_id,
        top_3_average,
        last_3_average,
        all_time_pb: best_all_time_pb,
        all_time_pb_meet_id: best_all_time_pb_meet_id,
        all_time_pb_race_id: best_all_time_pb_race_id
      }
    }).sort((a, b) => (a.season_pr || Infinity) - (b.season_pr || Infinity))

    // Auto-select top 5 when rankings change
    if (normalized.length >= 5) {
      setSelectedBoys(new Set(normalized.slice(0, 5).map(a => a.athlete_id)))
    }

    return normalized
  }, [boysRankings, targetCourseId, courses])

  const normalizedGirlsRankings = useMemo(() => {
    if (!targetCourseId || courses.length === 0) return girlsRankings

    const targetCourse = courses.find(c => c.id === targetCourseId)
    if (!targetCourse) return girlsRankings

    const METERS_PER_MILE = 1609.344

    // For each athlete, normalize ALL their times to the target course and find the best
    const normalized = girlsRankings.map(athlete => {
      // Normalize all times to target course
      const normalizedTimes = athlete.all_times.map(time => {
        // If this time is already on the target course, use it directly
        if (time.course_id === targetCourseId) {
          return {
            normalized_time_cs: time.time_cs,
            meet_id: time.meet_id,
            race_id: time.race_id,
            original_time_cs: time.time_cs,
            course_id: time.course_id,
            date: time.date
          }
        } else {
          // Use the pre-computed normalized_time_cs from database (difficulty-normalized per-mile pace)
          // Formula from DB: time_cs / difficulty / distance_meters * 1609.344
          // To project to target course: normalized_time_cs * target_difficulty * target_distance / 1609.344
          let projectedTime: number

          if (time.normalized_time_cs && targetCourse.distance_meters > 0) {
            projectedTime = Math.round(
              time.normalized_time_cs * targetCourse.difficulty_rating * targetCourse.distance_meters / METERS_PER_MILE
            )
          } else {
            // Fallback to client-side calculation if normalized_time_cs is missing
            projectedTime = normalizeTime(
              time.time_cs,
              time.course_difficulty,
              time.course_distance,
              targetCourse.difficulty_rating,
              targetCourse.distance_meters
            )
          }

          return {
            normalized_time_cs: projectedTime,
            meet_id: time.meet_id,
            race_id: time.race_id,
            original_time_cs: time.time_cs,
            course_id: time.course_id,
            date: time.date
          }
        }
      })

      // Find the best normalized time
      const bestNormalizedTime = normalizedTimes.sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)[0]

      // Recalculate Top 3 Avg with normalized times
      const sortedNormalizedTimes = [...normalizedTimes].sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)
      const top3Times = sortedNormalizedTimes.slice(0, Math.min(3, sortedNormalizedTimes.length))
      const top_3_average = top3Times.length > 0
        ? Math.round(top3Times.reduce((sum, t) => sum + t.normalized_time_cs, 0) / top3Times.length)
        : null

      // Recalculate Last 3 Avg with normalized times (sort by race date)
      const sortedByDate = [...normalizedTimes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const last3Times = sortedByDate.slice(0, Math.min(3, sortedByDate.length))
      const last_3_average = last3Times.length > 0
        ? Math.round(last3Times.reduce((sum, t) => sum + t.normalized_time_cs, 0) / last3Times.length)
        : null

      // Normalize ALL all-time results to target course and find the best one
      let best_all_time_pb = null
      let best_all_time_pb_meet_id = null
      let best_all_time_pb_race_id = null

      if (athlete.all_time_results && athlete.all_time_results.length > 0) {
        const normalizedAllTimeResults = athlete.all_time_results.map(result => {
          if (result.course_id === targetCourseId) {
            return {
              normalized_time_cs: result.time_cs,
              meet_id: result.meet_id,
              race_id: result.race_id
            }
          } else if (result.normalized_time_cs && targetCourse.distance_meters > 0) {
            return {
              normalized_time_cs: Math.round(
                result.normalized_time_cs * targetCourse.difficulty_rating * targetCourse.distance_meters / METERS_PER_MILE
              ),
              meet_id: result.meet_id,
              race_id: result.race_id
            }
          } else {
            return null
          }
        }).filter(r => r !== null) as Array<{normalized_time_cs: number, meet_id: string, race_id: string}>

        if (normalizedAllTimeResults.length > 0) {
          const bestResult = normalizedAllTimeResults.sort((a, b) => a.normalized_time_cs - b.normalized_time_cs)[0]
          best_all_time_pb = bestResult.normalized_time_cs
          best_all_time_pb_meet_id = bestResult.meet_id
          best_all_time_pb_race_id = bestResult.race_id
        }
      }

      return {
        ...athlete,
        season_pr: bestNormalizedTime ? bestNormalizedTime.normalized_time_cs : athlete.season_pr,
        season_pr_meet_id: bestNormalizedTime ? bestNormalizedTime.meet_id : athlete.season_pr_meet_id,
        season_pr_race_id: bestNormalizedTime ? bestNormalizedTime.race_id : athlete.season_pr_race_id,
        top_3_average,
        last_3_average,
        all_time_pb: best_all_time_pb,
        all_time_pb_meet_id: best_all_time_pb_meet_id,
        all_time_pb_race_id: best_all_time_pb_race_id
      }
    }).sort((a, b) => (a.season_pr || Infinity) - (b.season_pr || Infinity))

    // Auto-select top 5 when rankings change
    if (normalized.length >= 5) {
      setSelectedGirls(new Set(normalized.slice(0, 5).map(a => a.athlete_id)))
    }

    return normalized
  }, [girlsRankings, targetCourseId, courses])

  const renderTeamTable = (
    athletes: AthleteRanking[],
    title: string,
    genderColor: string,
    selectedSet: Set<string>,
    toggleSelected: (id: string) => void
  ) => {
    if (athletes.length === 0) return null

    return (
      <div className="mb-8">
        <div className="bg-white rounded-lg border-2 border-zinc-300 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-zinc-300 bg-zinc-50">
            <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
            <p className="text-sm text-zinc-600 mt-1">
              {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} with race data this season
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-zinc-300 bg-zinc-100">
                  <th className="py-4 px-4 text-center font-bold text-zinc-900 w-16">Select</th>
                  <th className="py-4 px-4 text-center font-bold text-zinc-900 w-16">#</th>
                  <th className="py-4 px-6 text-left font-bold text-zinc-900">Athlete Name</th>
                  <th className="py-4 px-4 text-center font-bold text-zinc-900">Class</th>
                  <th className="py-4 px-6 text-right font-bold text-zinc-900">Season PR</th>
                  <th className="py-4 px-6 text-right font-bold text-zinc-900">All Time PR</th>
                  <th className="py-4 px-6 text-right font-bold text-zinc-900">Top 3 Avg</th>
                  <th className="py-4 px-6 text-right font-bold text-zinc-900">Last 3 Avg</th>
                  <th className="py-4 px-4 text-center font-bold text-zinc-900">Races</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {athletes.map((athlete, index) => {
                  const isVarsity = index < 7
                  const isSelected = selectedSet.has(athlete.athlete_id)
                  const canSelect = selectedSet.size < 5 || isSelected

                  return (
                    <tr
                      key={athlete.athlete_id}
                      className={`border-b border-zinc-200 hover:bg-zinc-50 ${
                        isSelected ? 'bg-green-100 font-medium' : isVarsity ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(athlete.athlete_id)}
                          disabled={!canSelect}
                          className="w-5 h-5 rounded border-zinc-400 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-bold ${isSelected ? 'text-green-700' : isVarsity ? 'text-blue-700' : 'text-zinc-500'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/athletes/${athlete.athlete_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {athlete.athlete_name}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-zinc-700 text-sm font-medium">
                          {getGradeLabel(athlete.grad_year, parseInt(year))}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {athlete.season_pr && athlete.season_pr_meet_id && athlete.season_pr_race_id ? (
                          <Link
                            href={`/meets/${athlete.season_pr_meet_id}/races/${athlete.season_pr_race_id}`}
                            className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {formatTime(athlete.season_pr)}
                          </Link>
                        ) : (
                          <span className="font-mono font-bold text-zinc-900">
                            {athlete.season_pr ? formatTime(athlete.season_pr) : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {athlete.all_time_pb && athlete.all_time_pb_meet_id && athlete.all_time_pb_race_id ? (
                          <Link
                            href={`/meets/${athlete.all_time_pb_meet_id}/races/${athlete.all_time_pb_race_id}`}
                            className="font-mono text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {formatTime(athlete.all_time_pb)}
                          </Link>
                        ) : (
                          <span className="font-mono text-zinc-700">
                            {athlete.all_time_pb ? formatTime(athlete.all_time_pb) : '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-mono text-zinc-700">
                          {athlete.top_3_average ? formatTime(athlete.top_3_average) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-mono text-zinc-700">
                          {athlete.last_3_average ? formatTime(athlete.last_3_average) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-700">
                        {athlete.race_count}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {athletes.length > 7 && (
            <div className="px-6 py-3 bg-zinc-50 border-t-2 border-zinc-300">
              <p className="text-xs text-zinc-700">
                <span className="text-blue-700 font-bold">Top 7 (light blue background)</span> - Potential varsity lineup (5 score + 2 alternates) • <span className="text-green-700 font-bold">Selected (green background)</span> - Athletes counted in team time
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading season data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/schools" className="text-blue-600 hover:text-blue-800 font-medium">
            Schools
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <Link href={`/schools/${schoolId}`} className="text-blue-600 hover:text-blue-800 font-medium">
            {school?.name}
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <Link href={`/schools/${schoolId}/seasons`} className="text-blue-600 hover:text-blue-800 font-medium">
            Seasons
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700 font-medium">{year}</span>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-2 tracking-tight">
          {school?.name} - {year} Season
        </h1>
        <p className="text-lg text-zinc-600 mb-8">
          Team selection and performance rankings
        </p>

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="bg-white rounded-lg border-2 border-zinc-200 shadow-sm p-6 mb-8">
            <h3 className="font-bold text-zinc-900 mb-3">Normalize Times to Course</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Select a course to normalize all Season PR times for fair comparison across different courses.
            </p>
            <select
              value={targetCourseId}
              onChange={(e) => setTargetCourseId(e.target.value)}
              className="w-full md:w-auto px-4 py-2 bg-white text-zinc-900 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} (Difficulty: {course.difficulty_rating.toFixed(1)}, {(course.distance_meters / 1609.34).toFixed(2)} mi)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Team Selection Guide */}
        {(boysRankings.length > 0 || girlsRankings.length > 0) && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-blue-900 mb-3">Team Selection Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-700">
              <div>
                <h4 className="font-bold mb-2 text-zinc-900">Performance Metrics:</h4>
                <ul className="space-y-1">
                  <li>• <strong>Season PR:</strong> Fastest time this season</li>
                  <li>• <strong>Top 3 Average:</strong> Average of 3 fastest times</li>
                  <li>• <strong>Last 3 Average:</strong> Average of 3 most recent times</li>
                  <li>• <strong>Races:</strong> Number of races competed this season</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-2 text-zinc-900">Team Selection:</h4>
                <ul className="space-y-1">
                  <li>• <strong>Varsity Team:</strong> Top 7 runners (5 score + 2 alternates)</li>
                  <li>• <strong>Top 7 highlighted:</strong> Potential varsity lineup shown with darker background</li>
                  <li>• <strong>Consistency:</strong> Compare Top 3 Avg vs Last 3 Avg for form</li>
                  <li>• <strong>Experience:</strong> More races = better race readiness</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Team Time Calculator */}
        {(normalizedBoysRankings.length >= 5 || normalizedGirlsRankings.length >= 5) && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-green-900 mb-4">Estimated Team Times</h3>
            <p className="text-sm text-zinc-700 mb-6">
              Select exactly 5 athletes per team using the checkboxes in the tables below. Combined time will appear here.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Boys Team Time */}
              {normalizedBoysRankings.length >= 5 && (
                <div className="bg-white rounded-lg p-5 border-2 border-zinc-300 shadow-sm">
                  <h4 className="font-bold text-zinc-900 mb-3">Boys Team</h4>
                  {(() => {
                    const teamTime = calculateTeamTime(normalizedBoysRankings, selectedBoys)
                    return teamTime ? (
                      <div className="text-center">
                        <div className="text-sm text-zinc-600 mb-2">Combined Time (5 athletes)</div>
                        <div className="text-4xl font-bold font-mono text-zinc-900">
                          {formatTime(teamTime)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-zinc-700 mb-2 font-medium">
                          {selectedBoys.size}/5 athletes selected
                        </div>
                        <div className="text-sm text-zinc-500">
                          Select exactly 5 athletes below
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Girls Team Time */}
              {normalizedGirlsRankings.length >= 5 && (
                <div className="bg-white rounded-lg p-5 border-2 border-zinc-300 shadow-sm">
                  <h4 className="font-bold text-zinc-900 mb-3">Girls Team</h4>
                  {(() => {
                    const teamTime = calculateTeamTime(normalizedGirlsRankings, selectedGirls)
                    return teamTime ? (
                      <div className="text-center">
                        <div className="text-sm text-zinc-600 mb-2">Combined Time (5 athletes)</div>
                        <div className="text-4xl font-bold font-mono text-zinc-900">
                          {formatTime(teamTime)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-zinc-700 mb-2 font-medium">
                          {selectedGirls.size}/5 athletes selected
                        </div>
                        <div className="text-sm text-zinc-500">
                          Select exactly 5 athletes below
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Boys Team Selection */}
        {renderTeamTable(normalizedBoysRankings, 'Boys Varsity Team Selection', 'blue', selectedBoys, toggleSelectedBoy)}

        {/* Girls Team Selection */}
        {renderTeamTable(normalizedGirlsRankings, 'Girls Varsity Team Selection', 'pink', selectedGirls, toggleSelectedGirl)}

        {/* No Data Message */}
        {boysRankings.length === 0 && girlsRankings.length === 0 && (
          <div className="bg-white rounded-lg border-2 border-zinc-300 shadow-sm p-12 text-center">
            <div className="text-zinc-700 font-medium mb-4">No race data available for this season.</div>
            <div className="text-sm text-zinc-500">
              Results will appear here once races are added for the {year} season.
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href={`/schools/${schoolId}/seasons`}
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ← Back to All Seasons
          </Link>
        </div>
      </div>
    </div>
  )
}
