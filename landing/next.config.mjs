/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static export for deployment
  distDir: './dist', // Use dist directory for static export
  trailingSlash: true, // Enable trailing slash for static export
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

export default nextConfig
