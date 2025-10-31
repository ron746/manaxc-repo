'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CourseAnalysis {
  course_id: string
  course_name: string
  distance_meters: number
  current_difficulty: number
  total_results: number
  avg_time_cs: number
  median_time_cs: number
  avg_normalized_time_cs: number
  suggested_difficulty: number
  confidence_score: number
  reasoning: string[]
  avg_time_with_new_rating_cs: number
  median_time_with_new_rating_cs: number
  avg_normalized_mile_current_cs: number
  avg_normalized_mile_proposed_cs: number
  time_difference_cs: number
  time_difference_seconds: number
  comparisons: {
    similar_courses: Array<{
      name: string
      difficulty: number
      avg_time_cs: number
      distance_meters: number
    }>
  }
  outliers: {
    unusually_fast: number
    unusually_slow: number
  }
  recommendations: {
    action: 'keep' | 'increase' | 'decrease'
    current: number
    suggested: number
    impact_description: string
    confidence: 'high' | 'medium' | 'low'
  }
}

interface Summary {
  total_courses_analyzed: number
  courses_with_recommendations: number
  high_confidence_recommendations: number
  courses_by_action: {
    increase: number
    decrease: number
    keep: number
  }
  avg_confidence_score: number
}

interface SavedRecommendation {
  id: string
  course_id: string
  recommended_difficulty: number
  current_difficulty: number
  source: 'network_calibration' | 'ai_analysis'
  confidence: number
  shared_athletes_count?: number
  median_ratio?: number
  reasoning?: any
  created_at: string
  applied_at?: string
  dismissed_at?: string
  applied_by?: string
  dismissed_by?: string
  notes?: string
}

export default function CourseAnalysisPage() {
  const [analyses, setAnalyses] = useState<CourseAnalysis[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'recommendations' | 'high-confidence'>('all')
  const [selectedCourse, setSelectedCourse] = useState<CourseAnalysis | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<{[key: string]: any}>({})
  const [aiLoading, setAiLoading] = useState<{[key: string]: boolean}>({})
  const [savedRecommendations, setSavedRecommendations] = useState<{[courseId: string]: {network_calibration?: SavedRecommendation, ai_analysis?: SavedRecommendation}}>({})

  useEffect(() => {
    loadAnalysis()
    loadSavedRecommendations()
  }, [])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/analyze-course-difficulties')
      const data = await response.json()

      if (data.success) {
        setAnalyses(data.analyses)
        setSummary(data.summary)
      } else {
        console.error('Analysis failed:', data.error)
      }
    } catch (error) {
      console.error('Error loading analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedRecommendations = async () => {
    try {
      const response = await fetch('/api/admin/course-recommendations?pending=true')
      const data = await response.json()

      if (data.success && data.recommendations) {
        const grouped: {[courseId: string]: any} = {}
        data.recommendations.forEach((item: any) => {
          grouped[item.course_id] = item.recommendations
        })
        setSavedRecommendations(grouped)
      }
    } catch (error) {
      console.error('Error loading saved recommendations:', error)
    }
  }

  const applyRecommendation = async (recommendationId: string, notes?: string) => {
    if (!confirm('Apply this recommendation? This will update the course difficulty rating.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/course-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          action: 'apply',
          notes,
          applied_by: 'admin'
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Recommendation applied successfully!')
        await loadSavedRecommendations()
        await loadAnalysis()
      } else {
        alert(`Failed to apply: ${data.error}`)
      }
    } catch (error) {
      console.error('Error applying recommendation:', error)
      alert('Error applying recommendation')
    }
  }

  const dismissRecommendation = async (recommendationId: string, notes?: string) => {
    const reason = prompt('Reason for dismissing? (optional)', notes || '')

    try {
      const response = await fetch('/api/admin/course-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          action: 'dismiss',
          notes: reason || undefined,
          applied_by: 'admin'
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Recommendation dismissed')
        await loadSavedRecommendations()
      } else {
        alert(`Failed to dismiss: ${data.error}`)
      }
    } catch (error) {
      console.error('Error dismissing recommendation:', error)
      alert('Error dismissing recommendation')
    }
  }

  const runAIAnalysis = async (courseId: string, provider: 'claude' | 'gemini') => {
    try {
      setAiLoading(prev => ({...prev, [courseId]: true}))

      const response = await fetch('/api/admin/ai-course-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, provider })
      })

      const data = await response.json()

      if (data.success) {
        setAiAnalysis(prev => ({...prev, [courseId]: data}))
      } else {
        console.error('AI Analysis failed:', data.error)
        alert(`AI Analysis failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error running AI analysis:', error)
      alert('Error running AI analysis')
    } finally {
      setAiLoading(prev => ({...prev, [courseId]: false}))
    }
  }

  const formatTime = (centiseconds: number) => {
    const totalSeconds = Math.floor(centiseconds / 100)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const cs = centiseconds % 100
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'increase':
        return <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-bold rounded-full">↑ Increase</span>
      case 'decrease':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">↓ Decrease</span>
      default:
        return <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-bold rounded-full">✓ Keep</span>
    }
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">High</span>
      case 'medium':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">Medium</span>
      default:
        return <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded">Low</span>
    }
  }

  const filteredAnalyses = analyses.filter(a => {
    if (filter === 'recommendations') return a.recommendations.action !== 'keep'
    if (filter === 'high-confidence') return a.recommendations.action !== 'keep' && a.recommendations.confidence === 'high'
    return true
  }).sort((a, b) => {
    // Priority 1: Courses with AI analysis (sort by AI discrepancy)
    const aHasAI = aiAnalysis[a.course_id]?.analysis?.recommended_difficulty
    const bHasAI = aiAnalysis[b.course_id]?.analysis?.recommended_difficulty

    if (aHasAI && bHasAI) {
      const aDiscrepancy = Math.abs(aHasAI - a.current_difficulty)
      const bDiscrepancy = Math.abs(bHasAI - b.current_difficulty)
      return bDiscrepancy - aDiscrepancy // Largest discrepancy first
    }

    // Priority 2: Courses with AI analysis come first
    if (aHasAI && !bHasAI) return -1
    if (!aHasAI && bHasAI) return 1

    // Priority 3: For courses without AI, sort by statistical discrepancy
    const aStatDiscrepancy = Math.abs(a.suggested_difficulty - a.current_difficulty)
    const bStatDiscrepancy = Math.abs(b.suggested_difficulty - b.current_difficulty)
    return bStatDiscrepancy - aStatDiscrepancy
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-zinc-900">Analyzing all courses...</div>
          <div className="text-sm text-zinc-600 mt-2">This may take a minute</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header - Compact */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Course Difficulty Analysis</h1>
              <p className="text-sm text-zinc-600 mt-1">9-decimal precision ratings</p>
            </div>
            <button
              onClick={loadAnalysis}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            ← Back
          </Link>
        </div>

        {/* Summary Cards - Compact */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded border border-zinc-200 p-3 shadow-sm">
              <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">Total Courses</div>
              <div className="text-xl font-bold text-zinc-900">{summary.total_courses_analyzed}</div>
            </div>
            <div className="bg-white rounded border border-orange-200 p-3 shadow-sm">
              <div className="text-xs font-semibold text-orange-600 uppercase mb-1">Recommendations</div>
              <div className="text-xl font-bold text-orange-600">{summary.courses_with_recommendations}</div>
            </div>
            <div className="bg-white rounded border border-green-200 p-3 shadow-sm">
              <div className="text-xs font-semibold text-green-600 uppercase mb-1">High Confidence</div>
              <div className="text-xl font-bold text-green-600">{summary.high_confidence_recommendations}</div>
            </div>
            <div className="bg-white rounded border border-blue-200 p-3 shadow-sm">
              <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Avg Confidence</div>
              <div className="text-xl font-bold text-blue-600">{(summary.avg_confidence_score * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {/* Filter Tabs - Compact */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-700 border border-zinc-300 hover:border-blue-600'
            }`}
          >
            All ({analyses.length})
          </button>
          <button
            onClick={() => setFilter('recommendations')}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              filter === 'recommendations'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-zinc-700 border border-zinc-300 hover:border-orange-600'
            }`}
          >
            Recommendations ({summary?.courses_with_recommendations || 0})
          </button>
          <button
            onClick={() => setFilter('high-confidence')}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              filter === 'high-confidence'
                ? 'bg-green-600 text-white'
                : 'bg-white text-zinc-700 border border-zinc-300 hover:border-green-600'
            }`}
          >
            High Confidence ({summary?.high_confidence_recommendations || 0})
          </button>
        </div>

        {/* Courses List - Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAnalyses.map((analysis) => (
            <div
              key={analysis.course_id}
              className="bg-white rounded border border-zinc-200 shadow-sm overflow-hidden hover:shadow transition-shadow"
            >
              <div className="p-3">
                {/* Header Row - Compact */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-zinc-900">{analysis.course_name}</h3>
                      {getActionBadge(analysis.recommendations.action)}
                      {getConfidenceBadge(analysis.recommendations.confidence)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      <span>{(analysis.distance_meters / 1000).toFixed(2)}km</span>
                      <span>•</span>
                      <span>{analysis.total_results} results</span>
                      <span>•</span>
                      <span>{(analysis.confidence_score * 100).toFixed(0)}% conf</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => runAIAnalysis(analysis.course_id, 'claude')}
                      disabled={aiLoading[analysis.course_id]}
                      className="px-2 py-1 text-xs bg-purple-600 text-white font-semibold hover:bg-purple-700 rounded transition-colors disabled:bg-gray-400"
                      title="Deep AI analysis with Claude Haiku"
                    >
                      {aiLoading[analysis.course_id] ? '...' : 'AI Analysis'}
                    </button>
                    <button
                      onClick={() => setSelectedCourse(selectedCourse?.course_id === analysis.course_id ? null : analysis)}
                      className="px-3 py-1 text-xs text-blue-600 font-semibold hover:bg-blue-50 rounded transition-colors"
                    >
                      {selectedCourse?.course_id === analysis.course_id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Two-Row Layout: Current / Suggested */}
                <div className="space-y-2 text-xs">
                  {/* Row 1: Current, Avg Time, Norm Mile (Current) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-50 rounded p-2 border border-zinc-200">
                      <div className="font-semibold text-zinc-500 mb-0.5">Current</div>
                      <div className="font-mono font-bold text-zinc-900">{analysis.current_difficulty.toFixed(9)}</div>
                    </div>

                    <div className="bg-white rounded p-2 border border-zinc-200">
                      <div className="font-semibold text-zinc-500 mb-0.5">Avg Time</div>
                      <div className="font-mono font-bold text-zinc-900">{formatTime(analysis.avg_time_cs)}</div>
                    </div>

                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <div className="font-semibold text-blue-600 mb-0.5">Norm Mile (Current)</div>
                      <div className="font-mono font-bold text-blue-900">{formatTime(analysis.avg_normalized_mile_current_cs)}</div>
                    </div>
                  </div>

                  {/* Row 2: Suggested, Median, Norm Mile (Proposed) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded p-2 border ${
                      analysis.recommendations.action === 'keep' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="font-semibold text-zinc-500 mb-0.5">Suggested</div>
                      <div className={`font-mono font-bold ${
                        analysis.recommendations.action === 'keep' ? 'text-green-700' : 'text-orange-700'
                      }`}>
                        {analysis.suggested_difficulty.toFixed(9)}
                      </div>
                    </div>

                    <div className="bg-white rounded p-2 border border-zinc-200">
                      <div className="font-semibold text-zinc-500 mb-0.5">Median</div>
                      <div className="font-mono font-bold text-zinc-900">{formatTime(analysis.median_time_cs)}</div>
                    </div>

                    <div className={`rounded p-2 border ${
                      analysis.recommendations.action === 'keep'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className={`font-semibold mb-0.5 ${
                        analysis.recommendations.action === 'keep' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        Norm Mile (Proposed)
                      </div>
                      <div className={`font-mono font-bold ${
                        analysis.recommendations.action === 'keep' ? 'text-green-900' : 'text-orange-900'
                      }`}>
                        {formatTime(analysis.avg_normalized_mile_proposed_cs)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impact Description - Compact */}
                <div className={`mt-2 p-2 rounded text-xs ${
                  analysis.recommendations.action === 'keep'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  <span className="font-semibold text-zinc-900">
                    {analysis.recommendations.action === 'keep' ? '✓ ' : '⚠️ '}
                  </span>
                  <span className="text-zinc-700">{analysis.recommendations.impact_description}</span>
                </div>

                {/* Saved Recommendations */}
                {savedRecommendations[analysis.course_id] && (
                  <div className="mt-3 space-y-2">
                    {savedRecommendations[analysis.course_id]?.network_calibration && (
                      <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-blue-900 text-sm">Network Calibration Recommendation</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => applyRecommendation(savedRecommendations[analysis.course_id].network_calibration!.id)}
                              className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => dismissRecommendation(savedRecommendations[analysis.course_id].network_calibration!.id)}
                              className="px-2 py-1 bg-zinc-500 text-white text-xs font-semibold rounded hover:bg-zinc-600"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="font-semibold">Recommended:</span>
                            <span className="ml-2 font-mono">{savedRecommendations[analysis.course_id]?.network_calibration?.recommended_difficulty?.toFixed(9) || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Confidence:</span>
                            <span className="ml-2">{savedRecommendations[analysis.course_id]?.network_calibration?.confidence ? (savedRecommendations[analysis.course_id].network_calibration.confidence * 100).toFixed(0) + '%' : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Shared Athletes:</span>
                            <span className="ml-2">{savedRecommendations[analysis.course_id]?.network_calibration?.shared_athletes_count || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Median Ratio:</span>
                            <span className="ml-2">{savedRecommendations[analysis.course_id]?.network_calibration?.median_ratio?.toFixed(4) || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {savedRecommendations[analysis.course_id]?.ai_analysis && (
                      <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-purple-900 text-sm">AI Analysis Recommendation</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => applyRecommendation(savedRecommendations[analysis.course_id]?.ai_analysis!.id)}
                              className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => dismissRecommendation(savedRecommendations[analysis.course_id]?.ai_analysis!.id)}
                              className="px-2 py-1 bg-zinc-500 text-white text-xs font-semibold rounded hover:bg-zinc-600"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="font-semibold">Recommended:</span>
                            <span className="ml-2 font-mono">{savedRecommendations[analysis.course_id]?.ai_analysis?.recommended_difficulty?.toFixed(9) || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Confidence:</span>
                            <span className="ml-2">{savedRecommendations[analysis.course_id]?.ai_analysis?.confidence ? (savedRecommendations[analysis.course_id].ai_analysis.confidence * 100).toFixed(0) + '%' : 'N/A'}</span>
                          </div>
                          {savedRecommendations[analysis.course_id]?.ai_analysis?.reasoning?.reasoning && (
                            <div className="mt-2 pt-2 border-t border-purple-200">
                              <div className="font-semibold mb-1">Reasoning:</div>
                              <ul className="space-y-0.5 pl-4">
                                {savedRecommendations[analysis.course_id]?.ai_analysis?.reasoning?.reasoning.slice(0, 3).map((reason: string, idx: number) => (
                                  <li key={idx} className="text-zinc-700">• {reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Analysis Results (Old format - shown when manually running AI analysis) */}
                {aiAnalysis[analysis.course_id] && (
                  <div className="mt-3 p-3 bg-purple-50 border-2 border-purple-200 rounded">
                    <h4 className="font-bold text-purple-900 mb-2 text-sm">AI Deep Analysis (Just Run)</h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold">Recommended Difficulty:</span>
                        <span className="ml-2 font-mono">{aiAnalysis[analysis.course_id].analysis?.recommended_difficulty?.toFixed(9)}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Confidence:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded ${
                          aiAnalysis[analysis.course_id].analysis?.confidence === 'high'
                            ? 'bg-green-100 text-green-700'
                            : aiAnalysis[analysis.course_id].analysis?.confidence === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {aiAnalysis[analysis.course_id].analysis?.confidence}
                        </span>
                      </div>
                      {aiAnalysis[analysis.course_id].analysis?.reasoning && (
                        <div>
                          <div className="font-semibold mb-1">AI Reasoning:</div>
                          <ul className="space-y-1 pl-4">
                            {aiAnalysis[analysis.course_id].analysis.reasoning.map((reason: string, idx: number) => (
                              <li key={idx} className="text-zinc-700">• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysis[analysis.course_id].analysis?.impact_summary && (
                        <div className="pt-2 mt-2 border-t border-purple-200">
                          <span className="font-semibold">Impact:</span>
                          <p className="mt-1 text-zinc-700">{aiAnalysis[analysis.course_id].analysis.impact_summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {selectedCourse?.course_id === analysis.course_id && (
                  <div className="mt-6 pt-6 border-t-2 border-zinc-200 space-y-6">
                    {/* Reasoning */}
                    <div>
                      <h4 className="font-bold text-zinc-900 mb-3 text-lg">Detailed Analysis:</h4>
                      <ul className="space-y-2">
                        {analysis.reasoning.map((reason, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span className="text-zinc-700 font-mono text-sm">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Similar Courses Comparison */}
                    {analysis.comparisons.similar_courses.length > 0 && (
                      <div>
                        <h4 className="font-bold text-zinc-900 mb-3 text-lg">Similar Courses:</h4>
                        <div className="bg-zinc-50 rounded-lg p-4">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs font-semibold text-zinc-600 uppercase">
                                <th className="pb-2">Course Name</th>
                                <th className="pb-2">Distance</th>
                                <th className="pb-2">Difficulty</th>
                                <th className="pb-2">Avg Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysis.comparisons.similar_courses.map((similar, index) => (
                                <tr key={index} className="border-t border-zinc-200">
                                  <td className="py-2 text-zinc-900">{similar.name}</td>
                                  <td className="py-2 text-zinc-700">{(similar.distance_meters / 1000).toFixed(2)}km</td>
                                  <td className="py-2 font-mono font-bold text-zinc-900 text-sm">{similar.difficulty.toFixed(9)}</td>
                                  <td className="py-2 font-mono text-zinc-900">{formatTime(similar.avg_time_cs)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Outliers */}
                    {(analysis.outliers.unusually_fast > 0 || analysis.outliers.unusually_slow > 0) && (
                      <div>
                        <h4 className="font-bold text-zinc-900 mb-3 text-lg">Statistical Outliers:</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-sm font-semibold text-blue-600 mb-1">Unusually Fast</div>
                            <div className="text-2xl font-bold text-blue-700">{analysis.outliers.unusually_fast}</div>
                            <div className="text-xs text-zinc-600 mt-1">&gt;2 std dev below mean</div>
                          </div>
                          <div className="bg-red-50 rounded-lg p-4">
                            <div className="text-sm font-semibold text-red-600 mb-1">Unusually Slow</div>
                            <div className="text-2xl font-bold text-red-700">{analysis.outliers.unusually_slow}</div>
                            <div className="text-xs text-zinc-600 mt-1">&gt;2 std dev above mean</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredAnalyses.length === 0 && (
          <div className="bg-white rounded-lg border-2 border-zinc-200 p-12 text-center">
            <div className="text-xl font-semibold text-zinc-900 mb-2">No courses match this filter</div>
            <div className="text-zinc-600">Try selecting a different filter option</div>
          </div>
        )}
      </div>
    </div>
  )
}
