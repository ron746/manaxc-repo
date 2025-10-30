"use client";
import { useState } from "react";
import Link from "next/link";

type BatchOperation = {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  estimatedDuration: string;
  icon: string;
};

type BatchLog = {
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
};

const BATCH_OPERATIONS: BatchOperation[] = [
  {
    id: "normalized-times",
    name: "Rebuild Normalized Times",
    description: "Recalculate normalized times for all results based on course difficulty ratings (only NULL/0 values)",
    endpoint: "/api/admin/batch/rebuild-normalized-times",
    estimatedDuration: "1-2 minutes",
    icon: "⏱️"
  },
  {
    id: "force-normalized-times",
    name: "Force Recalculate All Normalized Times",
    description: "Force recalculate ALL normalized times (use when course difficulty ratings change)",
    endpoint: "/api/admin/batch/force-recalculate-normalized-times",
    estimatedDuration: "3-5 minutes",
    icon: "🔄"
  },
  {
    id: "athlete-best-times",
    name: "Rebuild Athlete Best Times",
    description: "Recalculate season-best and all-time-best times for all athletes",
    endpoint: "/api/admin/batch/rebuild-athlete-best-times",
    estimatedDuration: "2-3 minutes",
    icon: "🏃"
  },
  {
    id: "course-records",
    name: "Rebuild Course Records",
    description: "Rebuild top 100 leaderboards for each course (by gender)",
    endpoint: "/api/admin/batch/rebuild-course-records",
    estimatedDuration: "1-2 minutes",
    icon: "🏆"
  },
  {
    id: "school-hall-of-fame",
    name: "Rebuild School Hall of Fame",
    description: "Rebuild top 100 athletes for each school (by gender, based on normalized times)",
    endpoint: "/api/admin/batch/rebuild-school-hall-of-fame",
    estimatedDuration: "1-2 minutes",
    icon: "🏫"
  },
  {
    id: "school-course-records",
    name: "Rebuild School Course Records",
    description: "Rebuild best times per grade level for each school/course combination",
    endpoint: "/api/admin/batch/rebuild-school-course-records",
    estimatedDuration: "2-3 minutes",
    icon: "📊"
  },
  {
    id: "find-duplicates",
    name: "Find Duplicate Results",
    description: "Detect athletes with multiple results in the same race (very rare, review in admin)",
    endpoint: "/api/admin/batch/find-duplicates",
    estimatedDuration: "<1 minute",
    icon: "🔍"
  },
  {
    id: "recalculate-meet-counts",
    name: "Recalculate Meet Result Counts",
    description: "Update cached result counts for all meets (run after bulk imports)",
    endpoint: "/api/admin/batch/recalculate-meet-counts",
    estimatedDuration: "<1 minute",
    icon: "🔢"
  },
  {
    id: "rebuild-all",
    name: "Run All Batch Operations",
    description: "Execute all batch rebuild operations in sequence (skips force recalculate - use that separately when needed)",
    endpoint: "/api/admin/batch/rebuild-all",
    estimatedDuration: "5-10 minutes",
    icon: "🚀"
  }
];

export default function BatchPage() {
  const [logs, setLogs] = useState<BatchLog[]>([]);
  const [runningOperations, setRunningOperations] = useState<Set<string>>(new Set());

  const addLog = (type: BatchLog["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), type, message },
    ]);
  };

  const runBatchOperation = async (operation: BatchOperation) => {
    if (runningOperations.has(operation.id)) {
      addLog("warning", `${operation.name} is already running`);
      return;
    }

    setRunningOperations((prev) => new Set(prev).add(operation.id));
    addLog("info", `Starting ${operation.name}...`);
    addLog("info", `Estimated duration: ${operation.estimatedDuration}`);

    try {
      const response = await fetch(operation.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        addLog("success", `✓ ${operation.name} completed successfully`);

        // Log specific results based on operation
        if (data.results) {
          // For "rebuild all" operation
          addLog("info", `  - Normalized times: ${data.results.normalizedTimes} updated`);
          addLog("info", `  - Athlete best times: ${data.results.athleteBestTimes} records`);
          addLog("info", `  - Course records: ${data.results.courseRecords} records`);
          addLog("info", `  - School hall of fame: ${data.results.schoolHallOfFame} records`);
          addLog("info", `  - School course records: ${data.results.schoolCourseRecords} records`);
        } else if (data.updatedCount !== undefined) {
          addLog("info", `  Updated ${data.updatedCount} records`);
        } else if (data.count !== undefined) {
          addLog("info", `  Processed ${data.count} records`);
        }
      } else {
        addLog("error", `✗ ${operation.name} failed: ${data.error}`);
      }
    } catch (error: any) {
      addLog("error", `✗ Error running ${operation.name}: ${error.message}`);
    } finally {
      setRunningOperations((prev) => {
        const next = new Set(prev);
        next.delete(operation.id);
        return next;
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/import"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Import
        </Link>
        <h1 className="text-3xl font-bold mb-2">Batch Operations</h1>
        <p className="text-gray-600">
          Run batch operations to rebuild derived tables and recalculate statistics.
          These operations should be run after bulk imports or when data inconsistencies are detected.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">When to Run Batch Operations</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>After bulk importing results (with triggers disabled)</li>
                <li>After updating course difficulty ratings</li>
                <li>When best times or leaderboards appear incorrect</li>
                <li>As part of scheduled maintenance (nightly/weekly)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {BATCH_OPERATIONS.map((operation) => {
          const isRunning = runningOperations.has(operation.id);
          const isRunAll = operation.id === "rebuild-all";

          return (
            <div
              key={operation.id}
              className={`border rounded-lg p-6 ${
                isRunAll
                  ? "border-purple-300 bg-purple-50"
                  : "border-gray-200 bg-white"
              } ${isRunning ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{operation.icon}</span>
                  <h3 className="text-lg font-semibold">{operation.name}</h3>
                </div>
                {isRunning && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-4">
                {operation.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  ~{operation.estimatedDuration}
                </span>
                <button
                  onClick={() => runBatchOperation(operation)}
                  disabled={isRunning || runningOperations.size > 0}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    isRunAll
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                >
                  {isRunning ? "Running..." : "Run"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs Section */}
      <div className="bg-white border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Operation Logs</h2>
          <button
            onClick={clearLogs}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Logs
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-400">No operations run yet. Click "Run" on any operation above to start.</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`flex gap-2 ${
                  log.type === "error"
                    ? "text-red-600"
                    : log.type === "success"
                    ? "text-green-600"
                    : log.type === "warning"
                    ? "text-yellow-600"
                    : "text-gray-700"
                }`}
              >
                <span className="text-gray-400">[{log.timestamp}]</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scheduling Info */}
      <div className="mt-8 bg-gray-50 border rounded-lg p-6">
        <h3 className="font-semibold mb-3">Automated Scheduling</h3>
        <p className="text-sm text-gray-600 mb-4">
          Batch operations can be scheduled to run automatically via Vercel Cron Jobs or other scheduling services.
        </p>
        <div className="bg-white border rounded p-4 font-mono text-xs">
          <div className="text-gray-500 mb-2"># Example Vercel cron configuration (vercel.json):</div>
          <pre className="text-gray-800">{`{
  "crons": [{
    "path": "/api/admin/batch/rebuild-all",
    "schedule": "0 2 * * *"
  }]
}`}</pre>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          This example runs all batch operations daily at 2:00 AM UTC
        </p>
      </div>
    </div>
  );
}
