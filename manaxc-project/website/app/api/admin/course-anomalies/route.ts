import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { minSharedAthletes = 10, outlierThreshold = 2.0, improvementPerWeek = 150.0 } = await request.json()

    console.log('Running course anomaly detection...')
    console.log(`Parameters: minAthletes=${minSharedAthletes}, threshold=${outlierThreshold}, improvement=${improvementPerWeek}`)

    const { data: anomalies, error } = await supabase.rpc(
      'identify_course_anomalies_with_recommendations',
      {
        min_shared_athletes: minSharedAthletes,
        outlier_threshold_std_dev: outlierThreshold,
        improvement_per_week_cs: improvementPerWeek
      }
    )

    if (error) {
      console.error('Error running anomaly detection:', error)
      return NextResponse.json({
        error: 'Failed to detect anomalies',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Found ${anomalies?.length || 0} courses with anomalies`)

    // Categorize anomalies
    const critical = anomalies?.filter((a: any) => a.suspicion_level.startsWith('CRITICAL')) || []
    const high = anomalies?.filter((a: any) => a.suspicion_level.startsWith('HIGH')) || []
    const medium = anomalies?.filter((a: any) => a.suspicion_level.startsWith('MEDIUM')) || []
    const low = anomalies?.filter((a: any) => a.suspicion_level.startsWith('LOW')) || []

    return NextResponse.json({
      success: true,
      anomalies: anomalies || [],
      summary: {
        total: anomalies?.length || 0,
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        low: low.length,
        avgOutlierPct: anomalies?.length
          ? (anomalies.reduce((sum, a) => sum + a.outlier_percentage, 0) / anomalies.length)
          : 0
      }
    })

  } catch (error) {
    console.error('Unexpected error in course anomalies:', error)
    return NextResponse.json(
      {
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
