// app/admin/duplicate-results/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DuplicateResultsDashboard from '@/components/admin/DuplicateResultsDashboard';
import { DatabaseZap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default async function DuplicateResultsPage() {
  // 1. ACCESS CONTROL: Ensure Admin Role
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return redirect('/403'); 
  }

  // 2. ADMIN LAYOUT
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white flex items-center">
          <DatabaseZap className="w-8 h-8 mr-3 text-mana-red-500" />
          Data Integrity: Duplicate Results
        </h1>
        <p className="text-xl text-mana-blue-400 mt-2">
          CRITICAL Phase 0 Task: Identify and eliminate results where one athlete has multiple times in the same race.
        </p>
        <Separator className="bg-gray-700 mt-4" />
      </header>
      
      {/* 3. CORE DASHBOARD COMPONENT */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
        <DuplicateResultsDashboard />
      </div>
    </div>
  );
}