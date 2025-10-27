// app/athletes/[id]/seasons/page.tsx
import { Separator } from '@/components/ui/separator';
import { Clock, Calendar } from 'lucide-react';
import { formatTime } from '@/lib/time-utils';

// Mock function for demo, will call API in final implementation
const fetchSeasonData = async () => {
    // Mock Data based on the SQL function output
    const mockSeasons = [
        { season_year: 2023, grade_level: 10, best_xc_time_cs: 93000, avg_top_3_xc_time_cs: 95500, total_races: 7, previous_best_xc_time_cs: null },
        { season_year: 2024, grade_level: 11, best_xc_time_cs: 89000, avg_top_3_xc_time_cs: 90200, total_races: 9, previous_best_xc_time_cs: 93000 },
        { season_year: 2025, grade_level: 12, best_xc_time_cs: 86500, avg_top_3_xc_time_cs: 87500, total_races: 5, previous_best_xc_time_cs: 89000 },
    ];
    // NOTE: In the real app, use the API route: 
    // const res = await fetch(`/api/athlete-seasons?athleteId=${athleteId}`);
    return mockSeasons;
};

// Application-layer utility to calculate improvement percentage
const calculateImprovement = (current: number, previous: number | null): string => {
    if (previous === null || previous === 0) return 'N/A';
    // (Previous - Current) / Previous * 100 
    const improvement = ((previous - current) / previous) * 100;
    
    // Positive improvement is a faster time (lower number)
    if (improvement > 0) {
        return `-${improvement.toFixed(1)}% Faster`;
    } else if (improvement < 0) {
        return `+${Math.abs(improvement).toFixed(1)}% Slower`;
    }
    return '0.0% No Change';
};

export default async function SeasonsPage() {
    const seasonData = await fetchSeasonData();
    
    // NOTE: Mock athlete details
    const athleteName = "John Smith (Westmont HS)"; 

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12">
            <header className="mb-8 max-w-4xl mx-auto">
                <h1 className="text-5xl font-extrabold text-gray-900 flex items-center">
                    <Calendar className="w-8 h-8 mr-4 text-mana-green-600" />
                    {athleteName} Season History
                </h1>
                <p className="text-xl text-gray-600 mt-2">
                    Year-over-year performance tracking, comparing normalized XC Time PRs and top average times.
                </p>
                <Separator className="bg-gray-200 mt-4" />
            </header>

            <main className="max-w-4xl mx-auto space-y-6">
                {seasonData.map((season) => {
                    const improvementText = calculateImprovement(season.best_xc_time_cs, season.previous_best_xc_time_cs);
                    const isImproving = season.best_xc_time_cs < (season.previous_best_xc_time_cs || Infinity);
                    
                    return (
                        <div 
                            key={season.season_year}
                            className={`p-6 border rounded-lg shadow-md ${isImproving ? 'border-mana-green-300 bg-mana-green-50' : 'border-gray-300 bg-white'}`}
                        >
                            <h2 className="text-3xl font-bold flex items-center justify-between">
                                <span className="text-mana-blue-600">{season.season_year} Season</span>
                                <div className={`text-lg font-semibold px-3 py-1 rounded-full ${isImproving ? 'bg-mana-green-500 text-white' : 'bg-mana-red-500 text-white'}`}>
                                    {improvementText}
                                </div>
                            </h2>
                            <Separator className="my-3 bg-gray-200" />
                            
                            <div className="grid grid-cols-3 gap-4 text-sm font-medium">
                                <div><span className="text-gray-500">Grade Level:</span> <span className="text-gray-900">{season.grade_level}</span></div>
                                <div><span className="text-gray-500">Total Races:</span> <span className="text-gray-900">{season.total_races}</span></div>
                                <div><span className="text-gray-500">Avg. Top 3 XC Time:</span> <span className="text-gray-900">{formatTime(season.avg_top_3_xc_time_cs)}</span></div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                                <span className="font-bold text-yellow-800 flex items-center">
                                    <Clock className="w-4 h-4 mr-2" />
                                        Season XC PR: {formatTime(season.best_xc_time_cs)}
                                </span>
                            </div>

                            {/* NOTE: SeasonCard component would expand this with individual race logs and charts */}
                        </div>
                    );
                })}
            </main>
        </div>
    );
}