// Full database recalculation of normalized times, best times, and course records
// Run after fixing course distances/difficulties that happened before triggers were in place

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔄 Starting Full Database Recalculation')
  console.log('=' .repeat(80))
  console.log('')

  // Step 1: Count total results
  console.log('📊 Step 1: Counting results...')
  const { count: totalResults, error: countError } = await supabase
    .from('results')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error counting results:', countError)
    process.exit(1)
  }

  console.log(`   Total results in database: ${totalResults}`)
  console.log('')

  // Step 2: Recalculate normalized times
  console.log('⚙️  Step 2: Recalculating normalized_time_cs for ALL results...')
  console.log('   This will update every result to use correct distance/difficulty')
  console.log('   Please wait...')

  const { data: updateData, error: updateError } = await supabase.rpc('batch_rebuild_normalized_times')

  if (updateError) {
    console.error('❌ Error recalculating normalized times:', updateError)
    process.exit(1)
  }

  console.log('   ✅ Normalized times recalculated')
  console.log('')

  // Step 3: Rebuild athlete best times
  console.log('👟 Step 3: Rebuilding athlete_best_times table...')
  console.log('   This may take 2-3 minutes for all athletes...')

  const { data: bestTimesData, error: bestTimesError } = await supabase.rpc('batch_rebuild_athlete_best_times')

  if (bestTimesError) {
    console.error('❌ Error rebuilding athlete best times:', bestTimesError)
    process.exit(1)
  }

  console.log('   ✅ Athlete best times rebuilt')
  console.log('')

  // Step 4: Rebuild course records
  console.log('🏆 Step 4: Rebuilding course_records table...')

  const { data: recordsData, error: recordsError } = await supabase.rpc('batch_rebuild_course_records')

  if (recordsError) {
    console.error('❌ Error rebuilding course records:', recordsError)
    process.exit(1)
  }

  console.log('   ✅ Course records rebuilt')
  console.log('')

  // Step 5: Verify key courses
  console.log('🔍 Step 5: Verifying key courses...')
  console.log('')

  const courses = [
    'Lagoon Valley Park, 2 Miles',
    'Lagoon Valley Park, 3 Miles',
    'Crystal Springs, 2.13 Miles',
    'Crystal Springs, 2.95 Miles'
  ]

  for (const courseName of courses) {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        distance_meters,
        difficulty_rating,
        races:races(
          id,
          results:results(
            time_cs
          )
        )
      `)
      .eq('name', courseName)
      .single()

    if (error || !data) {
      console.log(`   ⚠️  ${courseName}: Not found`)
      continue
    }

    const allTimes = data.races.flatMap(race =>
      race.results.map(r => r.time_cs).filter(t => t !== null)
    )

    if (allTimes.length === 0) {
      console.log(`   ⚠️  ${courseName}: No results`)
      continue
    }

    const fastestTime = Math.min(...allTimes)
    const miles = data.distance_meters / 1609.344
    const pace = (fastestTime / 100) / miles / 60

    console.log(`   ✅ ${courseName}`)
    console.log(`      Distance: ${miles.toFixed(2)} miles`)
    console.log(`      Difficulty: ${data.difficulty_rating.toFixed(6)}`)
    console.log(`      Results: ${allTimes.length}`)
    console.log(`      Fastest pace: ${pace.toFixed(2)} min/mile`)
    console.log('')
  }

  console.log('=' .repeat(80))
  console.log('✅ Full recalculation complete!')
  console.log('')
  console.log('💡 Next steps:')
  console.log('   1. Run anomaly detection at http://localhost:3000/admin/course-anomalies')
  console.log('   2. Verify that Lagoon Valley and Crystal Springs now show correct data')
  console.log('   3. All future changes will auto-recalculate via triggers')
}

main()
