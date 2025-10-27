'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAthleteWithSchool, getAthleteResults } from '@/lib/supabase/queries';
import { formatTime, formatPace, formatDistance, calculateAverage, getBestTime, formatTimeDiff } from '@/lib/utils/time';
import { ChevronLeft, Calendar, MapPin, Trophy, TrendingUp, Award } from 'lucide-react';

type Athlete = {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  grad_year: number;
  gender: 'M' | 'F';
  bio?: string;
  schools: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    league?: string;
  } | null;
};

type Result = {
  id: string;
  time_cs: number;
  place_overall?: number;
  place_gender?: number;
  place_team?: number;
  is_pr: boolean;
  data_source: string;
  is_legacy_data: boolean;
  races?: {
    id: string;
    name: string;
    gender: string;
    distance_meters: number;
    meets: {
      id: string;
      name: string;
      meet_date: string;
      season_year: number;
      courses?: {
        id: string;
        name: string;
        location?: string;
        distance_meters: number;
        distance_display?: string;
        difficulty_rating?: number;
      } | null;
    } | null;
  } | null;
};

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.id as string;

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [athleteData, resultsData] = await Promise.all([
          getAthleteWithSchool(athleteId),
          getAthleteResults(athleteId)
        ]);

        setAthlete(athleteData);
        setResults(resultsData);
      } catch (err) {
        console.error('Failed to fetch athlete data:', err);
        setError('Failed to load athlete data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [athleteId]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!results || results.length === 0) {
      return {
        totalRaces: 0,
        seasonBest: null,
        averageTime: null,
        prsCount: 0,
        seasons: []
      };
    }

    const times = results.map(r => r.time_cs);
    const seasons = Array.from(new Set(results.map(r => r.races?.meets?.season_year).filter(Boolean)));
    const prsCount = results.filter(r => r.is_pr).length;

    return {
      totalRaces: results.length,
      seasonBest: getBestTime(times),
      averageTime: calculateAverage(times),
      prsCount,
      seasons: seasons.sort((a, b) => (b as number) - (a as number))
    };
  }, [results]);

  // Group results by course for PRs
  const coursePRs = useMemo(() => {
    const courseMap = new Map<string, { courseName: string; bestTime: number; result: Result }>();

    results.forEach(result => {
      if (!result.races?.meets?.courses) return;

      const courseId = result.races.meets.courses.id;
      const courseName = result.races.meets.courses.name;

      if (!courseMap.has(courseId) || result.time_cs < courseMap.get(courseId)!.bestTime) {
        courseMap.set(courseId, {
          courseName,
          bestTime: result.time_cs,
          result
        });
      }
    });

    return Array.from(courseMap.values()).sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [results]);

  // Get current season results
  const currentSeason = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const currentSeasonResults = useMemo(() => {
    return results.filter(r => r.races?.meets?.season_year === currentSeason);
  }, [results, currentSeason]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-600">Loading athlete data...</div>
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Athlete not found'}</p>
          <button onClick={() => router.push('/athletes')} className="text-cyan-600 hover:underline">
            Back to Athletes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <section className="bg-zinc-100/50 border-b border-zinc-200">
        <div className="container mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/athletes')}
            className="flex items-center text-cyan-600 hover:text-cyan-700 mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Athletes
          </button>

          <div className="flex items-start gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">
                {athlete.first_name} {athlete.last_name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-zinc-600">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    athlete.gender === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                  }`}>
                    {athlete.gender === 'M' ? 'Boys' : 'Girls'}
                  </span>
                </div>
                <div>Class of {athlete.grad_year}</div>
                {athlete.schools && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <a href={`/schools/${athlete.schools.id}`} className="text-cyan-600 hover:underline">
                      {athlete.schools.name}
                    </a>
                  </div>
                )}
              </div>
              {athlete.bio && (
                <p className="mt-4 text-zinc-700">{athlete.bio}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-zinc-700">Total Races</h3>
            </div>
            <p className="text-3xl font-bold text-zinc-900">{stats.totalRaces}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-zinc-700">Personal Records</h3>
            </div>
            <p className="text-3xl font-bold text-zinc-900">{stats.prsCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-zinc-700">Season Best</h3>
            </div>
            <p className="text-3xl font-bold text-zinc-900">
              {stats.seasonBest ? formatTime(stats.seasonBest) : '--:--'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-zinc-700">Average Time</h3>
            </div>
            <p className="text-3xl font-bold text-zinc-900">
              {stats.averageTime ? formatTime(stats.averageTime) : '--:--'}
            </p>
          </div>
        </div>

        {/* Course PRs and Season Progression */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Course PRs */}
          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Course PRs</h2>
            {coursePRs.length === 0 ? (
              <p className="text-zinc-500">No race results yet</p>
            ) : (
              <div className="space-y-3">
                {coursePRs.map((pr, index) => (
                  <div key={index} className="border-b border-zinc-200 pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-900">{pr.courseName}</p>
                        <p className="text-sm text-zinc-600">
                          {pr.result.races?.meets?.name} • {new Date(pr.result.races.meets.meet_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-cyan-600">{formatTime(pr.bestTime)}</p>
                        {pr.result.races?.meets?.courses && (
                          <p className="text-sm text-zinc-500">
                            {formatPace(pr.bestTime, pr.result.races.meets.courses.distance_meters)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Season Progression */}
          <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-6">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">{currentSeason} Season</h2>
            {currentSeasonResults.length === 0 ? (
              <p className="text-zinc-500">No results for current season</p>
            ) : (
              <div className="space-y-3">
                {currentSeasonResults.slice(0, 5).map((result, index) => (
                  <div key={result.id} className="flex justify-between items-center border-b border-zinc-200 pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {result.races?.meets?.name}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {result.races?.meets?.meet_date && new Date(result.races.meets.meet_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zinc-900">{formatTime(result.time_cs)}</p>
                      {result.is_pr && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PR</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Race History Table */}
        <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-2xl font-bold text-zinc-900">Race History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Date</th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Meet</th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Course</th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Distance</th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Time</th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Pace</th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Place</th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">Season</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-zinc-500">No race results found</td>
                  </tr>
                ) : (
                  results.map((result) => (
                    <tr key={result.id} className="hover:bg-cyan-50/50 transition-colors">
                      <td className="p-4 text-zinc-900">
                        {result.races?.meets?.meet_date
                          ? new Date(result.races.meets.meet_date).toLocaleDateString()
                          : '--'}
                      </td>
                      <td className="p-4 text-zinc-900">
                        {result.races?.meets?.name || '--'}
                      </td>
                      <td className="p-4 text-zinc-900">
                        {result.races?.meets?.courses?.name || '--'}
                      </td>
                      <td className="p-4 text-zinc-600">
                        {result.races?.meets?.courses
                          ? formatDistance(result.races.meets.courses.distance_meters)
                          : '--'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">{formatTime(result.time_cs)}</span>
                          {result.is_pr && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                              PR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-600">
                        {result.races?.meets?.courses
                          ? formatPace(result.time_cs, result.races.meets.courses.distance_meters)
                          : '--'}
                      </td>
                      <td className="p-4 text-zinc-600">
                        {result.place_overall || '--'}
                      </td>
                      <td className="p-4 text-zinc-600">
                        {result.races?.meets?.season_year || '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
