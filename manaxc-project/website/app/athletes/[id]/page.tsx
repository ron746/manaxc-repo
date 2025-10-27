
import { getAthleteById } from '@/lib/supabase/queries';
import { User, Calendar } from 'lucide-react';

type AthletePageProps = {
  params: {
    id: string;
  };
};

export default async function AthletePage({ params }: AthletePageProps) {
  const athlete = await getAthleteById(params.id);

  if (!athlete) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Athlete not found</h1>
          <p className="text-lg text-zinc-600 mt-2">
            Sorry, we couldn't find the athlete you're looking for.
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
              <User className="w-8 h-8 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-5xl font-extrabold text-zinc-900 tracking-tight">
                {athlete.first_name} {athlete.last_name}
              </h1>
              <div className="mt-2 flex items-center text-zinc-600">
                <Calendar className="w-5 h-5 mr-2" />
                <span className="text-lg">Class of {athlete.graduation_year}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="bg-white rounded-xl shadow-xl border border-zinc-200 p-8">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Athlete Details</h2>
          {/* Add more details here as they become available */}
        </div>
      </main>
    </div>
  );
}
