import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content - Centered */}
      <div className="flex-grow flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl w-full text-center">
          {/* Logo/Title */}
          <h1 className="text-7xl font-black text-gray-900 mb-6">
            Mana XC
          </h1>

          {/* Mission Statement */}
          <p className="text-2xl text-gray-700 mb-16 font-medium max-w-3xl mx-auto leading-relaxed">
            Comprehensive Cross Country Statistics & Performance Analytics
          </p>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link
              href="/top-performances"
              className="px-8 py-4 bg-gray-800 text-white font-bold text-lg rounded-lg hover:bg-gray-900 transition-colors border-2 border-gray-800"
            >
              Top Performances
            </Link>

            <Link
              href="/schools/f2b562df-dec5-481b-8d99-afc48b1eb6e6/roster?season=2025"
              className="px-8 py-4 bg-gray-700 text-white font-bold text-lg rounded-lg hover:bg-gray-800 transition-colors border-2 border-gray-700"
            >
              School Rosters
            </Link>

            <Link
              href="/admin/scraper"
              className="px-8 py-4 bg-gray-600 text-white font-bold text-lg rounded-lg hover:bg-gray-700 transition-colors border-2 border-gray-600"
            >
              Admin Tools
            </Link>
          </div>

          {/* Stats Section */}
          <div className="border-t-2 border-gray-200 pt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="text-5xl font-black text-gray-900 mb-2">31,721</div>
                <div className="text-gray-600 font-medium">Race Results</div>
              </div>
              <div>
                <div className="text-5xl font-black text-gray-900 mb-2">13,487</div>
                <div className="text-gray-600 font-medium">Athletes Tracked</div>
              </div>
              <div>
                <div className="text-5xl font-black text-gray-900 mb-2">674</div>
                <div className="text-gray-600 font-medium">Schools</div>
              </div>
            </div>

            <p className="text-gray-500 text-sm">
              Course-adjusted performance comparisons for athletes, coaches, and fans
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t-2 border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Mana XC. Built for the running community.
          </p>
        </div>
      </footer>
    </div>
  );
}
