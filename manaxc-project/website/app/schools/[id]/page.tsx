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
  cif_section?: string;
  cif_division?: string;
  league?: string;
  subleague?: string;
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpToPage, setJumpToPage] = useState<string>('');
  const ATHLETES_PER_PAGE = 50;

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
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGradYears, selectedGenders]);

  // Pagination
  const totalPages = Math.ceil(filteredAthletes.length / ATHLETES_PER_PAGE);
  const startIndex = (currentPage - 1) * ATHLETES_PER_PAGE;
  const endIndex = startIndex + ATHLETES_PER_PAGE;
  const currentAthletes = filteredAthletes.slice(startIndex, endIndex);

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
              <div className="mt-3 flex flex-wrap gap-3 text-zinc-600">
                {school.city && school.state && (
                  <div className="flex items-center">
                    <span className="font-medium">{school.city}, {school.state}</span>
                  </div>
                )}
                {school.cif_section && (
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    {school.cif_section}
                  </div>
                )}
                {school.cif_division && (
                  <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                    {school.cif_division}
                  </div>
                )}
                {school.league && (
                  <div className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
                    {school.league}
                  </div>
                )}
                {school.subleague && (
                  <div className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                    {school.subleague}
                  </div>
                )}
                {school.mascot && (
                  <div className="flex items-center text-sm">
                    <span className="text-zinc-500">Mascot:</span> <span className="ml-1 font-medium">{school.mascot}</span>
                  </div>
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
                    currentAthletes.map((athlete) => (
                      <tr key={athlete.id} className="hover:bg-cyan-50/50 transition-colors">
                        <td className="p-4">
                          <a
                            href={`/athletes/${athlete.id}`}
                            className="font-medium text-cyan-600 hover:underline"
                          >
                            {athlete.last_name}, {athlete.first_name}
                          </a>
                        </td>
                        <td className="p-4 text-zinc-800 font-medium">
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

            {/* Intelligent Pagination */}
            {filteredAthletes.length > 0 && totalPages > 1 && (
              <div className="p-6 border-t border-zinc-200">
                <div className="flex flex-col gap-4">
                  {/* Primary Navigation */}
                  <div className="flex flex-wrap justify-center items-center gap-2">
                    {/* First Page */}
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      title="First page"
                    >
                      ««
                    </button>

                    {/* Back 5 */}
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 5))}
                      disabled={currentPage <= 5}
                      className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      title="Back 5 pages"
                    >
                      -5
                    </button>

                    {/* Previous */}
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex gap-2">
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 7) {
                          pageNum = i + 1
                        } else if (currentPage <= 4) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 3) {
                          pageNum = totalPages - 6 + i
                        } else {
                          pageNum = currentPage - 3 + i
                        }

                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                              currentPage === pageNum
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    {/* Next */}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Next
                    </button>

                    {/* Forward 5 */}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 5))}
                      disabled={currentPage > totalPages - 5}
                      className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      title="Forward 5 pages"
                    >
                      +5
                    </button>

                    {/* Last Page */}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      title="Last page"
                    >
                      »»
                    </button>
                  </div>

                  {/* Jump to Page & Info */}
                  <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-zinc-200">
                    <div className="text-sm text-zinc-600">
                      Page <span className="font-semibold text-zinc-900">{currentPage}</span> of <span className="font-semibold text-zinc-900">{totalPages}</span>
                      <span className="mx-2">•</span>
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredAthletes.length)} of <span className="font-semibold text-zinc-900">{filteredAthletes.length}</span> athletes
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="jumpToPage" className="text-sm font-medium text-zinc-700">
                        Jump to page:
                      </label>
                      <input
                        id="jumpToPage"
                        type="number"
                        min="1"
                        max={totalPages}
                        value={jumpToPage}
                        onChange={(e) => setJumpToPage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const page = parseInt(jumpToPage)
                            if (page >= 1 && page <= totalPages) {
                              setCurrentPage(page)
                              setJumpToPage('')
                            }
                          }
                        }}
                        placeholder={`1-${totalPages}`}
                        className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <button
                        onClick={() => {
                          const page = parseInt(jumpToPage)
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page)
                            setJumpToPage('')
                          }
                        }}
                        disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Go
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Simple info when no pagination needed */}
            {filteredAthletes.length > 0 && totalPages <= 1 && (
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
