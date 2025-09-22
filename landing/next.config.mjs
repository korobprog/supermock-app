import nextI18NextConfig from './next-i18next.config.js';

const normalizeBasePath = (value) => {
  if (!value || value === '/') {
    return ''
  }

  const trimmed = value.trim()

  if (!trimmed || trimmed === '/') {
    return ''
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')

  return withoutTrailingSlash.startsWith('/')
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash}`
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)
const assetPrefix = basePath ? `${basePath}/` : undefined

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' for development
  // output: 'export', // Enable static export for deployment
  // distDir: './dist', // Use dist directory for static export
  trailingSlash: false, // Disable trailing slash for development
  images: {
    unoptimized: true, // Disable image optimization for static export
  },
  eslint: {
    ignoreDuringBuilds: true, // Disable ESLint during builds for now
  },
  typescript: {
    ignoreBuildErrors: true, // Disable TypeScript errors during builds for now
  },
  i18n: nextI18NextConfig.i18n,
  ...(basePath
    ? {
        basePath,
        assetPrefix,
      }
    : {}),
}

export default nextConfig
