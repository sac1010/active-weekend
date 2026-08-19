import { createClient } from '@supabase/supabase-js';
import { ACTIVITIES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Users, PlusCircle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Bangalore layout acronyms helper
function slugToLabel(slug) {
  if (!slug) return '';
  const acronyms = ['aecs', 'btm', 'cv', 'hal', 'hbr', 'hsr', 'jp', 'kr', 'rt', 'ms', 'hrbr'];
  return slug
    .split('-')
    .map(word => {
      if (acronyms.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Next.js dynamic metadata generator
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const city = slugToLabel(resolvedParams.city);
  const activity = slugToLabel(resolvedParams.activity);
  const locality = slugToLabel(resolvedParams.locality);

  return {
    title: `Active ${activity} Groups in ${locality}, ${city} | ActiveWeekend`,
    description: `Find active local groups and join upcoming ${activity} meetups in ${locality}, ${city}. Connect with friendly hosts, register for free, and meet new people this weekend.`,
    keywords: [`${activity} groups ${locality}`, `${activity} meetups ${locality}`, `active ${activity} ${locality}`]
  };
}

export default async function CategoryLocalityPage({ params }) {
  const resolvedParams = await params;
  const rawCity = resolvedParams.city;
  const rawActivity = resolvedParams.activity;
  const rawLocality = resolvedParams.locality;

  const city = slugToLabel(rawCity);
  const activity = slugToLabel(rawActivity);
  const locality = slugToLabel(rawLocality);

  // Find visual theme config matching this activity category
  const activityObj = ACTIVITIES.find(a => a.value.toLowerCase() === rawActivity.toLowerCase()) || ACTIVITIES[0];

  let events = [];
  const isMock = supabaseUrl.includes('placeholder');

  if (isMock) {
    const { MOCK_EVENTS } = await import('@/lib/mockData');
    events = MOCK_EVENTS.filter(
      e => e.activity_type.toLowerCase() === activity.toLowerCase() && 
           e.locality.toLowerCase() === locality.toLowerCase()
    );
  } else {
    try {
      const { data } = await supabase
        .from('events')
        .select(`
          *,
          host:host_id (username, avatar_url),
          bookings (user_id)
        `)
        .eq('status', 'Open')
        .ilike('activity_type', activity)
        .ilike('locality', locality)
        .order('event_date', { ascending: true });

      events = data || [];
    } catch (e) {
      console.error(e);
    }
  }

  // Generate Structured Data (JSON-LD Event Schema)
  const jsonLd = events.map(event => ({
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "startDate": `${event.event_date}T${event.event_time.split(' - ')[0]}`,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": event.venue_name,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": locality,
        "addressRegion": "Karnataka",
        "addressCountry": "IN"
      }
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR",
      "availability": event.bookings?.length < event.max_slots ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* JSON-LD Structured Data Injection */}
      {jsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Header breadcrumb & Themed Category Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${activityObj.bgClass} ${activityObj.textClass} border border-slate-800/40`}>
                {activityObj.icon} {activityObj.name}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{city}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white mt-1">
              {activity} Meetups in {locality}
            </h1>
          </div>
        </div>
      </div>

      {/* Description section - Premium, no asterisks, no explicit SEO comments */}
      <div className="glass p-6 rounded-2xl border border-slate-800/80 space-y-3.5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl" />
        <p className="text-xs md:text-sm text-slate-350 leading-relaxed relative z-10">
          Welcome to the local community directory for <span className="font-extrabold text-white">{activity}</span> events and groups in <span className="font-extrabold text-white">{locality}, {city}</span>. Explore active match rosters, register for free, and connect directly with local hosts near you this weekend.
        </p>
        <div className="flex flex-wrap gap-4 text-[10.5px] text-slate-500 font-medium relative z-10 pt-3 border-t border-slate-900/50">
          <span className="flex items-center gap-1">✓ Verified with TrustPoints</span>
          <span className="flex items-center gap-1">✓ 100% Free Squad coordination</span>
        </div>
      </div>

      {/* Event list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.length === 0 ? (
          <div className="md:col-span-2 text-center py-16 border border-dashed border-slate-800 rounded-3xl p-8 max-w-md mx-auto space-y-5 bg-slate-950/10">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 w-fit mx-auto">
              <PlusCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white text-sm font-bold">Be the first to host {activity} in {locality}!</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                There are currently no active listings for this combination. Open the app to publish a squad roster and invite players.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition-transform active:scale-95"
            >
              Open Dashboard
            </Link>
          </div>
        ) : (
          events.map(event => {
            return (
              <Link
                key={event.id}
                href={`/?event=${event.id}`} // direct query fallback opens details drawer
                className={`glass p-5 rounded-2xl border hover:scale-[1.01] hover:shadow-lg transition-all flex flex-col justify-between gap-4 ${activityObj.borderClass}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${activityObj.bgClass} ${activityObj.textClass}`}>
                      {activityObj.icon} {event.activity_type}
                    </span>
                    <span className="text-slate-500 text-[10px] font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {event.event_date}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white truncate">{event.title}</h3>
                    <p className="text-slate-400 text-xs flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate">{event.venue_name}</span>
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800/40 my-0.5" />

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {event.bookings?.length || 1} / {event.max_slots} filled
                  </span>
                  <span className="text-emerald-400 font-bold uppercase text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Free
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
