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

interface Record {
  grade: number
  best_time_cs: number
  athlete_name: string
  athlete_id: string
  meet_name: string
  meet_date: string
  course_name: string
}

export default function SchoolRecordsPage() {
  const params = useParams()
  const schoolId = params.id as string

  const [school, setSchool] = useState<School | null>(null)
  const [boysRecords, setBoysRecords] = useState<Record[]>([])
  const [girlsRecords, setGirlsRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGender, setSelectedGender] = useState<'M' | 'F'>('M')

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

      // Load all results for this school with athlete, meet, and course info
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          time_cs,
          athlete:athletes!inner(
            id,
            name,
            grad_year,
            gender
          ),
          race:races(
            meet:meets(
              name,
              meet_date,
              course:courses(
                name
              )
            )
          )
        `)
        .eq('athlete.school_id', schoolId)
        .order('time_cs', { ascending: true })

      if (resultsError) {
        console.error('Results query error:', resultsError)
        throw resultsError
      }

      // If no results, set empty arrays and return
      if (!resultsData || resultsData.length === 0) {
        setBoysRecords([])
        setGirlsRecords([])
        return
      }

      // Calculate current year for grade calculation
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      // If we're in Jan-July, use current year; if Aug-Dec, use next year as season year
      const seasonYear = currentMonth >= 7 ? currentYear + 1 : currentYear

      // Process results to get records by grade and gender
      const boysRecordsByGrade: { [grade: number]: Record } = {}
      const girlsRecordsByGrade: { [grade: number]: Record } = {}

      resultsData?.forEach((result: any) => {
        if (!result.athlete || !result.time_cs || result.time_cs <= 0) return

        const athlete = result.athlete
        const race = result.race
        const meet = race?.meet
        const course = meet?.course

        // Calculate grade at time of race (using grad_year)
        // Grade = 12 - (grad_year - season_year)
        const grade = 12 - (athlete.grad_year - seasonYear)

        // Only include valid grades (9-12)
        if (grade < 9 || grade > 12) return

        const record: Record = {
          grade,
          best_time_cs: result.time_cs,
          athlete_name: athlete.name,
          athlete_id: athlete.id,
          meet_name: meet?.name || 'Unknown Meet',
          meet_date: meet?.meet_date || '',
          course_name: course?.name || 'Unknown Course'
        }

        if (athlete.gender === 'M') {
          if (!boysRecordsByGrade[grade] || result.time_cs < boysRecordsByGrade[grade].best_time_cs) {
            boysRecordsByGrade[grade] = record
          }
        } else if (athlete.gender === 'F') {
          if (!girlsRecordsByGrade[grade] || result.time_cs < girlsRecordsByGrade[grade].best_time_cs) {
            girlsRecordsByGrade[grade] = record
          }
        }
      })

      // Convert to arrays and sort by grade
      setBoysRecords(Object.values(boysRecordsByGrade).sort((a, b) => a.grade - b.grade))
      setGirlsRecords(Object.values(girlsRecordsByGrade).sort((a, b) => a.grade - b.grade))
    } catch (error) {
      console.error('Error loading school records:', error)
      // Set empty arrays on error
      setBoysRecords([])
      setGirlsRecords([])
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

  const records = selectedGender === 'M' ? boysRecords : girlsRecords

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading records...</div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">School not found</h1>
          <Link href="/schools" className="text-cyan-400 hover:text-cyan-300">
            Back to Schools
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/schools" className="text-cyan-400 hover:text-cyan-300">
            Schools
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <Link href={`/schools/${schoolId}`} className="text-cyan-400 hover:text-cyan-300">
            {school.short_name || school.name}
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">Records</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {school.name} XC Records
          </h1>
          <p className="text-zinc-400">Best times by grade level</p>
        </div>

        {/* Gender Selector */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSelectedGender('M')}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedGender === 'M'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            Boys
          </button>
          <button
            onClick={() => setSelectedGender('F')}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedGender === 'F'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
            }`}
          >
            Girls
          </button>
        </div>

        {/* Records Table */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden border border-zinc-700">
          {records.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-400 text-lg">
                No {selectedGender === 'M' ? 'boys' : 'girls'} records found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-zinc-700 bg-zinc-900/50">
                    <th className="py-4 px-6 text-left font-bold text-white">Grade</th>
                    <th className="py-4 px-6 text-left font-bold text-white">Time</th>
                    <th className="py-4 px-6 text-left font-bold text-white">Athlete</th>
                    <th className="py-4 px-6 text-left font-bold text-white">Meet</th>
                    <th className="py-4 px-6 text-left font-bold text-white">Course</th>
                    <th className="py-4 px-6 text-left font-bold text-white">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr
                      key={record.grade}
                      className={`border-b border-zinc-700 hover:bg-zinc-800/30 transition-colors ${
                        index === 0 ? 'bg-cyan-900/20' : ''
                      }`}
                    >
                      <td className="py-4 px-6 font-semibold text-white">
                        {getGradeLabel(record.grade)}
                      </td>
                      <td className="py-4 px-6 font-bold text-cyan-400">
                        {formatTime(record.best_time_cs)}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/athletes/${record.athlete_id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        >
                          {record.athlete_name}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-zinc-300">
                        {record.meet_name}
                      </td>
                      <td className="py-4 px-6 text-zinc-300">
                        {record.course_name}
                      </td>
                      <td className="py-4 px-6 text-zinc-400">
                        {formatDate(record.meet_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        {records.length > 0 && (
          <div className="mt-6 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
            <p className="text-sm text-zinc-400">
              <span className="inline-block w-4 h-4 bg-cyan-900/20 border border-cyan-500/30 rounded mr-2"></span>
              Fastest overall time is highlighted
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/schools/${schoolId}`}
            className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            ← Back to Roster
          </Link>
        </div>
      </div>
    </div>
  )
}
