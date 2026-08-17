'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MOCK_CHATS } from '@/lib/mockData';
import { X, MapPin, Calendar, Clock, Award, Send, Users, AlertTriangle, Image as ImageIcon, CheckCircle, ShieldAlert, Link2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/lib/supabase'; // We'll add this canvas utility later
import { ACTIVITIES } from '@/lib/constants';
import { useToast } from '@/lib/ToastContext';

// Custom modern X (formerly Twitter) SVG Icon
function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function DetailsDrawer({ eventId, currentUser, onClose, onActionComplete }) {
  const { showToast } = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [bookingRecord, setBookingRecord] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Upload/Verification state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isMock = (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true) || (currentUser?.id === '00000000-0000-0000-0000-000000000000') || (eventId?.startsWith('mock')) || (eventId?.startsWith('e') && eventId.length < 5);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && event) {
      const shareUrl = `${window.location.origin}/event/${event.id}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fetch Event details and chat logs
  const fetchDetails = async () => {
    if (isMock) {
      // Simulate mock event retrieval
      const { MOCK_EVENTS } = await import('@/lib/mockData');
      const found = MOCK_EVENTS.find(e => e.id === eventId);
      if (found) {
        setEvent(found);
        setMessages(MOCK_CHATS);
        // Check if joined
        const joined = found.bookings.some(b => b.user_id === currentUser?.id);
        setIsJoined(joined);
        if (joined) {
          setBookingRecord(found.bookings.find(b => b.user_id === currentUser?.id));
        }
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch event
      const { data, error } = await supabase
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
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);

      // Check if current user is in booking roster
      const userBooking = data.bookings?.find(b => b.user_id === currentUser?.id);
      setIsJoined(!!userBooking);
      setBookingRecord(userBooking || null);

      // Fetch chats
      const { data: chatData } = await supabase
        .from('chats')
        .select(`
          id,
          message,
          created_at,
          user:user_id (id, username, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      setMessages(chatData || []);
    } catch (e) {
      console.error('Error fetching event details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [eventId, currentUser]);

  // Real-time Chat Subscription
  useEffect(() => {
    if (isMock || !eventId || !isJoined) return;

    const chatChannel = supabase
      .channel(`chats-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          // Fetch the profile for the user who posted
          const { data: userData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const formattedMessage = {
            id: payload.new.id,
            message: payload.new.message,
            created_at: payload.new.created_at,
            user: {
              id: payload.new.user_id,
              username: userData?.username || 'Player',
              avatar_url: userData?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'
            }
          };
          setMessages((prev) => [...prev, formattedMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [eventId, isJoined]);

  // Under-the-table payment filter
  const filterMessageContent = (msg) => {
    // Mask phone numbers (10 digits)
    let cleaned = msg.replace(/\b\d{10}\b/g, ' [phone masked] ');
    // Mask UPI handles (@ybl, @okaxis, etc.)
    cleaned = cleaned.replace(/\b[\w\.\-]+@(ybl|okaxis|upi|paytm|okicici|okhdfcbank)\b/gi, ' [UPI masked] ');
    // Mask direct transaction keywords
    cleaned = cleaned.replace(/(gpay me|pay directly|phonepe me|send money|transfer direct|gpay directly)/gi, ' [coordination masked] ');
    return cleaned;
  };

  // Post chat message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const filtered = filterMessageContent(newMessage);

    if (isMock) {
      const mockMsg = {
        id: Date.now(),
        message: filtered,
        created_at: new Date().toISOString(),
        user: {
          id: currentUser.id,
          username: currentUser.email.split('@')[0],
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sid'
        }
      };
      setMessages(prev => [...prev, mockMsg]);
      setNewMessage('');
      return;
    }

    try {
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          event_id: eventId,
          user_id: currentUser.id,
          message: filtered
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch user profile info to render immediately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', currentUser.id)
        .single();

      const formattedMessage = {
        id: newChat.id,
        message: newChat.message,
        created_at: newChat.created_at,
        user: {
          id: currentUser.id,
          username: profileData?.username || currentUser.email.split('@')[0],
          avatar_url: profileData?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'
        }
      };

      // Append to local state if it hasn't been added already (e.g. by Realtime listener)
      setMessages((prev) => {
        if (prev.some((m) => m.id === newChat.id)) return prev;
        return [...prev, formattedMessage];
      });

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Join Event (Free / Cash payment trigger)
  const handleJoinFree = async () => {
    if (!currentUser) {
      showToast('Please Sign-In via Google first.', 'warning');
      return;
    }
    setSubmittingAction(true);

    if (isMock) {
      setTimeout(() => {
        setIsJoined(true);
        if (onActionComplete) onActionComplete();
        fetchDetails();
        setSubmittingAction(false);
      }, 500);
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          event_id: eventId,
          user_id: currentUser.id,
          payment_status: 'Released', // Free event means release immediately
          payment_ref: 'Free_Access'
        });

      if (error) throw error;
      
      // Auto-insert notification to user
      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        title: 'Joined Roster! 🏸',
        message: `You successfully joined the roster for "${event.title}". Coordination chat is now open!`
      });

      setIsJoined(true);
      if (onActionComplete) onActionComplete();
      fetchDetails();
    } catch (e) {
      showToast(e.message || 'Failed to join. Roster might be full.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Leave Event Roster (Safeguard checks)
  const handleLeaveEvent = async () => {
    if (!currentUser || !bookingRecord) return;

    // Check cancellation window (6 hours)
    const eventDateTime = new Date(`${event.event_date}`);
    const timeDiffMs = eventDateTime.getTime() - new Date().getTime();
    const hoursRemaining = timeDiffMs / (1000 * 60 * 60);

    let warningText = 'Are you sure you want to leave this match?';
    if (hoursRemaining < 6) {
      warningText = '🚨 WARNING: This event starts in less than 6 hours. Leaving now will penalize you 30 TrustPoints. Proceed?';
    }

    if (!window.confirm(warningText)) return;
    setSubmittingAction(true);

    if (isMock) {
      setTimeout(() => {
        setIsJoined(false);
        setBookingRecord(null);
        if (onActionComplete) onActionComplete();
        fetchDetails();
        setSubmittingAction(false);
      }, 500);
      return;
    }

    try {
      // 1. Delete booking
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingRecord.id);

      if (error) throw error;

      // 2. Apply penalties if less than 6 hours
      if (hoursRemaining < 6) {
        // Fetch host profile details to check current trust points
        const { data: profile } = await supabase
          .from('profiles')
          .select('trust_points')
          .eq('id', currentUser.id)
          .single();

        // Deduct 30 TrustPoints (clamped at 0)
        const currentPoints = profile?.trust_points || 150;
        const newPoints = Math.max(0, currentPoints - 30);
        
        await supabase
          .from('profiles')
          .update({ trust_points: newPoints })
          .eq('id', currentUser.id);

        await supabase.from('trust_points_ledger').insert({
          user_id: currentUser.id,
          amount: -30,
          transaction_type: 'Penalty',
          event_id: eventId
        });

        await supabase.from('notifications').insert({
          user_id: currentUser.id,
          title: 'TrustPoints Penalized 🤝',
          message: `You left the match "${event.title}" under the 6-hour cancellation limit. 30 TrustPoints were deducted.`
        });
      }

      setIsJoined(false);
      setBookingRecord(null);
      if (onActionComplete) onActionComplete();
      fetchDetails();
    } catch (e) {
      showToast(e.message || 'Failed to leave roster.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Host: Reject guest booking / Kick
  const handleRejectBooking = async (bookingId, guestId) => {
    if (!window.confirm('Are you sure you want to reject this booking and kick the user from the roster?')) return;
    setSubmittingAction(true);
    if (isMock) {
      fetchDetails();
      setSubmittingAction(false);
      return;
    }
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      // Notify guest
      await supabase.from('notifications').insert({
        user_id: guestId,
        title: 'Booking Rejected 🚫',
        message: `Your booking was rejected by the host for "${event.title}". Please check your transaction details.`
      });

      fetchDetails();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Host: Cancel match event
  const handleCancelEvent = async () => {
    setSubmittingAction(true);
    if (isMock) {
      setTimeout(() => {
        showToast('Match event cancelled successfully.', 'success');
        if (onActionComplete) onActionComplete();
        onClose();
        setSubmittingAction(false);
      }, 500);
      return;
    }
    try {
      // 1. Cancel the event
      const { error: eventError } = await supabase
        .from('events')
        .update({ status: 'Cancelled' })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // 2. Mark bookings as Refunded (audit-logged cancellation)
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ payment_status: 'Refunded' })
        .eq('event_id', eventId);

      if (bookingsError) throw bookingsError;

      showToast('Match event cancelled successfully.', 'success');
      if (onActionComplete) onActionComplete();
      onClose();
    } catch (e) {
      showToast(e.message || 'Failed to cancel event.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Host: Handle event completion (upload selfie and release escrow)
  const handleCompleteEvent = async (e) => {
    e.preventDefault();
    if (!selectedPhoto && !isMock) {
      showToast('Please upload a verified group selfie taken at the venue to complete the event.', 'warning');
      return;
    }
    setUploadingPhoto(true);

    if (isMock) {
      setTimeout(() => {
        showToast('Event successfully completed! (Mock points disbursed)', 'success');
        setShowCompletionForm(false);
        if (onActionComplete) onActionComplete();
        onClose();
      }, 500);
      return;
    }

    try {
      // 1. Compress image client side
      const { compressImage } = await import('@/lib/supabase');
      const compressedFile = await compressImage(selectedPhoto);

      // 2. Upload to storage bucket `event-verifications`
      const fileName = `${event.id}.jpg`;
      const filePath = `${currentUser.id}/${fileName}`; // event-verifications/[user_id]/[event_id].jpg

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-verifications')
        .upload(filePath, compressedFile, { overwrite: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-verifications')
        .getPublicUrl(filePath);

      // 3. Update event status to Completed and store photo URL
      const { error: updateError } = await supabase
        .from('events')
        .update({
          status: 'Completed',
          photo_url: publicUrl
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      showToast('Event successfully completed! Group selfie uploaded, and rewards disbursed.', 'success');
      setShowCompletionForm(false);
      if (onActionComplete) onActionComplete();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error processing completion.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const activity = event ? (ACTIVITIES.find(a => a.value === event.activity_type) || ACTIVITIES[0]) : ACTIVITIES[0];

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity" 
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] glass-premium border-l border-slate-800/80 shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-950 transition-all"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
            <div className="text-center space-y-2">
              <div className="h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-semibold animate-pulse">Fetching match profile...</p>
            </div>
          </div>
        ) : !event ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-950 transition-all"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
            <p className="text-slate-400 text-xs font-semibold">Event Not Found</p>
          </div>
        ) : (
          <>
            {/* Drawer Header Event Banner */}
            <div className="relative h-44 sm:h-48 w-full shrink-0 overflow-hidden bg-slate-950">
          <img
            src={event.cover_image_url || activity.fallbackImage}
            alt={event.title}
            className="h-full w-full object-cover transition-opacity duration-300"
          />
          {/* Dark overlay gradient to blend with the app background */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/30 to-slate-950/20" />

          {/* Floating close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-950 transition-all z-10"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* Event Title & Metadata overlay */}
          <div className="absolute bottom-4 left-5 right-5 space-y-1.5">
            <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${activity.bgClass} ${activity.textClass} border border-[rgba(255,255,255,0.06)]`}>
              {activity.icon} {event.activity_type}
            </span>
            <h2 className="font-extrabold text-base sm:text-lg text-white leading-snug drop-shadow-md truncate">
              {event.title}
            </h2>
            <p className="text-[10px] text-slate-300 font-medium drop-shadow leading-none">
              {event.skill_level} · {event.locality}
            </p>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Details Card */}
          <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 space-y-3.5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase leading-none font-bold">Date</p>
                  <p className="font-semibold mt-0.5">{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase leading-none font-bold">Timings</p>
                  <p className="font-semibold mt-0.5">{event.event_time}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-300 border-t border-slate-800/40 pt-3">
              <MapPin className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] text-slate-500 uppercase leading-none font-bold">Venue Address</p>
                <p className="font-semibold mt-0.5 leading-snug">{event.venue_name}</p>
              </div>
            </div>

            <div className="border-t border-slate-800/40 pt-3 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase leading-none font-bold block">Session Notes</span>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{event.description}</p>
            </div>

            {/* Share event social widgets */}
            <div className="border-t border-slate-800/40 pt-3 space-y-2">
              <span className="text-[9px] text-slate-500 uppercase leading-none font-bold block">Share Squad</span>
              <div className="flex items-center gap-2">
                {/* Copy Link Button */}
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all font-semibold"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>

                {/* WhatsApp Share Button */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hey! Join my ${event.activity_type} squad: "${event.title}" in ${event.locality} this weekend! Join here: ${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all"
                  title="Share on WhatsApp"
                >
                  <MessageSquare className="h-4 w-4" />
                </a>

                {/* Twitter / X Share Button */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just hosted a ${event.activity_type} squad in ${event.locality}! Join the roster: ${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
                  title="Share on X"
                >
                  <XIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Completed Event Verification Group Photo */}
          {event.status === 'Completed' && event.photo_url && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>Match Group Selfie</span>
              </h3>
              <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
                <img
                  src={event.photo_url}
                  alt="Group Verification"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Roster Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Squad Roster ({event.bookings?.length || 0}/{event.max_slots} slots)</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {/* Host Roster Card */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/5">
                <div className="flex items-center gap-2.5">
                  <img
                    src={event.host?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                    alt="Host"
                    className="h-8 w-8 rounded-full border border-indigo-500/40 object-cover bg-slate-900"
                  />
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1">
                      {event.host?.username || 'Host'}
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded font-semibold leading-none py-0.5">Host</span>
                    </p>
                    <p className="text-[9px] text-slate-400 flex items-center gap-0.5 leading-none mt-0.5">
                      🤝 {event.host?.trust_points || 150} TrustPoints
                    </p>
                  </div>
                </div>
              </div>

              {/* Roster Members Cards */}
              {event.bookings?.filter(b => b.user_id !== event.host_id).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-900/10">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={booking.user?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                      alt="Player"
                      className="h-8 w-8 rounded-full border border-slate-700 object-cover bg-slate-900"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-200">{booking.user?.username || 'Player'}</p>
                    </div>
                  </div>

                  {event.host_id === currentUser?.id && (
                    <button
                      onClick={() => handleRejectBooking(booking.id, booking.user_id)}
                      disabled={submittingAction}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/10 text-[10px] transition-colors shrink-0"
                    >
                      Kick
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          {currentUser && (
            <div className="space-y-2 border-t border-slate-800/60 pt-4">
              {/* Host Actions */}
              {event.host_id === currentUser.id ? (
                event.status === 'Open' && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setShowCompletionForm(true)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg transition-all"
                    >
                      Complete Session & Disburse TrustPoints
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mb-1">
                      Requires uploading a verified group selfie to award successful hostings and points.
                    </p>

                    {/* Inline Host Cancellation */}
                    {!showCancelConfirm ? (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 font-semibold text-[11px] transition-colors"
                      >
                        Cancel Squad Event
                      </button>
                    ) : (
                      <div className="flex gap-2 animate-fade-in">
                        <button
                          onClick={handleCancelEvent}
                          disabled={submittingAction}
                          className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] transition-colors"
                        >
                          Confirm Cancel Match
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className="flex-1 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-[11px] transition-colors"
                        >
                          Keep Match
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : isJoined ? (
                /* Guest leaves match */
                <button
                  onClick={handleLeaveEvent}
                  disabled={submittingAction}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs transition-all active:scale-98"
                >
                  Leave Squad Roster
                </button>
              ) : (
                /* Guest joins match */
                event.bookings?.length < event.max_slots && event.status === 'Open' && (
                  <button
                    onClick={handleJoinFree}
                    disabled={submittingAction}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-98"
                  >
                    Confirm & Join Squad
                  </button>
                )
              )}
            </div>
          )}

          {/* Roster Live Discussion Board */}
          {isJoined && (
            <div className="border-t border-slate-800/80 pt-4 flex flex-col h-72">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Roster Discussion Board
              </h3>
              
              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto bg-slate-950/40 rounded-xl p-3 border border-slate-900 space-y-2.5">
                {messages.length === 0 ? (
                  <p className="text-center text-slate-500 text-[10px] py-10">No messages in chat. Type below to say hi!</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-2 text-xs">
                      <img
                        src={msg.user?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                        alt="User"
                        className="h-6.5 w-6.5 rounded-full mt-0.5 object-cover bg-slate-900 border border-slate-800"
                      />
                      <div className="space-y-0.5 max-w-[260px]">
                        <p className="font-semibold text-slate-400 text-[10px] leading-none">
                          {msg.user?.username || 'Player'}
                        </p>
                        <p className="bg-slate-900/60 p-2 rounded-xl text-[11px] text-slate-200 border border-slate-900 leading-normal break-words">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  placeholder="Send match details or coordinates..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-950/30 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-700 text-slate-200 placeholder-slate-600"
                />
                <button type="submit" className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all active:scale-95">
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>
          )}
        </div>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {showCompletionForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCompletionForm(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl glass-premium p-6 border border-slate-800 shadow-2xl z-50 space-y-4"
            >
              <h3 className="font-bold text-base text-white text-center">Complete Event & Release Payouts</h3>
              <p className="text-slate-400 text-xs leading-relaxed text-center">
                Please upload a group selfie photo taken with the attendees at the sports venue. Once uploaded, the match is completed, and TrustPoints are released to everyone.
              </p>

              <form onSubmit={handleCompleteEvent} className="space-y-4 pt-1">
                {/* File picker */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/30 flex flex-col items-center justify-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedPhoto(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  {selectedPhoto ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-emerald-400 animate-bounce" />
                      <p className="text-xs font-semibold text-white">{selectedPhoto.name}</p>
                      <p className="text-[10px] text-slate-500">{(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB (will be compressed to ~150KB)</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-300">Click to upload group selfie</p>
                      <p className="text-[10px] text-slate-500">Accepts JPEG, PNG from mobile camera</p>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={uploadingPhoto}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg transition-all"
                  >
                    {uploadingPhoto ? 'Uploading & Disbursing...' : 'Disburse Rewards'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompletionForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
