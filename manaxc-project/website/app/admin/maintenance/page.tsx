'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Search, Settings, Users, Award, Edit, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type AdminSection = 'courses' | 'schools' | 'athletes' | 'results' | 'meets' | null

interface Course {
  id: string
  name: string
  location: string | null
  distance_meters: number
  difficulty_rating: number
  venue_id: string | null
}

interface School {
  id: string
  name: string
  short_name: string | null
  city: string | null
  state: string | null
  league: string | null
  subleague: string | null
  cif_division: string | null
}

interface Meet {
  id: string
  name: string
  meet_date: string
  season_year: number
  meet_type: string | null
}

interface Athlete {
  id: string
  name: string
  first_name: string
  last_name: string
  grad_year: number
  gender: string
  school_id: string
  schools?: {
    name: string
  }
}

interface Result {
  id: string
  time_cs: number
  place_overall: number | null
  athlete_id: string
  race_id: string
  athletes?: {
    name: string
  }
  races?: {
    name: string
    meets?: {
      name: string
      meet_date: string
    }
  }
}

export default function AdminMaintenancePage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<AdminSection>(null)

  // Course management state
  const [courses, setCourses] = useState<Course[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [analyzingCourse, setAnalyzingCourse] = useState<Course | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Athlete management state
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [athleteSearch, setAthleteSearch] = useState('')
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])

  // Results management state
  const [results, setResults] = useState<Result[]>([])
  const [resultSearch, setResultSearch] = useState('')
  const [editingResult, setEditingResult] = useState<Result | null>(null)

  // Schools management state
  const [schools, setSchools] = useState<School[]>([])
  const [schoolSearch, setSchoolSearch] = useState('')
  const [editingSchool, setEditingSchool] = useState<School | null>(null)

  // Meets management state
  const [meets, setMeets] = useState<Meet[]>([])
  const [meetSearch, setMeetSearch] = useState('')
  const [editingMeet, setEditingMeet] = useState<Meet | null>(null)

  // Load courses
  const loadCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('name', { ascending: true })

    if (data) setCourses(data)
  }

  // Load athletes with potential duplicates
  const loadAthletes = async () => {
    const { data } = await supabase
      .from('athletes')
      .select(`
        *,
        schools (name)
      `)
      .order('name', { ascending: true })

    if (data) setAthletes(data as any)
  }

  // Load recent results
  const loadResults = async () => {
    const { data } = await supabase
      .from('results')
      .select(`
        *,
        athletes (name),
        races (
          name,
          meets (name, meet_date)
        )
      `)
      .order('id', { ascending: false })
      .limit(100)

    if (data) setResults(data as any)
  }

  // Load schools
  const loadSchools = async () => {
    const { data } = await supabase
      .from('schools')
      .select('id, name, short_name, city, state, league, subleague, cif_division')
      .order('name', { ascending: true })

    if (data) setSchools(data)
  }

  // Load meets
  const loadMeets = async () => {
    const { data } = await supabase
      .from('meets')
      .select('id, name, meet_date, season_year, meet_type')
      .order('meet_date', { ascending: false })
      .limit(100)

    if (data) setMeets(data)
  }

  useEffect(() => {
    if (activeSection === 'courses') loadCourses()
    if (activeSection === 'schools') loadSchools()
    if (activeSection === 'athletes') loadAthletes()
    if (activeSection === 'results') loadResults()
    if (activeSection === 'meets') loadMeets()
  }, [activeSection])

  // Update course difficulty rating
  const updateCourseRating = async (courseId: string, newRating: number) => {
    const { error } = await supabase
      .from('courses')
      .update({ difficulty_rating: newRating })
      .eq('id', courseId)

    if (!error) {
      setCourses(courses.map(c =>
        c.id === courseId ? { ...c, difficulty_rating: newRating } : c
      ))
      setEditingCourse(null)
      alert('Course rating updated successfully!')
    } else {
      alert('Error updating course rating')
    }
  }

  // AI Course Analysis
  const analyzeCourseWithAI = async (course: Course) => {
    setAnalyzingCourse(course)
    setAnalyzing(true)
    setAiAnalysis(null)

    try {
      const response = await fetch('/api/admin/analyze-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze course')
      }

      setAiAnalysis(data)
    } catch (error) {
      console.error('Error analyzing course:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to analyze course'}`)
      setAnalyzingCourse(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const applyAISuggestedRating = async () => {
    if (!analyzingCourse || !aiAnalysis) return

    const suggestedRating = aiAnalysis.analysis.suggestedRating
    await updateCourseRating(analyzingCourse.id, suggestedRating)
    setAnalyzingCourse(null)
    setAiAnalysis(null)
    loadCourses()
  }

  // Merge duplicate athletes
  const mergeAthletes = async () => {
    if (selectedAthletes.length !== 2) {
      alert('Please select exactly 2 athletes to merge')
      return
    }

    const [keepId, removeId] = selectedAthletes
    const keepAthlete = athletes.find(a => a.id === keepId)
    const removeAthlete = athletes.find(a => a.id === removeId)

    if (!confirm(`Merge "${removeAthlete?.name}" into "${keepAthlete?.name}"?\n\nThis will:\n- Transfer all results from ${removeAthlete?.name} to ${keepAthlete?.name}\n- Delete ${removeAthlete?.name}\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      // Update all results to point to the kept athlete
      const { error: updateError } = await supabase
        .from('results')
        .update({ athlete_id: keepId })
        .eq('athlete_id', removeId)

      if (updateError) throw updateError

      // Delete the removed athlete
      const { error: deleteError } = await supabase
        .from('athletes')
        .delete()
        .eq('id', removeId)

      if (deleteError) throw deleteError

      alert('Athletes merged successfully!')
      setSelectedAthletes([])
      loadAthletes()
    } catch (error) {
      console.error('Error merging athletes:', error)
      alert('Error merging athletes. Check console for details.')
    }
  }

  // Update result time
  const updateResultTime = async (resultId: string, newTimeCs: number) => {
    const { error } = await supabase
      .from('results')
      .update({ time_cs: newTimeCs })
      .eq('id', resultId)

    if (!error) {
      setResults(results.map(r =>
        r.id === resultId ? { ...r, time_cs: newTimeCs } : r
      ))
      setEditingResult(null)
      alert('Result updated successfully!')
    } else {
      alert('Error updating result')
    }
  }

  // Reassign result to different athlete
  const reassignResultToAthlete = async (resultId: string) => {
    const athleteName = prompt('Enter athlete name to search for:')
    if (!athleteName) return

    // Search for athletes matching the name
    const { data: athleteMatches } = await supabase
      .from('athletes')
      .select(`
        id,
        name,
        grad_year,
        gender,
        schools (name)
      `)
      .ilike('name', `%${athleteName}%`)
      .limit(10)

    if (!athleteMatches || athleteMatches.length === 0) {
      alert('No athletes found matching that name')
      return
    }

    // Build selection message
    let message = 'Select athlete by number:\n\n'
    athleteMatches.forEach((athlete: any, index) => {
      message += `${index + 1}. ${athlete.name} (${athlete.grad_year}, ${athlete.gender}${athlete.schools?.name ? ', ' + athlete.schools.name : ''})\n`
    })

    const selection = prompt(message + '\nEnter number (1-' + athleteMatches.length + '):')
    if (!selection) return

    const selectedIndex = parseInt(selection) - 1
    if (selectedIndex < 0 || selectedIndex >= athleteMatches.length) {
      alert('Invalid selection')
      return
    }

    const selectedAthlete = athleteMatches[selectedIndex]

    if (!confirm(`Reassign this result to ${selectedAthlete.name}?`)) {
      return
    }

    // Update the result
    const { error } = await supabase
      .from('results')
      .update({ athlete_id: selectedAthlete.id })
      .eq('id', resultId)

    if (!error) {
      alert('Result reassigned successfully!')
      loadResults() // Reload to show updated data
    } else {
      alert('Error reassigning result')
    }
  }

  // Update meet type
  const updateMeetType = async (meetId: string, newType: string) => {
    const { error } = await supabase
      .from('meets')
      .update({ meet_type: newType })
      .eq('id', meetId)

    if (!error) {
      setMeets(meets.map(m =>
        m.id === meetId ? { ...m, meet_type: newType } : m
      ))
      setEditingMeet(null)
      alert('Meet type updated successfully!')
    } else {
      alert('Error updating meet type')
    }
  }

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.location?.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(athleteSearch.toLowerCase()) ||
    a.schools?.name?.toLowerCase().includes(athleteSearch.toLowerCase())
  )

  const filteredResults = results.filter(r =>
    r.athletes?.name?.toLowerCase().includes(resultSearch.toLowerCase()) ||
    r.races?.meets?.name?.toLowerCase().includes(resultSearch.toLowerCase())
  )

  const filteredMeets = meets.filter(m =>
    m.name.toLowerCase().includes(meetSearch.toLowerCase())
  )

  const timeToString = (timeCs: number) => {
    const totalSeconds = Math.floor(timeCs / 100)
    const centiseconds = timeCs % 100
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  const stringToTime = (timeStr: string) => {
    const match = timeStr.match(/^(\d+):(\d+)\.(\d+)$/)
    if (!match) return null
    const [, min, sec, cs] = match
    return parseInt(min) * 6000 + parseInt(sec) * 100 + parseInt(cs)
  }

  const formatMeetType = (type: string | null) => {
    if (!type) return 'N/A'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800">
      <div className="container mx-auto px-6 py-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center text-cyan-400 hover:text-cyan-300 mb-6"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Admin
        </button>

        <h1 className="text-4xl font-bold text-white mb-2">Data Maintenance</h1>
        <p className="text-zinc-400 mb-8">Manage courses, athletes, and race results</p>

        {/* Section Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => setActiveSection('courses')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeSection === 'courses'
                ? 'bg-cyan-600 border-cyan-600 text-white'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-cyan-600'
            }`}
          >
            <Settings className="w-8 h-8 mb-3 mx-auto" />
            <h2 className="text-xl font-bold mb-2">Course Ratings</h2>
            <p className="text-sm opacity-80">Update difficulty ratings for courses</p>
          </button>

          <button
            onClick={() => setActiveSection('athletes')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeSection === 'athletes'
                ? 'bg-cyan-600 border-cyan-600 text-white'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-cyan-600'
            }`}
          >
            <Users className="w-8 h-8 mb-3 mx-auto" />
            <h2 className="text-xl font-bold mb-2">Merge Athletes</h2>
            <p className="text-sm opacity-80">Find and merge duplicate athlete records</p>
          </button>

          <button
            onClick={() => setActiveSection('results')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeSection === 'results'
                ? 'bg-cyan-600 border-cyan-600 text-white'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-cyan-600'
            }`}
          >
            <Award className="w-8 h-8 mb-3 mx-auto" />
            <h2 className="text-xl font-bold mb-2">Edit Results</h2>
            <p className="text-sm opacity-80">Correct race times and placements</p>
          </button>

          <button
            onClick={() => setActiveSection('meets')}
            className={`p-6 rounded-lg border-2 transition-all ${
              activeSection === 'meets'
                ? 'bg-cyan-600 border-cyan-600 text-white'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-cyan-600'
            }`}
          >
            <Edit className="w-8 h-8 mb-3 mx-auto" />
            <h2 className="text-xl font-bold mb-2">Edit Meets</h2>
            <p className="text-sm opacity-80">Update meet types and information</p>
          </button>
        </div>

        {/* Course Ratings Section */}
        {activeSection === 'courses' && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Course Difficulty Ratings</h2>

            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-zinc-700">
                  <tr>
                    <th className="py-3 px-4 text-left text-white font-bold">Course Name</th>
                    <th className="py-3 px-4 text-left text-white font-bold">Location</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Distance</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Difficulty Rating</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {filteredCourses.map(course => (
                    <tr key={course.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-300">{course.name}</td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">{course.location || 'N/A'}</td>
                      <td className="py-3 px-4 text-center text-zinc-300">{course.distance_meters}m</td>
                      <td className="py-3 px-4 text-center">
                        {editingCourse?.id === course.id ? (
                          <input
                            type="number"
                            step="0.1"
                            defaultValue={course.difficulty_rating}
                            className="w-20 px-2 py-1 bg-zinc-900 border border-cyan-600 rounded text-white text-center"
                            onBlur={(e) => {
                              const newRating = parseFloat(e.target.value)
                              if (!isNaN(newRating)) {
                                updateCourseRating(course.id, newRating)
                              } else {
                                setEditingCourse(null)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newRating = parseFloat(e.currentTarget.value)
                                if (!isNaN(newRating)) {
                                  updateCourseRating(course.id, newRating)
                                }
                              } else if (e.key === 'Escape') {
                                setEditingCourse(null)
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="text-cyan-400 font-bold">
                            {course.difficulty_rating}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setEditingCourse(course)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors inline-flex items-center justify-center"
                            title="Edit rating manually"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => analyzeCourseWithAI(course)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors inline-flex items-center justify-center"
                            title="AI Rating Test"
                          >
                            AI Test
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Athlete Merge Section */}
        {activeSection === 'athletes' && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Merge Duplicate Athletes</h2>

            <div className="mb-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search athletes..."
                  value={athleteSearch}
                  onChange={(e) => setAthleteSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              {selectedAthletes.length > 0 && (
                <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4 mb-4">
                  <p className="text-white mb-2">
                    Selected: {selectedAthletes.length} athlete(s)
                  </p>
                  <button
                    onClick={mergeAthletes}
                    disabled={selectedAthletes.length !== 2}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      selectedAthletes.length === 2
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    Merge Selected Athletes
                  </button>
                  <button
                    onClick={() => setSelectedAthletes([])}
                    className="ml-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-zinc-700">
                  <tr>
                    <th className="py-3 px-4 text-center text-white font-bold">Select</th>
                    <th className="py-3 px-4 text-left text-white font-bold">Name</th>
                    <th className="py-3 px-4 text-left text-white font-bold">School</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Grad Year</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Gender</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {filteredAthletes.map(athlete => (
                    <tr
                      key={athlete.id}
                      className={`hover:bg-zinc-800/30 ${
                        selectedAthletes.includes(athlete.id) ? 'bg-cyan-900/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedAthletes.includes(athlete.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAthletes([...selectedAthletes, athlete.id])
                            } else {
                              setSelectedAthletes(selectedAthletes.filter(id => id !== athlete.id))
                            }
                          }}
                          className="form-checkbox h-5 w-5 text-cyan-600 rounded"
                        />
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{athlete.name}</td>
                      <td className="py-3 px-4 text-zinc-400">{athlete.schools?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-center text-zinc-300">{athlete.grad_year}</td>
                      <td className="py-3 px-4 text-center text-zinc-300">{athlete.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Edit Section */}
        {activeSection === 'results' && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Race Results</h2>
            <p className="text-zinc-400 mb-4 text-sm">Showing most recent 100 results</p>

            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search results by athlete or meet..."
                value={resultSearch}
                onChange={(e) => setResultSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-zinc-700">
                  <tr>
                    <th className="py-3 px-4 text-left text-white font-bold">Athlete</th>
                    <th className="py-3 px-4 text-left text-white font-bold">Meet</th>
                    <th className="py-3 px-4 text-left text-white font-bold">Race</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Time</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Place</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {filteredResults.map(result => (
                    <tr key={result.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-300">{result.athletes?.name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">
                        {result.races?.meets?.name || 'Unknown Meet'}
                        <div className="text-xs text-zinc-500">
                          {result.races?.meets?.meet_date ? new Date(result.races.meets.meet_date).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">{result.races?.name || 'Unknown Race'}</td>
                      <td className="py-3 px-4 text-center">
                        {editingResult?.id === result.id ? (
                          <input
                            type="text"
                            placeholder="MM:SS.CC"
                            defaultValue={timeToString(result.time_cs)}
                            className="w-24 px-2 py-1 bg-zinc-900 border border-cyan-600 rounded text-white text-center"
                            onBlur={(e) => {
                              const newTime = stringToTime(e.target.value)
                              if (newTime !== null) {
                                updateResultTime(result.id, newTime)
                              } else {
                                alert('Invalid time format. Use MM:SS.CC')
                                setEditingResult(null)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newTime = stringToTime(e.currentTarget.value)
                                if (newTime !== null) {
                                  updateResultTime(result.id, newTime)
                                } else {
                                  alert('Invalid time format. Use MM:SS.CC')
                                }
                              } else if (e.key === 'Escape') {
                                setEditingResult(null)
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="text-cyan-400 font-mono font-bold">
                            {timeToString(result.time_cs)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-300">{result.place_overall || 'N/A'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setEditingResult(result)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors inline-flex items-center justify-center"
                            title="Edit time"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => reassignResultToAthlete(result.id)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                            title="Reassign to different athlete"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Meets Edit Section */}
        {activeSection === 'meets' && (
          <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Meet Information</h2>
            <p className="text-zinc-400 mb-4 text-sm">Showing most recent 100 meets</p>

            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search meets..."
                value={meetSearch}
                onChange={(e) => setMeetSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-zinc-700">
                  <tr>
                    <th className="py-3 px-4 text-left text-white font-bold">Meet Name</th>
                    <th className="py-3 px-4 text-left text-white font-bold">Date</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Season</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Type</th>
                    <th className="py-3 px-4 text-center text-white font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {filteredMeets.map(meet => (
                    <tr key={meet.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-300">{meet.name}</td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">
                        {new Date(meet.meet_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-300">{meet.season_year}</td>
                      <td className="py-3 px-4 text-center">
                        {editingMeet?.id === meet.id ? (
                          <select
                            defaultValue={meet.meet_type || ''}
                            className="w-full px-2 py-1 bg-zinc-900 border border-cyan-600 rounded text-white text-center"
                            onBlur={(e) => {
                              const newType = e.target.value
                              if (newType) {
                                updateMeetType(meet.id, newType)
                              } else {
                                setEditingMeet(null)
                              }
                            }}
                            onChange={(e) => {
                              const newType = e.target.value
                              if (newType) {
                                updateMeetType(meet.id, newType)
                              }
                            }}
                            autoFocus
                          >
                            <option value="">Select Type</option>
                            <option value="league">League</option>
                            <option value="invitational">Invitational</option>
                            <option value="championship">Championship</option>
                            <option value="intrasquad">Intrasquad</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <span className="text-cyan-400 font-bold">
                            {formatMeetType(meet.meet_type)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setEditingMeet(meet)}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors inline-flex items-center justify-center"
                          title="Edit meet type"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Analysis Modal */}
        {analyzingCourse && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-zinc-800 border-b border-zinc-700 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">AI Course Analysis</h2>
                    <p className="text-zinc-400">{analyzingCourse.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setAnalyzingCourse(null)
                      setAiAnalysis(null)
                    }}
                    className="text-zinc-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                {analyzing && (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent mb-4"></div>
                    <p className="text-white text-lg">Analyzing race results with AI...</p>
                    <p className="text-zinc-400 text-sm mt-2">This may take 10-20 seconds</p>
                  </div>
                )}

                {!analyzing && aiAnalysis && (
                  <div className="space-y-6">
                    {/* Current vs Suggested */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                        <p className="text-zinc-400 text-sm mb-1">Current Rating (Pace Multiplier)</p>
                        <p className="text-3xl font-bold text-white">{aiAnalysis.course.currentRating}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {aiAnalysis.course.currentRating < 1.1044 ? '⚡ Very Fast' :
                           aiAnalysis.course.currentRating < 1.1336 ? '🏃 Fast' :
                           aiAnalysis.course.currentRating < 1.1618 ? '📊 Average' :
                           aiAnalysis.course.currentRating < 1.3184 ? '⛰️ Difficult' : '🔥 Very Difficult'}
                        </p>
                      </div>
                      <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                        <p className="text-purple-300 text-sm mb-1">AI Suggested Rating</p>
                        <p className="text-2xl font-bold text-purple-400 font-mono">{aiAnalysis.analysis.suggestedRating.toFixed(10)}</p>
                        <p className="text-xs text-purple-300 mt-1">
                          Confidence: {aiAnalysis.analysis.confidence} |
                          {aiAnalysis.analysis.suggestedRating < 1.1044 ? ' ⚡ Very Fast' :
                           aiAnalysis.analysis.suggestedRating < 1.1336 ? ' 🏃 Fast' :
                           aiAnalysis.analysis.suggestedRating < 1.1618 ? ' 📊 Average' :
                           aiAnalysis.analysis.suggestedRating < 1.3184 ? ' ⛰️ Difficult' : ' 🔥 Very Difficult'}
                        </p>
                      </div>
                    </div>

                    {/* Pace Multiplier Reference */}
                    <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4">
                      <h3 className="text-cyan-300 font-bold mb-2">Pace Multiplier Scale</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-zinc-400">1st Quartile:</span>
                          <span className="text-white font-mono ml-1">1.1044</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Median:</span>
                          <span className="text-cyan-400 font-mono ml-1 font-bold">1.1336</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">3rd Quartile:</span>
                          <span className="text-white font-mono ml-1">1.1618</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Upper:</span>
                          <span className="text-white font-mono ml-1">1.3184</span>
                        </div>
                      </div>
                      <p className="text-zinc-400 text-xs mt-2">
                        Baseline 1.1336 = typical HS XC course | Lower = faster/easier | Higher = slower/harder
                      </p>
                    </div>

                    {/* Statistics */}
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                      <h3 className="text-white font-bold mb-3">Race Statistics</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {aiAnalysis.stats.boys && (
                          <div>
                            <p className="text-cyan-400 font-semibold mb-2">Boys ({aiAnalysis.stats.boys.count} results)</p>
                            <div className="space-y-1 text-zinc-300">
                              <p>Fastest: <span className="font-mono">{aiAnalysis.stats.boys.fastest}</span></p>
                              <p>Median: <span className="font-mono">{aiAnalysis.stats.boys.median}</span></p>
                              <p>Top 10 Avg: <span className="font-mono">{aiAnalysis.stats.boys.top10Avg}</span></p>
                            </div>
                          </div>
                        )}
                        {aiAnalysis.stats.girls && (
                          <div>
                            <p className="text-pink-400 font-semibold mb-2">Girls ({aiAnalysis.stats.girls.count} results)</p>
                            <div className="space-y-1 text-zinc-300">
                              <p>Fastest: <span className="font-mono">{aiAnalysis.stats.girls.fastest}</span></p>
                              <p>Median: <span className="font-mono">{aiAnalysis.stats.girls.median}</span></p>
                              <p>Top 10 Avg: <span className="font-mono">{aiAnalysis.stats.girls.top10Avg}</span></p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                      <h3 className="text-white font-bold mb-2">AI Analysis</h3>
                      <p className="text-zinc-300 mb-4">{aiAnalysis.analysis.reasoning}</p>

                      <h4 className="text-white font-semibold mb-2">Comparison to Baseline</h4>
                      <p className="text-zinc-300 mb-4">{aiAnalysis.analysis.comparisonToBaseline}</p>

                      <h4 className="text-white font-semibold mb-2">Key Factors</h4>
                      <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
                        {aiAnalysis.analysis.factors.map((factor: string, i: number) => (
                          <li key={i}>{factor}</li>
                        ))}
                      </ul>

                      {aiAnalysis.analysis.anomalies && aiAnalysis.analysis.anomalies.length > 0 && (
                        <>
                          <h4 className="text-orange-400 font-semibold mb-2 mt-4">⚠️ Detected Anomalies</h4>
                          <ul className="list-disc list-inside text-orange-300 space-y-1 mb-4">
                            {aiAnalysis.analysis.anomalies.map((anomaly: string, i: number) => (
                              <li key={i}>{anomaly}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {aiAnalysis.analysis.seasonalVariance?.detected && (
                        <div className="bg-orange-900/20 border border-orange-700 rounded p-3 mb-4">
                          <h4 className="text-orange-400 font-semibold mb-1">🔍 Seasonal Variance Detected</h4>
                          <p className="text-orange-300 text-sm">{aiAnalysis.analysis.seasonalVariance.description}</p>
                          {aiAnalysis.analysis.seasonalVariance.recommendation ? (
                            <p className="text-orange-200 text-xs mt-2">
                              <span className="font-semibold">Recommendation:</span> {aiAnalysis.analysis.seasonalVariance.recommendation}
                            </p>
                          ) : (
                            <p className="text-orange-200 text-xs mt-2">
                              This may indicate the course was altered. Consider creating season-specific ratings.
                            </p>
                          )}
                        </div>
                      )}

                      {aiAnalysis.analysis.dataQuality && (
                        <div className="bg-zinc-800 border border-zinc-600 rounded p-3 mb-4">
                          <h4 className="text-zinc-300 font-semibold mb-1">Data Quality</h4>
                          <p className="text-zinc-400 text-sm">
                            Sample Size: <span className="text-white">{aiAnalysis.analysis.dataQuality.sampleSize}</span> |
                            Consistency: <span className="text-white">{aiAnalysis.analysis.dataQuality.consistencyScore}</span>
                          </p>
                          {aiAnalysis.analysis.dataQuality.topTimesSpread && (
                            <p className="text-zinc-400 text-sm mt-1">
                              Top Times Spread: <span className="text-white">{aiAnalysis.analysis.dataQuality.topTimesSpread}</span>
                            </p>
                          )}
                          {aiAnalysis.analysis.dataQuality.outlierCount && (
                            <p className="text-zinc-400 text-sm mt-1">
                              Outliers Detected: <span className="text-white">{aiAnalysis.analysis.dataQuality.outlierCount}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {aiAnalysis.analysis.statisticalAnalysis && (
                        <div className="bg-blue-900/20 border border-blue-700 rounded p-3 mb-4">
                          <h4 className="text-blue-400 font-semibold mb-2">📊 Statistical Analysis</h4>
                          {aiAnalysis.analysis.statisticalAnalysis.boysAnalysis && (
                            <p className="text-cyan-300 text-sm mb-2">
                              <span className="font-semibold">Boys:</span> {aiAnalysis.analysis.statisticalAnalysis.boysAnalysis}
                            </p>
                          )}
                          {aiAnalysis.analysis.statisticalAnalysis.girlsAnalysis && (
                            <p className="text-pink-300 text-sm mb-2">
                              <span className="font-semibold">Girls:</span> {aiAnalysis.analysis.statisticalAnalysis.girlsAnalysis}
                            </p>
                          )}
                          {aiAnalysis.analysis.statisticalAnalysis.genderSpecificNotes && (
                            <p className="text-yellow-200 text-sm mb-2 bg-yellow-900/20 border border-yellow-700/50 rounded p-2">
                              <span className="font-semibold">⚠️ Gender Patterns:</span> {aiAnalysis.analysis.statisticalAnalysis.genderSpecificNotes}
                            </p>
                          )}
                          {aiAnalysis.analysis.statisticalAnalysis.weightedRecommendation && (
                            <p className="text-blue-200 text-sm mt-2 pt-2 border-t border-blue-700">
                              <span className="font-semibold">Methodology:</span> {aiAnalysis.analysis.statisticalAnalysis.weightedRecommendation}
                            </p>
                          )}
                        </div>
                      )}

                      {aiAnalysis.analysis.slaneysMethodologyNotes && (
                        <div className="bg-purple-900/20 border border-purple-700 rounded p-3 mb-4">
                          <h4 className="text-purple-400 font-semibold mb-1">🔬 Slaney's Methodology</h4>
                          <p className="text-purple-200 text-sm">{aiAnalysis.analysis.slaneysMethodologyNotes}</p>
                        </div>
                      )}

                      {aiAnalysis.analysis.warnings && aiAnalysis.analysis.warnings.length > 0 && (
                        <>
                          <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Warnings</h4>
                          <ul className="list-disc list-inside text-yellow-300 space-y-1">
                            {aiAnalysis.analysis.warnings.map((warning: string, i: number) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={applyAISuggestedRating}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                      >
                        Apply Suggested Rating ({aiAnalysis.analysis.suggestedRating.toFixed(10)})
                      </button>
                      <button
                        onClick={() => {
                          setAnalyzingCourse(null)
                          setAiAnalysis(null)
                        }}
                        className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
