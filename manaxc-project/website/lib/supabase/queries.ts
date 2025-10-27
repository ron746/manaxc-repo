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
  const { data, error} = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ==================== ATHLETE DETAIL QUERIES ====================

export async function getAthleteWithSchool(id: string) {
  const { data, error } = await supabase
    .from('athletes')
    .select(`
      *,
      schools (
        id,
        name,
        city,
        state,
        league
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAthleteResults(athleteId: string) {
  const { data, error } = await supabase
    .from('results')
    .select(`
      id,
      time_cs,
      place_overall,
      place_gender,
      place_team,
      is_pr,
      data_source,
      is_legacy_data,
      races (
        id,
        name,
        gender,
        distance_meters,
        meets (
          id,
          name,
          meet_date,
          season_year,
          courses (
            id,
            name,
            location,
            distance_meters,
            distance_display,
            difficulty_rating
          )
        )
      )
    `)
    .eq('athlete_id', athleteId)
    .order('races.meets.meet_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAthleteSeasonStats(athleteId: string, seasonYear: number) {
  const { data, error } = await supabase
    .from('results')
    .select(`
      id,
      time_cs,
      races!inner (
        meets!inner (
          season_year
        )
      )
    `)
    .eq('athlete_id', athleteId)
    .eq('races.meets.season_year', seasonYear);

  if (error) throw error;
  return data || [];
}

// ==================== SCHOOL DETAIL QUERIES ====================

export async function getSchoolAthletes(schoolId: string) {
  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('school_id', schoolId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getSchoolWithStats(schoolId: string) {
  // Get school info
  const school = await getSchoolById(schoolId);

  // Get athletes count
  const { count: athletesCount } = await supabase
    .from('athletes')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId);

  // Get boys count
  const { count: boysCount } = await supabase
    .from('athletes')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('gender', 'M');

  // Get girls count
  const { count: girlsCount } = await supabase
    .from('athletes')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('gender', 'F');

  return {
    ...school,
    athletesCount: athletesCount || 0,
    boysCount: boysCount || 0,
    girlsCount: girlsCount || 0
  };
}
