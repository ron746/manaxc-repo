import { supabase } from './client'

export async function getStats() {
  const [schools, athletes, courses, results] = await Promise.all([
    supabase.from('schools').select('id', { count: 'exact', head: true }),
    supabase.from('athletes').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('results').select('id', { count: 'exact', head: true })
  ])

  return {
    schools: schools.count || 0,
    athletes: athletes.count || 0,
    courses: courses.count || 0,
    results: results.count || 0
  }
}

export async function getRecentMeets(limit = 10) {
  const { data, error } = await supabase
    .from('meets')
    .select(`
      id,
      name,
      meet_date,
      season_year
    `)
    .order('meet_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAthletes() {
  const { data, error } = await supabase
    .from('athletes')
    .select(`
      *,
      schools (
        name
      )
    `)
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getSchools() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCourseById(id: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAthleteById(id: string) {
  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getSchoolById(id: string) {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}
