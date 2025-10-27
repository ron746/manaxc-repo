'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, CheckCircle, Clock, AlertCircle, Loader2, Download, Zap, Calendar, TrendingUp } from 'lucide-react';

interface ScrapeRequest {
  id: string;
  schoolId: string;
  schoolName?: string;
  season: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
  stats?: {
    totalMeets: number;
    newMeets: number;
    totalResults: number;
  };
  files?: {
    csvFile: string;
    jsonFile: string;
  };
}

export default function ScrapeRequestManager() {
  const [requests, setRequests] = useState<ScrapeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [autoImport, setAutoImport] = useState(true);

  // Load saved requests from localStorage
  useEffect(() => {
    const _saved = localStorage.getItem('scrapeRequests');
    if (_saved) {
      setRequests(JSON.parse(_saved));
    }
  }, []);

  // Save to localStorage whenever requests change
  useEffect(() => {
    localStorage.setItem('scrapeRequests', JSON.stringify(requests));
  }, [requests]);

  const addRequests = (customStart?: number, customEnd?: number) => {
    if (!schoolId) {
      alert('Please enter a School ID');
      return;
    }

    const start = customStart ?? Math.min(startYear, endYear);
    const end = customEnd ?? Math.max(startYear, endYear);

    const newRequests: ScrapeRequest[] = [];
    for (let year = start; year <= end; year++) {
      newRequests.push({
        id: `${schoolId}-${year}-${Date.now()}-${Math.random()}`,
        schoolId,
        schoolName: schoolName || undefined,
        season: year,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    setRequests([...requests, ...newRequests]);

    // Only reset form if not using quick action
    if (!customStart && !customEnd) {
      setSchoolId('');
      setSchoolName('');
      setStartYear(new Date().getFullYear());
      setEndYear(new Date().getFullYear());
    }
  };

  // Quick action presets
  const addCurrentSeason = () => {
    const currentYear = new Date().getFullYear();
    addRequests(currentYear, currentYear);
  };

  const addLast4Years = () => {
    const currentYear = new Date().getFullYear();
    addRequests(currentYear - 3, currentYear);
  };

  const addLast10Years = () => {
    const currentYear = new Date().getFullYear();
    addRequests(currentYear - 9, currentYear);
  };

  const addAllAvailable = () => {
    // Athletic.net has data going back to around 2010 for most schools
    // We'll conservatively start from 2010 and go to current year
    const currentYear = new Date().getFullYear();
    const confirmed = window.confirm(
      `This will queue scrapes from 2010 to ${currentYear} (${currentYear - 2010 + 1} seasons).\n\n` +
      `Athletic.net may not have data for all years. Empty seasons will be skipped.\n\n` +
      `Continue?`
    );

    if (confirmed) {
      addRequests(2010, currentYear);
    }
  };

  const removeRequest = (id: string) => {
    setRequests(requests.filter(r => r.id !== id));
  };

  const runRequest = async (request: ScrapeRequest) => {
    // Update status to running
    setRequests(requests.map(r =>
      r.id === request.id ? { ...r, status: 'running' as const } : r
    ));

    try {
      // Call the scraper API
      const response = await fetch('/api/admin/scrape-athletic-net', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: request.schoolId,
          season: request.season.toString()
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update request with success
        setRequests(requests.map(r =>
          r.id === request.id ? {
            ...r,
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
            stats: {
              totalMeets: result.data.totalMeets,
              newMeets: result.data.newMeets,
              totalResults: result.data.totalResults,
            },
            files: {
              csvFile: result.data.csvFile,
              jsonFile: result.data.jsonFile,
            }
          } : r
        ));

        // Auto-import if enabled
        if (autoImport && result.data.csvFile) {
          await handleImport(result.data.csvFile, result.data.jsonFile, request.id);
        }
      } else {
        // Update with error
        setRequests(requests.map(r =>
          r.id === request.id ? {
            ...r,
            status: 'failed' as const,
            error: result.error || result.message,
            completedAt: new Date().toISOString(),
          } : r
        ));
      }
    } catch (error) {
      setRequests(requests.map(r =>
        r.id === request.id ? {
          ...r,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date().toISOString(),
        } : r
      ));
    }
  };

  const handleImport = async (csvFile: string, jsonFile: string, requestId: string) => {
    try {
      const response = await fetch('/api/admin/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvFile, jsonFile })
      });

      const result = await response.json();

      if (!result.success) {
        // Update request to show import failed
        setRequests(requests.map(r =>
          r.id === requestId ? {
            ...r,
            error: `Import failed: ${result.error || result.message}`
          } : r
        ));
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const runAllPending = async () => {
    const pending = requests.filter(r => r.status === 'pending');

    setIsLoading(true);
    for (const request of pending) {
      await runRequest(request);
      // Add delay between scrapes to be nice to Athletic.net
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    setIsLoading(false);
  };

  const clearCompleted = () => {
    setRequests(requests.filter(r => r.status !== 'completed'));
  };

  const getStatusIcon = (status: ScrapeRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const failedCount = requests.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Add Request Form */}
      <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <Plus className="w-6 h-6 mr-2" />
          Add Scrape Request
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* School ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              School ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="e.g., 1076"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* School Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              School Name (Optional)
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g., Westmont HS"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Start Year */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value))}
              min="2010"
              max={new Date().getFullYear()}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Year */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(parseInt(e.target.value))}
              min="2010"
              max={new Date().getFullYear()}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Auto Import Toggle */}
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoImport}
                onChange={(e) => setAutoImport(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Auto-import after scraping</span>
            </label>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={addCurrentSeason}
              disabled={!schoolId}
              className="bg-blue-800/50 hover:bg-blue-700/50 disabled:bg-gray-800 disabled:text-gray-600 text-blue-200 px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
            >
              <Calendar className="w-4 h-4" />
              <span>Current Season</span>
            </button>

            <button
              onClick={addLast4Years}
              disabled={!schoolId}
              className="bg-green-800/50 hover:bg-green-700/50 disabled:bg-gray-800 disabled:text-gray-600 text-green-200 px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Last 4 Years</span>
            </button>

            <button
              onClick={addLast10Years}
              disabled={!schoolId}
              className="bg-purple-800/50 hover:bg-purple-700/50 disabled:bg-gray-800 disabled:text-gray-600 text-purple-200 px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Last 10 Years</span>
            </button>

            <button
              onClick={addAllAvailable}
              disabled={!schoolId}
              className="bg-orange-800/50 hover:bg-orange-700/50 disabled:bg-gray-800 disabled:text-gray-600 text-orange-200 px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-1"
            >
              <Zap className="w-4 h-4" />
              <span>All Available</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Click a quick action to add common year ranges to the queue
          </p>
        </div>

        {/* Manual Add Button */}
        <button
          onClick={() => addRequests()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Custom Range to Queue</span>
        </button>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm">Pending</div>
          <div className="text-3xl font-bold text-blue-400">{pendingCount}</div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm">Completed</div>
          <div className="text-3xl font-bold text-green-400">{completedCount}</div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
          <div className="text-gray-400 text-sm">Failed</div>
          <div className="text-3xl font-bold text-red-400">{failedCount}</div>
        </div>
      </div>

      {/* Queue Controls */}
      {requests.length > 0 && (
        <div className="flex space-x-4">
          <button
            onClick={runAllPending}
            disabled={isLoading || pendingCount === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Queue...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Run All Pending ({pendingCount})</span>
              </>
            )}
          </button>

          <button
            onClick={clearCompleted}
            disabled={completedCount === 0}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-5 h-5" />
            <span>Clear Completed</span>
          </button>
        </div>
      )}

      {/* Request List */}
      {requests.length > 0 && (
        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Request Queue</h3>

          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {getStatusIcon(request.status)}

                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {request.schoolName || `School ${request.schoolId}`} - {request.season}
                    </div>
                    <div className="text-sm text-gray-400">
                      {request.status === 'completed' && request.stats && (
                        <span>
                          {request.stats.newMeets} new meets, {request.stats.totalResults} results
                        </span>
                      )}
                      {request.status === 'failed' && request.error && (
                        <span className="text-red-400">{request.error}</span>
                      )}
                      {request.status === 'pending' && (
                        <span>Waiting to run...</span>
                      )}
                      {request.status === 'running' && (
                        <span>Scraping in progress...</span>
                      )}
                    </div>
                  </div>

                  {request.status === 'completed' && request.files && (
                    <div className="flex space-x-2">
                      <a
                        href={`/api/admin/download?file=${request.files.csvFile}`}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>CSV</span>
                      </a>
                      <a
                        href={`/api/admin/download?file=${request.files.jsonFile}`}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>JSON</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => runRequest(request)}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm flex items-center space-x-1"
                    >
                      <Play className="w-4 h-4" />
                      <span>Run</span>
                    </button>
                  )}

                  <button
                    onClick={() => removeRequest(request.id)}
                    disabled={request.status === 'running'}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="bg-gray-900/50 p-12 rounded-lg border border-gray-700 text-center">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No scrape requests yet</h3>
          <p className="text-gray-500">Add a school and season range to get started</p>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-300 mb-2">How to use:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
          <li>Enter the Athletic.net School ID (find it in the school&apos;s URL)</li>
          <li>Optionally add a school name for easier identification</li>
          <li>Set the year range (e.g., 2022-2025 to scrape 4 seasons)</li>
          <li>Choose whether to auto-import data after scraping</li>
          <li>Click &quot;Add to Queue&quot; - multiple requests will be created (one per year)</li>
          <li>Click &quot;Run All Pending&quot; to process the entire queue</li>
          <li>The system will automatically skip duplicate meets</li>
        </ol>
      </div>
    </div>
  );
}
