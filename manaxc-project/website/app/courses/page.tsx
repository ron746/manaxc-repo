'use client';

import { getCourses } from '@/lib/supabase/queries';
import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

type Course = {
  id: number;
  name: string;
  distance_meters: number;
  difficulty_rating: number;
  race_count: number;
  result_count: number;
};

type SortKey = 'name' | 'distance_meters' | 'difficulty_rating' | 'race_count' | 'result_count';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpToPage, setJumpToPage] = useState<string>('');
  const coursesPerPage = 50;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fetchedCourses = await getCourses();
        // Default sort: Venue (asc), meters (asc), difficulty (asc)
        const sorted = fetchedCourses.sort((a, b) => {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          if (a.distance_meters < b.distance_meters) return -1;
          if (a.distance_meters > b.distance_meters) return 1;
          if (a.difficulty_rating < b.difficulty_rating) return -1;
          if (a.difficulty_rating > b.difficulty_rating) return 1;
          return 0;
        });
        setCourses(sorted);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [courses, sortKey, sortDirection]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery) {
      return sortedCourses;
    }
    return sortedCourses.filter(course => {
      const searchLower = searchQuery.toLowerCase();
      return (
        course.name.toLowerCase().includes(searchLower) ||
        course.distance_meters.toString().includes(searchLower) ||
        course.difficulty_rating.toString().includes(searchLower) ||
        course.race_count.toString().includes(searchLower) ||
        course.result_count.toString().includes(searchLower)
      );
    });
  }, [sortedCourses, searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const endIndex = startIndex + coursesPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Hero Section */}
      <section className="bg-zinc-100/50 border-b border-zinc-200">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center">
            <img src="/mana-xc-logo.png" alt="Mana XC Logo" className="h-12 w-auto mr-4" />
            <div>
              <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">
                Courses
              </h1>
              <p className="mt-1 text-lg text-zinc-600">
                Explore the courses that have challenged Westmont runners over the years.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
          <div className="p-4 border-b border-zinc-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name, distance, or rating..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('name')} className="flex items-center">
                    Venue <SortIcon columnKey="name" />
                  </button>
                </th>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('distance_meters')} className="flex items-center">
                    Meters <SortIcon columnKey="distance_meters" />
                  </button>
                </th>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('difficulty_rating')} className="flex items-center">
                    Difficulty Rating <SortIcon columnKey="difficulty_rating" />
                  </button>
                </th>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('race_count')} className="flex items-center">
                    Total Races <SortIcon columnKey="race_count" />
                  </button>
                </th>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('result_count')} className="flex items-center">
                    Total Results <SortIcon columnKey="result_count" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-zinc-500">Loading courses...</td>
                </tr>
              ) : currentCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-zinc-500">No courses found</td>
                </tr>
              ) : (
                currentCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-cyan-50/50 transition-colors">
                    <td className="p-4">
                      <a
                        href={`/courses/${course.id}`}
                        className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                      >
                        {course.name}
                      </a>
                    </td>
                    <td className="p-4 text-zinc-600">{course.distance_meters}</td>
                    <td className="p-4 text-zinc-600">{course.difficulty_rating?.toFixed(3) || 'N/A'}</td>
                    <td className="p-4 text-zinc-600">{course.race_count?.toLocaleString() || 0}</td>
                    <td className="p-4 text-zinc-600">{course.result_count?.toLocaleString() || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Intelligent Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 bg-white rounded-xl shadow-xl border border-zinc-200 p-6">
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
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredCourses.length)} of <span className="font-semibold text-zinc-900">{filteredCourses.length}</span> courses
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
      </main>
    </div>
  );
}