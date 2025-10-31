'use client'

import { useIsAdmin } from '@/lib/hooks/useIsAdmin'

export default function Header() {
  const { isAdmin } = useIsAdmin()

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-slate-800">
            ManaXC
          </a>
          <div className="flex gap-6 items-center">
            <a href="/meets" className="text-slate-600 hover:text-blue-600 transition-colors">
              Meets
            </a>
            <a href="/courses" className="text-slate-600 hover:text-blue-600 transition-colors">
              Courses
            </a>
            {isAdmin && (
              <a
                href="/admin"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin
              </a>
            )}
            <a href="/schools" className="text-slate-600 hover:text-blue-600 transition-colors">
              Schools
            </a>
            <a href="/athletes" className="text-slate-600 hover:text-blue-600 transition-colors">
              Athletes
            </a>
            <a href="/season" className="text-slate-600 hover:text-blue-600 transition-colors">
              Seasons
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
