'use client';

import { getSchools } from '@/lib/supabase/queries';
import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

type School = {
  id: number;
  name: string;
  league: string | null;
  city: string | null;
  state: string | null;
};

type SortKey = 'name' | 'league' | 'city' | 'state';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const fetchedSchools = await getSchools();
        setSchools(fetchedSchools);
      } catch (error) {
        console.error('Failed to fetch schools:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchools();
  }, []);

  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null) return sortDirection === 'asc' ? -1 : 1;


      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [schools, sortKey, sortDirection]);

  const filteredSchools = useMemo(() => {
    if (!searchQuery) {
      return sortedSchools;
    }
    return sortedSchools.filter(school => {
      const searchLower = searchQuery.toLowerCase();
      return (
        school.name.toLowerCase().includes(searchLower) ||
        (school.league && school.league.toLowerCase().includes(searchLower)) ||
        (school.city && school.city.toLowerCase().includes(searchLower)) ||
        (school.state && school.state.toLowerCase().includes(searchLower))
      );
    });
  }, [sortedSchools, searchQuery]);

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
                Schools
              </h1>
              <p className="mt-1 text-lg text-zinc-600">
                Discover the schools competing in the league.
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
                placeholder="Search by school name, league, city, or state..."
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
                    School <SortIcon columnKey="name" />
                  </button>
                </th>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('league')} className="flex items-center">
                    League <SortIcon columnKey="league" />
                  </button>
                </th>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('city')} className="flex items-center">
                    City <SortIcon columnKey="city" />
                  </button>
                </th>
                <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                  <button onClick={() => handleSort('state')} className="flex items-center">
                    State <SortIcon columnKey="state" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-zinc-500">Loading schools...</td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-zinc-500">No schools found matching your criteria</td>
                </tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr key={school.id} className="hover:bg-cyan-50/50 transition-colors">
                    <td className="p-4 text-zinc-900 font-medium">
                      <a href={`/schools/${school.id}`} className="text-cyan-600 hover:underline">
                        {school.name}
                      </a>
                    </td>
                    <td className="p-4 text-zinc-600">{school.league || 'N/A'}</td>
                    <td className="p-4 text-zinc-600">{school.city || 'N/A'}</td>
                    <td className="p-4 text-zinc-600">{school.state || 'N/A'}</td>
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
