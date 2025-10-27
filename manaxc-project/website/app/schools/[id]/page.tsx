
import { getSchoolById } from '@/lib/supabase/queries';
import { School } from 'lucide-react';

type SchoolPageProps = {
  params: {
    id: string;
  };
};

export default async function SchoolPage({ params }: SchoolPageProps) {
  const school = await getSchoolById(params.id);

  if (!school) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900">School not found</h1>
          <p className="text-lg text-zinc-600 mt-2">
            Sorry, we couldn't find the school you're looking for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Hero Section */}
      <section className="bg-zinc-100/50 border-b border-zinc-200">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center border-2 border-dashed border-cyan-200 mr-4">
              <School className="w-8 h-8 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-5xl font-extrabold text-zinc-900 tracking-tight">
                {school.name}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="bg-white rounded-xl shadow-xl border border-zinc-200 p-8">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">School Details</h2>
          {/* Add more details here as they become available, e.g., a list of athletes */}
        </div>
      </main>
    </div>
  );
}
