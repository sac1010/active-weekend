'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Trash2, ArrowLeft, UserX, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/ToastContext';

export default function AdminConsole() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [flaggedEvents, setFlaggedEvents] = useState([]);
  const [submittingAction, setSubmittingAction] = useState(false);

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
        setFlaggedEvents([
          {
            id: "e3",
            title: "Pickleball Singles Practice",
            locality: "Koramangala",
            photo_url: null, // Host didn't upload photo but marked complete? Or flagged no-show
            cost_type: "Paid",
            cost_value: 300,
            host: { username: "Rohan D." },
            status: "Open",
            dispute_reason: "Host did not show up. Players waited 30 mins at court."
          }
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      // 1. Fetch completed events
      const { data: completed } = await supabase
        .from('events')
        .select('*, host:host_id (username)')
        .eq('status', 'Completed')
        .order('created_at', { ascending: false });

      setCompletedEvents(completed || []);

      // 2. Fetch events in 'Open' or 'Completed' status where players submitted "Host No-Show" disputes.
      // For MVP, we fetch bookings where payment_status = 'Escrow_Held' or is flagged
      const { data: disputed } = await supabase
        .from('events')
        .select('*, host:host_id (username)')
        .eq('status', 'Open')
        .order('created_at', { ascending: false });

      // Simulate filtering for demo, normally we check a dispute table or flagged column
      setFlaggedEvents(disputed || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResolveDispute = async (eventId, decision) => {
    setSubmittingAction(true);
    if (isMock) {
      showToast(`Dispute resolved! Decision: ${decision}`, 'success');
      setFlaggedEvents(prev => prev.filter(e => e.id !== eventId));
      setSubmittingAction(false);
      return;
    }

    try {
      if (decision === 'refund') {
        // 1. Mark bookings as Refunded
        const { error: refundError } = await supabase
          .from('bookings')
          .update({ payment_status: 'Refunded' })
          .eq('event_id', eventId);

        if (refundError) throw refundError;

        // 2. Cancel Event
        const { error: eventError } = await supabase
          .from('events')
          .update({ status: 'Cancelled' })
          .eq('id', eventId);

        if (eventError) throw eventError;

        showToast('Dispute resolved: Refund processed successfully.', 'success');
      } else {
        // Host attended: Complete match and disburse funds
        const { error: completeError } = await supabase
          .from('events')
          .update({ status: 'Completed' })
          .eq('id', eventId);

        if (completeError) throw completeError;

        showToast('Dispute resolved: Payout released to host.', 'success');
      }
      fetchAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to resolve dispute.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disputes section */}
        <div className="glass p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Flagged Disputes ({flaggedEvents.length})
          </h3>

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {flaggedEvents.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">No active dispute flags reported.</p>
            ) : (
              flaggedEvents.map((event) => (
                <div key={event.id} className="p-4 rounded-xl border border-rose-500/10 bg-rose-950/5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-white">{event.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Locality: {event.locality} · Host: {event.host?.username}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold uppercase">
                      Disputed
                    </span>
                  </div>

                  <p className="text-[10.5px] text-slate-300 leading-normal bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                    <strong>Report Details:</strong> {event.dispute_reason || 'Guest flagged host as no-show. Funds are currently frozen in escrow.'}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveDispute(event.id, 'refund')}
                      disabled={submittingAction}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[10.5px] transition-colors"
                    >
                      <UserX className="h-3.5 w-3.5" /> Refund Players & Lock Host
                    </button>
                    <button
                      onClick={() => handleResolveDispute(event.id, 'release')}
                      disabled={submittingAction}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10.5px] transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Release Escrow to Host
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
                    <span className="text-slate-400">Match Fee: ₹{event.cost_value} ({event.cost_type})</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Payout Disbursed
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
