import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_APP_NAME: 'SuperMock'
  },
  experimental: {
    externalDir: true,
    outputFileTracingRoot: path.join(__dirname, '..')
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supermock.ru'
      }
    ]
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx']
};

export default nextConfig;
