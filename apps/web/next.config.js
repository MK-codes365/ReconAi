/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@reconai/shared-types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: '/api/auth/:path*',
          destination: '/api/auth/:path*',
        },
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
        {
          source: '/webhooks/:path*',
          destination: `${apiUrl}/webhooks/:path*`,
        },
        {
          source: '/health',
          destination: `${apiUrl}/health`,
        },
      ],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
