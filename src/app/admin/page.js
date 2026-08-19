'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/ToastContext';

export default function AdminConsole() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true;

  const fetchAdminData = async () => {
    setLoading(true);
    if (isMock) {
      // Setup mock data for admin console demo
      setTimeout(() => {
        setCompletedEvents([
          {
            id: "e1",
            title: "Saturday Morning Badminton Doubles",
            locality: "HSR Layout",
            photo_url: "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=500&q=80",
            cost_type: "Split",
            cost_value: 150,
            host: { username: "Karthik (Court Ace)" },
            status: "Completed"
          }
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      // Fetch completed events
      const { data: completed } = await supabase
        .from('events')
        .select('*, host:host_id (username)')
        .eq('status', 'Completed')
        .order('created_at', { ascending: false });

      setCompletedEvents(completed || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isMock) {
      setCurrentUser({ id: 'mock-admin', email: 'admin@activeweekend.in' });
      fetchAdminData();
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin`
      }
    });
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    };
    checkUser();
    fetchAdminData();
  }, []);

  if (!loading && !currentUser && !isMock) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Shield className="h-16 w-16 text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
          The Admin Console is restricted to authenticated staff. Please sign in with an authorized account to continue.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleGoogleSignIn}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Sign In with Google
          </button>
          <Link 
            href="/" 
            className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-semibold text-xs flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white">Admin Operations Console</h2>
            <p className="text-[10px] text-slate-500 leading-none mt-1">Verify matches, upload audits, and resolve payouts</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to App
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Verifications section */}
        <div className="glass p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> Match Photo Verifications ({completedEvents.length})
          </h3>

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {completedEvents.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">No match verifications submitted today.</p>
            ) : (
              completedEvents.map((event) => (
                <div key={event.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/10 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-white">{event.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Locality: {event.locality} · Host: {event.host?.username}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase">
                      Completed
                    </span>
                  </div>

                  {event.photo_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-800 h-40">
                      <img
                        src={event.photo_url}
                        alt="Venue verification"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-[10px] border border-dashed border-slate-800 rounded-lg">
                      No photo submitted (Mock event).
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-slate-400">Status: Match Completed</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Verified
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
