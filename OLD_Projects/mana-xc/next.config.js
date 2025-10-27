// mana-xc/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
    // No redirects - landing page now at root

    // CRITICAL FIX: This tells Next.js to ignore potential external
    // files during the module resolution phase, bypassing the corrupted
    // /Users/ron/package.json and ensuring your local aliases are prioritized.
    experimental: {
        esmExternals: false,
    },
};

module.exports = nextConfig;