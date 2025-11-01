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
  result_count: number
}

type SortField = 'meet_date' | 'name' | 'meet_type' | 'season_year' | 'venue' | 'result_count'
type SortDirection = 'asc' | 'desc'

export default function MeetsPage() {
  const [meets, setMeets] = useState<Meet[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('meet_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [seasonFilter, setSeasonFilter] = useState<string>('all')
  const [meetTypeFilter, setMeetTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [jumpToPage, setJumpToPage] = useState<string>('')
  const meetsPerPage = 50

  useEffect(() => {
    loadMeets()
  }, [])

  const loadMeets = async () => {
    try {
      setLoading(true)

      // Get meets with venue info, race counts, and cached result counts
      const { data: meetsData, error } = await supabase
        .from('meets')
        .select(`
          id,
          name,
          meet_date,
          season_year,
          meet_type,
          result_count,
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
        race_count: meet.races?.length || 0,
        result_count: meet.result_count || 0
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
    // Season filter
    if (seasonFilter !== 'all' && meet.season_year.toString() !== seasonFilter) {
      return false
    }
    // Meet type filter
    if (meetTypeFilter !== 'all' && meet.meet_type !== meetTypeFilter) {
      return false
    }
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const meetName = meet.name.toLowerCase()
      const venueName = meet.venue?.name?.toLowerCase() || ''
      const venueCity = meet.venue?.city?.toLowerCase() || ''
      const venueState = meet.venue?.state?.toLowerCase() || ''

      const matchesSearch =
        meetName.includes(query) ||
        venueName.includes(query) ||
        venueCity.includes(query) ||
        venueState.includes(query)

      if (!matchesSearch) {
        return false
      }
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

        {/* Search Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-4 border border-blue-200 shadow-sm">
          <label htmlFor="search" className="block text-sm font-medium text-zinc-700 mb-2">
            Search Meets
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by meet name, venue, city, or state..."
              className="w-full px-4 py-3 pr-10 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                title="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {!searchQuery && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-blue-700">
              Found {filteredMeets.length} meet{filteredMeets.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          )}
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
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  setSearchQuery('')
                  setSeasonFilter('all')
                  setMeetTypeFilter('all')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg transition-colors font-medium"
              >
                Clear All Filters
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
                    onClick={() => handleSort('result_count')}
                    className="py-4 px-6 text-center font-bold text-zinc-900 cursor-pointer hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Results <SortIcon field="result_count" />
                    </div>
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
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
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
                        {meet.result_count}
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

        {/* Intelligent Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 bg-white rounded-lg shadow-lg border border-zinc-200 p-6">
            <div className="flex flex-col gap-4">
              {/* Primary Navigation */}
              <div className="flex flex-wrap justify-center items-center gap-2">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="First page"
                >
                  ««
                </button>

                {/* Back 5 */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 5))}
                  disabled={currentPage <= 5}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Back 5 pages"
                >
                  -5
                </button>

                {/* Previous */}
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (currentPage <= 4) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = currentPage - 3 + i
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                {/* Next */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Next
                </button>

                {/* Forward 5 */}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 5))}
                  disabled={currentPage > totalPages - 5}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Forward 5 pages"
                >
                  +5
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Last page"
                >
                  »»
                </button>
              </div>

              {/* Jump to Page & Info */}
              <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-zinc-200">
                <div className="text-sm text-zinc-600">
                  Page <span className="font-semibold text-zinc-900">{currentPage}</span> of <span className="font-semibold text-zinc-900">{totalPages}</span>
                  <span className="mx-2">•</span>
                  Total: <span className="font-semibold text-zinc-900">{sortedMeets.length}</span> meets
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="jumpToPage" className="text-sm font-medium text-zinc-700">
                    Jump to page:
                  </label>
                  <input
                    id="jumpToPage"
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const page = parseInt(jumpToPage)
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page)
                          setJumpToPage('')
                        }
                      }
                    }}
                    placeholder={`1-${totalPages}`}
                    className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const page = parseInt(jumpToPage)
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page)
                        setJumpToPage('')
                      }
                    }}
                    disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
