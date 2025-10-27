'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatTime } from '@/lib/time-utils';

type Athlete = {
  athlete_id: string;
  full_name: string;
  gender: string;
  grade: number;
  graduation_year: number;
  xc_time_pr_cs: number;
  xc_time_pr_track_mile_cs: number;
  top3_season_avg_cs: number;
  season_avg_cs: number;
  race_count: number;
};

type School = {
  id: string;
  name: string;
};

type SortColumn = 'name' | 'grade' | 'xc_time_pr_cs' | 'top3_season_avg_cs' | 'season_avg_cs';
type SortDirection = 'asc' | 'desc';

export default function SchoolRosterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const schoolId = params.id as string;
  const season = searchParams.get('season') || '2025';

  const [school, setSchool] = useState<School | null>(null);
  const [boysTeam, setBoysTeam] = useState<Athlete[]>([]);
  const [girlsTeam, setGirlsTeam] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Boys team state
  const [boysSortColumn, setBoysSortColumn] = useState<SortColumn>('xc_time_pr_cs');
  const [boysSortDirection, setBoysSortDirection] = useState<SortDirection>('asc');
  const [boysGradeFilter, setBoysGradeFilter] = useState<number | null>(null);

  // Girls team state
  const [girlsSortColumn, setGirlsSortColumn] = useState<SortColumn>('xc_time_pr_cs');
  const [girlsSortDirection, setGirlsSortDirection] = useState<SortDirection>('asc');
  const [girlsGradeFilter, setGirlsGradeFilter] = useState<number | null>(null);

  useEffect(() => {
    async function fetchRosterData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/schools/${schoolId}/roster?season=${season}`);
        if (!response.ok) throw new Error('Failed to fetch roster');

        const data = await response.json();
        setSchool(data.school);
        setBoysTeam(data.boysTeam || []);
        setGirlsTeam(data.girlsTeam || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchRosterData();
  }, [schoolId, season]);

  // Sorting logic
  function sortTeam(team: Athlete[], column: SortColumn, direction: SortDirection): Athlete[] {
    return [...team].sort((a, b) => {
  let aVal: unknown, bVal: unknown;

      switch (column) {
        case 'name':
          aVal = a.full_name;
          bVal = b.full_name;
          break;
        case 'grade':
          aVal = a.grade;
          bVal = b.grade;
          break;
        case 'xc_time_pr_cs':
          aVal = a.xc_time_pr_cs || 999999;
          bVal = b.xc_time_pr_cs || 999999;
          break;
        case 'top3_season_avg_cs':
          aVal = a.top3_season_avg_cs || 999999;
          bVal = b.top3_season_avg_cs || 999999;
          break;
        case 'season_avg_cs':
          aVal = a.season_avg_cs || 999999;
          bVal = b.season_avg_cs || 999999;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        const aNum = Number(aVal as unknown);
        const bNum = Number(bVal as unknown);
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
    });
  }

  // Filter by grade
  function filterByGrade(team: Athlete[], grade: number | null): Athlete[] {
    if (!grade) return team;
    return team.filter(a => a.grade === grade);
  }

  // Handle column header click
  function handleSort(
    column: SortColumn,
    currentColumn: SortColumn,
    currentDirection: SortDirection,
    setColumn: (col: SortColumn) => void,
    setDirection: (dir: SortDirection) => void
  ) {
    if (column === currentColumn) {
      setDirection(currentDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setColumn(column);
      setDirection('asc');
    }
  }

  // Get available grades from team
  function getAvailableGrades(team: Athlete[]): number[] {
    const grades = new Set(team.map(a => a.grade));
    return Array.from(grades).sort((a, b) => b - a);
  }

  // Sort icon component
  function SortIcon({ column, currentColumn, currentDirection }: {
    column: SortColumn;
    currentColumn: SortColumn;
    currentDirection: SortDirection;
  }) {
    if (column !== currentColumn) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return currentDirection === 'asc'
      ? <span className="ml-1">↑</span>
      : <span className="ml-1">↓</span>;
  }

  // Team Table Component
  function TeamTable({
    team,
    sortColumn,
    sortDirection,
    gradeFilter,
    setSortColumn,
    setSortDirection,
    setGradeFilter,
    gender
  }: {
    team: Athlete[];
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    gradeFilter: number | null;
    setSortColumn: (col: SortColumn) => void;
    setSortDirection: (dir: SortDirection) => void;
    setGradeFilter: (grade: number | null) => void;
    gender: string;
  }) {
    const filteredTeam = filterByGrade(team, gradeFilter);
    const sortedTeam = sortTeam(filteredTeam, sortColumn, sortDirection);
    const availableGrades = getAvailableGrades(team);

    return (
      <div className="mb-8">
        {/* Header with Grade Filter */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {gender === 'M' ? 'Boys' : 'Girls'} Team ({filteredTeam.length})
          </h2>

          {/* Grade Filter Buttons */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-700 font-medium">Grade:</span>
            <button
              onClick={() => setGradeFilter(null)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                !gradeFilter
                  ? 'bg-[rgb(200,15,46)] text-white'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
              }`}
            >
              All
            </button>
            {availableGrades.map(grade => (
              <button
                key={grade}
                onClick={() => setGradeFilter(grade)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  gradeFilter === grade
                    ? 'bg-[rgb(200,15,46)] text-white'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr className="border-b-2 border-gray-300">
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th
                    onClick={() => handleSort('name', sortColumn, sortDirection, setSortColumn, setSortDirection)}
                    className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center">
                      Name
                      <SortIcon column="name" currentColumn={sortColumn} currentDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('grade', sortColumn, sortDirection, setSortColumn, setSortDirection)}
                    className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center">
                      Grade
                      <SortIcon column="grade" currentColumn={sortColumn} currentDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('xc_time_pr_cs', sortColumn, sortDirection, setSortColumn, setSortDirection)}
                    className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center">
                      XC Time PR
                      <SortIcon column="xc_time_pr_cs" currentColumn={sortColumn} currentDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('top3_season_avg_cs', sortColumn, sortDirection, setSortColumn, setSortDirection)}
                    className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center">
                      Top 3 Season Avg
                      <SortIcon column="top3_season_avg_cs" currentColumn={sortColumn} currentDirection={sortDirection} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('season_avg_cs', sortColumn, sortDirection, setSortColumn, setSortDirection)}
                    className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                  >
                    <div className="flex items-center">
                      Season Avg
                      <SortIcon column="season_avg_cs" currentColumn={sortColumn} currentDirection={sortDirection} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTeam.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                      No athletes found for this filter
                    </td>
                  </tr>
                ) : (
                  sortedTeam.map((athlete, index) => (
                    <tr
                      key={athlete.athlete_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        index < 7 ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-gray-700 font-bold">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/athletes/${athlete.athlete_id}/profile`}
                          className="font-semibold hover:underline"
                          style={{ color: 'rgb(200,15,46)' }}
                        >
                          {athlete.full_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 rounded font-medium text-sm bg-gray-100 text-gray-900">
                          {athlete.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {formatTime(athlete.xc_time_pr_cs)}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-900">
                        {formatTime(athlete.top3_season_avg_cs)}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-900">
                        {formatTime(athlete.season_avg_cs)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note for top 7 highlighting */}
          {sortedTeam.length >= 7 && (
            <div className="px-6 py-3 bg-gray-50 border-t-2 border-gray-200 text-sm text-gray-900">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-500 rounded"></div>
                <span className="font-medium">Top 7 runners highlighted (varsity team + alternates)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Loading Roster...</div>
          <div className="text-gray-600">Getting team data...</div>
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-xl font-semibold mb-2 text-gray-900">Error</div>
          <div className="text-gray-700 mb-4">{error || 'School not found'}</div>
          <Link
            href="/schools"
            className="inline-block px-4 py-2 rounded font-medium transition-colors text-white"
            style={{ backgroundColor: 'rgb(200,15,46)' }}
          >
            Back to Schools
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="text-sm text-gray-700 font-medium">
            <Link href="/" className="hover:underline" style={{ color: 'rgb(200,15,46)' }}>Home</Link>
            <span className="mx-2">/</span>
            <Link href="/schools" className="hover:underline" style={{ color: 'rgb(200,15,46)' }}>Schools</Link>
            <span className="mx-2">/</span>
            <Link href={`/schools/${school.id}`} className="hover:underline" style={{ color: 'rgb(200,15,46)' }}>{school.name}</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-bold">Roster</span>
          </nav>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg mb-6 p-6 border-2 border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{school.name}</h1>
              <p className="text-gray-700 font-medium">{season} Season Team Roster</p>
              <div className="text-sm text-gray-600 mt-1">
                {boysTeam.length} boys • {girlsTeam.length} girls
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6 border-2 border-gray-200">
          <div className="border-b-2 border-gray-200">
            <nav className="flex">
              <Link
                href={`/schools/${school.id}`}
                className="px-6 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-4 border-transparent hover:bg-gray-50"
              >
                Athletes
              </Link>
              <Link
                href={`/schools/${school.id}/records`}
                className="px-6 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-4 border-transparent hover:bg-gray-50"
              >
                Records
              </Link>
              <Link
                href={`/schools/${school.id}/seasons`}
                className="px-6 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-4 border-transparent hover:bg-gray-50"
              >
                Seasons
              </Link>
              <div className="px-6 py-4 text-sm font-bold text-gray-900 border-b-4 border-gray-800 bg-gray-100">
                Roster
              </div>
              <Link
                href={`/schools/${school.id}/results`}
                className="px-6 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-4 border-transparent hover:bg-gray-50"
              >
                All Results
              </Link>
            </nav>
          </div>
        </div>

        {/* Team Selection Guide */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-3">About These Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
            <div>
              <h4 className="font-bold mb-2">XC Time Performance Metrics:</h4>
              <ul className="space-y-1">
                <li>• <strong>XC Time PR:</strong> Fastest Crystal Springs equivalent (all-time)</li>
                <li>• <strong>Top 3 Season Avg:</strong> Average of athlete&apos;s 3 fastest races this season</li>
                <li>• <strong>Season Avg:</strong> Average of all races this season</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">What is &quot;XC Time&quot;?</h4>
              <ul className="space-y-1">
                <li>• Times normalized to Crystal Springs 2.95-mile baseline</li>
                <li>• Accounts for course difficulty differences</li>
                <li>• Allows fair comparison across all courses</li>
                <li>• Top 5 runners score, can race up to 7</li>
              </ul>
            </div>
          </div>
        </div>

        {boysTeam.length === 0 && girlsTeam.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-12 text-center">
            <div className="text-gray-700 font-medium mb-4">No roster data available for this season.</div>
            <div className="text-sm text-gray-600">
              Results will appear here once races are added for the {season} season.
            </div>
          </div>
        ) : (
          <>
            {/* Boys Team */}
            {boysTeam.length > 0 && (
              <TeamTable
                team={boysTeam}
                sortColumn={boysSortColumn}
                sortDirection={boysSortDirection}
                gradeFilter={boysGradeFilter}
                setSortColumn={setBoysSortColumn}
                setSortDirection={setBoysSortDirection}
                setGradeFilter={setBoysGradeFilter}
                gender="M"
              />
            )}

            {/* Girls Team */}
            {girlsTeam.length > 0 && (
              <TeamTable
                team={girlsTeam}
                sortColumn={girlsSortColumn}
                sortDirection={girlsSortDirection}
                gradeFilter={girlsGradeFilter}
                setSortColumn={setGirlsSortColumn}
                setSortDirection={setGirlsSortDirection}
                setGradeFilter={setGirlsGradeFilter}
                gender="F"
              />
            )}
          </>
        )}

        {/* Back Button */}
        <div className="mt-6">
          <Link
            href={`/schools/${school.id}`}
            className="inline-block px-4 py-2 rounded font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700"
          >
            ← Back to School
          </Link>
        </div>
      </div>
    </div>
  );
}
