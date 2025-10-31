"use client";
import { useState } from "react";

export default function AdminPage() {
  const [schoolId, setSchoolId] = useState("");
  const [seasons, setSeasons] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleImport = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schoolId, seasons: seasons.split(",").map(s => s.trim()) }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Import started successfully. Check the server logs for progress.`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("An error occurred while starting the import.");
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4 text-white">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <a
          href="/admin/maintenance"
          className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-cyan-500"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Data Maintenance</h2>
          <p className="text-cyan-100">Update course ratings, merge athletes, and edit results</p>
        </a>

        <a
          href="/admin/import"
          className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-blue-500"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Data Import</h2>
          <p className="text-blue-100">Import data from Athletic.net</p>
        </a>

        <a
          href="/admin/batch"
          className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-purple-500"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Batch Operations</h2>
          <p className="text-purple-100">Rebuild derived tables and run batch updates</p>
        </a>

        <a
          href="/admin/course-analysis"
          className="bg-gradient-to-br from-orange-600 to-orange-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-orange-500"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Course Analysis</h2>
          <p className="text-orange-100">AI-powered difficulty rating recommendations</p>
        </a>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-white">Quick Import</h2>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <label htmlFor="schoolId" className="block text-white mb-2">
            School ID
          </label>
          <input
            type="text"
            id="schoolId"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            placeholder="e.g., 1076"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="seasons" className="block text-white mb-2">
            Seasons (comma-separated)
          </label>
          <input
            type="text"
            id="seasons"
            value={seasons}
            onChange={(e) => setSeasons(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            placeholder="e.g., 2023, 2024"
          />
        </div>
        <button
          onClick={handleImport}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
        >
          {isLoading ? "Importing..." : "Start Import"}
        </button>
        {message && <p className="mt-4 text-white">{message}</p>}
      </div>
    </div>
  );
}
