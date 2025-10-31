// Check which races are on which Lagoon Valley course
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔍 Checking Lagoon Valley race assignments...\n')

  // Get both courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, name, distance_meters')
    .ilike('name', '%Lagoon Valley%')
    .order('distance_meters')

  if (error) {
    console.error('Error:', error)
    return
  }

  for (const course of courses) {
    console.log(`📍 ${course.name} (${(course.distance_meters / 1609.344).toFixed(2)} miles)`)
    console.log(`   Course ID: ${course.id}\n`)

    // Get all races on this course
    const { data: races, error: racesError } = await supabase
      .from('races')
      .select('id, name')
      .eq('course_id', course.id)
      .order('name')

    if (racesError) {
      console.error('   Error fetching races:', racesError)
      continue
    }

    if (races.length === 0) {
      console.log('   ❌ NO RACES on this course!\n')
      continue
    }

    console.log(`   Races (${races.length} total):`)
    for (const race of races) {
      // Check if race name matches course distance
      const raceHas2Miles = race.name.includes('2 Miles')
      const raceHas3Miles = race.name.includes('3 Miles')
      const courseIs2Miles = course.distance_meters < 3500
      const courseIs3Miles = course.distance_meters > 4000

      let status = '✅'
      if (courseIs2Miles && !raceHas2Miles) {
        status = '❌ WRONG COURSE!'
      } else if (courseIs3Miles && !raceHas3Miles) {
        status = '❌ WRONG COURSE!'
      }

      console.log(`   ${status} ${race.name}`)
    }
    console.log('')
  }

  console.log('💡 Summary:')
  console.log('   - 2-mile races should be on the 2-mile course')
  console.log('   - 3-mile races should be on the 3-mile course')
  console.log('   - If any are marked "WRONG COURSE", run the reassignment SQL')
}

main()
