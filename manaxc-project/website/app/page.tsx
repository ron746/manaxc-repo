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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl text-cyan-500 animate-pulse">Loading Mana XC...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Hero Section */}
      <section className="relative container mx-auto px-6 pt-20 pb-24 bg-zinc-100/50">
        <div className="relative text-center max-w-4xl mx-auto z-10">
          {/* Logo */}
          <div className="w-32 md:w-40 mx-auto mb-6">
            <img 
              src="/mana-xc-logo.png"
              alt="Mana XC Tribal Runner Logo"
              className="w-full h-auto object-contain"
            />
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-zinc-900 mb-4 tracking-tight">
            The Finish Line Starts Here
          </h1>
          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">
            Your definitive source for Westmont High School Cross Country results, athlete tracking, and course records.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/meets"
              className="px-8 py-3 bg-cyan-600 text-white rounded-full font-bold shadow-lg shadow-cyan-500/50 hover:bg-cyan-700 transition-all duration-300 transform hover:scale-105"
            >
              Race Day Results
            </a>
            <a
              href="/schools"
              className="px-8 py-3 bg-zinc-900 text-cyan-500 border-2 border-cyan-500 rounded-full font-bold hover:bg-zinc-800 transition-colors duration-300 transform hover:scale-105"
            >
              Analyze Teams
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard value={stats.schools} label="Schools" color="text-cyan-600" />
          <StatCard value={stats.athletes} label="Athletes" color="text-red-500" />
          <StatCard value={stats.courses} label="Courses" color="text-emerald-600" />
          <StatCard value={stats.results} label="Results" color="text-indigo-600" />
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-extrabold text-zinc-900 mb-12 text-center tracking-tight">
          Tools Built for the XC Season
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            title="Team &amp; Roster Deep Dive"
            description="Track athlete PRs, progression, and team scores across every meet and season."
            iconPath="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            iconColor="text-cyan-600"
            bgColor="bg-cyan-50"
          />
          <FeatureCard 
            title="Course Breakdown"
            description="Analyze historical fastest times and compare difficulty ratings."
            iconPath="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            iconColor="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <FeatureCard 
            title="Results &amp; Leaderboards"
            description="Access official meet results instantly, filter by class, and see the top finishers."
            iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            iconColor="text-indigo-600"
            bgColor="bg-indigo-50"
          />
        </div>
      </section>

      {/* Recent Meets Section */}
      {meets.length > 0 && (
        <section className="container mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-8 text-center">
            Latest Race Day Action
          </h2>
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-3xl mx-auto border border-zinc-200">
            <div className="divide-y divide-zinc-200">
              {meets.map((meet) => (
                <a
                  key={meet.id}
                  href={`/meets/${meet.id}`}
                  className="block p-4 hover:bg-cyan-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{meet.name}</h3>
                      <p className="text-sm text-zinc-600">
                        {new Date(meet.meet_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-cyan-600">{meet.season_year} Season</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-zinc-900 text-white mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-zinc-400 text-sm">
            <p>&copy; {new Date().getFullYear()} ManaXC. Where the Cross Country Journey Begins.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const StatCard = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <div className="bg-white rounded-xl shadow-xl p-6 text-center border-t-4 border-cyan-500">
        <div className={`text-5xl font-extrabold ${color} mb-2`}>
            {value.toLocaleString()}
        </div>
        <div className="text-zinc-700 font-semibold">{label}</div>
    </div>
);

const FeatureCard = ({ title, description, iconPath, iconColor, bgColor }: { title: string, description: string, iconPath: string, iconColor: string, bgColor: string }) => (
    <div className={`${bgColor} rounded-xl shadow-lg p-8 transform transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border border-zinc-200`}>
        <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center mb-4 border-2 border-dashed ${iconColor}`}>
            <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
            </svg>
        </div>
        <h3 className="text-xl font-bold text-zinc-900 mb-3 tracking-tight">{title}</h3>
        <p className="text-zinc-600">{description}</p>
    </div>
);
