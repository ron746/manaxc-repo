"use client";
import { useState } from "react";

type ImportLog = {
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
};

export default function ImportPage() {
  const [meetUrl, setMeetUrl] = useState("");
  const [isScr aping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [availableImports, setAvailableImports] = useState<string[]>([]);

  const addLog = (type: ImportLog["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), type, message },
    ]);
  };

  const handleScrape = async () => {
    if (!meetUrl) {
      addLog("error", "Please enter a meet URL");
      return;
    }

    // Extract meet ID from URL (e.g., https://www.athletic.net/CrossCountry/meet/265306)
    const meetIdMatch = meetUrl.match(/\/meet\/(\d+)/);
    if (!meetIdMatch) {
      addLog("error", "Invalid meet URL. Please use a URL like: https://www.athletic.net/CrossCountry/meet/265306");
      return;
    }

    const meetId = meetIdMatch[1];
    setIsScraping(true);
    addLog("info", `Starting scrape for meet ${meetId}...`);

    try {
      const response = await fetch("/api/admin/scrape-meet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetId }),
      });

      const data = await response.json();

      if (response.ok) {
        addLog("success", `Scraped ${data.totalResults} results from ${data.totalRaces} races`);
        addLog("info", `Data saved to: ${data.directoryPath}`);

        // Refresh available imports
        await fetchAvailableImports();
      } else {
        addLog("error", `Scraping failed: ${data.error}`);
      }
    } catch (error: any) {
      addLog("error", `Error: ${error.message}`);
    }

    setIsScraping(false);
  };

  const fetchAvailableImports = async () => {
    try {
      const response = await fetch("/api/admin/list-imports");
      const data = await response.json();

      if (response.ok) {
        setAvailableImports(data.imports || []);
      }
    } catch (error) {
      addLog("error", "Failed to fetch available imports");
    }
  };

  const handleImport = async (directoryName: string) => {
    setIsImporting(true);
    addLog("info", `Starting import from ${directoryName}...`);

    try {
      const response = await fetch("/api/admin/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ directoryName }),
      });

      const data = await response.json();

      if (response.ok) {
        addLog("success", `Import complete!`);
        addLog("info", `Imported: ${data.stats.results_inserted} results, ${data.stats.athletes_created} athletes, ${data.stats.schools_created} schools`);

        // Refresh available imports
        await fetchAvailableImports();
      } else {
        addLog("error", `Import failed: ${data.error}`);
      }
    } catch (error: any) {
      addLog("error", `Error: ${error.message}`);
    }

    setIsImporting(false);
  };

  // Fetch available imports on mount
  useState(() => {
    fetchAvailableImports();
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Meet Data Importer</h1>

      {/* Scraping Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">1. Scrape Meet Data</h2>
        <p className="text-gray-400 mb-4">
          Enter an Athletic.net meet URL to scrape race results
        </p>

        <div className="mb-4">
          <label htmlFor="meetUrl" className="block text-white mb-2">
            Meet URL
          </label>
          <input
            type="text"
            id="meetUrl"
            value={meetUrl}
            onChange={(e) => setMeetUrl(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            placeholder="https://www.athletic.net/CrossCountry/meet/265306"
            disabled={isScraping}
          />
        </div>

        <button
          onClick={handleScrape}
          disabled={isScraping}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
        >
          {isScraping ? "Scraping..." : "Scrape Meet"}
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">2. Import Scraped Data</h2>
        <p className="text-gray-400 mb-4">
          Select a scraped meet to import into the database
        </p>

        {availableImports.length === 0 ? (
          <p className="text-gray-500">No scraped meets available for import</p>
        ) : (
          <div className="space-y-2">
            {availableImports.map((dir) => (
              <div
                key={dir}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <span className="text-white">{dir}</span>
                <button
                  onClick={() => handleImport(dir)}
                  disabled={isImporting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded disabled:bg-gray-500 text-sm"
                >
                  {isImporting ? "Importing..." : "Import"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Activity Log</h2>
        <div className="bg-black p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No activity yet</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                    ? "text-green-400"
                    : log.type === "warning"
                    ? "text-yellow-400"
                    : "text-gray-300"
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
