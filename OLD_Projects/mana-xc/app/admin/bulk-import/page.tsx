// app/admin/bulk-import/page.tsx
'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    meetsImported: number;
    racesImported: number;
    resultsImported: number;
    errors?: string[];
  };
}

export default function BulkImportPage() {
  const [csvFile, setCsvFile] = useState('');
  const [jsonFile, setJsonFile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!csvFile || !jsonFile) {
      setResult({
        success: false,
        message: 'Please enter both CSV and JSON file paths',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvFile, jsonFile })
      });

      const data = await response.json();
      setResult(data);
    } catch (_error) {
      console.error('Bulk import error:', _error);
      setResult({
        success: false,
        message: 'Error during import',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white flex items-center">
          <Upload className="w-8 h-8 mr-3 text-blue-500" />
          Bulk Import Scraped Data
        </h1>
        <p className="text-xl text-blue-400 mt-2">
          Import existing CSV/JSON files from Athletic.net scraper
        </p>
        <Separator className="bg-gray-700 mt-4" />
      </header>

      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CSV File Path
            </label>
            <input
              type="text"
              value={csvFile}
              onChange={(e) => setCsvFile(e.target.value)}
              placeholder="athletic-net-1076-2024.csv"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Relative to project root (e.g., athletic-net-1076-2024.csv)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              JSON File Path
            </label>
            <input
              type="text"
              value={jsonFile}
              onChange={(e) => setJsonFile(e.target.value)}
              placeholder="athletic-net-1076-2024.json"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Relative to project root (e.g., athletic-net-1076-2024.json)
            </p>
          </div>

          <button
            onClick={handleImport}
            disabled={isLoading || !csvFile || !jsonFile}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Import to Database
              </>
            )}
          </button>
        </div>

        {result && (
          <div className={`mt-6 p-4 rounded-md ${result.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 mr-2 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                  {result.message}
                </p>
                {result.data && (
                  <div className="mt-2 text-sm text-gray-300">
                    <p>• Meets Imported: {result.data.meetsImported}</p>
                    <p>• Races Imported: {result.data.racesImported}</p>
                    <p>• Results Imported: {result.data.resultsImported}</p>
                    {result.data.errors && result.data.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-300 font-semibold">Errors:</p>
                        <ul className="list-disc list-inside">
                          {result.data.errors.slice(0, 5).map((err, idx) => (
                            <li key={idx} className="text-xs text-red-200">{err}</li>
                          ))}
                          {result.data.errors.length > 5 && (
                            <li className="text-xs text-red-200">
                              ... and {result.data.errors.length - 5} more errors
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-700 rounded-md">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center mb-2">
            <FileText className="w-4 h-4 mr-2" />
            Available Files
          </h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• athletic-net-1076-2024.csv (2024 season)</p>
            <p>• athletic-net-1076-2024.json</p>
            <p>• athletic-net-1076-2025.csv (2025 season)</p>
            <p>• athletic-net-1076-2025.json</p>
          </div>
        </div>
      </div>
    </div>
  );
}
