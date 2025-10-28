import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const { meetId } = await request.json();

  if (!meetId) {
    return NextResponse.json({ error: 'Missing meetId' }, { status: 400 });
  }

  const projectRoot = path.resolve(process.cwd(), '..');
  const importersPath = path.join(projectRoot, 'code', 'importers');
  const scraperScript = path.join(importersPath, 'athletic_net_scraper_v2.py');

  console.log('🏃 Starting meet scraper...');
  console.log(`Meet ID: ${meetId}`);

  try {
    // Run the scraper
    const scrapeCommand = `cd ${importersPath} && venv/bin/python3 "${scraperScript}" meet ${meetId}`;
    console.log(`Executing: ${scrapeCommand}`);

    const { stdout, stderr } = await execAsync(scrapeCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 180000 // 3 minute timeout
    });

    console.log('Scraper output:', stdout);
    if (stderr) console.error('Scraper stderr:', stderr);

    // Parse the output to find the directory path
    const dirMatch = stdout.match(/💾 Saved to: (.+)/);
    const relativePath = dirMatch ? dirMatch[1].trim() : null;

    if (!relativePath) {
      throw new Error('Failed to find output directory in scraper output');
    }

    // Construct full path (output is relative to importers directory)
    const directoryPath = path.join(importersPath, relativePath);

    // Read the metadata to get stats
    const metadataPath = path.join(directoryPath, 'metadata.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Extract just the directory name for the UI
    const directoryName = path.basename(directoryPath);

    return NextResponse.json({
      success: true,
      directoryPath: relativePath,
      directoryName,
      totalResults: metadata.total_results,
      totalRaces: metadata.total_races,
      totalSchools: metadata.total_schools,
      totalAthletes: metadata.total_athletes,
      metadata
    });

  } catch (error: any) {
    console.error('Error scraping meet:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to scrape meet',
        details: error.stderr || error.stdout
      },
      { status: 500 }
    );
  }
}
