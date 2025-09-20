import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Temporarily disabled for debugging
  // distDir: './dist', // Changes the build output directory to `./dist/`
  // trailingSlash: true, // Add trailing slash to URLs for static export
  images: {
    unoptimized: true, // Disable image optimization for static export
  },
  eslint: {
    ignoreDuringBuilds: true, // Disable ESLint during builds for now
  },
  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during builds for now
  },
  // Configure base path if needed
  // basePath: process.env.NEXT_PUBLIC_BASE_PATH,
}

export default withNextIntl(nextConfig)
