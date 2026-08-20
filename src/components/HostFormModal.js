'use client';

import { useState, useEffect } from 'react';
import { supabase, compressImage } from '@/lib/supabase';
import { LOCALITIES, ACTIVITIES, SKILL_LEVELS } from '@/lib/constants';
import { X, Calendar, Clock, MapPin, Users, Award, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/lib/ToastContext';

export default function HostFormModal({ currentUser, onClose, onActionComplete }) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('Badminton');
  const [locality, setLocality] = useState(LOCALITIES[0]);
  const [venueName, setVenueName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('09:00');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [coverImage, setCoverImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [maxSlots, setMaxSlots] = useState(4);
  const [costType, setCostType] = useState('Free');
  const [costValue, setCostValue] = useState(0);
  const [description, setDescription] = useState('');
  const [womenOnly, setWomenOnly] = useState(false);

  const isMock = (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true) || (currentUser?.id === '00000000-0000-0000-0000-000000000000');

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    if (startTime >= endTime) {
      showToast('End time must be after the start time.', 'error');
      return;
    }

    setSubmitting(true);

    const event_time = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;

    let uploadedImageUrl = null;

    if (coverImage) {
      setUploadingImage(true);
      try {
        const compressed = await compressImage(coverImage);
        const fileName = `${currentUser.id}/banners/${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('event-verifications')
          .upload(fileName, compressed, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-verifications')
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      } catch (err) {
        showToast('Failed to upload cover image: ' + err.message, 'error');
        setUploadingImage(false);
        setSubmitting(false);
        return;
      }
      setUploadingImage(false);
    }

    const eventData = {
      host_id: currentUser.id,
      title,
      activity_type: activityType,
      locality,
      venue_name: venueName,
      event_date: eventDate,
      event_time,
      skill_level: skillLevel,
      max_slots: Number(maxSlots),
      cost_type: 'Free',
      cost_value: 0,
      description,
      status: 'Open',
      cover_image_url: uploadedImageUrl,
      women_only: womenOnly
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
        ...eventData,
        cover_image_url: coverImage ? URL.createObjectURL(coverImage) : null
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
      showToast(err.message || 'Failed to host event.', 'error');
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
            <Award className="h-5 w-5 text-emerald-400" /> Host an Event
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
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chill Saturday Cycling Crew"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Activity Type</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ACTIVITIES.slice(0, 10).map(act => (
                    <button
                      key={act.value}
                      type="button"
                      onClick={() => setActivityType(act.value)}
                      title={act.name}
                      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border text-base transition-all ${
                        activityType === act.value
                          ? `${act.bgClass} ${act.borderClass} scale-105 shadow-md`
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <span>{act.icon}</span>
                      <span className={`text-[8px] font-bold leading-none truncate w-full text-center px-0.5 ${activityType === act.value ? act.textClass : 'text-slate-500'}`}>
                        {act.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Locality & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Locality</label>
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50"
                >
                  {LOCALITIES.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Venue / Meeting Point</label>
                <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500/50">
                  <MapPin className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cubbon Park Gate 2, Indiranagar"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full bg-transparent text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time & Skill */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Event Date</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + (6 - d.getDay() + 1) % 7 || 7);
                    setEventDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-[10px] font-semibold transition-colors"
                >
                  This Weekend
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + (6 - d.getDay() + 8) % 7 + 7);
                    setEventDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-[10px] font-semibold transition-colors"
                >
                  Next Weekend
                </button>
              </div>
              <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-emerald-500">
                <Calendar className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none w-full [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Start Time</label>
                <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-emerald-500">
                  <Clock className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none w-full [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">End Time</label>
                <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-emerald-500">
                  <Clock className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none w-full [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Skill Level</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50"
                >
                  {SKILL_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Roster Size stepper */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Max Group Size</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMaxSlots(s => Math.max(2, Number(s) - 1))}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="flex-1 flex items-center justify-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-200 font-bold text-sm w-6 text-center">{maxSlots}</span>
                  <span className="text-slate-500 text-[10px]">people</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMaxSlots(s => Math.min(50, Number(s) + 1))}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Optional Cover Image Banner */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Cover Photo (Optional)
              </label>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImage(e.target.files[0] || null)}
                  className="text-slate-400 hover:text-slate-200 text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-900 file:text-slate-300 hover:file:bg-slate-800 file:cursor-pointer"
                />
                {coverImage && (
                  <img
                    src={URL.createObjectURL(coverImage)}
                    alt="Cover preview"
                    className="h-10 w-16 object-cover rounded-lg border border-slate-700 shrink-0"
                  />
                )}
              </div>
            </div>

            {/* Description Notes */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Details & What to Expect</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Casual and friendly vibe. Bring your own gear if you have it. We'll sort out logistics on WhatsApp!"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50"
              />
            </div>

            {/* Women-only toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/40">
              <div>
                <p className="text-[11px] font-extrabold text-white">🟣 Women-only Event</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Only women can join this event roster</p>
              </div>
              <button
                type="button"
                onClick={() => setWomenOnly(w => !w)}
                className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                  womenOnly ? 'bg-purple-500' : 'bg-slate-700'
                }`}
                aria-label="Toggle women-only event"
              >
                <span className={`absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
                  womenOnly ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Submit Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-60"
              >
                {submitting ? 'Creating Event...' : 'Publish Event'}
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
