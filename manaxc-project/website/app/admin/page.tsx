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
      <h1 className="text-3xl font-bold mb-4">Athletic.net Importer</h1>
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
