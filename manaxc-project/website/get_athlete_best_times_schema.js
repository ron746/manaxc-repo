import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // Get a sample row to see the schema
  const { data, error } = await supabase
    .from('athlete_best_times')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('athlete_best_times columns:')
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]))
  } else {
    console.log('No data in table')
  }
}

main()
