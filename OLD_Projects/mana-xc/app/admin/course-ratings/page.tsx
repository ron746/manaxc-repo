// app/admin/course-ratings/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import RatingAnalysisDashboard from '@/components/admin/RatingAnalysisDashboard';

export default async function CourseRatingsPage() {
  // ACCESS CONTROL: Ensure Admin Role
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || (await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()).data?.role !== 'admin') {
    return redirect('/403'); 
  }
  
  // NOTE: You would fetch the list of all Races here to populate a master list/dropdown
  // For now, we pass a dummy list of races for testing
  const races = [
    { id: 'race-uuid-1', name: 'WCAL Varsity Boys 5K', current_rating: 1.050, course_name: 'Crystal Springs' },
    { id: 'race-uuid-2', name: 'Lynbrook Frosh Girls 2M', current_rating: 0.985, course_name: 'Lynbrook HS' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white flex items-center">
          <TrendingUp className="w-8 h-8 mr-3 text-mana-green-500" />
          Data Integrity: Course Rating Accuracy Test
        </h1>
        <p className="text-xl text-mana-blue-400 mt-2">
          Phase 0, Feature 4: AI-driven statistical validation of $\text{XC}$ Time Rating (1-Mile Track Equivalent Factor).
        </p>
        <Separator className="bg-gray-700 mt-4" />
      </header>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
        <RatingAnalysisDashboard initialRaces={races} /> 
      </div>
    </div>
  );
}