import { createClient } from '@supabase/supabase-js'

// Hardcoded for static export - environment variables don't work in browser
const supabaseUrl = 'https://mdspteohgwkpttlmdayn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
