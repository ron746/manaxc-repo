'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

interface Meet {
  id: string
  name: string
  meet_date: string
  season_year: number
  meet_type: string | null
  course: {
    name: string
    location: string | null
  } | null
  race_count: number
}

type SortField = 'meet_date' | 'name' | 'meet_type' | 'season_year'
type SortDirection = 'asc' | 'desc'

export default function MeetsPage() {
  const [meets, setMeets] = useState<Meet[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('meet_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [seasonFilter, setSeasonFilter] = useState<string>('all')
  const [meetTypeFilter, setMeetTypeFilter] = useState<string>('all')
  const meetsPerPage = 50

  useEffect(() => {
    loadMeets()
  }, [])

  const loadMeets = async () => {
    try {
      setLoading(true)

      // Get meets with course info and race counts
      const { data: meetsData, error } = await supabase
        .from('meets')
        .select(`
          id,
          name,
          meet_date,
          season_year,
          meet_type,
          course:courses(
            name,
            location
          ),
          races(id)
        `)
        .order('meet_date', { ascending: false })

      if (error) throw error

      const processedMeets: Meet[] = meetsData?.map(meet => ({
        id: meet.id,
        name: meet.name,
        meet_date: meet.meet_date,
        season_year: meet.season_year,
        meet_type: meet.meet_type,
        course: meet.course as { name: string; location: string | null } | null,
        race_count: meet.races?.length || 0
      })) || []

      setMeets(processedMeets)
    } catch (error) {
      console.error('Error loading meets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // Filter meets
  const filteredMeets = meets.filter(meet => {
    if (seasonFilter !== 'all' && meet.season_year.toString() !== seasonFilter) {
      return false
    }
    if (meetTypeFilter !== 'all' && meet.meet_type !== meetTypeFilter) {
      return false
    }
    return true
  })

  // Sort meets
  const sortedMeets = [...filteredMeets].sort((a, b) => {
    let aVal: string | number = a[sortField] || ''
    let bVal: string | number = b[sortField] || ''

    if (sortField === 'meet_date') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedMeets.length / meetsPerPage)
  const startIndex = (currentPage - 1) * meetsPerPage
  const endIndex = startIndex + meetsPerPage
  const currentMeets = sortedMeets.slice(startIndex, endIndex)

  // Get unique seasons and meet types for filters
  const seasons = Array.from(new Set(meets.map(m => m.season_year))).sort((a, b) => b - a)
  const meetTypes = Array.from(new Set(meets.map(m => m.meet_type).filter(Boolean))).sort()

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-zinc-400">↕</span>
    }
    return <span className="text-cyan-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatMeetType = (type: string | null) => {
    if (!type) return 'N/A'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading meets...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Cross Country Meets</h1>
          <p className="text-zinc-400">{meets.length} total meets</p>
        </div>

        {/* Filters */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Season
              </label>
              <select
                value={seasonFilter}
                onChange={(e) => {
                  setSeasonFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Seasons</option>
                {seasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Meet Type
              </label>
              <select
                value={meetTypeFilter}
                onChange={(e) => {
                  setMeetTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Types</option>
                {meetTypes.map(type => (
                  <option key={type} value={type}>{formatMeetType(type)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSeasonFilter('all')
                  setMeetTypeFilter('all')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-zinc-400">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedMeets.length)} of {sortedMeets.length} meets
        </div>

        {/* Meets Table */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden border border-zinc-700">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-900/50">
                  <th
                    onClick={() => handleSort('meet_date')}
                    className="py-4 px-6 text-left font-bold text-white cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Date <SortIcon field="meet_date" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-4 px-6 text-left font-bold text-white cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Meet Name <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left font-bold text-white">
                    Course
                  </th>
                  <th
                    onClick={() => handleSort('meet_type')}
                    className="py-4 px-6 text-left font-bold text-white cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Type <SortIcon field="meet_type" />
                    </div>
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-white">
                    Races
                  </th>
                  <th
                    onClick={() => handleSort('season_year')}
                    className="py-4 px-6 text-center font-bold text-white cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Season <SortIcon field="season_year" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentMeets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      No meets found
                    </td>
                  </tr>
                ) : (
                  currentMeets.map((meet) => (
                    <tr
                      key={meet.id}
                      className="border-b border-zinc-700 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-4 px-6 text-zinc-300">
                        {formatDate(meet.meet_date)}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/meets/${meet.id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        >
                          {meet.name}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-zinc-300">
                        {meet.course ? (
                          <div>
                            <div className="font-medium">{meet.course.name}</div>
                            {meet.course.location && (
                              <div className="text-sm text-zinc-500">{meet.course.location}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-zinc-300">
                        {formatMeetType(meet.meet_type)}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-300">
                        {meet.race_count}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-300">
                        {meet.season_year}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-cyan-600 text-white'
                        : 'bg-zinc-700 text-white hover:bg-zinc-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
