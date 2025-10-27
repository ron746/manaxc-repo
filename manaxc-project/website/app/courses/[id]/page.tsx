
import { getCourseById } from '@/lib/supabase/queries';
import { MapPin, TrendingUp, Globe } from 'lucide-react';

type CoursePageProps = {
  params: {
    id: string;
  };
};

export default async function CoursePage({ params }: CoursePageProps) {
  const course = await getCourseById(params.id);

  if (!course) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Course not found</h1>
          <p className="text-lg text-zinc-600 mt-2">
            Sorry, we couldn't find the course you're looking for.
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
              <Globe className="w-8 h-8 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-5xl font-extrabold text-zinc-900 tracking-tight">
                {course.name}
              </h1>
              <div className="mt-2 flex items-center text-zinc-600">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="text-lg">{course.location || 'Location not available'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="bg-white rounded-xl shadow-xl border border-zinc-200 p-8">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Course Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-zinc-700">Distance</h3>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-6 h-6 text-cyan-600 mr-3" />
                <p className="text-2xl font-bold text-zinc-900">{course.distance} meters</p>
              </div>
            </div>
            {/* Add more details here as they become available */}
          </div>
        </div>
      </main>
    </div>
  );
}
