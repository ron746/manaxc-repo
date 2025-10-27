// app/api/admin/batch-import-v2/route.ts
// Optimized batch import using 7 normalized CSV files
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';

interface VenueRow {
  name: string;
  city: string;
  state: string;
}

interface CourseRow {
  venue_name: string;
  distance_meters: number;
  layout_version: string;
}

interface SchoolRow {
  name: string;
}

interface MeetRow {
  athletic_net_id: string;
  name: string;
  meet_date: string;
  season_year: number;
}

interface RaceRow {
  meet_athletic_net_id: string;
  name: string;
  gender: string;
  distance_meters: number;
  venue_name: string;
  athletic_net_id: string;
}

interface AthleteRow {
  full_name: string;
  school_name: string;
  gender: string;
  graduation_year: number;
}

interface ResultRow {
  meet_athletic_net_id: string;
  race_name: string;
  athlete_full_name: string;
  school_name: string;
  graduation_year: number;
  time_cs: number;
  place_overall: number;
  season_year: number;
}

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      const value = values[i] || '';
      row[header] = value.replace(/^"|"$/g, '');
    });

    return row;
  });
}

export async function POST(request: NextRequest) {
  try {
    // NOTE: Auth disabled for local development - re-enable for production!
    const supabase = await createClient();

    // Get file prefix from request (e.g., "athletic-net-1076-2025")
    const body = await request.json();
    const { filePrefix } = body;

    if (!filePrefix) {
      return NextResponse.json(
        { success: false, message: 'Missing filePrefix' },
        { status: 400 }
      );
    }

    console.log(`\n🚀 Starting batch import v2: ${filePrefix}\n`);

    const cwd = process.cwd();

    // Read all 7 CSV files
    const venuesCSV = await fs.readFile(path.join(cwd, `${filePrefix}-venues.csv`), 'utf-8');
    const coursesCSV = await fs.readFile(path.join(cwd, `${filePrefix}-courses.csv`), 'utf-8');
    const schoolsCSV = await fs.readFile(path.join(cwd, `${filePrefix}-schools.csv`), 'utf-8');
    const meetsCSV = await fs.readFile(path.join(cwd, `${filePrefix}-meets.csv`), 'utf-8');
    const racesCSV = await fs.readFile(path.join(cwd, `${filePrefix}-races.csv`), 'utf-8');
    const athletesCSV = await fs.readFile(path.join(cwd, `${filePrefix}-athletes.csv`), 'utf-8');
    const resultsCSV = await fs.readFile(path.join(cwd, `${filePrefix}-results.csv`), 'utf-8');

    // Parse CSVs
  const venues = parseCSV(venuesCSV) as unknown as VenueRow[];
  const courses = parseCSV(coursesCSV) as unknown as CourseRow[];
  const schools = parseCSV(schoolsCSV) as unknown as SchoolRow[];
  const meets = parseCSV(meetsCSV) as unknown as MeetRow[];
  const races = parseCSV(racesCSV) as unknown as RaceRow[];
  const athletes = parseCSV(athletesCSV) as unknown as AthleteRow[];
  const results = parseCSV(resultsCSV) as unknown as ResultRow[];

    console.log(`📊 Loaded CSV files:`);
    console.log(`   Venues: ${venues.length}`);
    console.log(`   Courses: ${courses.length}`);
    console.log(`   Schools: ${schools.length}`);
    console.log(`   Meets: ${meets.length}`);
    console.log(`   Races: ${races.length}`);
    console.log(`   Athletes: ${athletes.length}`);
    console.log(`   Results: ${results.length}\n`);

    // ========================================================================
    // STEP 1: Upsert Venues (handle duplicates across seasons)
    // ========================================================================
    console.log(`1️⃣  Upserting ${venues.length} venues...`);

    // First, get existing venues
    const { data: existingVenues } = await supabase
      .from('venues')
      .select('id, name');

    const venueMap = new Map(existingVenues?.map(v => [v.name, v.id]) || []);

    // Insert only new venues
    const newVenues = venues.filter(v => !venueMap.has(v.name));

    if (newVenues.length > 0) {
      const { data: insertedVenues, error: venuesError } = await supabase
        .from('venues')
        .insert(newVenues.map(v => ({ name: v.name, city: v.city, state: v.state })))
        .select('id, name');

      if (venuesError) {
        console.error('❌ Venues error:', venuesError);
        return NextResponse.json(
          { success: false, message: 'Failed to import venues', error: venuesError.message },
          { status: 500 }
        );
      }

      // Add newly inserted venues to map
      insertedVenues?.forEach(v => venueMap.set(v.name, v.id));
    }

    console.log(`   ✅ ${newVenues.length} new venues, ${existingVenues?.length || 0} existing\n`);

    // ========================================================================
    // STEP 2: Upsert Courses
    // ========================================================================
    console.log(`2️⃣  Upserting ${courses.length} courses...`);

    // Get existing courses
    const { data: existingCourses } = await supabase
      .from('courses')
      .select('id, venue_id, distance_meters');

    const courseMap = new Map(
      existingCourses?.map(c => [`${c.venue_id}|${c.distance_meters}`, c.id]) || []
    );

    // Insert only new courses
    const coursesToInsert = courses
      .map(c => ({
        venue_id: venueMap.get(c.venue_name),
        distance_meters: parseInt(String(c.distance_meters)),
        layout_version: c.layout_version || 'standard',
        xc_time_rating: 1.000,
      }))
      .filter(c => !courseMap.has(`${c.venue_id}|${c.distance_meters}`));

    if (coursesToInsert.length > 0) {
      const { data: insertedCourses, error: coursesError } = await supabase
        .from('courses')
        .insert(coursesToInsert)
        .select('id, venue_id, distance_meters');

      if (coursesError) {
        console.error('❌ Courses error:', coursesError);
        return NextResponse.json(
          { success: false, message: 'Failed to import courses', error: coursesError.message },
          { status: 500 }
        );
      }

      // Add newly inserted courses to map
      insertedCourses?.forEach(c => courseMap.set(`${c.venue_id}|${c.distance_meters}`, c.id));
    }

    console.log(`   ✅ ${coursesToInsert.length} new courses, ${existingCourses?.length || 0} existing\n`);

    // ========================================================================
    // STEP 3: Upsert Schools
    // ========================================================================
    console.log(`3️⃣  Upserting ${schools.length} schools...`);

    // Get existing schools
    const { data: existingSchools } = await supabase
      .from('schools')
      .select('id, name');

    const schoolMap = new Map(existingSchools?.map(s => [s.name, s.id]) || []);

    // Insert only new schools
    const newSchools = schools.filter(s => !schoolMap.has(s.name));

    if (newSchools.length > 0) {
      const { data: insertedSchools, error: schoolsError } = await supabase
        .from('schools')
        .insert(newSchools.map(s => ({ name: s.name })))
        .select('id, name');

      if (schoolsError) {
        console.error('❌ Schools error:', schoolsError);
        return NextResponse.json(
          { success: false, message: 'Failed to import schools', error: schoolsError.message },
          { status: 500 }
        );
      }

      // Add newly inserted schools to map
      insertedSchools?.forEach(s => schoolMap.set(s.name, s.id));
    }

    console.log(`   ✅ ${newSchools.length} new schools, ${existingSchools?.length || 0} existing\n`);

    // ========================================================================
    // STEP 4: Insert Meets
    // ========================================================================
    console.log(`4️⃣  Inserting ${meets.length} meets...`);

    const { data: upsertedMeets, error: meetsError } = await supabase
      .from('meets')
      .insert(
        meets.map(m => ({
          athletic_net_id: m.athletic_net_id,
          name: m.name,
          meet_date: m.meet_date,
          season_year: parseInt(String(m.season_year)),
        }))
      )
      .select('id, athletic_net_id');

    if (meetsError) {
      console.error('❌ Meets error:', meetsError);
      return NextResponse.json(
        { success: false, message: 'Failed to import meets', error: meetsError.message },
        { status: 500 }
      );
    }

    const meetMap = new Map(upsertedMeets?.map(m => [m.athletic_net_id, m.id]) || []);
    console.log(`   ✅ Upserted ${upsertedMeets?.length || 0} meets\n`);

    // ========================================================================
    // STEP 5: Insert Races
    // ========================================================================
    console.log(`5️⃣  Inserting ${races.length} races...`);

    const { data: upsertedRaces, error: racesError } = await supabase
      .from('races')
      .insert(
        races.map(r => {
          const venueId = venueMap.get(r.venue_name);
          const courseKey = `${venueId}|${r.distance_meters}`;
          const courseId = courseMap.get(courseKey);

          return {
            meet_id: meetMap.get(r.meet_athletic_net_id),
            name: r.name,
            gender: r.gender,
            distance_meters: parseInt(String(r.distance_meters)),
            course_id: courseId,
            athletic_net_id: r.athletic_net_id || null,
          };
        })
      )
      .select('id, meet_id, name');

    if (racesError) {
      console.error('❌ Races error:', racesError);
      return NextResponse.json(
        { success: false, message: 'Failed to import races', error: racesError.message },
        { status: 500 }
      );
    }

    // Create (meet_id + race_name) → race ID map
    const raceMap = new Map(
      upsertedRaces?.map(r => [`${r.meet_id}|${r.name}`, r.id]) || []
    );
    console.log(`   ✅ Upserted ${upsertedRaces?.length || 0} races\n`);

    // ========================================================================
    // STEP 6: Upsert Athletes
    // ========================================================================
    console.log(`6️⃣  Upserting ${athletes.length} athletes...`);

    // Get existing athletes
    const { data: existingAthletes } = await supabase
      .from('athletes')
      .select('id, full_name, current_school_id, graduation_year');

    const athleteMap = new Map(
      existingAthletes?.map(a => [
        `${a.full_name}|${a.current_school_id}|${a.graduation_year}`,
        a.id
      ]) || []
    );

    // Build unique set of athletes from CSV (deduplicate within CSV first)
    const uniqueAthletes = new Map();
    athletes.forEach(a => {
      const schoolId = schoolMap.get(a.school_name);
      const gradYear = a.graduation_year ? parseInt(String(a.graduation_year)) : null;
      const key = `${a.full_name}|${schoolId}|${gradYear}`;

      if (!uniqueAthletes.has(key)) {
        uniqueAthletes.set(key, {
          full_name: a.full_name,
          current_school_id: schoolId,
          gender: a.gender,
          graduation_year: gradYear,
        });
      }
    });

    // We upsert all unique athletes below; no intermediate list required.

    // Use upsert with ON CONFLICT to handle any edge cases we might have missed
    const { data: upsertedAthletes, error: athletesError } = await supabase
      .from('athletes')
      .upsert(Array.from(uniqueAthletes.values()), {
        onConflict: 'full_name,current_school_id,graduation_year',
        ignoreDuplicates: false
      })
      .select('id, full_name, current_school_id, graduation_year');

    if (athletesError) {
      console.error('❌ Athletes error:', athletesError);
      return NextResponse.json(
        { success: false, message: 'Failed to import athletes', error: athletesError.message },
        { status: 500 }
      );
    }

    // Rebuild athlete map with ALL athletes (existing + upserted)
    athleteMap.clear();
    upsertedAthletes?.forEach(a =>
      athleteMap.set(`${a.full_name}|${a.current_school_id}|${a.graduation_year}`, a.id)
    );

    console.log(`   ✅ Upserted ${upsertedAthletes?.length || 0} athletes (${existingAthletes?.length || 0} existed)\n`);

    // ========================================================================
    // STEP 7: Bulk Insert Results (NO deduplication - trust upstream)
    // ========================================================================
    console.log(`7️⃣  Inserting ${results.length} results...`);

    // Insert in batches of 500 to avoid payload limits
    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);

      // Filter out results without valid times (DNF, DNS, etc.)
      const validResults = batch
        .map(r => {
          const meetId = meetMap.get(r.meet_athletic_net_id);
          const raceKey = `${meetId}|${r.race_name}`;
          const raceId = raceMap.get(raceKey);

          const schoolId = schoolMap.get(r.school_name);
          const athleteKey = `${r.athlete_full_name}|${schoolId}|${r.graduation_year}`;
          const athleteId = athleteMap.get(athleteKey);

          const time_cs = r.time_cs ? parseInt(String(r.time_cs)) : null;

          return {
            race_id: raceId,
            athlete_id: athleteId,
            time_cs,
            place_overall: r.place_overall ? parseInt(String(r.place_overall)) : null,
            season_year: parseInt(String(r.season_year)),
          };
        })
        .filter(r => r.time_cs !== null && r.time_cs > 0); // Only include valid times

      if (validResults.length === 0) continue; // Skip empty batches

      const { error: resultsError } = await supabase
        .from('results')
        .insert(validResults);

      if (resultsError) {
        console.error(`❌ Results batch ${i / BATCH_SIZE + 1} error:`, resultsError);
        return NextResponse.json(
          { success: false, message: 'Failed to import results', error: resultsError.message },
          { status: 500 }
        );
      }

      insertedCount += validResults.length;
      console.log(`   📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${validResults.length} results`);
    }

    console.log(`   ✅ Inserted ${insertedCount} results\n`);

    // ========================================================================
    // SUCCESS!
    // ========================================================================
    console.log(`✅ BATCH IMPORT COMPLETE!\n`);

    return NextResponse.json({
      success: true,
      message: 'Batch import completed successfully',
      data: {
        venues: venueMap.size,
        courses: courseMap.size,
        schools: schoolMap.size,
        meets: upsertedMeets?.length || 0,
        races: upsertedRaces?.length || 0,
        athletes: upsertedAthletes?.length || 0,
        results: insertedCount,
      }
    });

  } catch (error) {
    console.error('❌ Batch import error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error during batch import',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
