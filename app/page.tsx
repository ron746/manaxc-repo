'use client'

import { useEffect, useState } from 'react'
import { getStats, getRecentMeets } from '@/lib/supabase/queries'

interface Stats {
  schools: number
  athletes: number
  courses: number
  results: number
}

interface Meet {
  id: string
  name: string
  meet_date: string
  season_year: number
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ schools: 0, athletes: 0, courses: 0, results: 0 })
  const [meets, setMeets] = useState<Meet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [statsData, meetsData] = await Promise.all([
          getStats(),
          getRecentMeets(10)
        ])
        setStats(statsData)
        setMeets(meetsData)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load data from database')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Welcome to <span className="text-blue-600">ManaXC</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            The ultimate platform for high school cross country.
            Track performances, analyze trends, and celebrate every runner&apos;s journey.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/meets"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse Meets
            </a>
            <a
              href="/schools"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              View Schools
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {stats.schools.toLocaleString()}
            </div>
            <div className="text-slate-600 font-medium">Schools</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">
              {stats.athletes.toLocaleString()}
            </div>
            <div className="text-slate-600 font-medium">Athletes</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {stats.courses.toLocaleString()}
            </div>
            <div className="text-slate-600 font-medium">Courses</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {stats.results.toLocaleString()}
            </div>
            <div className="text-slate-600 font-medium">Results</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">
          Everything You Need for Cross Country
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Schools & Teams</h3>
            <p className="text-slate-600">
              Track team rosters, athlete progression, and school performance over time.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Courses & Venues</h3>
            <p className="text-slate-600">
              Explore course profiles with difficulty ratings, elevation, and historical records.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Meets & Results</h3>
            <p className="text-slate-600">
              Browse complete meet results, compare performances, and analyze trends over seasons.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Meets Section */}
      {meets.length > 0 && (
        <section className="container mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Recent Meets
          </h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-3xl mx-auto">
            <div className="divide-y divide-slate-200">
              {meets.map((meet) => (
                <a
                  key={meet.id}
                  href={`/meets/${meet.id}`}
                  className="block p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-slate-900">{meet.name}</h3>
                      <p className="text-sm text-slate-600">
                        {new Date(meet.meet_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-sm text-slate-500">{meet.season_year}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-slate-600 text-sm">
            <p>&copy; {new Date().getFullYear()} ManaXC. Where Cross Country Comes Alive.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
