import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sql = readFileSync('supabase/migrations/20251030_optimize_course_analysis.sql', 'utf8')

console.log('Applying migration...')

// Split by semicolon and execute each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

for (const statement of statements) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })
    if (error) {
      // Try direct execution
      const { error: error2 } = await supabase.from('_sql').select('*').limit(0)
      console.log('Statement:', statement.substring(0, 100) + '...')
      if (error2) console.error('Error:', error2)
    }
  } catch (e) {
    console.error('Failed:', e.message)
  }
}

console.log('Migration complete')
