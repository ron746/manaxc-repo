import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const { schoolId, seasons } = await request.json();

  if (!schoolId || !seasons || !Array.isArray(seasons)) {
    return NextResponse.json({ error: 'Missing schoolId or seasons' }, { status: 400 });
  }

  const projectRoot = path.resolve(process.cwd(), '../..');
  const scraperPath = path.join(projectRoot, 'code', 'importers', 'athletic_net_scraper.py');
  const importerPath = path.join(projectRoot, 'code', 'importers', 'import_scraped_data.py');

  console.log('🏃 Starting Athletic.net scraper...');
  console.log(`School ID: ${schoolId}`);
  console.log(`Seasons: ${seasons.join(', ')}`);

  const results = [];

  for (const season of seasons) {
    try {
      console.log(`\n📥 Scraping season ${season}...`);

      // Run scraper
      const scrapeCommand = `cd ${projectRoot}/code/importers && python3 ${scraperPath} ${schoolId} ${season}`;
      const { stdout: scrapeOutput, stderr: scrapeError } = await execAsync(scrapeCommand, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      console.log(scrapeOutput);
      if (scrapeError) console.error(scrapeError);

      // Run batch importer (faster for large datasets)
      const jsonFile = `athletic_net_${schoolId}_${season}.json`;
      console.log(`\n💾 Importing data from ${jsonFile}...`);

      const batchImporterPath = path.join(projectRoot, 'code', 'importers', 'import_scraped_data_batch.py');
      const importCommand = `cd ${projectRoot}/code/importers && python3 ${batchImporterPath} ${jsonFile}`;
      const { stdout: importOutput, stderr: importError } = await execAsync(importCommand, {
        maxBuffer: 10 * 1024 * 1024
      });

      console.log(importOutput);
      if (importError) console.error(importError);

      results.push({
        season,
        status: 'success',
        message: `Successfully scraped and imported season ${season}`
      });

    } catch (error: any) {
      console.error(`Error processing season ${season}:`, error);
      results.push({
        season,
        status: 'error',
        message: error.message
      });
    }
  }

  const allSuccess = results.every(r => r.status === 'success');

  return NextResponse.json({
    success: allSuccess,
    results,
    message: allSuccess
      ? `Successfully scraped and imported ${seasons.length} season(s)`
      : 'Some seasons failed to import'
  });
}
