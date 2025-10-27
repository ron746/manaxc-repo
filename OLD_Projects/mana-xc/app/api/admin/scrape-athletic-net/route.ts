// app/api/admin/scrape-athletic-net/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Auth client import kept for future use when reenabling auth in production.
// import { createClient } from '@/lib/supabase/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin access
  // NOTE: Auth disabled for local development - re-enable for production!
  // When enabling auth, use `createClient()` to validate admin access.
    // const { data: { user } } = await supabase.auth.getUser();

    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Unauthorized', error: 'Not logged in' },
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
    //     { success: false, message: 'Forbidden', error: 'Admin access required' },
    //     { status: 403 }
    //   );
    // }

    // 2. Get scraper parameters
    const body = await request.json();
    const { schoolId, season } = body;

    if (!schoolId || !season) {
      return NextResponse.json(
        { success: false, message: 'Missing parameters', error: 'schoolId and season are required' },
        { status: 400 }
      );
    }

    // 3. Run the scraper script
    const scriptPath = path.join(process.cwd(), 'scripts', 'athletic-net-scraper-v2.js');
    const command = `node "${scriptPath}" ${schoolId} ${season}`;

    console.log(`Running scraper: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 300000 // 5 minute timeout
    });

    if (stderr && !stderr.includes('Chromium')) {
      console.error('Scraper stderr:', stderr);
    }

    // 4. Read the generated files
    const csvFile = `athletic-net-${schoolId}-${season}.csv`;
    const jsonFile = `athletic-net-${schoolId}-${season}.json`;

    const csvPath = path.join(process.cwd(), csvFile);
    const jsonPath = path.join(process.cwd(), jsonFile);

    // Check if files exist
    try {
      await fs.access(csvPath);
      await fs.access(jsonPath);
    } catch (_err) {
      console.warn('Scraper file access check failed:', _err);
      return NextResponse.json(
        { success: false, message: 'Scraper did not generate output files', error: stdout },
        { status: 500 }
      );
    }

    // 5. Parse the JSON to get stats
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const meets: Array<{
      meetId: string;
      meetName: string;
      date: string;
      location?: string;
      races: Array<{
        raceId: string;
        raceName: string;
        gender?: string;
        results: Array<unknown>;
      }>;
    }> = JSON.parse(jsonContent);

    const totalResults = meets.reduce((sum: number, meet) => {
      return sum + meet.races.reduce((raceSum: number, race) => {
        return raceSum + race.results.length;
      }, 0);
    }, 0);

    // Parse stdout to get new vs existing meet counts
    const newMeetsMatch = stdout.match(/🆕 Scraping (\d+) new meet/);
    const skippedMatch = stdout.match(/⏭️\s+Skipping (\d+) already-scraped meet/);

  const newMeets = newMeetsMatch ? parseInt(newMeetsMatch[1]) : meets.length;
    const existingMeets = skippedMatch ? parseInt(skippedMatch[1]) : 0;

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully scraped ${meets.length} meets with ${totalResults} results`,
      data: {
        totalMeets: meets.length,
        newMeets,
        existingMeets,
        totalResults,
        csvFile,
        jsonFile,
        meets: meets.map((meet) => ({
          meetId: meet.meetId,
          meetName: meet.meetName,
          date: meet.date,
          location: meet.location,
          races: meet.races.map((race) => ({
            raceId: race.raceId,
            raceName: race.raceName,
            gender: race.gender,
            results: race.results
          }))
        }))
      }
    });

  } catch (error) {
    console.error('Scraper error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error running scraper',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
