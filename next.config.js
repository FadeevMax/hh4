/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // This is the most important setting - it prevents static export
  output: 'standalone',
  distDir: '.next',
  trailingSlash: true,
  // Add experimental feature flag to ignore pages with useSearchParams during static export
  experimental: {
    disableOptimizedLoading: true,
    isrFlushToDisk: false
  }
};

module.exports = nextConfig; 