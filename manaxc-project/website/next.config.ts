import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Required for Cloudflare Pages static hosting
  images: {
    unoptimized: true
  },
  // Enable trailing slashes for better static hosting compatibility
  trailingSlash: true,
};

export default nextConfig;
