import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed 'output: export' to support dynamic routes with client components
  // Static export is incompatible with 'use client' components that use dynamic routes
  images: {
    unoptimized: true
  }
};

export default nextConfig;
