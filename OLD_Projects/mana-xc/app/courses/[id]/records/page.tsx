// app/courses/[id]/records/page.tsx
import { Separator } from '@/components/ui/separator';
import { Trophy, ChevronDown, Map } from 'lucide-react';
import RecordsDisplay from '@/components/courses/RecordsDisplay'; 

// NOTE: Fetch function for initial Course List (simulated)
const fetchCourseDetails = async (id: string) => {
    // In reality, this fetches course details and all records for that ID
    const courseData = {
        name: "Crystal Springs Course",
        city: "Belmont",
        state: "CA",
        id: id,
        // Mock the records fetch here for component to use
        records: await (await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/course-records?courseId=${id}`, { cache: 'no-store' })).json().then(res => res.records || []),
    };
    return courseData;
};

export default async function CourseRecordsPage({ params }: { params: { id: string } }) {
    const courseDetails = await fetchCourseDetails(params.id);
    const { records, name } = courseDetails;

    // Filter records into Boys (M) and Girls (F) groups
    // Data comes from external API; narrow with local any to avoid heavier typing churn.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const boysRecords = records.filter((r: any) => r.gender_char === 'M');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const girlsRecords = records.filter((r: any) => r.gender_char === 'F');

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12">
            <header className="mb-8 max-w-7xl mx-auto">
                <h1 className="text-5xl font-extrabold text-gray-900 flex items-center">
                    <Map className="w-8 h-8 mr-4 text-mana-blue-600" />
                    {name} Records
                </h1>
                <p className="text-xl text-gray-600 mt-2">
                    Official course records tracked by grade level. All times are **raw, unadjusted** performance times.
                </p>
                <div className="mt-4 flex items-center space-x-4">
                    <span className="text-sm text-gray-700 font-medium">Viewing Course:</span>
                    {/* Course Selector Dropdown (Future Feature) */}
                    <div className="bg-white border border-gray-300 rounded-lg p-2 flex items-center space-x-2 cursor-pointer hover:bg-gray-100">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className="font-semibold">{name}</span>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
                <Separator className="bg-gray-200 mt-4" />
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                
                {/* BOYS RECORDS */}
                <RecordsDisplay 
                    title="Boys Course Records" 
                    color="blue" 
                    records={boysRecords}
                />

                {/* GIRLS RECORDS */}
                <RecordsDisplay 
                    title="Girls Course Records" 
                    color="pink" 
                    records={girlsRecords}
                />
            </main>
        </div>
    );
}

// NOTE: The RecordsDisplay component (to be created) handles the presentation of the 10 categories.