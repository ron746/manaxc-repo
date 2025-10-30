import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key required' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { persistSession: false } }
    )

    // Call the duplicate detection function
    const { data, error } = await supabase.rpc('find_duplicate_results')

    if (error) {
      console.error('Find duplicates error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const duplicateCount = data?.length || 0

    return NextResponse.json({
      success: true,
      message: duplicateCount > 0
        ? `Found ${duplicateCount} duplicate result sets - review in admin/duplicates`
        : 'No duplicates found',
      duplicateCount,
      duplicates: data,
    })
  } catch (error: any) {
    console.error('Find duplicates exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
