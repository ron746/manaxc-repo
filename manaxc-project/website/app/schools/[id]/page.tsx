'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSchoolWithStats, getSchoolAthletes } from '@/lib/supabase/queries';
import { ChevronLeft, Users, ChevronUp, ChevronDown, Search } from 'lucide-react';

type School = {
  id: string;
  name: string;
  short_name?: string;
  city?: string;
  state?: string;
  league?: string;
  mascot?: string;
  website_url?: string;
  athletesCount: number;
  boysCount: number;
  girlsCount: number;
};

type Athlete = {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  grad_year: number;
  gender: 'M' | 'F';
  is_active: boolean;
};

type SortKey = 'name' | 'grad_year' | 'gender';

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;

  const [school, setSchool] = useState<School | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradYears, setSelectedGradYears] = useState<number[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<('M' | 'F')[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolData, athletesData] = await Promise.all([
          getSchoolWithStats(schoolId),
          getSchoolAthletes(schoolId)
        ]);

        setSchool(schoolData);
        setAthletes(athletesData);
      } catch (err) {
        console.error('Failed to fetch school data:', err);
        setError('Failed to load school data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId]);

  // Get unique grad years and genders for filters
  const allGradYears = useMemo(() => {
    const years = new Set<number>();
    athletes.forEach(athlete => years.add(athlete.grad_year));
    return Array.from(years).sort((a, b) => a - b);
  }, [athletes]);

  const allGenders = useMemo(() => {
    const genders = new Set<'M' | 'F'>();
    athletes.forEach(athlete => genders.add(athlete.gender));
    return Array.from(genders).sort();
  }, [athletes]);

  // Sort and filter athletes
  const sortedAthletes = useMemo(() => {
    return [...athletes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortKey === 'name') {
        aValue = `${a.last_name} ${a.first_name}`;
        bValue = `${b.last_name} ${b.first_name}`;
      } else {
        aValue = a[sortKey];
        bValue = b[sortKey];
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [athletes, sortKey, sortDirection]);

  const filteredAthletes = useMemo(() => {
    let filtered = sortedAthletes;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(athlete => {
        const fullName = `${athlete.first_name} ${athlete.last_name}`.toLowerCase();
        return fullName.includes(searchLower) || athlete.grad_year.toString().includes(searchLower);
      });
    }

    if (selectedGradYears.length > 0) {
      filtered = filtered.filter(athlete => selectedGradYears.includes(athlete.grad_year));
    }

    if (selectedGenders.length > 0) {
      filtered = filtered.filter(athlete => selectedGenders.includes(athlete.gender));
    }

    return filtered;
  }, [sortedAthletes, searchQuery, selectedGradYears, selectedGenders]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const handleGradYearFilterChange = (year: number) => {
    setSelectedGradYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const handleGenderFilterChange = (gender: 'M' | 'F') => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGradYears([]);
    setSelectedGenders([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-600">Loading school data...</div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'School not found'}</p>
          <button onClick={() => router.push('/schools')} className="text-cyan-600 hover:underline">
            Back to Schools
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
            onClick={() => router.push('/schools')}
            className="flex items-center text-cyan-600 hover:text-cyan-700 mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Schools
          </button>

          <div className="flex items-start gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">
                {school.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-4 text-zinc-600">
                {school.city && school.state && (
                  <div>{school.city}, {school.state}</div>
                )}
                {school.league && (
                  <div className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
                    {school.league}
                  </div>
                )}
                {school.mascot && (
                  <div>Mascot: {school.mascot}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-zinc-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div className="flex flex-wrap gap-8">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-cyan-600" />
                <div>
                  <p className="text-sm text-zinc-600">Total Athletes</p>
                  <p className="text-2xl font-bold text-zinc-900">{school.athletesCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full font-bold text-sm">
                  M
                </div>
                <div>
                  <p className="text-sm text-zinc-600">Boys</p>
                  <p className="text-2xl font-bold text-zinc-900">{school.boysCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center bg-pink-100 text-pink-800 rounded-full font-bold text-sm">
                  F
                </div>
                <div>
                  <p className="text-sm text-zinc-600">Girls</p>
                  <p className="text-2xl font-bold text-zinc-900">{school.girlsCount}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/schools/${schoolId}/records`)}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
              >
                School Records
              </button>
              <button
                onClick={() => router.push(`/schools/${schoolId}/seasons`)}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
              >
                Seasons
              </button>
              <button
                onClick={() => router.push(`/schools/${schoolId}/results`)}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
              >
                All Results
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-1/4 bg-white rounded-xl shadow-lg border border-zinc-200 p-6 self-start">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Filters</h3>
              {(selectedGradYears.length > 0 || selectedGenders.length > 0 || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-cyan-600 hover:text-cyan-700"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Graduation Year Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-700 mb-2">Graduation Year</h4>
              <div className="max-h-48 overflow-y-auto pr-2">
                {allGradYears.map(year => (
                  <label key={year} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedGradYears.includes(year)}
                      onChange={() => handleGradYearFilterChange(year)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                    />
                    <span className="text-zinc-800">{year}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Gender Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-700 mb-2">Gender</h4>
              <div className="space-y-2">
                {allGenders.map(gender => (
                  <label key={gender} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedGenders.includes(gender)}
                      onChange={() => handleGenderFilterChange(gender)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                    />
                    <span className="text-zinc-800">{gender === 'M' ? 'Boys' : 'Girls'}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Athletes Roster */}
          <div className="lg:w-3/4 bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">Athletes Roster</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search athletes by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                      <button onClick={() => handleSort('name')} className="flex items-center">
                        Athlete Name <SortIcon columnKey="name" />
                      </button>
                    </th>
                    <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                      <button onClick={() => handleSort('grad_year')} className="flex items-center">
                        Class <SortIcon columnKey="grad_year" />
                      </button>
                    </th>
                    <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                      <button onClick={() => handleSort('gender')} className="flex items-center">
                        Gender <SortIcon columnKey="gender" />
                      </button>
                    </th>
                    <th className="text-left text-sm font-semibold text-zinc-600 p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-zinc-500">
                        No athletes found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAthletes.map((athlete) => (
                      <tr key={athlete.id} className="hover:bg-cyan-50/50 transition-colors">
                        <td className="p-4">
                          <a
                            href={`/athletes/${athlete.id}`}
                            className="font-medium text-cyan-600 hover:underline"
                          >
                            {athlete.last_name}, {athlete.first_name}
                          </a>
                        </td>
                        <td className="p-4 text-zinc-600">
                          Class of {athlete.grad_year}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            athlete.gender === 'M'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-pink-100 text-pink-800'
                          }`}>
                            {athlete.gender === 'M' ? 'Boys' : 'Girls'}
                          </span>
                        </td>
                        <td className="p-4">
                          <a
                            href={`/athletes/${athlete.id}`}
                            className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                          >
                            View Profile →
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredAthletes.length > 0 && (
              <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                <p className="text-sm text-zinc-600">
                  Showing {filteredAthletes.length} of {athletes.length} athletes
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
