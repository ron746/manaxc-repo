import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  const projectRoot = path.resolve(process.cwd(), '..');
  const toBeProcessedDir = path.join(projectRoot, 'code', 'importers', 'to-be-processed');

  try {
    // Read the to-be-processed directory
    const entries = await fs.readdir(toBeProcessedDir, { withFileTypes: true });

    // Filter for directories only (meet folders)
    const imports = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort(); // Ascending order by folder name

    return NextResponse.json({ imports });

  } catch (error: any) {
    console.error('Error listing imports:', error);

    // If directory doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return NextResponse.json({ imports: [] });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to list imports' },
      { status: 500 }
    );
  }
}
