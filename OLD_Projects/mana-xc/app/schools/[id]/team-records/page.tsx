// app/schools/[id]/team-records/page.tsx
import { Separator } from '@/components/ui/separator';
import { Users } from 'lucide-react';
import TeamRecordCard from '@/components/schools/TeamRecordCard';

// NOTE: Mock fetch for demo. In final, this fetches data from /api/team-records
const fetchRecords = async () => {
    // Mock Data representing the best Varsity and Frosh/Soph scores
    const records = [
        { 
            gender_char: 'M', team_category: 'Varsity', meet_name: 'CCS Championships', total_time_cs: 450300, meet_date: '2025-11-16', 
            top_5_results: [
                {athlete_name: "Ethan Smith", time_cs: 89000},
                {athlete_name: "Liam Jones", time_cs: 89500},
                {athlete_name: "Noah Brown", time_cs: 90000},
                {athlete_name: "Caleb Green", time_cs: 90800},
                {athlete_name: "Ryan White", time_cs: 91000},
            ]
        },
        { 
            gender_char: 'F', team_category: 'Varsity', meet_name: 'Stanford Invitational', total_time_cs: 601000, meet_date: '2025-09-28', 
            top_5_results: [
                {athlete_name: "Mia Chang", time_cs: 119000},
                {athlete_name: "Olivia Lee", time_cs: 120000},
                {athlete_name: "Ava Perez", time_cs: 120500},
                {athlete_name: "Sophie Clark", time_cs: 120700},
                {athlete_name: "Chloe King", time_cs: 120800},
            ]
        },
        // Frosh/Soph records would follow
    ];
    return records;
};

export default async function TeamRecordsPage({ params: _params }: { params: { id: string } }) {
    // NOTE: In a real app, fetch school name via schoolId (params.id)
    const schoolName = "Westmont High School"; 
    const records = await fetchRecords();

    // Helper to sum the top 5 times for display total
    const getFormattedTotal = (time_cs: number) => {
        const totalSeconds = time_cs / 100;
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalSecs = (totalSeconds % 60).toFixed(2);
        return `${totalMinutes} min ${totalSecs} sec`;
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12">
            <header className="mb-8 max-w-7xl mx-auto">
                <h1 className="text-5xl font-extrabold text-gray-900 flex items-center">
                    <Users className="w-8 h-8 mr-4 text-mana-green-600" />
                    {schoolName} Team Records
                </h1>
                <p className="text-xl text-gray-600 mt-2">
                    Historical best team times based on top five runners on a single race day. Critical for coach planning.
                </p>
                <Separator className="bg-gray-200 mt-4" />
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                {/* Find Boys Varsity Record */}
                <TeamRecordCard 
                    title="Boys Varsity Team Record" 
                    color="blue" 
                    record={records.find(r => r.gender_char === 'M' && r.team_category === 'Varsity')}
                    getFormattedTotal={getFormattedTotal}
                />

                {/* Find Girls Varsity Record */}
                <TeamRecordCard 
                    title="Girls Varsity Team Record" 
                    color="pink" 
                    record={records.find(r => r.gender_char === 'F' && r.team_category === 'Varsity')}
                    getFormattedTotal={getFormattedTotal}
                />

                {/* Find Boys Frosh/Soph Record (Placeholder) */}
                <TeamRecordCard 
                    title="Boys Frosh/Soph Team Record" 
                    color="blue" 
                    record={records.find(r => r.gender_char === 'M' && r.team_category === 'Frosh/Soph')}
                    getFormattedTotal={getFormattedTotal}
                />

                {/* Find Girls Frosh/Soph Record (Placeholder) */}
                <TeamRecordCard 
                    title="Girls Frosh/Soph Team Record" 
                    color="pink" 
                    record={records.find(r => r.gender_char === 'F' && r.team_category === 'Frosh/Soph')}
                    getFormattedTotal={getFormattedTotal}
                />
            </main>
        </div>
    );
}

// NOTE: TeamRecordCard component (to be created) handles the presentation.
              <h4 className="font-bold mb-2">What is &quot;XC Time&quot;?</h4>