'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to check if the current user is an admin
 * Returns { isAdmin: boolean, loading: boolean, user: User | null }
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        setUser(currentUser)

        if (currentUser) {
          // Check if user is in admin_users table
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('email')
            .eq('user_id', currentUser.id)
            .single()

          setIsAdmin(!!adminData)
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [])

  return { isAdmin, loading, user }
}
