'use client'

import { useState, useEffect } from 'react'

interface Course {
  id: string
  name: string
  distance_meters: number
  difficulty_rating: number
  result_count: number
  avg_normalized_mile_time_cs: number | null
}

export default function CourseCalibrationPage() {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'avgTime' | 'results'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [newDifficulty, setNewDifficulty] = useState('')
  const [comment, setComment] = useState('')
  const [applying, setApplying] = useState(false)

  // Reverse calculator state
  const [calcRaceMinutes, setCalcRaceMinutes] = useState('')
  const [calcRaceSeconds, setCalcRaceSeconds] = useState('')
  const [calcRaceHundredths, setCalcRaceHundredths] = useState('')
  const [calcNormMinutes, setCalcNormMinutes] = useState('')
  const [calcNormSeconds, setCalcNormSeconds] = useState('')
  const [calcNormHundredths, setCalcNormHundredths] = useState('')
  const [calculatedDifficulty, setCalculatedDifficulty] = useState<number | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [search, sortBy, sortOrder])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/admin/list-courses?${params}`)
      const data = await response.json()

      if (!response.ok || data.error) {
        alert(`Failed to fetch courses: ${data.error || data.details || 'Unknown error'}`)
        return
      }

      setCourses(data.courses)
    } catch (error) {
      console.error('Failed to fetch courses:', error)
      alert('Failed to fetch courses: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (centiseconds: number | null): string => {
    if (centiseconds === null) return '--:--'
    const totalSeconds = centiseconds / 100
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const calculateDifficulty = () => {
    if (!selectedCourse) return

    const raceMin = parseFloat(calcRaceMinutes)
    const raceSec = parseFloat(calcRaceSeconds)
    const raceHun = parseFloat(calcRaceHundredths || '0')
    const normMin = parseFloat(calcNormMinutes)
    const normSec = parseFloat(calcNormSeconds)
    const normHun = parseFloat(calcNormHundredths || '0')

    if (isNaN(raceMin) || isNaN(raceSec) || isNaN(raceHun) || isNaN(normMin) || isNaN(normSec) || isNaN(normHun)) {
      alert('Please enter valid numbers for all time fields.')
      return
    }

    if (raceMin < 0 || raceSec < 0 || raceSec >= 60 || raceHun < 0 || raceHun >= 100 ||
        normMin < 0 || normSec < 0 || normSec >= 60 || normHun < 0 || normHun >= 100) {
      alert('Invalid time values. Seconds must be 0-59, hundredths must be 0-99.')
      return
    }

    // Convert to centiseconds
    const raceTimeCs = (raceMin * 60 + raceSec) * 100 + raceHun
    const normalizedTimeCs = (normMin * 60 + normSec) * 100 + normHun

    if (raceTimeCs <= 0 || normalizedTimeCs <= 0) {
      alert('Time values must be greater than zero.')
      return
    }

    // Calculate required difficulty
    // normalized_time_cs = (race_time_cs * 1609.344 / distance_meters) / difficulty
    // Therefore: difficulty = (race_time_cs * 1609.344 / distance_meters) / normalized_time_cs
    const difficulty = (raceTimeCs * 1609.344 / selectedCourse.distance_meters) / normalizedTimeCs

    setCalculatedDifficulty(difficulty)
  }

  const useDifficulty = () => {
    if (calculatedDifficulty !== null) {
      setNewDifficulty(calculatedDifficulty.toFixed(9))
    }
  }

  const openEditModal = (course: Course) => {
    setSelectedCourse(course)
    setNewDifficulty(course.difficulty_rating.toFixed(9))
    setComment('')
    setCalcRaceMinutes('')
    setCalcRaceSeconds('')
    setCalcRaceHundredths('')
    setCalcNormMinutes('')
    setCalcNormSeconds('')
    setCalcNormHundredths('')
    setCalculatedDifficulty(null)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setSelectedCourse(null)
    setNewDifficulty('')
    setComment('')
    setCalcRaceMinutes('')
    setCalcRaceSeconds('')
    setCalcRaceHundredths('')
    setCalcNormMinutes('')
    setCalcNormSeconds('')
    setCalcNormHundredths('')
    setCalculatedDifficulty(null)
  }

  const applyChange = async () => {
    if (!selectedCourse) return

    const difficultyValue = parseFloat(newDifficulty)
    if (isNaN(difficultyValue) || difficultyValue <= 0) {
      alert('Invalid difficulty value. Must be a positive number.')
      return
    }

    if (!comment.trim()) {
      alert('Please provide a comment explaining why you are changing the difficulty.')
      return
    }

    setApplying(true)
    try {
      const response = await fetch('/api/admin/apply-difficulty-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          newDifficulty: difficultyValue,
          comment: comment.trim(),
          changeType: 'manual_adjustment'
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        alert(`Failed to apply change: ${data.error || data.details || 'Unknown error'}`)
        return
      }

      let message = `Difficulty updated from ${data.oldDifficulty.toFixed(6)} to ${data.newDifficulty.toFixed(6)}!\n\n`
      message += `✅ Normalized times recalculated\n`

      if (data.athleteBestTimesRebuilt) {
        message += `✅ Athlete best times rebuilt (${data.athleteBestTimesRebuilt} records)\n`
        message += `✅ Team projections on Season page will now reflect the new difficulty`
      } else if (data.warning) {
        message += `⚠️ ${data.warning}`
      }

      alert(message)

      closeEditModal()
      fetchCourses() // Refresh the list

    } catch (error) {
      console.error('Failed to apply change:', error)
      alert('Failed to apply change: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setApplying(false)
    }
  }

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return '↕'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Course Calibration</h1>
        <p className="text-lg text-gray-900 font-semibold mb-6">
          Manually adjust course difficulty ratings. All changes are logged and trigger automatic recalculation.
        </p>

        {/* Search and controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block font-bold text-gray-900 text-base mb-2">
                Search Courses
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type course name..."
                className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-bold text-lg bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-900 text-base mb-2">
                Total Courses
              </label>
              <div className="text-3xl font-bold text-gray-900">
                {courses.length}
              </div>
            </div>
          </div>
        </div>

        {/* Course table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-900 font-bold text-xl">
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center text-gray-900 font-bold text-xl">
              No courses found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-3 border-gray-900">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    >
                      Course Name {getSortIcon('name')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Distance
                    </th>
                    <th
                      onClick={() => handleSort('difficulty')}
                      className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    >
                      Difficulty {getSortIcon('difficulty')}
                    </th>
                    <th
                      onClick={() => handleSort('avgTime')}
                      className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    >
                      Avg. Norm. Mile Time {getSortIcon('avgTime')}
                    </th>
                    <th
                      onClick={() => handleSort('results')}
                      className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    >
                      Results {getSortIcon('results')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-200">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900 font-semibold">
                        {course.name}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-semibold">
                        {(course.distance_meters / 1609.344).toFixed(2)} mi
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-mono font-bold">
                        {course.difficulty_rating.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-mono font-bold text-lg">
                        {formatTime(course.avg_normalized_mile_time_cs)}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-bold">
                        {course.result_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEditModal(course)}
                          className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Edit Course Difficulty
            </h2>

            <div className="mb-4 p-4 bg-gray-100 rounded">
              <h3 className="font-bold text-gray-900 text-lg mb-2">{selectedCourse.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">Distance:</span>{' '}
                  <span className="text-gray-900">{(selectedCourse.distance_meters / 1609.344).toFixed(2)} miles</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Current Difficulty:</span>{' '}
                  <span className="font-mono text-gray-900">{selectedCourse.difficulty_rating.toFixed(6)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Avg. Norm. Mile Time:</span>{' '}
                  <span className="font-mono text-gray-900">{formatTime(selectedCourse.avg_normalized_mile_time_cs)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Results:</span>{' '}
                  <span className="text-gray-900">{selectedCourse.result_count}</span>
                </div>
              </div>
            </div>

            {/* Reverse Calculator */}
            <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-400 rounded">
              <h3 className="font-bold text-gray-900 text-lg mb-3">
                🔢 Difficulty Calculator
              </h3>
              <p className="text-sm text-gray-900 font-semibold mb-4">
                Calculate what difficulty rating would be needed to achieve a specific normalized time for a given race time.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-gray-900 text-sm mb-2">
                    Race Time
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={calcRaceMinutes}
                      onChange={(e) => setCalcRaceMinutes(e.target.value)}
                      placeholder="MM"
                      className="w-full px-3 py-2 border-2 border-gray-900 rounded text-gray-900 font-bold text-lg bg-white focus:border-purple-600"
                    />
                    <span className="text-2xl font-bold text-gray-900">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={calcRaceSeconds}
                      onChange={(e) => setCalcRaceSeconds(e.target.value)}
                      placeholder="SS"
                      className="w-full px-3 py-2 border-2 border-gray-900 rounded text-gray-900 font-bold text-lg bg-white focus:border-purple-600"
                    />
                    <span className="text-2xl font-bold text-gray-900">.</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      step="1"
                      value={calcRaceHundredths}
                      onChange={(e) => setCalcRaceHundredths(e.target.value)}
                      placeholder="HH"
                      className="w-full px-3 py-2 border-2 border-gray-900 rounded text-gray-900 font-bold text-lg bg-white focus:border-purple-600"
                    />
                  </div>
                  <p className="text-xs text-gray-700 font-semibold mt-1">
                    Minutes : Seconds . Hundredths
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-900 text-sm mb-2">
                    Desired Normalized Time
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={calcNormMinutes}
                      onChange={(e) => setCalcNormMinutes(e.target.value)}
                      placeholder="MM"
                      className="w-full px-3 py-2 border-2 border-gray-900 rounded text-gray-900 font-bold text-lg bg-white focus:border-purple-600"
                    />
                    <span className="text-2xl font-bold text-gray-900">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={calcNormSeconds}
                      onChange={(e) => setCalcNormSeconds(e.target.value)}
                      placeholder="SS"
                      className="w-full px-3 py-2 border-2 border-gray-900 rounded text-gray-900 font-bold text-lg bg-white focus:border-purple-600"
                    />
                    <span className="text-2xl font-bold text-gray-900">.</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      step="1"
                      value={calcNormHundredths}
                      onChange={(e) => setCalcNormHundredths(e.target.value)}
                      placeholder="HH"
                      className="w-full px-3 py-2 border-2 border-gray-900 rounded text-gray-900 font-bold text-lg bg-white focus:border-purple-600"
                    />
                  </div>
                  <p className="text-xs text-gray-700 font-semibold mt-1">
                    Minutes : Seconds . Hundredths (per mile pace)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <button
                  onClick={calculateDifficulty}
                  className="px-4 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700"
                >
                  Calculate Difficulty
                </button>

                {calculatedDifficulty !== null && (
                  <div className="flex gap-3 items-center">
                    <div className="text-gray-900">
                      <span className="font-semibold">Result:</span>{' '}
                      <span className="font-mono font-bold text-lg">{calculatedDifficulty.toFixed(6)}</span>
                    </div>
                    <button
                      onClick={useDifficulty}
                      className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700"
                    >
                      Use This Value
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* New difficulty input */}
            <div className="mb-4">
              <label className="block font-bold text-gray-900 text-base mb-2">
                New Difficulty Rating <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
                className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-bold text-lg bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                placeholder="Enter new difficulty (e.g., 1.050000000)"
              />
              <p className="text-sm text-gray-700 font-semibold mt-1">
                1.0 = perfectly flat. Higher values = harder course. Must be &gt; 0.
              </p>
            </div>

            {/* Comment field */}
            <div className="mb-6">
              <label className="block font-bold text-gray-900 text-base mb-2">
                Comment <span className="text-red-600">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Required: Explain why you are changing this difficulty rating"
                className="w-full px-4 py-3 border-3 border-gray-900 rounded-md text-gray-900 font-semibold text-base bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600 h-32"
              />
              <p className="text-sm text-gray-700 font-semibold mt-1">
                This change will be logged with your comment for future reference.
              </p>
            </div>

            {/* Warning */}
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-400 rounded">
              <p className="text-sm font-bold text-gray-900">
                ⚠️ <strong>This will trigger automatic recalculation:</strong>
              </p>
              <ul className="text-sm text-gray-900 font-semibold mt-2 ml-6 list-disc">
                <li>All normalized times for results on this course</li>
                <li>Course records (fastest M/F times)</li>
                <li>Athlete best times table (team projections will update)</li>
              </ul>
              <p className="text-xs text-gray-700 font-semibold mt-2 italic">
                Note: Large difficulty changes may take 10-30 seconds to complete.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeEditModal}
                disabled={applying}
                className="px-6 py-3 bg-gray-300 text-gray-900 font-bold rounded hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={applyChange}
                disabled={applying}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {applying ? 'Applying...' : 'Apply Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
