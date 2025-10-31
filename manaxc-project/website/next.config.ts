import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Removed output: 'export' to enable full Next.js features (API routes, dynamic routes)
  // This configuration works with Vercel deployment
  images: {
    unoptimized: true
  },
  // Set Turbopack root to the website directory to prevent scanning parent directories
  turbopack: {
    root: path.resolve(__dirname, "."),
  },
  // Prevent file watcher from monitoring import directories (prevents crashes)
  watchOptions: {
    ignored: [
      '**/code/importers/**',
      '**/to-be-processed/**',
      '**/processed/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/.next/**',
    ],
  },
};

export default nextConfig;
