'use client';

import React, { useState } from 'react';
import { Download, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ScrapedMeet {
  meetId: string;
  meetName: string;
  date: string;
  location: string;
  races: Array<{
    raceId: string;
    raceName: string;
    gender: string;
    results: Array<Record<string, unknown>>;
  }>;
}

interface ScrapeResult {
  success: boolean;
  message: string;
  data?: {
    totalMeets: number;
    newMeets: number;
    existingMeets: number;
    totalResults: number;
    csvFile: string;
    jsonFile: string;
    meets: ScrapedMeet[];
  };
  error?: string;
}

export default function AthleticNetScraperDashboard() {
  const [schoolId, setSchoolId] = useState('');
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const handleScrape = async () => {
    if (!schoolId || !season) {
      setResult({
        success: false,
        message: 'Please enter both School ID and Season',
        error: 'Missing required fields'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/scrape-athletic-net', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, season })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Error running scraper',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchImport = async () => {
    if (!result?.data?.csvFile) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvFile: result.data.csvFile,
          jsonFile: result.data.jsonFile
        })
      });

      const importResult = await response.json();
      setResult({
        ...result,
        message: importResult.message || 'Batch import completed'
      });
    } catch (error) {
      setResult({
        ...result,
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scraper Form */}
      <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Scrape Athletic.net</h2>
        <p className="text-gray-400 mb-6">
          Enter a school ID and season to automatically download all race results
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* School ID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              School ID
            </label>
            <input
              type="text"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="e.g., 1076"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Find this in the URL: athletic.net/team/<strong>1076</strong>/cross-country/2025
            </p>
          </div>

          {/* Season Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Season
            </label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="e.g., 2025"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Year of the cross country season
            </p>
          </div>
        </div>

        {/* Scrape Button */}
        <button
          onClick={handleScrape}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Scraping...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Scrape Results</span>
            </>
          )}
        </button>
      </div>

      {/* Results Display */}
      {result && (
        <div className={`p-6 rounded-lg border ${
          result.success
            ? 'bg-green-900/20 border-green-700'
            : 'bg-red-900/20 border-red-700'
        }`}>
          <div className="flex items-start space-x-3 mb-4">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {result.success ? 'Scrape Successful' : 'Scrape Failed'}
              </h3>
              <p className="text-gray-300">{result.message}</p>
              {result.error && (
                <p className="text-red-400 text-sm mt-2">Error: {result.error}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {result.success && result.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 p-3 rounded">
                  <div className="text-gray-400 text-xs">Total Meets</div>
                  <div className="text-2xl font-bold text-white">{result.data.totalMeets}</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded">
                  <div className="text-gray-400 text-xs">New Meets</div>
                  <div className="text-2xl font-bold text-green-400">{result.data.newMeets}</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded">
                  <div className="text-gray-400 text-xs">Existing Meets</div>
                  <div className="text-2xl font-bold text-blue-400">{result.data.existingMeets}</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded">
                  <div className="text-gray-400 text-xs">Total Results</div>
                  <div className="text-2xl font-bold text-white">{result.data.totalResults}</div>
                </div>
              </div>

              {/* Meet Details */}
              <div className="bg-gray-800/50 p-4 rounded">
                <h4 className="font-semibold text-white mb-3">Meet Summary</h4>
                <div className="space-y-2">
                  {result.data.meets.map((meet) => (
                    <div key={meet.meetId} className="text-sm">
                      <span className="text-gray-300">{meet.meetName}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-gray-400">{meet.date}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-gray-500">{meet.races.length} races</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Batch Import Button */}
              <button
                onClick={handleBatchImport}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>Import to Database</span>
              </button>

              {/* File Download Links */}
              <div className="flex space-x-4 text-sm">
                <a
                  href={`/api/admin/download?file=${result.data.csvFile}`}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Download CSV
                </a>
                <a
                  href={`/api/admin/download?file=${result.data.jsonFile}`}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Download JSON
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-300 mb-2">How to use:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
          <li>Find your school&apos;s ID from the Athletic.net URL</li>
          <li>Enter the school ID and season year</li>
          <li>Click &quot;Scrape Results&quot; to download all meet data</li>
          <li>Review the results and click &quot;Import to Database&quot; to add them</li>
          <li>The scraper automatically skips duplicate meets</li>
        </ol>
      </div>
    </div>
  );
}
