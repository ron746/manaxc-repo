import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');

    // Test simple query
    const { data, error, status, statusText } = await supabase
      .from('meets')
      .select('id, name')
      .limit(5);

    console.log('Supabase response:', { data, error, status, statusText });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        status,
        statusText
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data,
      message: 'Successfully fetched meets from Supabase'
    });
  } catch (error: any) {
    console.error('Exception in test-db:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
