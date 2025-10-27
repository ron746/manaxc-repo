// app/api/admin/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 1. Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 2. Get filename from query params
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('file');

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing file parameter' },
        { status: 400 }
      );
    }

    // 3. Security: Only allow athletic-net files
    if (!filename.startsWith('athletic-net-')) {
      return NextResponse.json(
        { error: 'Invalid file' },
        { status: 403 }
      );
    }

    // 4. Read the file
    const filePath = path.join(process.cwd(), filename);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const contentType = filename.endsWith('.json') ? 'application/json' : 'text/csv';

      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (err) {
      // File not found or unreadable
      console.warn('Download file access error:', err);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
