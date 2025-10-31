// Quick script to apply migration and run anomaly detection
// Usage: node run_anomaly_detection.js

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔍 Running Elite Runner Anomaly Detection...\n')

  try {
    // Call the function (it should already be created via migration)
    const { data, error } = await supabase.rpc('identify_course_anomalies_elite', {
      min_shared_athletes: 10,
      outlier_threshold_std_dev: 2.0
    })

    if (error) {
      console.error('❌ Error running anomaly detection:', error.message)
      console.log('\n💡 You may need to apply the migration first.')
      console.log('📝 Run this SQL in Supabase SQL Editor:')
      console.log('   website/supabase/migrations/20251031_identify_course_anomalies_elite_runners.sql')
      process.exit(1)
    }

    if (!data || data.length === 0) {
      console.log('✅ No significant anomalies detected!')
      console.log('   All courses appear to have consistent athlete performances.')
      return
    }

    console.log(`📊 Found ${data.length} courses with statistical anomalies:\n`)
    console.log('─'.repeat(140))
    console.log(
      'Course'.padEnd(40) +
      'Miles'.padStart(6) +
      'Elite'.padStart(7) +
      'Fast'.padStart(6) +
      'Slow'.padStart(6) +
      'Out%'.padStart(7) +
      'Diff/mi'.padStart(9) +
      'Direction'.padStart(30) +
      'Level'.padStart(20)
    )
    console.log('─'.repeat(140))

    data.forEach(row => {
      const courseName = row.course_name.length > 38
        ? row.course_name.substring(0, 35) + '...'
        : row.course_name

      const miles = (row.distance_meters / 1609.344).toFixed(2)
      const diffColor = row.difference_seconds_per_mile < 0 ? '\x1b[32m' : '\x1b[31m' // Green for fast, red for slow
      const resetColor = '\x1b[0m'

      console.log(
        courseName.padEnd(40) +
        miles.padStart(6) +
        row.elite_athlete_count.toString().padStart(7) +
        row.athletes_with_fast_outlier.toString().padStart(6) +
        row.athletes_with_slow_outlier.toString().padStart(6) +
        row.outlier_percentage.toFixed(1).padStart(7) +
        diffColor + row.difference_seconds_per_mile.toFixed(2).padStart(9) + resetColor +
        row.anomaly_direction.padStart(30) +
        row.suspicion_level.substring(0, 18).padStart(20)
      )
    })

    console.log('─'.repeat(140))
    console.log('\n📈 Interpretation:')
    console.log('  • Negative diff = Athletes FASTER than typical → Course easier or short-measured')
    console.log('  • Positive diff = Athletes SLOWER than typical → Course harder or tough conditions')
    console.log('  • High outlier % = Strong signal (many athletes affected)')
    console.log('\n💡 Next Steps:')
    console.log('  • CRITICAL/HIGH courses should be investigated')
    console.log('  • Check if course distance is correct in database')
    console.log('  • Consider adjusting difficulty rating')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  }
}

main()
