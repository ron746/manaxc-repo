const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sql = fs.readFileSync('supabase/migrations/20251030_optimize_course_analysis.sql', 'utf8')

console.log('Ready to apply migration.')
console.log('Please copy the SQL below and run it in Supabase SQL Editor:')
console.log('\n================SQL START================\n')
console.log(sql)
console.log('\n=================SQL END=================\n')
console.log('Or visit: https://supabase.com/dashboard/project/mdspteohgwkpttlmdayn/sql/new')
