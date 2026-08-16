'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LOCALITIES, ACTIVITIES, SKILL_LEVELS } from '@/lib/constants';
import { X, Calendar, Clock, MapPin, DollarSign, Users, Award, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HostFormModal({ currentUser, onClose, onActionComplete }) {
  const [hostProfile, setHostProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('Badminton');
  const [locality, setLocality] = useState(LOCALITIES[0]);
  const [venueName, setVenueName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('7:00 AM - 9:00 AM');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [maxSlots, setMaxSlots] = useState(4);
  const [costType, setCostType] = useState('Free');
  const [costValue, setCostValue] = useState(0);
  const [description, setDescription] = useState('');

  const isMock = (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true) || (currentUser?.id === '00000000-0000-0000-0000-000000000000');

  // Fetch host profile details
  useEffect(() => {
    const fetchHostProfile = async () => {
      if (!currentUser) return;
      if (isMock) {
        setHostProfile({
          successful_hostings: 1
        });
        setLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('successful_hostings')
          .eq('id', currentUser.id)
          .single();

        if (data) setHostProfile(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchHostProfile();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    const eventData = {
      host_id: currentUser.id,
      title,
      activity_type: activityType,
      locality,
      venue_name: venueName,
      event_date: eventDate,
      event_time: eventTime,
      skill_level: skillLevel,
      max_slots: Number(maxSlots),
      cost_type: costType,
      cost_value: costType === 'Free' ? 0 : Number(costValue),
      description,
      status: 'Open'
    };

    if (isMock) {
      // Simulate database write
      const { MOCK_EVENTS } = await import('@/lib/mockData');
      const newMockEvent = {
        id: `mock-${Date.now()}`,
        host: {
          username: currentUser.email.split('@')[0],
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sid'
        },
        bookings: [
          { user_id: currentUser.id, user: { avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sid' } }
        ],
        ...eventData
      };
      MOCK_EVENTS.unshift(newMockEvent);
      setTimeout(() => {
        setSubmitting(false);
        if (onActionComplete) onActionComplete();
        onClose();
      }, 550);
      return;
    }

    try {
      // 1. Insert Event
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Add Host directly to Roster (occupies 1 slot)
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          event_id: newEvent.id,
          user_id: currentUser.id,
          payment_status: 'Released',
          payment_ref: 'Host_Owner'
        });

      if (bookingError) throw bookingError;

      // 3. Create Notification
      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        title: 'Event Hosted! 🏸',
        message: `Your match "${title}" in ${locality} has been successfully hosted. Invite friends using the direct link!`
      });

      if (onActionComplete) onActionComplete();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to host event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl glass-premium p-6 border border-slate-800 shadow-2xl z-50 space-y-4"
      >
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-400" /> Host Weekend Match
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {loadingProfile ? (
          <div className="text-center py-10 space-y-2">
            <div className="h-5 w-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Checking host level...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-300">
            {/* Title & Activity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Match Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sat Morning Doubles"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sport / Activity</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-slate-700"
                >
                  {ACTIVITIES.map(act => (
                    <option key={act.value} value={act.value}>{act.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Locality & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Locality</label>
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-slate-700"
                >
                  {LOCALITIES.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Exact Venue Address</label>
                <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
                  <MapPin className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Play Arena Court 3, Sarjapur"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full bg-transparent text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time & Skill */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Match Date</label>
                <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
                  <Calendar className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time Slot</label>
                <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
                  <Clock className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7-9 AM"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Skill Level</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-slate-700"
                >
                  {SKILL_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Roster Size & Cost Type & Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Max Squad Size</label>
                <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
                  <Users className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="number"
                    required
                    min={2}
                    placeholder="4"
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cost Type</label>
                <select
                  value={costType}
                  onChange={(e) => {
                    setCostType(e.target.value);
                    if (e.target.value === 'Free') setCostValue(0);
                  }}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-slate-700"
                >
                  <option value="Free">Free Session</option>
                  <option value="Split">Split Court Cost</option>
                  <option 
                    value="Paid" 
                    disabled={hostProfile?.successful_hostings < 3}
                  >
                    Paid Ticket {hostProfile?.successful_hostings < 3 && '🔒'}
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Price per Ticket (₹)</label>
                <div className={`flex items-center border rounded-xl px-3 py-2 transition-all ${
                  costType === 'Free'
                    ? 'bg-slate-950/80 border-slate-900/60 text-slate-600'
                    : 'bg-slate-950/40 border-slate-800 text-slate-200'
                }`}>
                  <DollarSign className="h-4 w-4 text-slate-500 mr-1 shrink-0" />
                  <input
                    type="number"
                    disabled={costType === 'Free'}
                    min={0}
                    placeholder="150"
                    value={costValue}
                    onChange={(e) => setCostValue(e.target.value)}
                    className="bg-transparent focus:outline-none w-full disabled:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Paid hosting requirement warning badge */}
            {hostProfile?.successful_hostings < 3 && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl border border-orange-500/20 bg-orange-950/10 text-orange-400">
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-[10.5px] leading-relaxed">
                  *"Paid Event" option is locked. Complete **{3 - hostProfile.successful_hostings} more successful free matches** to unlock paid ticketing permissions.*
                </p>
              </div>
            )}

            {/* Description Notes */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Session Details / Roster Rules</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Bring your own rackets. We will split shuttlecock costs equally. Playing doubles format..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-slate-700"
              />
            </div>

            {/* Submit Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
              >
                {submitting ? 'Creating Event...' : 'Publish Match Listing'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs transition-all animate-none"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
