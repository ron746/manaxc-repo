// app/admin/scrape-requests/page.tsx
import { Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ScrapeRequestManager from '@/components/admin/ScrapeRequestManager';

export default async function ScrapeRequestsPage() {
  // 1. ACCESS CONTROL: Ensure Admin Role
  // NOTE: Auth disabled for local development - re-enable for production!
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();

  // if (!user) {
  //   return redirect('/login');
  // }
  // const { data: profile } = await supabase
  //   .from('user_profiles')
  //   .select('role')
  //   .eq('user_id', user.id)
  //   .single();

  // if (profile?.role !== 'admin') {
  //   return redirect('/403');
  // }

  // 2. ADMIN LAYOUT
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white flex items-center">
          <Calendar className="w-8 h-8 mr-3 text-mana-blue-500" />
          Scrape Request Manager
        </h1>
        <p className="text-xl text-mana-blue-400 mt-2">
          Queue and manage Athletic.net scraping jobs for multiple schools and seasons
        </p>
        <Separator className="bg-gray-700 mt-4" />
      </header>

      {/* 3. CORE MANAGER COMPONENT */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl">
        <ScrapeRequestManager />
      </div>
    </div>
  );
}
