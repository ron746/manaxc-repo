// app/top-performances/page.tsx
import { Separator } from '@/components/ui/separator';
import { Zap, ChevronDown } from 'lucide-react';
import PerformanceTable from '@/components/performances/PerformanceTable';

// Utility to fetch data (simulated server component fetch)
const fetchPerformances = async (gender: 'M' | 'F') => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/top-performances?gender=${gender}&limit=50`, {
        cache: 'no-store' // Always fetch fresh data for leaderboards
    });
    if (!res.ok) {
        // Handle error gracefully
        console.error(`Failed to fetch ${gender} performances`);
        return [];
    }
    const data = await res.json();
    return data.performances;
};

export default async function TopPerformancesPage() {
    // Fetch both datasets concurrently for fast loading
    const [boysData, girlsData] = await Promise.all([
        fetchPerformances('M'),
        fetchPerformances('F'),
    ]);
    
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12">
            <header className="mb-8 max-w-4xl mx-auto">
                <h1 className="text-5xl font-extrabold text-gray-900 flex items-center">
                    <Zap className="w-8 h-8 mr-4 text-mana-green-600" />
                    Top Performances (All-Time)
                </h1>
                <p className="text-xl text-gray-600 mt-2">
                    The normalized cross country rankings. All times are adjusted to the **1-Mile Track Equivalent Factor** for universal comparison.
                </p>
                <Separator className="bg-gray-200 mt-4" />
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                
                {/* BOYS RANKINGS */}
                <div className="bg-white shadow-xl rounded-xl overflow-hidden border-t-4 border-blue-600">
                    <div className="p-4 bg-blue-50 text-blue-800 font-bold text-lg flex justify-between items-center">
                        <span>Boys Rankings 🥇</span>
                        <span className="text-sm flex items-center">
                            Filter <ChevronDown className="w-4 h-4 ml-1" />
                        </span>
                    </div>
                    {/* Component to render the actual table */}
                    <PerformanceTable data={boysData} gender="M" /> 
                </div>

                {/* GIRLS RANKINGS */}
                <div className="bg-white shadow-xl rounded-xl overflow-hidden border-t-4 border-pink-600">
                    <div className="p-4 bg-pink-50 text-pink-800 font-bold text-lg flex justify-between items-center">
                        <span>Girls Rankings 🥇</span>
                        <span className="text-sm flex items-center">
                            Filter <ChevronDown className="w-4 h-4 ml-1" />
                        </span>
                    </div>
                    {/* Component to render the actual table */}
                    <PerformanceTable data={girlsData} gender="F" />
                </div>
            </main>
        </div>
    );
}

// NOTE: The PerformanceTable component needs to be created to handle rendering, 
// including time formatting (dividing time_cs by 100).