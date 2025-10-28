import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Required for Cloudflare Pages static hosting
  images: {
    unoptimized: true
  },
  // Enable trailing slashes for better static hosting compatibility
  trailingSlash: true,
  // Exclude parent directories from the build
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        '../code/**',
        '../docs/**',
        '../../**'
      ]
    }
  }
};

export default nextConfig;
