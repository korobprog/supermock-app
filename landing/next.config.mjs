import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disable static export for next-intl compatibility
  // distDir: './dist', // Use default .next directory
  // trailingSlash: true, // Disable trailing slash
  images: {
    unoptimized: true, // Disable image optimization
  },
  eslint: {
    ignoreDuringBuilds: true, // Disable ESLint during builds for now
  },
  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during builds for now
  },
  // Configure base path if needed
  // basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  webpack: (config) => {
    // Add alias for next/navigation compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      'next/navigation': 'next/navigation',
    };
    return config;
  },
}

export default withNextIntl(nextConfig)
