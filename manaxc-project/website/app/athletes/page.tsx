'use client';

import { getAthletes } from '@/lib/supabase/queries';
import { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

type Athlete = {
  id: number;
  first_name: string;
  last_name: string;
  grad_year: number;
  gender: 'M' | 'F';
  schools: {
    name: string;
  } | null;
};

type SortKey = 'last_name' | 'schools.name' | 'grad_year' | 'gender';

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('last_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedGradYears, setSelectedGradYears] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<('M' | 'F')[]>([]);

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const fetchedAthletes = await getAthletes();
        setAthletes(fetchedAthletes);
      } catch (error) {
        console.error('Failed to fetch athletes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAthletes();
  }, []);

  const allSchools = useMemo(() => {
    const schools = new Set<string>();
    athletes.forEach(athlete => {
      if (athlete.schools && athlete.schools.name) {
        schools.add(athlete.schools.name);
      }
    });
    return Array.from(schools).sort();
  }, [athletes]);

  const allGradYears = useMemo(() => {
    const years = new Set<string>();
    athletes.forEach(athlete => {
      if (athlete.grad_year != null) {
        years.add(athlete.grad_year.toString());
      }
    });
    return Array.from(years).sort();
  }, [athletes]);

  const allGenders = useMemo(() => {
    const genders = new Set<'M' | 'F'>();
    athletes.forEach(athlete => genders.add(athlete.gender));
    return Array.from(genders).sort();
  }, [athletes]);

  const sortedAthletes = useMemo(() => {
    return [...athletes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortKey === 'schools.name') {
        aValue = a.schools?.name || '';
        bValue = b.schools?.name || '';
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
    let currentFiltered = sortedAthletes;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      currentFiltered = currentFiltered.filter(athlete => {
        const fullName = `${athlete.first_name} ${athlete.last_name}`;
        return (
          fullName.toLowerCase().includes(searchLower) ||
          athlete.grad_year.toString().includes(searchLower) ||
          (athlete.schools?.name && athlete.schools.name.toLowerCase().includes(searchLower)) ||
          (athlete.gender === 'M' ? 'boys' : 'girls').includes(searchLower)
        );
      });
    }

    if (selectedSchools.length > 0) {
      currentFiltered = currentFiltered.filter(athlete =>
        athlete.schools?.name && selectedSchools.includes(athlete.schools.name)
      );
    }

    if (selectedGradYears.length > 0) {
      currentFiltered = currentFiltered.filter(athlete =>
        selectedGradYears.includes(athlete.grad_year.toString())
      );
    }

    if (selectedGenders.length > 0) {
      currentFiltered = currentFiltered.filter(athlete =>
        selectedGenders.includes(athlete.gender)
      );
    }

    return currentFiltered;
  }, [sortedAthletes, searchQuery, selectedSchools, selectedGradYears, selectedGenders]);

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

  const handleSchoolFilterChange = (schoolName: string) => {
    setSelectedSchools(prev =>
      prev.includes(schoolName)
        ? prev.filter(s => s !== schoolName)
        : [...prev, schoolName]
    );
  };

  const handleGradYearFilterChange = (year: string) => {
    setSelectedGradYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const handleGenderFilterChange = (gender: 'M' | 'F') => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
    );
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
                Athletes
              </h1>
              <p className="mt-1 text-lg text-zinc-600">
                Meet the dedicated athletes of Westmont High School Cross Country.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-1/4 bg-white rounded-xl shadow-xl border border-zinc-200 p-6 self-start sticky top-24">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Filter Athletes</h3>

            {/* School Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-700 mb-2">School</h4>
              <div className="max-h-48 overflow-y-auto pr-2">
                {allSchools.map(schoolName => (
                  <label key={schoolName} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedSchools.includes(schoolName)}
                      onChange={() => handleSchoolFilterChange(schoolName)}
                      className="form-checkbox h-4 w-4 text-cyan-600 rounded"
                    />
                    <span className="text-zinc-800">{schoolName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Grad Year Filter */}
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

            {/* Division Filter */}
            <div className="mb-6">
              <h4 className="font-semibold text-zinc-700 mb-2">Division</h4>
              <div className="max-h-48 overflow-y-auto pr-2">
                {allGenders.map(gender => (
                  <label key={gender} className="flex items-center space-x-2 py-1">
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

          {/* Athletes Table */}
          <div className="lg:w-3/4 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name or keywords..."
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
                    <button onClick={() => handleSort('last_name')} className="flex items-center">
                      Athlete <SortIcon columnKey="last_name" />
                    </button>
                  </th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                    <button onClick={() => handleSort('schools.name')} className="flex items-center">
                      School <SortIcon columnKey="schools.name" />
                    </button>
                  </th>
                  <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                    <button onClick={() => handleSort('grad_year')} className="flex items-center">
                      Grad Year <SortIcon columnKey="grad_year" />
                    </button>
                  </th>
                  <th scope="col" className="text-left text-sm font-semibold text-zinc-600 p-4">
                    <button onClick={() => handleSort('gender')} className="flex items-center">
                      Division <SortIcon columnKey="gender" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-zinc-500">Loading athletes...</td>
                  </tr>
                ) : filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-zinc-500">No athletes found matching your criteria.</td>
                  </tr>
                ) : (
                  filteredAthletes.map((athlete) => (
                    <tr key={athlete.id} className="hover:bg-cyan-50/50 transition-colors">
                      <td className="p-4 text-zinc-900 font-medium">
                        <a href={`/athletes/${athlete.id}`} className="text-cyan-600 hover:underline">
                          {athlete.first_name} {athlete.last_name}
                        </a>
                      </td>
                      <td className="p-4 text-zinc-600">{athlete.schools?.name || 'N/A'}</td>
                      <td className="p-4 text-zinc-600">{athlete.grad_year}</td>
                      <td className="p-4 text-zinc-600">{athlete.gender === 'M' ? 'Boys' : 'Girls'}</td>
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