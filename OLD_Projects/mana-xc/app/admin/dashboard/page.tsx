// app/admin/dashboard/page.tsx
import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  Upload,
  Download,
  Calendar,
  Trash2,
  TrendingUp,
  Copy,
  FileSpreadsheet
} from 'lucide-react';

interface AdminTool {
  name: string;
  description: string;
  href: string;
  icon: ComponentType<Record<string, unknown>>;
  category: 'import' | 'manage' | 'scrape';
}

const adminTools: AdminTool[] = [
  {
    name: 'Import Wizard',
    description: '5-step CSV import process for manual data entry',
    href: '/admin/import',
    icon: Upload,
    category: 'import'
  },
  {
    name: 'Bulk Import',
    description: 'Import existing CSV/JSON files from Athletic.net scraper',
    href: '/admin/bulk-import',
    icon: FileSpreadsheet,
    category: 'import'
  },
  {
    name: 'Scrape Requests',
    description: 'Queue and manage Athletic.net scraping jobs (NEW)',
    href: '/admin/scrape-requests',
    icon: Calendar,
    category: 'scrape'
  },
  {
    name: 'Athletic.net Scraper',
    description: 'One-time scrape for a single school/season',
    href: '/admin/scraper',
    icon: Download,
    category: 'scrape'
  },
  {
    name: 'Duplicate Results',
    description: 'Find and resolve duplicate race results',
    href: '/admin/duplicate-results',
    icon: Copy,
    category: 'manage'
  },
  {
    name: 'Course Ratings',
    description: 'Manage and validate course difficulty ratings',
    href: '/admin/course-ratings',
    icon: TrendingUp,
    category: 'manage'
  },
  {
    name: 'Delete Data',
    description: 'Safely delete meets, races, or results',
    href: '/admin/delete',
    icon: Trash2,
    category: 'manage'
  }
];

const categories = {
  scrape: { name: 'Data Scraping', color: 'blue' },
  import: { name: 'Data Import', color: 'green' },
  manage: { name: 'Data Management', color: 'purple' }
};

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white">Admin Dashboard</h1>
        <p className="text-xl text-gray-400 mt-2">
          Manage data imports, scraping, and system maintenance
        </p>
      </header>

      {Object.entries(categories).map(([key, category]) => {
        const toolsInCategory = adminTools.filter(t => t.category === key);

        return (
          <div key={key} className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">{category.name}</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {toolsInCategory.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 p-6 rounded-lg transition-all group"
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg bg-${category.color}-900/30 text-${category.color}-400 group-hover:bg-${category.color}-900/50`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {tool.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quick Stats Section */}
      <div className="mt-12 bg-gray-800 border border-gray-700 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">System Status</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="text-gray-400 text-sm">Total Athletes</div>
            <div className="text-3xl font-bold text-white">-</div>
            <div className="text-xs text-gray-500 mt-1">Check Supabase</div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="text-gray-400 text-sm">Total Results</div>
            <div className="text-3xl font-bold text-white">-</div>
            <div className="text-xs text-gray-500 mt-1">Check Supabase</div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="text-gray-400 text-sm">Total Meets</div>
            <div className="text-3xl font-bold text-white">-</div>
            <div className="text-xs text-gray-500 mt-1">Check Supabase</div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="text-gray-400 text-sm">Total Schools</div>
            <div className="text-3xl font-bold text-white">-</div>
            <div className="text-xs text-gray-500 mt-1">Check Supabase</div>
          </div>
        </div>
      </div>
    </div>
  );
}
