// app/schools/[id]/all-results/page.tsx
import { Separator } from '@/components/ui/separator';
import { List, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RosterTable from '@/components/schools/RosterTable'; 
// import RosterTable from '@/components/schools/RosterTable'; 
// import { formatTime } from '@/lib/utils/time-format';

// NOTE: Mock fetch for demo. In final, this fetches data from /api/school-roster
const fetchRoster = async (schoolId: string, gender: string) => {
    // Mock Data based on the SQL function output
    const mockRoster = [
        { athlete_id: 'a1', athlete_name: 'Ethan Smith', gender_char: 'M', graduation_year: 2026, best_xc_time_cs: 86500, total_races: 12 },
        { athlete_id: 'a2', athlete_name: 'Liam Jones', gender_char: 'M', graduation_year: 2027, best_xc_time_cs: 89000, total_races: 9 },
        { athlete_id: 'a3', athlete_name: 'Mia Chang', gender_char: 'F', graduation_year: 2026, best_xc_time_cs: 105000, total_races: 15 },
        { athlete_id: 'a4', athlete_name: 'Noah Brown', gender_char: 'M', graduation_year: 2028, best_xc_time_cs: 92000, total_races: 5 },
        { athlete_id: 'a5', athlete_name: 'Sophie Clark', gender_char: 'F', graduation_year: 2027, best_xc_time_cs: 108500, total_races: 7 },
    ];
    
    // Simple filter for the mock data
    if (gender !== 'All') {
        return mockRoster.filter(r => r.gender_char === gender);
    }
    return mockRoster;
};

export default async function AllResultsPage({ params, searchParams }: { params: { id: string }, searchParams: { gender: string } }) {
    const schoolId = params.id;
    const currentFilter = searchParams.gender || 'All';
    const schoolName = "Westmont High School"; // Mocked
    
    const roster = await fetchRoster(schoolId, currentFilter);

    const totalAthletes = roster.length;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12">
            <header className="mb-8 max-w-7xl mx-auto">
                <h1 className="text-5xl font-extrabold text-gray-900 flex items-center">
                    <List className="w-8 h-8 mr-4 text-mana-blue-600" />
                    {schoolName} Athlete Roster
                </h1>
                <p className="text-xl text-gray-600 mt-2">
                    Complete list of all recorded athletes, ranked by their normalized XC Time PR.
                </p>
                <Separator className="bg-gray-200 mt-4" />
            </header>

            <main className="max-w-7xl mx-auto space-y-6">
                
                {/* Control Panel / Status */}
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-md border-b border-gray-200">
                    <div className="flex items-center space-x-2 text-gray-700">
                        <User className="w-5 h-5" />
                        <span className="font-semibold">{totalAthletes} Athletes Loaded</span>
                        <span className="text-sm">({currentFilter} Filter)</span>
                    </div>

                    {/* Filter Buttons (App-layer logic handles searchParams updates) */}
                    <div className="flex space-x-2">
                        <Button variant={currentFilter === 'All' ? 'default' : 'outline'} className="bg-gray-700 hover:bg-gray-600 text-white">All</Button>
                        <Button variant={currentFilter === 'M' ? 'default' : 'outline'} className="bg-blue-600 hover:bg-blue-700 text-white">Boys</Button>
                        <Button variant={currentFilter === 'F' ? 'default' : 'outline'} className="bg-pink-600 hover:bg-pink-700 text-white">Girls</Button>
                    </div>
                </div>

                {/* Roster Table */}
                <RosterTable data={roster} />
            </main>
        </div>
    );
}

// NOTE: RosterTable component (to be created) handles the presentation, 
// including rank number and time formatting.