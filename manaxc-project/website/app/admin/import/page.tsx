"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type ImportLog = {
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
};

type ScrapeMode = "meet" | "school";

export default function ImportPage() {
  const [scrapeMode, setScrapeMode] = useState<ScrapeMode>("meet");

  // Meet scraping state
  const [meetUrl, setMeetUrl] = useState("");

  // School scraping state
  const [schoolId, setSchoolId] = useState("");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear().toString());

  const [isScraping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [availableImports, setAvailableImports] = useState<string[]>([]);

  const addLog = (type: ImportLog["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), type, message },
    ]);
  };

  const handleScrapeMeet = async () => {
    if (!meetUrl) {
      addLog("error", "Please enter a meet URL or ID");
      return;
    }

    // Extract meet ID from URL or use direct ID
    let meetId = meetUrl;
    const meetIdMatch = meetUrl.match(/\/meet\/(\d+)/);
    if (meetIdMatch) {
      meetId = meetIdMatch[1];
    } else if (!/^\d+$/.test(meetUrl)) {
      addLog("error", "Invalid meet URL or ID. Please use a URL like: https://www.athletic.net/CrossCountry/meet/265306 or just the meet ID like: 265306");
      return;
    }

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

  const handleScrapeSchool = async () => {
    if (!schoolId || !seasonYear) {
      addLog("error", "Please enter both School ID and Season Year");
      return;
    }

    if (!/^\d+$/.test(schoolId)) {
      addLog("error", "School ID must be a number");
      return;
    }

    if (!/^\d{4}$/.test(seasonYear)) {
      addLog("error", "Season year must be a 4-digit year (e.g., 2025)");
      return;
    }

    setIsScraping(true);
    addLog("info", `Starting scrape for school ${schoolId}, season ${seasonYear}...`);
    addLog("warning", "School scraping may take several minutes as it scrapes all meets for the season");

    try {
      const response = await fetch("/api/admin/scrape-school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId, seasonYear: parseInt(seasonYear) }),
      });

      const data = await response.json();

      if (response.ok) {
        addLog("success", `Scraped ${data.totalResults} results from ${data.totalMeets} meets`);
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
  useEffect(() => {
    fetchAvailableImports();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Meet Data Importer</h1>
        <Link
          href="/admin/batch"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
        >
          <span>⚡</span>
          <span>Batch Operations</span>
        </Link>
      </div>

      {/* Scraping Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">1. Scrape Data</h2>

        {/* Mode Toggle */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setScrapeMode("meet")}
              className={`px-4 py-2 rounded font-semibold ${
                scrapeMode === "meet"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Single Meet
            </button>
            <button
              onClick={() => setScrapeMode("school")}
              className={`px-4 py-2 rounded font-semibold ${
                scrapeMode === "school"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              School Season
            </button>
          </div>
        </div>

        {/* Meet Scraping Form */}
        {scrapeMode === "meet" && (
          <div>
            <p className="text-gray-400 mb-4">
              Enter an Athletic.net meet URL or meet ID to scrape race results
            </p>

            <div className="mb-4">
              <label htmlFor="meetUrl" className="block text-white mb-2">
                Meet URL or ID
              </label>
              <input
                type="text"
                id="meetUrl"
                value={meetUrl}
                onChange={(e) => setMeetUrl(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                placeholder="https://www.athletic.net/CrossCountry/meet/265306 or 265306"
                disabled={isScraping}
              />
              <p className="text-gray-500 text-sm mt-1">
                Examples: "265306" or "https://www.athletic.net/CrossCountry/meet/265306"
              </p>
            </div>

            <button
              onClick={handleScrapeMeet}
              disabled={isScraping}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
            >
              {isScraping ? "Scraping..." : "Scrape Meet"}
            </button>
          </div>
        )}

        {/* School Scraping Form */}
        {scrapeMode === "school" && (
          <div>
            <p className="text-gray-400 mb-4">
              Enter a school ID and season to scrape all meets for that school
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="schoolId" className="block text-white mb-2">
                  School ID
                </label>
                <input
                  type="text"
                  id="schoolId"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  placeholder="1082"
                  disabled={isScraping}
                />
                <p className="text-gray-500 text-sm mt-1">
                  Example: "1082" for Silver Creek High School
                </p>
              </div>

              <div>
                <label htmlFor="seasonYear" className="block text-white mb-2">
                  Season Year
                </label>
                <input
                  type="text"
                  id="seasonYear"
                  value={seasonYear}
                  onChange={(e) => setSeasonYear(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                  placeholder="2025"
                  disabled={isScraping}
                />
                <p className="text-gray-500 text-sm mt-1">
                  Example: "2025" for 2025 season
                </p>
              </div>
            </div>

            <button
              onClick={handleScrapeSchool}
              disabled={isScraping}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
            >
              {isScraping ? "Scraping..." : "Scrape School Season"}
            </button>

            <p className="text-yellow-400 text-sm mt-2">
              ⚠️ School scraping may take 5-10 minutes as it scrapes all meets for the season
            </p>
          </div>
        )}
      </div>

      {/* Import Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">2. Import Scraped Data</h2>
        <p className="text-gray-400 mb-4">
          Select a scraped dataset to import into the database
        </p>

        {availableImports.length === 0 ? (
          <p className="text-gray-500">No scraped data available for import</p>
        ) : (
          <div className="space-y-2">
            {availableImports.map((dir) => (
              <div
                key={dir}
                className="flex items-center justify-between bg-gray-700 p-3 rounded"
              >
                <span className="text-white font-mono text-sm">{dir}</span>
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
