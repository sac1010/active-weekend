export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.fun';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/'
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
