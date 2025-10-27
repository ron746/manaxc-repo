import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to support dynamic routes on Cloudflare Pages
  images: {
    unoptimized: true
  }
};

export default nextConfig;
