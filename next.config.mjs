/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    // Block search engines from indexing the raw *.vercel.app preview URL.
    // Once a custom domain is live, this header won't apply to it.
    const isVercelPreview = process.env.VERCEL_URL?.includes('vercel.app');
    if (!isVercelPreview) return [];

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
