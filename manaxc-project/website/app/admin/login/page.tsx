'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectTo = searchParams.get('redirectTo') || '/admin'
  const errorParam = searchParams.get('error')
  const debugUid = searchParams.get('debug_uid')
  const debugEmail = searchParams.get('debug_email')
  const debugError = searchParams.get('debug_error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Login failed')
        setLoading(false)
        return
      }

      // Check if user is an admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('user_id', data.user.id)
        .single()

      console.log('Admin check during login:', {
        userId: data.user.id,
        email: data.user.email,
        hasAdminData: !!adminData,
        errorCode: adminError?.code,
        errorMessage: adminError?.message,
        errorDetails: adminError?.details
      })

      if (adminError || !adminData) {
        await supabase.auth.signOut()
        const errorMsg = adminError
          ? `Admin check failed: ${adminError.message} (Code: ${adminError.code}). User ID: ${data.user.id.substring(0, 8)}...`
          : `No admin record found for user ${data.user.id.substring(0, 8)}...`
        setError(errorMsg)
        setLoading(false)
        return
      }

      // Success - use full page navigation to ensure cookies are sent to middleware
      window.location.href = redirectTo
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-gray-600">Sign in to access the admin dashboard</p>
          </div>

          {errorParam === 'unauthorized' && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded">
              <p className="text-red-800 font-semibold">
                You do not have admin privileges. Please contact an administrator.
              </p>
              {(debugUid || debugEmail || debugError) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <p className="font-bold text-yellow-900 mb-1">Debug Info:</p>
                  {debugUid && <p className="text-yellow-800">User ID: {debugUid}...</p>}
                  {debugEmail && <p className="text-yellow-800">Email: {debugEmail}</p>}
                  {debugError && <p className="text-yellow-800">Error: {debugError}</p>}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded">
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md text-gray-900 font-semibold bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md text-gray-900 font-semibold bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
              ← Back to Home
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Admin access only. Unauthorized access attempts are logged.</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
