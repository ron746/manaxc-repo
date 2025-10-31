// Find duplicate Lagoon Valley 2 Miles courses and show details
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔍 Finding Lagoon Valley duplicate courses...\n')

  // Get all Lagoon Valley courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .ilike('name', '%Lagoon Valley%')
    .order('distance_meters', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${courses.length} Lagoon Valley courses:\n`)

  for (const course of courses) {
    // Count races on this course
    const { count: raceCount } = await supabase
      .from('races')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course.id)

    // Get a sample race name
    const { data: sampleRaces } = await supabase
      .from('races')
      .select('name')
      .eq('course_id', course.id)
      .limit(2)

    console.log(`📍 ID: ${course.id}`)
    console.log(`   Name: ${course.name}`)
    console.log(`   Distance: ${(course.distance_meters / 1609.344).toFixed(2)} miles`)
    console.log(`   Difficulty: ${course.difficulty_rating}`)
    console.log(`   Created: ${new Date(course.created_at).toLocaleString()}`)
    console.log(`   Races: ${raceCount}`)
    if (sampleRaces && sampleRaces.length > 0) {
      console.log(`   Sample races: ${sampleRaces.map(r => r.name).join(', ')}`)
    }
    console.log('')
  }

  // Find duplicates (same name and distance)
  const duplicates = {}
  for (const course of courses) {
    const key = `${course.name}|${course.distance_meters}`
    if (!duplicates[key]) {
      duplicates[key] = []
    }
    duplicates[key].push(course)
  }

  console.log('📊 Duplicate Analysis:\n')
  for (const [key, coursesWithSameKey] of Object.entries(duplicates)) {
    if (coursesWithSameKey.length > 1) {
      const [name, distance] = key.split('|')
      console.log(`⚠️  Found ${coursesWithSameKey.length} courses: ${name} (${distance}m)`)
      for (const course of coursesWithSameKey) {
        const { count: raceCount } = await supabase
          .from('races')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)

        console.log(`   - ${course.id}: ${raceCount} races, created ${new Date(course.created_at).toLocaleString()}`)
      }
      console.log('')
    }
  }

  console.log('💡 Recommendation:')
  console.log('   Keep the course with races (or the oldest if both empty)')
  console.log('   Delete the other one manually or run fix_lagoon_valley_complete.sql')
}

main()
