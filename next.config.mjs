/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    // Block search engines from indexing preview and development deployments.
    // Allow indexing only on the production environment.
    const isProduction = process.env.VERCEL_ENV === 'production';
    if (isProduction) return [];

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
