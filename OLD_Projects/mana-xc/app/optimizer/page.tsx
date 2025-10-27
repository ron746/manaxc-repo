// app/optimizer/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Trophy, Users, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/time-utils';

// NOTE: Mock Data for initial state and selection options
const MOCK_SCHOOL_ID = 'school-westmont';
const MOCK_RACE_ID = 'race-woodward';
const MOCK_PREDICTION_DATE = new Date().toISOString().split('T')[0];

const MOCK_ATHLETES_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']; // Full Roster

// Mock Roster Data for Display (Actual data comes from API endpoint)
const MOCK_PREDICTED_ROSTER = [
    { athlete_name: "Ethan Smith", predicted_time_cs: 86500, rua_time_cs: 86000, rank: 1 },
    { athlete_name: "Liam Jones", predicted_time_cs: 89000, rua_time_cs: 87500, rank: 2 },
    { athlete_name: "Caleb Green", predicted_time_cs: 90000, rua_time_cs: 88500, rank: 3 },
    { athlete_name: "Mia Chang", predicted_time_cs: 91000, rua_time_cs: 90000, rank: 4 },
    { athlete_name: "Noah Brown", predicted_time_cs: 92000, rua_time_cs: 90500, rank: 5 },
    { athlete_name: "Ava Miller", predicted_time_cs: 93500, rua_time_cs: 92000, rank: 6 },
    { athlete_name: "Ryan White", predicted_time_cs: 95000, rua_time_cs: 93000, rank: 7 },
];

// const MOCK_SCORING_ROSTER = MOCK_PREDICTED_ROSTER.slice(0, 5);

export default function TeamOptimizerPage() {
    const [loading, setLoading] = useState(false);
    const [fullPredictedRoster, setFullPredictedRoster] = useState<Array<Record<string, unknown>>>([]);
    const [teamTotalTime, setTeamTotalTime] = useState(0);
    const [raceName] = useState("Woodward Park State Meet");
    const [error, setError] = useState('');

    const formatTeamTime = (cs: number) => {
        const totalSeconds = cs / 100;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(2);
        return `${minutes} min ${seconds} sec`;
    };

    const handleRunOptimizer = async () => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/api/team-optimizer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: MOCK_SCHOOL_ID,
                    targetRaceId: MOCK_RACE_ID,
                    rosterIds: MOCK_ATHLETES_IDS,
                    predictionDate: MOCK_PREDICTION_DATE,
                }),
            });
            
            const result = await response.json();

            if (response.ok && result.success) {
                // Assuming the API returns the sorted/scored data
                setFullPredictedRoster(result.full_roster.map((r: unknown, index: number) => ({...(r as Record<string, unknown>), rank: index + 1})));
                setTeamTotalTime(result.team_total_time_cs || 0);
            } else {
                setError(`Optimization Failed: ${result.details || result.error}`);
                // Fallback to mock data to show functionality if API fails in testing
                setFullPredictedRoster(MOCK_PREDICTED_ROSTER);
                setTeamTotalTime(MOCK_PREDICTED_ROSTER.slice(0, 5).reduce((sum, r) => sum + r.predicted_time_cs, 0));
            }
        } catch (err) {
            console.error(err);
            setError('Network error running team optimizer.');
            setFullPredictedRoster(MOCK_PREDICTED_ROSTER);
            setTeamTotalTime(MOCK_PREDICTED_ROSTER.slice(0, 5).reduce((sum, r) => sum + r.predicted_time_cs, 0));
        } finally {
            setLoading(false);
        }
    };
    
    // Initial run on mount
    useEffect(() => { handleRunOptimizer(); }, []);

    const scoringRoster = fullPredictedRoster.slice(0, 5);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-6 md:p-12">
            <header className="mb-8 max-w-5xl mx-auto">
                <h1 className="text-5xl font-extrabold text-white flex items-center">
                    <Trophy className="w-8 h-8 mr-4 text-mana-green-500" />
                    Team Optimizer & Scoring
                </h1>
                <p className="text-xl text-mana-blue-400 mt-2">
                    Phase 2: Strategic tool for coaches. Simulates team score and ranks the optimal varsity lineup using predictive analytics.
                </p>
                <Separator className="bg-gray-700 mt-4" />
            </header>

            <main className="max-w-5xl mx-auto space-y-8">
                
                {/* Optimizer Controls */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-2xl space-y-4">
                    <h2 className="text-xl font-semibold text-mana-green-400 flex items-center"><Users className="w-5 h-5 mr-2" /> Current Scenario</h2>
                    <p className="text-gray-400">School: <strong>Westmont HS Boys Varsity</strong></p>
                    <p className="text-gray-400">Target Race: <strong>{raceName}</strong></p>

                    <Button 
                        onClick={handleRunOptimizer} 
                        disabled={loading}
                        className="w-full bg-mana-blue-500 hover:bg-mana-blue-600 text-white font-bold"
                    >
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulating Race...</> : <><Zap className="w-4 h-4 mr-2" /> Re-Run Team Prediction</>}
                    </Button>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>

                {/* Output Panel: Team Score Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-l-4 border-mana-green-500 col-span-2">
                        <h2 className="text-2xl font-bold text-white mb-2">Predicted Team Total Time</h2>
                        <div className="text-6xl font-mono text-mana-green-400">
                            {formatTeamTime(teamTotalTime)}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">Sum of the top 5 predicted XC times.</p>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-lg shadow-2xl border-l-4 border-yellow-500 flex flex-col justify-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Predicted Score</h2>
                        <div className="text-5xl font-mono text-yellow-400">
                            ~50 Points
                        </div>
                        <p className="text-sm text-gray-400 mt-2">Estimated placement against a pre-selected field.</p>
                    </div>
                </div>

                {/* Scoring Roster Table */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center"><Users className="w-6 h-6 mr-2" /> Optimal Scoring Lineup</h2>
                    <table className="min-w-full text-white">
                        <thead>
                            <tr className="border-b border-gray-700 text-left text-gray-400 text-sm">
                                <th className="p-2">Rank</th>
                                <th className="p-2">Athlete</th>
                                <th className="p-2">Predicted Time</th>
                                <th className="p-2">RUA PR</th>
                            </tr>
                        </thead>
                        <tbody>
                    {scoringRoster.map((runnerRaw) => {
                            const runner = runnerRaw as { athlete_name?: string; predicted_time_cs?: number; rua_time_cs?: number; rank?: number };
                                return (
                                <tr key={runner.athlete_name} className="border-b border-gray-700 hover:bg-gray-700">
                                    <td className="p-2 font-bold">{runner.rank}</td>
                                    <td className="p-2">{runner.athlete_name}</td>
                                    <td className="p-2 font-mono text-mana-green-400">{formatTime(Number(runner.predicted_time_cs))}</td>
                                    <td className="p-2 font-mono text-gray-400">{formatTime(Number(runner.rua_time_cs))}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className='text-sm text-gray-500 pt-4'>
                        *Total Roster Size: {fullPredictedRoster.length} runners analyzed. Non-scoring runners are not shown.
                    </p>
                </div>
            </main>
        </div>
    );
}