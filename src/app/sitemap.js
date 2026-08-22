import { ACTIVITIES, LOCALITIES } from '@/lib/constants';
import { getBlogPosts } from '@/lib/blogParser';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.fun';

  // 1. Static Routes
  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 }
  ];

  // 2. Blog Posts
  const blogPosts = getBlogPosts();
  const blogRoutes = blogPosts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.metadata.date || new Date()),
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  // 3. Programmatic Landing Combinations (770+ Pages)
  const programmaticRoutes = [];
  ACTIVITIES.forEach(act => {
    const activitySlug = act.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    LOCALITIES.forEach(loc => {
      const localitySlug = loc.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      programmaticRoutes.push({
        url: `${baseUrl}/bangalore/${activitySlug}/${localitySlug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6
      });
    });
  });

  // 4. Dynamic Public Event details from Supabase
  const dynamicRoutes = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: events } = await supabase
        .from('events')
        .select('id, updated_at')
        .eq('status', 'Open')
        .limit(200);

      if (events) {
        events.forEach(evt => {
          dynamicRoutes.push({
            url: `${baseUrl}/event/${evt.id}`,
            lastModified: new Date(evt.updated_at || new Date()),
            changeFrequency: 'daily',
            priority: 0.9
          });
        });
      }
    } catch (e) {
      console.error("Error generating sitemap dynamic routes:", e);
    }
  }

  return [...staticRoutes, ...blogRoutes, ...programmaticRoutes, ...dynamicRoutes];
}
