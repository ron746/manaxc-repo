// Investigate courses with impossible difficulty ratings (< 1.0)
// Check for data quality issues like wrong distances or mixed results

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function investigateCourse(courseName) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Investigating: ${courseName}`)
  console.log('='.repeat(80))

  // Get all courses matching this name
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('*')
    .ilike('name', `%${courseName}%`)
    .order('distance_meters')

  if (coursesError) {
    console.error('Error fetching courses:', coursesError)
    return
  }

  for (const course of courses) {
    console.log(`\n📍 Course: ${course.name}`)
    console.log(`   Distance: ${(course.distance_meters / 1609.344).toFixed(2)} miles (${course.distance_meters}m)`)
    console.log(`   Difficulty: ${course.difficulty_rating}`)

    // Get all races on this course
    const { data: races, error: racesError } = await supabase
      .from('races')
      .select(`
        id,
        name,
        gender,
        meet:meets(id, name, meet_date),
        results:results(count)
      `)
      .eq('course_id', course.id)

    if (racesError) {
      console.error('   Error fetching races:', racesError)
      continue
    }

    console.log(`   Races on this course: ${races.length}`)

    for (const race of races) {
      console.log(`\n   🏁 Race: ${race.name} (${race.gender})`)
      console.log(`      Meet: ${race.meet?.name} (${race.meet?.meet_date})`)

      // Get result statistics for this race
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select('time_cs, athlete_id')
        .eq('race_id', race.id)
        .order('time_cs')

      if (resultsError) {
        console.error('      Error fetching results:', resultsError)
        continue
      }

      if (results.length === 0) {
        console.log('      No results')
        continue
      }

      const times = results.map(r => r.time_cs).filter(t => t !== null)
      const fastest = Math.min(...times)
      const median = times[Math.floor(times.length / 2)]
      const slowest = Math.max(...times)

      console.log(`      Results: ${results.length}`)
      console.log(`      Fastest: ${(fastest / 100).toFixed(1)}s (${(fastest / 100 / 60).toFixed(2)} min)`)
      console.log(`      Median:  ${(median / 100).toFixed(1)}s (${(median / 100 / 60).toFixed(2)} min)`)
      console.log(`      Slowest: ${(slowest / 100).toFixed(1)}s (${(slowest / 100 / 60).toFixed(2)} min)`)

      // Calculate pace per mile
      const fastestPace = (fastest / 100) / (course.distance_meters / 1609.344) / 60
      const medianPace = (median / 100) / (course.distance_meters / 1609.344) / 60

      console.log(`      Pace (fastest): ${fastestPace.toFixed(2)} min/mile`)
      console.log(`      Pace (median):  ${medianPace.toFixed(2)} min/mile`)

      // Flag suspiciously fast paces
      if (medianPace < 5.0) {
        console.log(`      ⚠️  WARNING: Median pace under 5:00/mile - likely data quality issue!`)
      }
      if (fastestPace < 4.0) {
        console.log(`      ⚠️  WARNING: Fastest pace under 4:00/mile - world-class or data error!`)
      }
    }
  }
}

async function main() {
  console.log('🔍 Investigating Courses with Impossible Difficulty Ratings\n')

  await investigateCourse('Lagoon Valley')
  await investigateCourse('Crystal Springs')

  console.log('\n\n💡 Data Quality Recommendations:')
  console.log('   1. If median pace < 5:00/mile for high school XC, check:')
  console.log('      - Is the distance correct in the database?')
  console.log('      - Were short course results mixed with long course?')
  console.log('      - Is this the right venue/course?')
  console.log('   2. Difficulty < 1.0 is impossible (easier than flat)')
  console.log('   3. Use manual adjustment with comment to fix the difficulty')
  console.log('   4. Consider adding distance validation to import process')
}

main()
