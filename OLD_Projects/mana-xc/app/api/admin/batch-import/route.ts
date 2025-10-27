// app/api/admin/batch-import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';
// parseCSVData and groupParsedResults are available in import-parser but not used here
// import { parseCSVData, groupParsedResults } from '@/lib/admin/import-parser';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin access
    // NOTE: Auth disabled for local development - re-enable for production!
    const supabase = await createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // const { data: profile } = await supabase
    //   .from('user_profiles')
    //   .select('role')
    //   .eq('user_id', user.id)
    //   .single();

    // if (profile?.role !== 'admin') {
    //   return NextResponse.json(
    //     { success: false, message: 'Forbidden - Admin access required' },
    //     { status: 403 }
    //   );
    // }

    // 2. Get file paths from request
    const body = await request.json();
    const { csvFile, jsonFile } = body;

    if (!csvFile || !jsonFile) {
      return NextResponse.json(
        { success: false, message: 'Missing file paths' },
        { status: 400 }
      );
    }

    // 3. Read and parse the JSON file (contains all structured data)
    const jsonPath = path.join(process.cwd(), jsonFile);
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const meets = JSON.parse(jsonContent);

    if (!meets || meets.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No meets found in JSON file' },
        { status: 400 }
      );
    }

    // 4. Process each meet
    let totalMeetsImported = 0;
    let totalRacesImported = 0;
    let totalResultsImported = 0;
    const errors: string[] = [];

    for (const meet of meets) {
      try {
        // Check if meet already exists by name and date
        const meetDate = meet.date ? new Date(meet.date).toISOString().split('T')[0] : null;

        // Declare at top level so accessible throughout
        let courseId: number | null = null;  // Course ID is SERIAL (integer), not UUID
        let venueId: string | null = null;  // UUID type for venues.id
        const seasonYear = meetDate ? new Date(meetDate).getFullYear() : 2024;

        const { data: existingMeet } = await supabase
          .from('meets')
          .select('id')
          .eq('name', meet.meetName)
          .eq('meet_date', meetDate || '2024-01-01')
          .maybeSingle();

        let meetId: number;
        if (existingMeet) {
          console.log(`Meet already exists, using existing: ${meet.meetName}`);
          meetId = existingMeet.id;
        } else {

        // Find or create VENUE (not course!)
        // FIX 1: Parse location properly to get clean venue name
        if (meet.location) {
          const locationParts = meet.location.split(',').map((s: string) => s.trim());
          const venueName = locationParts[0]; // Just "Crystal Springs", not "Crystal Springs, CA  US"
          const state = locationParts[1] || 'CA';

          const { data: existingVenue } = await supabase
            .from('venues')
            .select('id')
            .eq('name', venueName)
            .maybeSingle();

          if (existingVenue) {
            venueId = existingVenue.id;
          } else {
            // Create new venue with clean name
            const { data: newVenue, error: venueError } = await supabase
              .from('venues')
              .insert({
                name: venueName,  // Clean name only
                city: venueName,  // Use venue name as city
                state: state,
              })
              .select('id')
              .single();

            if (venueError) {
              errors.push(`Failed to create venue for ${meet.meetName}: ${venueError.message}`);
              continue;
            }
            venueId = newVenue.id;
          }
        }

        // Create the meet
        const { data: newMeet, error: meetError} = await supabase
          .from('meets')
          .insert({
            name: meet.meetName,
            meet_date: meetDate || '2024-01-01', // Default date if missing
            athletic_net_id: meet.meetId,
            season_year: seasonYear,  // Add season year
          })
          .select('id')
          .single();

          if (meetError) {
            errors.push(`Failed to create meet ${meet.meetName}: ${meetError.message}`);
            continue;
          }
          meetId = newMeet.id;
          totalMeetsImported++;
        }

        // Create races for this meet
        for (const race of meet.races) {
          // Extract distance from race name (e.g., "2.95 Miles" → 4748 meters)
          let distanceMeters = 4409; // Default 2.74 miles (5000m standard)
          const milesMatch = race.raceName.match(/([\d.]+)\s*Miles/i);
          const metersMatch = race.raceName.match(/([\d,]+)\s*Meters/i);
          if (milesMatch) {
            distanceMeters = Math.round(parseFloat(milesMatch[1]) * 1609.34);
          } else if (metersMatch) {
            distanceMeters = parseInt(metersMatch[1].replace(',', ''));
          }

          // NEW: Find or create COURSE (venue + distance combo)
          if (venueId) {
            const { data: existingCourse } = await supabase
              .from('courses')
              .select('id')
              .eq('venue_id', venueId)
              .eq('distance_meters', distanceMeters)
              .maybeSingle();

            if (existingCourse) {
              courseId = existingCourse.id;
            } else {
              // Create new course (venue + distance)
              const { data: newCourse, error: courseError } = await supabase
                .from('courses')
                .insert({
                  venue_id: venueId,
                  distance_meters: distanceMeters,
                  layout_version: 'standard',
                  xc_time_rating: 1.000,  // Default rating
                })
                .select('id')
                .single();

              if (courseError) {
                errors.push(`Failed to create course for ${meet.meetName}: ${courseError.message}`);
                continue;
              }
              courseId = newCourse.id;
            }
          }

          // FIX 3: Keep gender as string 'M' or 'F', and link to course
          const { data: newRace, error: raceError } = await supabase
            .from('races')
            .insert({
              meet_id: meetId,
              name: race.raceName,
              gender: race.gender,  // Keep as 'M' or 'F' string
              athletic_net_id: race.raceId,
              distance_meters: distanceMeters,
              course_id: courseId,  // Link race to COURSE (not venue!)
            })
            .select('id')
            .single();

          if (raceError) {
            errors.push(`Failed to create race ${race.raceName}: ${raceError.message}`);
            continue;
          }

          totalRacesImported++;

          // Import results for this race
          for (const result of race.results) {
            // Find or create school
            let schoolId = null;
            const { data: existingSchool } = await supabase
              .from('schools')
              .select('id')
              .eq('name', result.school)
              .maybeSingle();

            if (existingSchool) {
              schoolId = existingSchool.id;
            } else {
              const { data: newSchool } = await supabase
                .from('schools')
                .insert({ name: result.school })
                .select('id')
                .single();
              schoolId = newSchool?.id;
            }

            // Find or create athlete
            // FIX 4: Simple, reliable name parsing
            let athleteId = null;
            const nameParts = result.fullName.trim().split(/\s+/);
            const lastName = nameParts[nameParts.length - 1];
            const firstName = nameParts.slice(0, -1).join(' ');

            // NEW: Calculate graduation year from grade
            // Grade 9 in 2024 → graduates 2028 (2024 + (13 - 9) = 2024 + 4)
            const grade = result.grade ? parseInt(result.grade) : null;
            const graduationYear = grade ? seasonYear + (13 - grade) : null;

            const { data: existingAthlete } = await supabase
              .from('athletes')
              .select('id')
              .eq('first_name', firstName)
              .eq('last_name', lastName)
              .eq('current_school_id', schoolId)
              .maybeSingle();

            if (existingAthlete) {
              athleteId = existingAthlete.id;
            } else {
              // FIX 5: Add full_name and graduation_year
              const { data: newAthlete } = await supabase
                .from('athletes')
                .insert({
                  first_name: firstName,
                  last_name: lastName,
                  full_name: result.fullName,  // NEW: Store full name
                  current_school_id: schoolId,
                  gender: race.gender,  // Keep as 'M' or 'F' string
                  graduation_year: graduationYear,  // NEW: Calculate from grade
                })
                .select('id')
                .single();
              athleteId = newAthlete?.id;
            }

            // Parse time to centiseconds
            const timeMatch = result.time.match(/(\d+):(\d+)\.?(\d+)?/);
            let time_cs = null;
            if (timeMatch) {
              const minutes = parseInt(timeMatch[1]);
              const seconds = parseInt(timeMatch[2]);
              const centiseconds = timeMatch[3] ? parseInt(timeMatch[3].padEnd(2, '0')) : 0;
              time_cs = minutes * 6000 + seconds * 100 + centiseconds;
            }

            // FIX 6: Add season_year to results
            // Create result
            const { error: resultError } = await supabase
              .from('results')
              .insert({
                race_id: newRace.id,
                athlete_id: athleteId,
                time_cs: time_cs,
                place_overall: result.place,
                season_year: seasonYear,  // Add season year
              });

            if (!resultError) {
              totalResultsImported++;
            }
          }
        }
      } catch (meetError) {
        errors.push(`Error processing meet ${meet.meetName}: ${meetError instanceof Error ? meetError.message : 'Unknown error'}`);
      }
    }

    // 8. Return results
    return NextResponse.json({
      success: true,
      message: `Imported ${totalMeetsImported} meets, ${totalRacesImported} races, ${totalResultsImported} results`,
      data: {
        meetsImported: totalMeetsImported,
        racesImported: totalRacesImported,
        resultsImported: totalResultsImported,
        errors: errors.length > 0 ? errors : undefined,
      }
    });

  } catch (error) {
    console.error('Batch import error:', error);
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
