import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mdspteohgwkpttlmdayn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const value = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
          ?.split('=')[1]
        return value
      },
      set(name: string, value: string, options: any) {
        let cookie = `${name}=${value}; path=/; SameSite=Lax`

        if (options.maxAge) {
          cookie += `; max-age=${options.maxAge}`
        } else {
          // Default to 1 year if no maxAge specified
          cookie += `; max-age=31536000`
        }

        // Use secure cookies in production
        if (window.location.protocol === 'https:') {
          cookie += '; Secure'
        }

        document.cookie = cookie
      },
      remove(name: string, options: any) {
        document.cookie = `${name}=; path=/; max-age=0`
      }
    }
  })
}

// For backwards compatibility
export const supabase = createClient()
