'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

interface Course {
  id: string
  name: string
  location: string | null
  venue: string | null
  distance_meters: number
  distance_display: string | null
  difficulty_rating: number | null
  elevation_gain_meters: number | null
  surface_type: string | null
  terrain_description: string | null
  notes: string | null
}

interface Meet {
  id: string
  name: string
  meet_date: string
  season_year: number
  meet_type: string | null
  race_count: number
}

export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [meets, setMeets] = useState<Meet[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<'name' | 'meet_date' | 'meet_type'>('meet_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    try {
      setLoading(true)

      // Load course info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      // Load meets at this course's venue (via races that use this course)
      // Note: Meets don't have course_id, they have venue_id
      // We need to find meets through races that used this course
      const { data: racesWithMeets, error: racesError } = await supabase
        .from('races')
        .select(`
          meet:meets!inner(
            id,
            name,
            meet_date,
            season_year,
            meet_type
          )
        `)
        .eq('course_id', courseId)

      if (racesError) throw racesError

      // Extract unique meets from races (a meet may have multiple races on this course)
      const meetsMap = new Map<string, Meet>()

      racesWithMeets?.forEach((raceData: any) => {
        const meet = raceData.meet
        if (meet && !meetsMap.has(meet.id)) {
          meetsMap.set(meet.id, {
            id: meet.id,
            name: meet.name,
            meet_date: meet.meet_date,
            season_year: meet.season_year,
            meet_type: meet.meet_type,
            race_count: 0 // Will be calculated below
          })
        }
      })

      // Get race counts for each meet on this course
      const processedMeets: Meet[] = []
      for (const meet of meetsMap.values()) {
        const { count } = await supabase
          .from('races')
          .select('id', { count: 'exact', head: true })
          .eq('meet_id', meet.id)
          .eq('course_id', courseId)

        processedMeets.push({
          ...meet,
          race_count: count || 0
        })
      }

      // Sort by date descending
      processedMeets.sort((a, b) => new Date(b.meet_date).getTime() - new Date(a.meet_date).getTime())
      setMeets(processedMeets)
    } catch (error) {
      console.error('Error loading course:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDistance = (meters: number) => {
    if (meters === 5000) return '5K'
    if (meters === 3000) return '3K'
    if (meters === 4000) return '4K'
    const miles = meters / 1609.34
    if (Math.abs(miles - 3) < 0.01) return '3 Miles'
    if (Math.abs(miles - 2) < 0.01) return '2 Miles'
    return `${miles.toFixed(2)} mi`
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
    const labels: { [key: number]: string } = { 9: 'Freshman', 10: 'Sophomore', 11: 'Junior', 12: 'Senior' }
    return labels[grade] || `Grade ${grade}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading course...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Course not found</h1>
          <Link href="/courses" className="text-cyan-600 hover:text-cyan-700 underline">
            Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm">
          <Link href="/courses" className="text-cyan-600 hover:text-cyan-700 hover:underline">
            Courses
          </Link>
          <span className="text-zinc-400 mx-2">/</span>
          <span className="text-zinc-700">{course.name}</span>
        </div>

        {/* Course Header */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8 border border-zinc-200">
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">{course.name}</h1>

          {course.location && (
            <p className="text-zinc-600 text-lg mb-4">{course.location}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-zinc-500 mb-1">Distance</div>
              <div className="text-zinc-900 font-bold text-xl">
                {course.distance_display || formatDistance(course.distance_meters)}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-500 mb-1">Difficulty</div>
              <div className="text-zinc-900 font-bold text-xl">
                {course.difficulty_rating ? course.difficulty_rating.toFixed(3) : 'N/A'}
              </div>
            </div>

            {course.elevation_gain_meters && (
              <div>
                <div className="text-sm text-zinc-500 mb-1">Elevation Gain</div>
                <div className="text-zinc-900 font-medium">{course.elevation_gain_meters}m</div>
              </div>
            )}

            {course.surface_type && (
              <div>
                <div className="text-sm text-zinc-500 mb-1">Surface</div>
                <div className="text-zinc-900 font-medium capitalize">{course.surface_type}</div>
              </div>
            )}
          </div>

          {course.terrain_description && (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="text-sm text-zinc-500 mb-1">Terrain</div>
              <p className="text-zinc-700">{course.terrain_description}</p>
            </div>
          )}

          {course.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="text-sm text-zinc-500 mb-1">Notes</div>
              <p className="text-zinc-700">{course.notes}</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            href={`/courses/${courseId}/records`}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors shadow-md"
          >
            Records
          </Link>
          <Link
            href={`/courses/${courseId}/performances`}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors shadow-md"
          >
            Top Performances
          </Link>
        </div>

        {/* Meets on this Course */}
        {meets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Meets on this Course</h2>

            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <th
                        className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => {
                          if (sortField === 'name') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('name')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Meet
                          {sortField === 'name' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => {
                          if (sortField === 'meet_date') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('meet_date')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {sortField === 'meet_date' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                        onClick={() => {
                          if (sortField === 'meet_type') {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setSortField('meet_type')
                            setSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Type
                          {sortField === 'meet_type' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...meets].sort((a, b) => {
                      let aVal: any = a[sortField]
                      let bVal: any = b[sortField]

                      if (sortField === 'meet_date') {
                        aVal = new Date(aVal).getTime()
                        bVal = new Date(bVal).getTime()
                      } else if (sortField === 'meet_type') {
                        aVal = aVal || ''
                        bVal = bVal || ''
                      }

                      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
                      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
                      return 0
                    }).map(meet => (
                      <tr key={meet.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="py-4 px-6">
                          <Link
                            href={`/meets/${meet.id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                          >
                            {meet.name}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-zinc-700">{formatDate(meet.meet_date)}</td>
                        <td className="py-4 px-6 text-zinc-600 capitalize">
                          {meet.meet_type || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
