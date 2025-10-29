'use client';

import { getSchools } from '@/lib/supabase/queries';
import { useEffect, useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

type School = {
  id: number;
  name: string;
  league: string | null;
  city: string | null;
  state: string | null;
  cif_section: string | null;
  cif_division: string | null;
  subleague: string | null;
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [selectedCifSections, setSelectedCifSections] = useState<Set<string>>(new Set());
  const [selectedCifDivisions, setSelectedCifDivisions] = useState<Set<string>>(new Set());
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set());
  const [selectedSubleagues, setSelectedSubleagues] = useState<Set<string>>(new Set());
  const [includeStateNulls, setIncludeStateNulls] = useState(false);
  const [includeCifSectionNulls, setIncludeCifSectionNulls] = useState(false);
  const [includeCifDivisionNulls, setIncludeCifDivisionNulls] = useState(false);
  const [includeLeagueNulls, setIncludeLeagueNulls] = useState(false);
  const [includeSubleagueNulls, setIncludeSubleagueNulls] = useState(false);
  const ITEMS_PER_PAGE = 50;

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

  // Extract unique values for filters and count blanks
  const uniqueStates = useMemo(() => {
    const states = schools.map(s => s.state).filter(Boolean) as string[];
    return Array.from(new Set(states)).sort();
  }, [schools]);

  const blankStateCount = useMemo(() => {
    return schools.filter(s => !s.state).length;
  }, [schools]);

  const uniqueCifSections = useMemo(() => {
    const sections = schools.map(s => s.cif_section).filter(Boolean) as string[];
    return Array.from(new Set(sections)).sort();
  }, [schools]);

  const blankCifSectionCount = useMemo(() => {
    return schools.filter(s => !s.cif_section).length;
  }, [schools]);

  const uniqueCifDivisions = useMemo(() => {
    const divisions = schools.map(s => s.cif_division).filter(Boolean) as string[];
    return Array.from(new Set(divisions)).sort();
  }, [schools]);

  const blankCifDivisionCount = useMemo(() => {
    return schools.filter(s => !s.cif_division).length;
  }, [schools]);

  const uniqueLeagues = useMemo(() => {
    const leagues = schools.map(s => s.league).filter(Boolean) as string[];
    return Array.from(new Set(leagues)).sort();
  }, [schools]);

  const blankLeagueCount = useMemo(() => {
    return schools.filter(s => !s.league).length;
  }, [schools]);

  const uniqueSubleagues = useMemo(() => {
    const subleagues = schools.map(s => s.subleague).filter(Boolean) as string[];
    return Array.from(new Set(subleagues)).sort();
  }, [schools]);

  const blankSubleagueCount = useMemo(() => {
    return schools.filter(s => !s.subleague).length;
  }, [schools]);

  // Toggle functions for filters
  const toggleState = (state: string) => {
    const newSet = new Set(selectedStates);
    if (newSet.has(state)) {
      newSet.delete(state);
    } else {
      newSet.add(state);
    }
    setSelectedStates(newSet);
  };

  const toggleAllStates = () => {
    if (selectedStates.size === uniqueStates.length && uniqueStates.length > 0) {
      setSelectedStates(new Set());
    } else {
      setSelectedStates(new Set(uniqueStates));
    }
  };

  const toggleCifSection = (section: string) => {
    const newSet = new Set(selectedCifSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setSelectedCifSections(newSet);
  };

  const toggleAllCifSections = () => {
    if (selectedCifSections.size === uniqueCifSections.length && uniqueCifSections.length > 0) {
      setSelectedCifSections(new Set());
    } else {
      setSelectedCifSections(new Set(uniqueCifSections));
    }
  };

  const toggleCifDivision = (division: string) => {
    const newSet = new Set(selectedCifDivisions);
    if (newSet.has(division)) {
      newSet.delete(division);
    } else {
      newSet.add(division);
    }
    setSelectedCifDivisions(newSet);
  };

  const toggleAllCifDivisions = () => {
    if (selectedCifDivisions.size === uniqueCifDivisions.length && uniqueCifDivisions.length > 0) {
      setSelectedCifDivisions(new Set());
    } else {
      setSelectedCifDivisions(new Set(uniqueCifDivisions));
    }
  };

  const toggleLeague = (league: string) => {
    const newSet = new Set(selectedLeagues);
    if (newSet.has(league)) {
      newSet.delete(league);
    } else {
      newSet.add(league);
    }
    setSelectedLeagues(newSet);
  };

  const toggleAllLeagues = () => {
    if (selectedLeagues.size === uniqueLeagues.length && uniqueLeagues.length > 0) {
      setSelectedLeagues(new Set());
    } else {
      setSelectedLeagues(new Set(uniqueLeagues));
    }
  };

  const toggleSubleague = (subleague: string) => {
    const newSet = new Set(selectedSubleagues);
    if (newSet.has(subleague)) {
      newSet.delete(subleague);
    } else {
      newSet.add(subleague);
    }
    setSelectedSubleagues(newSet);
  };

  const toggleAllSubleagues = () => {
    if (selectedSubleagues.size === uniqueSubleagues.length && uniqueSubleagues.length > 0) {
      setSelectedSubleagues(new Set());
    } else {
      setSelectedSubleagues(new Set(uniqueSubleagues));
    }
  };

  // Sort schools alphabetically by name
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => a.name.localeCompare(b.name));
  }, [schools]);

  // Apply all filters
  const filteredSchools = useMemo(() => {
    return sortedSchools.filter(school => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = school.name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // State filter
      const stateMatch = selectedStates.size === 0 ||
        (school.state && selectedStates.has(school.state)) ||
        (!school.state && includeStateNulls);
      if (!stateMatch) return false;

      // CIF Section filter
      const cifSectionMatch = selectedCifSections.size === 0 ||
        (school.cif_section && selectedCifSections.has(school.cif_section)) ||
        (!school.cif_section && includeCifSectionNulls);
      if (!cifSectionMatch) return false;

      // CIF Division filter
      const cifDivisionMatch = selectedCifDivisions.size === 0 ||
        (school.cif_division && selectedCifDivisions.has(school.cif_division)) ||
        (!school.cif_division && includeCifDivisionNulls);
      if (!cifDivisionMatch) return false;

      // League filter
      const leagueMatch = selectedLeagues.size === 0 ||
        (school.league && selectedLeagues.has(school.league)) ||
        (!school.league && includeLeagueNulls);
      if (!leagueMatch) return false;

      // Subleague filter
      const subleagueMatch = selectedSubleagues.size === 0 ||
        (school.subleague && selectedSubleagues.has(school.subleague)) ||
        (!school.subleague && includeSubleagueNulls);
      if (!subleagueMatch) return false;

      return true;
    });
  }, [sortedSchools, searchQuery, selectedStates, selectedCifSections, selectedCifDivisions,
      selectedLeagues, selectedSubleagues, includeStateNulls, includeCifSectionNulls,
      includeCifDivisionNulls, includeLeagueNulls, includeSubleagueNulls]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStates, selectedCifSections, selectedCifDivisions, selectedLeagues,
      selectedSubleagues, includeStateNulls, includeCifSectionNulls, includeCifDivisionNulls,
      includeLeagueNulls, includeSubleagueNulls]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSchools = filteredSchools.slice(startIndex, endIndex);

  // Find first school index for each letter
  const getLetterIndex = (letter: string) => {
    const index = filteredSchools.findIndex(school =>
      school.name.toUpperCase().startsWith(letter)
    );
    return index !== -1 ? Math.floor(index / ITEMS_PER_PAGE) + 1 : null;
  };

  const jumpToLetter = (letter: string) => {
    const page = getLetterIndex(letter);
    if (page) {
      setCurrentPage(page);
    }
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const clearAllFilters = () => {
    setSelectedStates(new Set());
    setSelectedCifSections(new Set());
    setSelectedCifDivisions(new Set());
    setSelectedLeagues(new Set());
    setSelectedSubleagues(new Set());
    setIncludeStateNulls(false);
    setIncludeCifSectionNulls(false);
    setIncludeCifDivisionNulls(false);
    setIncludeLeagueNulls(false);
    setIncludeSubleagueNulls(false);
    setSearchQuery('');
  };

  const activeFiltersCount = selectedStates.size + selectedCifSections.size + selectedCifDivisions.size +
    selectedLeagues.size + selectedSubleagues.size +
    (includeStateNulls ? 1 : 0) + (includeCifSectionNulls ? 1 : 0) +
    (includeCifDivisionNulls ? 1 : 0) + (includeLeagueNulls ? 1 : 0) + (includeSubleagueNulls ? 1 : 0);

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
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-xl border border-zinc-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900">Filters</h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* State Filter */}
              {(uniqueStates.length > 0 || blankStateCount > 0) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-zinc-700">State:</h4>
                    <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedStates.size === uniqueStates.length}
                        onChange={toggleAllStates}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-600 text-xs font-medium">Select All</span>
                    </label>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueStates.map(state => (
                      <label key={state} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedStates.has(state)}
                          onChange={() => toggleState(state)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">{state}</span>
                      </label>
                    ))}
                    {blankStateCount > 0 && (
                      <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={includeStateNulls}
                          onChange={(e) => setIncludeStateNulls(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">Blank/Unknown ({blankStateCount})</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* CIF Section Filter */}
              {(uniqueCifSections.length > 0 || blankCifSectionCount > 0) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-zinc-700">CIF Section:</h4>
                    <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCifSections.size === uniqueCifSections.length}
                        onChange={toggleAllCifSections}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-600 text-xs font-medium">Select All</span>
                    </label>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueCifSections.map(section => (
                      <label key={section} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCifSections.has(section)}
                          onChange={() => toggleCifSection(section)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">{section}</span>
                      </label>
                    ))}
                    {blankCifSectionCount > 0 && (
                      <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={includeCifSectionNulls}
                          onChange={(e) => setIncludeCifSectionNulls(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">Blank/Unknown ({blankCifSectionCount})</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* CIF Division Filter */}
              {(uniqueCifDivisions.length > 0 || blankCifDivisionCount > 0) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-zinc-700">CIF Division:</h4>
                    <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCifDivisions.size === uniqueCifDivisions.length}
                        onChange={toggleAllCifDivisions}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-600 text-xs font-medium">Select All</span>
                    </label>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueCifDivisions.map(division => (
                      <label key={division} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCifDivisions.has(division)}
                          onChange={() => toggleCifDivision(division)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">{division}</span>
                      </label>
                    ))}
                    {blankCifDivisionCount > 0 && (
                      <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={includeCifDivisionNulls}
                          onChange={(e) => setIncludeCifDivisionNulls(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">Blank/Unknown ({blankCifDivisionCount})</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* League Filter */}
              {(uniqueLeagues.length > 0 || blankLeagueCount > 0) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-zinc-700">League:</h4>
                    <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedLeagues.size === uniqueLeagues.length}
                        onChange={toggleAllLeagues}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-600 text-xs font-medium">Select All</span>
                    </label>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueLeagues.map(league => (
                      <label key={league} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedLeagues.has(league)}
                          onChange={() => toggleLeague(league)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">{league}</span>
                      </label>
                    ))}
                    {blankLeagueCount > 0 && (
                      <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={includeLeagueNulls}
                          onChange={(e) => setIncludeLeagueNulls(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">Blank/Unknown ({blankLeagueCount})</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Subleague Filter */}
              {(uniqueSubleagues.length > 0 || blankSubleagueCount > 0) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-zinc-700">Subleague:</h4>
                    <label className="flex items-center space-x-2 cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSubleagues.size === uniqueSubleagues.length}
                        onChange={toggleAllSubleagues}
                        className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                      />
                      <span className="text-zinc-600 text-xs font-medium">Select All</span>
                    </label>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uniqueSubleagues.map(subleague => (
                      <label key={subleague} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedSubleagues.has(subleague)}
                          onChange={() => toggleSubleague(subleague)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">{subleague}</span>
                      </label>
                    ))}
                    {blankSubleagueCount > 0 && (
                      <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-cyan-50 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={includeSubleagueNulls}
                          onChange={(e) => setIncludeSubleagueNulls(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-cyan-600 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 text-sm">Blank/Unknown ({blankSubleagueCount})</span>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schools List */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
              {/* Search Bar */}
              <div className="p-4 border-b border-zinc-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by school name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 text-zinc-900"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left text-sm font-semibold text-zinc-600 p-4">
                      School
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {loading ? (
                    <tr>
                      <td colSpan={1} className="text-center p-8 text-zinc-500">Loading schools...</td>
                    </tr>
                  ) : filteredSchools.length === 0 ? (
                    <tr>
                      <td colSpan={1} className="text-center p-8 text-zinc-500">No schools found matching your criteria</td>
                    </tr>
                  ) : (
                    currentSchools.map((school) => (
                      <tr key={school.id} className="hover:bg-cyan-50/50 transition-colors">
                        <td className="py-2 px-4 text-zinc-900 font-medium">
                          <a href={`/schools/${school.id}`} className="text-cyan-600 hover:underline">
                            {school.name}
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {!loading && filteredSchools.length > 0 && (
                <div className="p-4 border-t border-zinc-200">
                  <div className="flex flex-col gap-4">
                    {/* Page Info and Prev/Next */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-zinc-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredSchools.length)} of {filteredSchools.length} schools
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-700 font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-zinc-600 px-4">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-700 font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {/* Alphabet Navigation */}
                    <div className="border-t border-zinc-200 pt-4">
                      <div className="text-xs text-zinc-500 mb-2">Jump to letter:</div>
                      <div className="flex flex-wrap gap-2">
                        {alphabet.map(letter => {
                          const pageForLetter = getLetterIndex(letter);
                          const isDisabled = !pageForLetter;
                          return (
                            <button
                              key={letter}
                              onClick={() => jumpToLetter(letter)}
                              disabled={isDisabled}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                isDisabled
                                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                  : 'bg-cyan-600 text-white hover:bg-cyan-700'
                              }`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
