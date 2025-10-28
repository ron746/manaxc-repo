'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils/time'

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
}

interface Race {
  id: string
  name: string
  gender: string
  division: string | null
  distance_meters: number
  result_count: number
  winning_time_cs: number | null
  winning_athlete: string | null
}

export default function MeetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const meetId = params.meetId as string

  const [meet, setMeet] = useState<Meet | null>(null)
  const [races, setRaces] = useState<Race[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMeetData()
  }, [meetId])

  const loadMeetData = async () => {
    try {
      setLoading(true)

      // Load meet info
      const { data: meetData, error: meetError } = await supabase
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
          )
        `)
        .eq('id', meetId)
        .single()

      if (meetError) throw meetError
      setMeet(meetData as any) // TODO: Fix type mismatch

      // Load races with result counts and winning times
      const { data: racesData, error: racesError } = await supabase
        .from('races')
        .select(`
          id,
          name,
          gender,
          division,
          distance_meters,
          results(
            id,
            time_cs,
            place_overall,
            athlete:athletes(
              name
            )
          )
        `)
        .eq('meet_id', meetId)
        .order('name', { ascending: true })

      if (racesError) throw racesError

      // Process races to get counts and winning info
      const processedRaces: Race[] = racesData?.map(race => {
        const results = race.results || []
        const sortedResults = [...results].sort((a, b) => (a.place_overall || 999) - (b.place_overall || 999))
        const winner = sortedResults[0]

        return {
          id: race.id,
          name: race.name,
          gender: race.gender,
          division: race.division,
          distance_meters: race.distance_meters,
          result_count: results.length,
          winning_time_cs: winner?.time_cs || null,
          winning_athlete: (winner?.athlete as any)?.name || null
        }
      }) || []

      setRaces(processedRaces)
    } catch (error) {
      console.error('Error loading meet:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatMeetType = (type: string | null) => {
    if (!type) return 'N/A'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatDistance = (meters: number) => {
    if (meters === 5000) return '5K'
    if (meters === 3000) return '3K'
    if (meters === 4000) return '4K'
    const miles = meters / 1609.34
    if (miles === 3) return '3 Miles'
    if (miles === 2) return '2 Miles'
    return `${miles.toFixed(2)} mi`
  }

  const getGenderBadgeColor = (gender: string) => {
    if (gender === 'M') return 'bg-blue-600'
    if (gender === 'F') return 'bg-pink-600'
    return 'bg-zinc-600'
  }

  const getGenderLabel = (gender: string) => {
    if (gender === 'M') return 'Boys'
    if (gender === 'F') return 'Girls'
    return 'Mixed'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-xl font-semibold text-white">Loading meet...</div>
      </div>
    )
  }

  if (!meet) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Meet not found</h1>
          <Link href="/meets" className="text-cyan-400 hover:text-cyan-300">
            Back to Meets
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
          <Link href="/meets" className="text-cyan-400 hover:text-cyan-300">
            Meets
          </Link>
          <span className="text-zinc-500 mx-2">/</span>
          <span className="text-zinc-300">{meet.name}</span>
        </div>

        {/* Meet Header */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-8 mb-8 border border-zinc-700">
          <h1 className="text-4xl font-bold text-white mb-4">{meet.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-zinc-400 mb-1">Date</div>
              <div className="text-white font-medium">{formatDate(meet.meet_date)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Season</div>
              <div className="text-white font-medium">{meet.season_year}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Type</div>
              <div className="text-white font-medium">{formatMeetType(meet.meet_type)}</div>
            </div>

            <div>
              <div className="text-sm text-zinc-400 mb-1">Venue</div>
              {meet.venue ? (
                <div>
                  <div className="text-white font-medium">{meet.venue.name}</div>
                  {(meet.venue.city || meet.venue.state) && (
                    <div className="text-sm text-zinc-500">
                      {[meet.venue.city, meet.venue.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-zinc-500">N/A</div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
            <div className="text-zinc-400 text-sm mb-2">Total Races</div>
            <div className="text-3xl font-bold text-cyan-400">{races.length}</div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
            <div className="text-zinc-400 text-sm mb-2">Total Participants</div>
            <div className="text-3xl font-bold text-cyan-400">
              {races.reduce((sum, race) => sum + race.result_count, 0)}
            </div>
          </div>

          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700">
            <div className="text-zinc-400 text-sm mb-2">Fastest Time</div>
            <div className="text-3xl font-bold text-cyan-400">
              {races.length > 0 && races.some(r => r.winning_time_cs)
                ? formatTime(Math.min(...races.filter(r => r.winning_time_cs).map(r => r.winning_time_cs!)))
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Races Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Races</h2>
        </div>

        {races.length === 0 ? (
          <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-12 text-center border border-zinc-700">
            <p className="text-zinc-400 text-lg">No races found for this meet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {races.map((race) => (
              <Link
                key={race.id}
                href={`/meets/${meetId}/races/${race.id}`}
                className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-6 border border-zinc-700 hover:border-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/20 group"
              >
                {/* Race Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {race.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getGenderBadgeColor(race.gender)}`}>
                      {getGenderLabel(race.gender)}
                    </span>
                  </div>
                  {race.division && (
                    <div className="text-sm text-zinc-400">{race.division}</div>
                  )}
                </div>

                {/* Race Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Distance</span>
                    <span className="text-white font-medium">{formatDistance(race.distance_meters)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Participants</span>
                    <span className="text-white font-medium">{race.result_count}</span>
                  </div>

                  {race.winning_time_cs && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Winning Time</span>
                        <span className="text-cyan-400 font-bold">{formatTime(race.winning_time_cs)}</span>
                      </div>

                      {race.winning_athlete && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 text-sm">Winner</span>
                          <span className="text-white font-medium text-sm">{race.winning_athlete}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* View Results Link */}
                <div className="mt-4 pt-4 border-t border-zinc-700">
                  <span className="text-cyan-400 group-hover:text-cyan-300 text-sm font-medium">
                    View Results →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
