'use client';

import { getCourses } from '@/lib/supabase/queries';
import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

type Course = {
  id: number;
  name: string;
  distance_meters: number;
  difficulty_rating: number;
};

type SortKey = 'name' | 'distance_meters' | 'difficulty_rating';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        course.difficulty_rating.toString().includes(searchLower)
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
  };

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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center p-8 text-zinc-500">Loading courses...</td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}