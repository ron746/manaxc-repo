// components/layout/Header.tsx
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b-2 border-gray-200">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-16">
        {/* Logo */}
        <Link href="/" className="text-2xl font-black text-gray-900 hover:text-gray-700 transition">
          Mana XC
        </Link>

        {/* Navigation Links */}
        <nav className="flex gap-6">
          <Link
            href="/top-performances"
            className="text-gray-700 hover:text-gray-900 font-semibold hover:underline"
          >
            Top Performances
          </Link>
          <Link
            href="/admin/scraper"
            className="text-gray-700 hover:text-gray-900 font-semibold hover:underline"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}