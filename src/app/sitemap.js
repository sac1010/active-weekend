import { ACTIVITIES, LOCALITIES } from '@/lib/constants';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.in';

  // 1. Static Routes
  const staticRoutes = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/blog`, lastModified: new Date() }
  ];

  // 2. Programmatic Landing Combinations (770 Pages)
  const programmaticRoutes = [];
  ACTIVITIES.forEach(act => {
    const activitySlug = act.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    LOCALITIES.forEach(loc => {
      const localitySlug = loc.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      programmaticRoutes.push({
        url: `${baseUrl}/bangalore/${activitySlug}/${localitySlug}`,
        lastModified: new Date()
      });
    });
  });

  // 3. Dynamic Public Event details from Supabase
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
            lastModified: new Date(evt.updated_at || new Date())
          });
        });
      }
    } catch (e) {
      console.error("Error generating sitemap dynamic routes:", e);
    }
  }

  return [...staticRoutes, ...programmaticRoutes, ...dynamicRoutes];
}
