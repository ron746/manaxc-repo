import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || '2025';

    const supabase = await createClient();

    // Get school info
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get team roster with all required metrics
    // This query gets athletes' PRs and season averages
    const { data: rosterData, error: rosterError } = await supabase.rpc(
      'get_school_roster',
      {
        p_school_id: schoolId,
        p_season_year: parseInt(season)
      }
    );

    if (rosterError) {
      console.error('Roster query error:', rosterError);
      return NextResponse.json(
        { error: 'Failed to fetch roster data' },
        { status: 500 }
      );
    }

    // Separate by gender
    const boysTeam = rosterData?.filter((a: any) => a.gender === 'M') || [];
    const girlsTeam = rosterData?.filter((a: any) => a.gender === 'F') || [];

    return NextResponse.json({
      school,
      boysTeam,
      girlsTeam,
      season
    });

  } catch (error) {
    console.error('Error in roster route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
