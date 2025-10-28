import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const { directoryName } = await request.json();

  if (!directoryName) {
    return NextResponse.json({ error: 'Missing directoryName' }, { status: 400 });
  }

  const projectRoot = path.resolve(process.cwd(), '../..');
  const importersPath = path.join(projectRoot, 'code', 'importers');
  const importScript = path.join(importersPath, 'import_csv_data.py');
  const directoryPath = path.join(importersPath, 'to-be-processed', directoryName);

  console.log('💾 Starting CSV import...');
  console.log(`Directory: ${directoryName}`);

  try {
    // Run the import script
    const importCommand = `cd ${importersPath} && venv/bin/python3 "${importScript}" "to-be-processed/${directoryName}"`;
    console.log(`Executing: ${importCommand}`);

    const { stdout, stderr } = await execAsync(importCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 120000 // 2 minute timeout
    });

    console.log('Import output:', stdout);
    if (stderr) console.error('Import stderr:', stderr);

    // Parse the summary from output
    const summaryMatch = stdout.match(/Summary:\s+Venues: (\d+)\s+Courses: (\d+)\s+Schools: (\d+)\s+Athletes: (\d+)\s+Meets: (\d+)\s+Races: (\d+)\s+Results: (\d+)/);

    const stats = summaryMatch ? {
      venues_created: parseInt(summaryMatch[1]),
      courses_created: parseInt(summaryMatch[2]),
      schools_created: parseInt(summaryMatch[3]),
      athletes_created: parseInt(summaryMatch[4]),
      meets_created: parseInt(summaryMatch[5]),
      races_created: parseInt(summaryMatch[6]),
      results_inserted: parseInt(summaryMatch[7])
    } : {
      venues_created: 0,
      courses_created: 0,
      schools_created: 0,
      athletes_created: 0,
      meets_created: 0,
      races_created: 0,
      results_inserted: 0
    };

    return NextResponse.json({
      success: true,
      stats,
      output: stdout
    });

  } catch (error: any) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to import CSV',
        details: error.stderr || error.stdout
      },
      { status: 500 }
    );
  }
}
