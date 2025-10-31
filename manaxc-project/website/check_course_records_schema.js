import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // Check if table exists and get schema
  const { data, error } = await supabase
    .from('course_records')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error (table may not exist):', error.message)
    return
  }

  console.log('course_records columns:')
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]))
  } else {
    console.log('Table exists but has no data')
  }
}

main()
