import { createClient } from '@supabase/supabase-js';
import { ACTIVITIES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Clock, Award, Users } from 'lucide-react';
import Header from '@/components/Header';
import ClientEventWrapper from './ClientEventWrapper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const isMock = supabaseUrl.includes('placeholder') || id.startsWith('e') || id.startsWith('mock');

  let title = 'Active Match Squad | ActiveWeekend';
  let description = 'Join this active weekend match in Bangalore.';

  if (isMock) {
    const { MOCK_EVENTS } = await import('@/lib/mockData');
    const event = MOCK_EVENTS.find(e => e.id === id);
    if (event) {
      title = `${event.title} in ${event.locality} | ActiveWeekend`;
      description = `Join ${event.host.username}'s ${event.activity_type} squad at ${event.venue_name} this weekend.`;
    }
  } else {
    try {
      const { data } = await supabase
        .from('events')
        .select('title, locality, venue_name, activity_type, host:host_id(username)')
        .eq('id', id)
        .single();
      
      if (data) {
        title = `${data.title} in ${data.locality} | ActiveWeekend`;
        description = `Join ${data.host?.username}'s ${data.activity_type} squad at ${data.venue_name} this weekend.`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return {
    title,
    description
  };
}

export default async function EventDetailPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const isMock = supabaseUrl.includes('placeholder') || id.startsWith('e') || id.startsWith('mock');

  let event = null;

  if (isMock) {
    const { MOCK_EVENTS } = await import('@/lib/mockData');
    event = MOCK_EVENTS.find(e => e.id === id);
  } else {
    try {
      const { data } = await supabase
        .from('events')
        .select(`
          *,
          host:host_id (username, avatar_url, trust_points),
          bookings (
            id,
            user_id,
            payment_status,
            payment_ref,
            user:user_id (avatar_url, username)
          )
        `)
        .eq('id', id)
        .single();
      
      event = data;
    } catch (e) {
      console.error(e);
    }
  }

  if (!event) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <p className="text-slate-500 text-xs">This event may have been cancelled or deleted by the host.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const activity = ACTIVITIES.find(a => a.value === event.activity_type) || ACTIVITIES[0];

  // Structured Data Schema for Google Events
  const jsonLd = {
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
        "addressLocality": event.locality,
        "addressRegion": "Karnataka",
        "addressCountry": "IN"
      }
    },
    "offers": {
      "@type": "Offer",
      "price": event.cost_value.toString(),
      "priceCurrency": "INR",
      "availability": event.bookings?.length < event.max_slots ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Structured data injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-sm font-bold text-white">Match Overview</h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Share Link landing page</p>
        </div>
      </div>

      {/* Static Server-Side Rendered Preview (Indexable by Google) */}
      <div className={`glass p-6 rounded-3xl border ${activity.borderClass} space-y-4`}>
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${activity.bgClass} ${activity.textClass}`}>
              {activity.icon} {event.activity_type}
            </span>
            <h1 className="text-lg md:text-xl font-extrabold text-white leading-snug pt-1">
              {event.title}
            </h1>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Price</p>
            <p className="text-base font-extrabold text-white">
              {event.cost_type === 'Free' ? 'Free' : `₹${event.cost_value}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-950/20 border border-slate-800/60 p-4 rounded-2xl text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[9px] text-slate-500 uppercase leading-none font-bold">Date</p>
              <p className="font-semibold mt-0.5">{new Date(event.event_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[9px] text-slate-500 uppercase leading-none font-bold">Timings</p>
              <p className="font-semibold mt-0.5">{event.event_time}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[9px] text-slate-500 uppercase leading-none font-bold">Locality</p>
              <p className="font-semibold mt-0.5 truncate max-w-[120px]">{event.locality}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Session Details</h3>
          <p className="text-slate-300 leading-relaxed font-medium bg-slate-950/10 p-3 rounded-xl border border-slate-900/60">
            {event.description}
          </p>
        </div>

        <div className="space-y-1.5 text-xs">
          <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Exact Venue</h3>
          <p className="text-slate-300 leading-relaxed font-semibold">
            📍 {event.venue_name}
          </p>
        </div>
      </div>

      {/* Hydrate dynamic interaction: Join button, chat, roster via client wrapper */}
      <ClientEventWrapper eventId={id} />
    </div>
  );
}
