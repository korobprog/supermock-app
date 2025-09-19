const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'SuperMock'
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supermock.ru'
      }
    ]
  }
};

export default nextConfig;
