'use client'

import { useState } from 'react'

interface CourseCalibration {
  course_id: string
  course_name: string
  current_difficulty: number
  implied_difficulty: number
  confidence: number
  shared_athletes_count: number
  median_ratio: number
  method: string
  anchor_course?: string
}

export default function NetworkCalibrationPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    anchor_course: any
    calibrations: CourseCalibration[]
    summary: any
  } | null>(null)
  const [filter, setFilter] = useState<'all' | 'needs-review' | 'high-confidence'>('needs-review')

  const runCalibration = async () => {
    setLoading(true)
    try {
      // Use OPTIMIZED endpoint (SQL-based, much faster)
      const response = await fetch('/api/admin/network-course-calibration-optimized', {
        method: 'POST'
      })
      const data = await response.json()

      console.log('API Response:', data)

      if (!response.ok || data.error) {
        console.error('API Error:', data.error || data.details)
        alert(`Calibration failed: ${data.error || data.details || 'Unknown error'}`)
        setResults(null)
        return
      }

      if (!data.calibrations) {
        console.error('No calibrations in response:', data)
        alert('No calibration data returned')
        setResults(null)
        return
      }

      setResults(data)
    } catch (error) {
      console.error('Calibration failed:', error)
      alert('Failed to run calibration: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (centiseconds: number): string => {
    const totalSeconds = Math.floor(centiseconds / 100)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const cs = centiseconds % 100
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
  }

  const filteredCalibrations = results?.calibrations?.filter(cal => {
    if (filter === 'needs-review') {
      // Match the API's definition: just discrepancy > 0.05 (no confidence requirement)
      return Math.abs(cal.implied_difficulty - cal.current_difficulty) > 0.05
    }
    if (filter === 'high-confidence') {
      return cal.confidence > 0.5
    }
    return true
  }) || []

  console.log('Results:', results)
  console.log('Total calibrations:', results?.calibrations?.length)
  console.log('Filtered calibrations:', filteredCalibrations.length)
  console.log('Filter:', filter)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Network Course Calibration</h1>
          <p className="text-gray-600">
            Uses Crystal Springs 2.95 Miles as anchor course to calibrate all other courses based on shared athlete performances
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Run Network Analysis</h2>
              <p className="text-sm text-gray-600">
                This will analyze ALL athletes across ALL courses to determine optimal difficulty ratings
              </p>
            </div>
            <button
              onClick={runCalibration}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Analyzing...' : 'Run Calibration'}
            </button>
          </div>
        </div>

        {results && (
          <>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 mb-6 text-white">
              <h2 className="text-2xl font-bold mb-4">Anchor Course</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-blue-100 text-sm">Course Name</div>
                  <div className="text-xl font-bold">{results.anchor_course.name}</div>
                </div>
                <div>
                  <div className="text-blue-100 text-sm">Difficulty Rating</div>
                  <div className="text-xl font-bold font-mono">{results.anchor_course.difficulty.toFixed(9)}</div>
                </div>
                <div>
                  <div className="text-blue-100 text-sm">Total Results</div>
                  <div className="text-xl font-bold">{results.anchor_course.total_results.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Summary</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900">{results.summary.total_courses}</div>
                  <div className="text-sm text-gray-600">Total Courses</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-700">{results.summary.directly_calibrated}</div>
                  <div className="text-sm text-gray-600">High Confidence</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-700">{results.summary.needs_review}</div>
                  <div className="text-sm text-gray-600">Needs Review</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Course Calibrations</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('needs-review')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      filter === 'needs-review'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Needs Review ({results.summary.needs_review})
                  </button>
                  <button
                    onClick={() => setFilter('high-confidence')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      filter === 'high-confidence'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    High Confidence
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Courses
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredCalibrations.map((cal) => {
                  const diff = cal.implied_difficulty - cal.current_difficulty
                  const diffPercent = (diff / cal.current_difficulty) * 100
                  const needsAdjustment = Math.abs(diff) > 0.05

                  return (
                    <div
                      key={cal.course_id}
                      className={`p-4 rounded-lg border-2 ${
                        needsAdjustment
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2">{cal.course_name}</h3>
                          <div className="grid grid-cols-5 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500 text-xs mb-1">Current</div>
                              <div className="font-mono font-bold text-gray-900">
                                {cal.current_difficulty.toFixed(9)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">Implied</div>
                              <div className="font-mono font-bold text-blue-600">
                                {cal.implied_difficulty.toFixed(9)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">Difference</div>
                              <div className={`font-mono font-bold ${
                                needsAdjustment ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                {diff >= 0 ? '+' : ''}{diff.toFixed(6)} ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">Shared Athletes</div>
                              <div className="font-bold text-gray-900">{cal.shared_athletes_count}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">Confidence</div>
                              <div className="flex items-center gap-2">
                                <div className={`font-bold ${
                                  cal.confidence > 0.7 ? 'text-green-600' :
                                  cal.confidence > 0.4 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {(cal.confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {needsAdjustment && (
                          <div className="ml-4">
                            <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                              REVIEW
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
