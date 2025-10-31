'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts'

interface CourseAnomaly {
  course_id: string
  course_name: string
  distance_meters: number
  current_difficulty: number
  recommended_difficulty: number
  difficulty_adjustment_pct: number
  elite_athlete_count: number
  athletes_with_fast_outlier: number
  athletes_with_slow_outlier: number
  total_outliers: number
  outlier_percentage: number
  median_normalized_cs: number
  typical_normalized_cs: number
  difference_cs: number
  difference_seconds_per_mile: number
  improvement_adjusted_diff_seconds_per_mile: number
  anomaly_direction: string
  confidence_score: number
  suspicion_level: string
  recommendation: string
}

export default function CourseAnomaliesPage() {
  const [loading, setLoading] = useState(false)
  const [anomalies, setAnomalies] = useState<CourseAnomaly[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [minAthletes, setMinAthletes] = useState(10)
  const [outlierThreshold, setOutlierThreshold] = useState(2.0)
  const [improvementPerWeek, setImprovementPerWeek] = useState(150) // 1.5 sec/mile/week
  const [applyingCourse, setApplyingCourse] = useState<string | null>(null)

  // Modal state for applying adjustments
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedAnomaly, setSelectedAnomaly] = useState<CourseAnomaly | null>(null)
  const [adjustmentComment, setAdjustmentComment] = useState('')
  const [customDifficulty, setCustomDifficulty] = useState('')
  const [useCustomValue, setUseCustomValue] = useState(false)

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/course-anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minSharedAthletes: minAthletes,
          outlierThreshold,
          improvementPerWeek
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        alert(`Analysis failed: ${data.error || data.details || 'Unknown error'}`)
        return
      }

      setAnomalies(data.anomalies)
      setSummary(data.summary)
    } catch (error) {
      console.error('Failed to run analysis:', error)
      alert('Failed to run analysis: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const openAdjustModal = (anomaly: CourseAnomaly) => {
    setSelectedAnomaly(anomaly)
    setAdjustmentComment('')
    setCustomDifficulty(anomaly.recommended_difficulty.toFixed(9))
    setUseCustomValue(false)
    setShowAdjustModal(true)
  }

  const closeAdjustModal = () => {
    setShowAdjustModal(false)
    setSelectedAnomaly(null)
    setAdjustmentComment('')
    setCustomDifficulty('')
    setUseCustomValue(false)
  }

  const applyAdjustment = async () => {
    if (!selectedAnomaly) return

    const finalDifficulty = useCustomValue
      ? parseFloat(customDifficulty)
      : selectedAnomaly.recommended_difficulty

    if (isNaN(finalDifficulty) || finalDifficulty <= 0) {
      alert('Invalid difficulty value')
      return
    }

    // Manual adjustments require a comment
    if (useCustomValue && !adjustmentComment.trim()) {
      alert('Please provide a comment explaining the manual adjustment')
      return
    }

    setApplyingCourse(selectedAnomaly.course_id)
    try {
      const response = await fetch('/api/admin/apply-difficulty-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedAnomaly.course_id,
          newDifficulty: finalDifficulty,
          comment: adjustmentComment.trim() || null,
          changeType: useCustomValue ? 'manual_adjustment' : 'automated_recommendation',
          anomalyContext: {
            elite_athlete_count: selectedAnomaly.elite_athlete_count,
            outlier_percentage: selectedAnomaly.outlier_percentage,
            difference_seconds_per_mile: selectedAnomaly.difference_seconds_per_mile,
            suspicion_level: selectedAnomaly.suspicion_level
          }
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        alert(`Failed to apply adjustment: ${data.error || data.details || 'Unknown error'}`)
        return
      }

      alert(`Difficulty updated from ${data.oldDifficulty.toFixed(6)} to ${data.newDifficulty.toFixed(6)}!\n\nRe-running analysis...`)

      closeAdjustModal()

      // Re-run analysis to get updated results
      await runAnalysis()
    } catch (error) {
      console.error('Failed to apply adjustment:', error)
      alert('Failed to apply adjustment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setApplyingCourse(null)
    }
  }

  // Prepare chart data
  const outlierChartData = anomalies.slice(0, 10).map(a => ({
    name: a.course_name.length > 20 ? a.course_name.substring(0, 18) + '...' : a.course_name,
    'Fast Outliers': a.athletes_with_fast_outlier,
    'Slow Outliers': a.athletes_with_slow_outlier,
    'Outlier %': a.outlier_percentage.toFixed(1)
  }))

  const difficultyAdjustmentData = anomalies
    .filter(a => Math.abs(a.difficulty_adjustment_pct) > 5)
    .slice(0, 10)
    .map(a => ({
      name: a.course_name.length > 20 ? a.course_name.substring(0, 18) + '...' : a.course_name,
      'Adjustment %': a.difficulty_adjustment_pct,
      current: a.current_difficulty,
      recommended: a.recommended_difficulty
    }))

  const scatterData = anomalies.map(a => ({
    name: a.course_name,
    athletes: a.elite_athlete_count,
    outlierPct: a.outlier_percentage,
    diffSec: a.difference_seconds_per_mile,
    color: a.suspicion_level.startsWith('CRITICAL') ? '#b91c1c' :
           a.suspicion_level.startsWith('HIGH') ? '#c2410c' :
           a.suspicion_level.startsWith('MEDIUM') ? '#1e40af' : '#374151'
  }))

  const getSuspicionColor = (level: string) => {
    if (level.startsWith('CRITICAL')) return 'bg-red-100 border-red-400 border-4'
    if (level.startsWith('HIGH')) return 'bg-orange-100 border-orange-400 border-4'
    if (level.startsWith('MEDIUM')) return 'bg-blue-100 border-blue-400 border-4'
    return 'bg-gray-100 border-gray-400 border-2'
  }

  const getSuspicionBadge = (level: string) => {
    if (level.startsWith('CRITICAL')) return 'bg-red-700 text-white'
    if (level.startsWith('HIGH')) return 'bg-orange-700 text-white'
    if (level.startsWith('MEDIUM')) return 'bg-blue-700 text-white'
    return 'bg-gray-700 text-white'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Course Anomaly Detection</h1>
          <p className="text-gray-600">
            Statistical analysis of elite runner performances to identify courses with rating issues
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-gray-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Parameters</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                Min Elite Athletes per Course
              </label>
              <input
                type="number"
                value={minAthletes}
                onChange={(e) => setMinAthletes(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-bold text-lg bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                min="5"
                max="50"
              />
              <p className="text-sm font-semibold text-gray-900 mt-2">Minimum sample size for analysis</p>
            </div>
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                Outlier Threshold (Std Devs)
              </label>
              <input
                type="number"
                value={outlierThreshold}
                onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-bold text-lg bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                min="1.0"
                max="3.0"
                step="0.1"
              />
              <p className="text-sm font-semibold text-gray-900 mt-2">Sensitivity (lower = more sensitive)</p>
            </div>
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">
                Seasonal Improvement (cs/week)
              </label>
              <input
                type="number"
                value={improvementPerWeek}
                onChange={(e) => setImprovementPerWeek(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-bold text-lg bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                min="0"
                max="300"
                step="10"
              />
              <p className="text-sm font-semibold text-gray-900 mt-2">~150cs = 1.5 sec/mile/week</p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="mt-6 px-8 py-4 bg-blue-700 text-white font-bold text-lg rounded-lg hover:bg-blue-800 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed border-2 border-gray-900"
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {summary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center border-2 border-gray-300">
                <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
                <div className="text-sm font-semibold text-gray-900">Total Anomalies</div>
              </div>
              <div className="bg-red-100 rounded-lg shadow p-4 text-center border-2 border-red-400">
                <div className="text-3xl font-bold text-red-900">{summary.critical}</div>
                <div className="text-sm font-semibold text-gray-900">Critical</div>
              </div>
              <div className="bg-orange-100 rounded-lg shadow p-4 text-center border-2 border-orange-400">
                <div className="text-3xl font-bold text-orange-900">{summary.high}</div>
                <div className="text-sm font-semibold text-gray-900">High</div>
              </div>
              <div className="bg-blue-100 rounded-lg shadow p-4 text-center border-2 border-blue-400">
                <div className="text-3xl font-bold text-blue-900">{summary.medium}</div>
                <div className="text-sm font-semibold text-gray-900">Medium</div>
              </div>
              <div className="bg-gray-100 rounded-lg shadow p-4 text-center border-2 border-gray-400">
                <div className="text-3xl font-bold text-gray-900">{summary.low}</div>
                <div className="text-sm font-semibold text-gray-900">Low</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Outlier Distribution */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Courses by Outliers</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={outlierChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Fast Outliers" fill="#1e40af" />
                    <Bar dataKey="Slow Outliers" fill="#c2410c" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Difficulty Adjustments Needed */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recommended Difficulty Adjustments</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={difficultyAdjustmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Adjustment %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Adjustment %" fill="#3b82f6">
                      {difficultyAdjustmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry['Adjustment %'] < 0 ? '#1e40af' : '#c2410c'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scatter Plot */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Outlier % vs Sample Size</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="athletes" name="Elite Athletes" label={{ value: 'Elite Athletes', position: 'bottom' }} />
                  <YAxis dataKey="outlierPct" name="Outlier %" label={{ value: 'Outlier %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Courses" data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Anomaly Table */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Course Analysis</h3>
              <div className="space-y-3 max-h-[800px] overflow-y-auto">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.course_id}
                    className={`p-4 rounded-lg border-2 ${getSuspicionColor(anomaly.suspicion_level)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg">{anomaly.course_name}</h4>
                        <p className="text-sm font-semibold text-gray-900">
                          {(anomaly.distance_meters / 1609.344).toFixed(2)} miles • {anomaly.elite_athlete_count} elite athletes
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${getSuspicionBadge(anomaly.suspicion_level)}`}>
                        {anomaly.suspicion_level.split(' - ')[0]}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-gray-900 text-xs font-semibold mb-1">Current Difficulty</div>
                        <div className="font-mono font-bold text-gray-900 text-base">
                          {anomaly.current_difficulty.toFixed(6)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-900 text-xs font-semibold mb-1">Recommended</div>
                        <div className="flex items-center gap-2">
                          <div className="font-mono font-bold text-blue-900 text-base">
                            {anomaly.recommended_difficulty.toFixed(6)}
                            {anomaly.recommended_difficulty < 1.0 && (
                              <span className="ml-2 text-xs font-bold text-red-600">⚠️ IMPOSSIBLE!</span>
                            )}
                          </div>
                          <button
                            onClick={() => openAdjustModal(anomaly)}
                            disabled={applyingCourse === anomaly.course_id}
                            className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {applyingCourse === anomaly.course_id ? 'Applying...' : 'Apply'}
                          </button>
                        </div>
                        {anomaly.recommended_difficulty < 1.0 && (
                          <div className="mt-1 text-xs font-bold text-red-600">
                            Difficulty {'<'} 1.0 is impossible. Check for data quality issues:
                            <br/>• Wrong race distance assigned to course
                            <br/>• Short course results mixed with long course
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-gray-900 text-xs font-semibold mb-1">Adjustment</div>
                        <div className={`font-bold text-base ${anomaly.difficulty_adjustment_pct < 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                          {anomaly.difficulty_adjustment_pct >= 0 ? '+' : ''}{anomaly.difficulty_adjustment_pct.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-900 text-xs font-semibold mb-1">Fast / Slow Outliers</div>
                        <div className="font-bold text-gray-900 text-base">
                          <span className="text-blue-900">{anomaly.athletes_with_fast_outlier}</span> / <span className="text-orange-900">{anomaly.athletes_with_slow_outlier}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-900 text-xs font-semibold mb-1">Outlier %</div>
                        <div className="font-bold text-gray-900 text-base">
                          {anomaly.outlier_percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-gray-900 text-xs font-semibold mb-1">Athletes run {anomaly.difference_cs < 0 ? 'faster' : 'slower'} by</div>
                        <div className={`font-bold text-base ${anomaly.difference_cs < 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                          {Math.abs(anomaly.difference_seconds_per_mile).toFixed(2)} sec/mile
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-900 text-xs font-semibold mb-1">After seasonal improvement adjustment</div>
                        <div className={`font-bold text-base ${anomaly.improvement_adjusted_diff_seconds_per_mile < 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                          {Math.abs(anomaly.improvement_adjusted_diff_seconds_per_mile).toFixed(2)} sec/mile
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 border-2 border-gray-300">
                      <div className="text-xs font-bold text-gray-900 mb-1">Recommendation:</div>
                      <div className="text-sm font-semibold text-gray-900">{anomaly.recommendation}</div>
                      <div className="text-xs text-gray-900 font-semibold mt-2">
                        <strong>Direction:</strong> {anomaly.anomaly_direction}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustModal && selectedAnomaly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Apply Difficulty Adjustment
            </h2>

            <div className="mb-4 p-4 bg-gray-100 rounded">
              <h3 className="font-bold text-gray-900 text-lg mb-2">{selectedAnomaly.course_name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">Current Difficulty:</span>{' '}
                  <span className="font-mono text-gray-900">{selectedAnomaly.current_difficulty.toFixed(6)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Recommended:</span>{' '}
                  <span className="font-mono text-blue-900">{selectedAnomaly.recommended_difficulty.toFixed(6)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Adjustment:</span>{' '}
                  <span className={`font-bold ${selectedAnomaly.difficulty_adjustment_pct < 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                    {selectedAnomaly.difficulty_adjustment_pct >= 0 ? '+' : ''}{selectedAnomaly.difficulty_adjustment_pct.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Suspicion:</span>{' '}
                  <span className="text-gray-900">{selectedAnomaly.suspicion_level.split(' - ')[0]}</span>
                </div>
              </div>
            </div>

            {/* Option to use custom value */}
            <div className="mb-4">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useCustomValue}
                  onChange={(e) => setUseCustomValue(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="font-bold text-gray-900 text-base">Use custom difficulty value</span>
              </label>

              {useCustomValue && (
                <input
                  type="number"
                  step="0.000001"
                  value={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.value)}
                  className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-bold text-lg bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter custom difficulty"
                />
              )}
            </div>

            {/* Comment field */}
            <div className="mb-6">
              <label className="block font-bold text-gray-900 text-base mb-2">
                Comment {useCustomValue && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={adjustmentComment}
                onChange={(e) => setAdjustmentComment(e.target.value)}
                placeholder={useCustomValue ? "Required: Explain why you're using a custom value" : "Optional: Add notes about this adjustment"}
                className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-semibold text-base bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600 h-24"
              />
              <p className="text-sm text-gray-700 font-semibold mt-1">
                {useCustomValue
                  ? "Manual adjustments must include a comment."
                  : "Optional: Document why you're accepting this recommendation."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeAdjustModal}
                disabled={applyingCourse === selectedAnomaly.course_id}
                className="px-6 py-3 bg-gray-300 text-gray-900 font-bold rounded hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={applyAdjustment}
                disabled={applyingCourse === selectedAnomaly.course_id}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {applyingCourse === selectedAnomaly.course_id ? 'Applying...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
