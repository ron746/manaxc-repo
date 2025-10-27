// components/performances/PerformanceTable.tsx
'use client';

import { TrendingUp } from 'lucide-react';

interface Performance {
  athlete_id: number;
  first_name: string;
  last_name: string;
  school_name: string;
  best_xc_time_cs: number;
  race_name?: string;
  course_name?: string;
  meet_date?: string;
}

interface PerformanceTableProps {
  data: Performance[];
  gender: 'M' | 'F';
}

// Convert centiseconds to MM:SS.CC format
const formatTime = (centiseconds: number): string => {
  if (!centiseconds || centiseconds <= 0) return '--:--';

  const totalSeconds = Math.floor(centiseconds / 100);
  const cs = centiseconds % 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
};

export default function PerformanceTable({ data, gender: _gender }: PerformanceTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-lg">No performances found</p>
        <p className="text-sm mt-2">Import race data to see rankings</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-gender={_gender}>
      <table className="w-full">
        <thead className="bg-gray-100 border-b-2 border-gray-300">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Athlete
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              School
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((perf, index) => (
            <tr
              key={perf.athlete_id}
              className={`hover:bg-gray-50 transition-colors ${
                index < 3 ? 'bg-yellow-50' : ''
              }`}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                  {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                  {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                  <span className="text-sm font-medium text-gray-900">
                    {index + 1}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">
                  {perf.first_name} {perf.last_name}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-700">{perf.school_name}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-bold text-gray-900 flex items-center">
                  {formatTime(perf.best_xc_time_cs)}
                  {index < 10 && (
                    <TrendingUp className="w-3 h-3 ml-1 text-green-500" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
