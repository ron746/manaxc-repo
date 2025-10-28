// @ts-nocheck
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
  venue: {
    name: string
    city: string | null
    state: string | null
  } | null
  race_count: number
}

type SortField = 'meet_date' | 'name' | 'meet_type' | 'season_year' | 'venue'
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

      // Get meets with venue info and race counts
      const { data: meetsData, error } = await supabase
        .from('meets')
        .select(`
          id,
          name,
          meet_date,
          season_year,
          meet_type,
          venue:venues(
            name,
            city,
            state
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
        venue: meet.venue as { name: string; city: string | null; state: string | null } | null,
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
    } else if (sortField === 'venue') {
      // Sort by venue name, with null venues at the end
      aVal = a.venue?.name?.toLowerCase() || 'zzzzz'
      bVal = b.venue?.name?.toLowerCase() || 'zzzzz'
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
    return <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl font-semibold text-zinc-900">Loading meets...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 mb-2">Cross Country Meets</h1>
          <p className="text-zinc-600">{meets.length} total meets</p>
        </div>

        {/* Filters */}
        <div className="bg-zinc-50 rounded-lg p-6 mb-6 border border-zinc-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Season
              </label>
              <select
                value={seasonFilter}
                onChange={(e) => {
                  setSeasonFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Seasons</option>
                {seasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Meet Type
              </label>
              <select
                value={meetTypeFilter}
                onChange={(e) => {
                  setMeetTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-zinc-600">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedMeets.length)} of {sortedMeets.length} meets
        </div>

        {/* Meets Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th
                    onClick={() => handleSort('meet_date')}
                    className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Date <SortIcon field="meet_date" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Meet Name <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('venue')}
                    className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Venue <SortIcon field="venue" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('meet_type')}
                    className="py-4 px-6 text-left font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Type <SortIcon field="meet_type" />
                    </div>
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-zinc-900">
                    Races
                  </th>
                  <th
                    onClick={() => handleSort('season_year')}
                    className="py-4 px-6 text-center font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
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
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No meets found
                    </td>
                  </tr>
                ) : (
                  currentMeets.map((meet) => (
                    <tr
                      key={meet.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      <td className="py-4 px-6 text-zinc-700">
                        {formatDate(meet.meet_date)}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/meets/${meet.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                        >
                          {meet.name}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-zinc-700">
                        {meet.venue ? (
                          <div>
                            <div className="font-medium">{meet.venue.name}</div>
                            {(meet.venue.city || meet.venue.state) && (
                              <div className="text-sm text-zinc-500">
                                {[meet.venue.city, meet.venue.state].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-zinc-700">
                        {formatMeetType(meet.meet_type)}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-700">
                        {meet.race_count}
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-700">
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
              className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
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
              className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
