'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MOCK_CHATS } from '@/lib/mockData';
import { X, MapPin, Calendar, Clock, Award, Send, Users, AlertTriangle, Image as ImageIcon, CheckCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/lib/supabase'; // We'll add this canvas utility later
import { ACTIVITIES } from '@/lib/constants';

export default function DetailsDrawer({ eventId, currentUser, onClose, onActionComplete }) {
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

  // UPI payment state
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [upiUtr, setUpiUtr] = useState('');

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isMock = (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true) || (currentUser?.id === '00000000-0000-0000-0000-000000000000');

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      alert('Please Sign-In via Google first.');
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
      alert(e.message || 'Failed to join. Roster might be full.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Join Paid Event via UPI UTR
  const handleUpiSubmit = async (e) => {
    e.preventDefault();
    if (!upiUtr.trim() || upiUtr.length !== 12 || isNaN(upiUtr)) {
      alert('Please enter a valid 12-digit numeric UPI reference (UTR) code.');
      return;
    }
    setSubmittingAction(true);

    if (isMock) {
      setTimeout(() => {
        setIsJoined(true);
        setShowUpiModal(false);
        setUpiUtr('');
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
          payment_status: 'Pending',
          payment_ref: upiUtr
        });

      if (error) throw error;

      // Notify host to verify UTR
      await supabase.from('notifications').insert({
        user_id: event.host_id,
        title: 'Payment Verification Needed 💰',
        message: `A guest has joined your match "${event.title}" via UPI. Please verify credit of ₹${event.cost_value} with UTR: ${upiUtr}.`
      });

      setShowUpiModal(false);
      setUpiUtr('');
      alert('UTR submitted! Your booking is pending host confirmation.');
      if (onActionComplete) onActionComplete();
      fetchDetails();
    } catch (err) {
      alert('This UTR has already been submitted. Please check the transaction record and enter a unique reference.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Process payment using Razorpay
  const handleRazorpayPayment = async () => {
    setSubmittingAction(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        return;
      }

      // 1. Create a pending booking record to link order reference
      let bookingId;
      if (isMock) {
        bookingId = `mock_bk_${Date.now()}`;
      } else {
        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            event_id: eventId,
            user_id: currentUser.id,
            payment_status: 'Pending',
            payment_ref: 'Razorpay_Initiating'
          })
          .select('id')
          .single();
        
        if (bookingError) throw bookingError;
        bookingId = newBooking.id;
      }

      // 2. Register Razorpay Order on server
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: event.cost_value, bookingId })
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error);

      // 3. Launch Razorpay modal or run simulation fallback
      if (orderData.isSimulated) {
        // Simulated signature verification
        const verifyRes = await fetch('/api/payments/verify-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: 'sim_pay_987654',
            razorpaySignature: 'sim_sig_987654',
            bookingId,
            userEmail: currentUser.email
          })
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          alert('Simulated Razorpay Checkout Successful! (Test Mode)');
          setIsJoined(true);
          setShowPaymentChoice(false);
          if (onActionComplete) onActionComplete();
          fetchDetails();
        } else {
          throw new Error(verifyData.error);
        }
      } else {
        // Launch real checkout modal
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_your_key_id',
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'ActiveWeekend Bangalore',
          description: `Roster spot for ${event.title}`,
          order_id: orderData.orderId,
          handler: async function (response) {
            setSubmittingAction(true);
            const verifyRes = await fetch('/api/payments/verify-signature', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                bookingId,
                userEmail: currentUser.email
              })
            });
            const verifyData = await verifyRes.json();
            setSubmittingAction(false);
            if (verifyData.success) {
              alert('Payment verified and slot confirmed! 🎉');
              setIsJoined(true);
              setShowPaymentChoice(false);
              if (onActionComplete) onActionComplete();
              fetchDetails();
            } else {
              alert('Payment verification failed: ' + verifyData.error);
            }
          },
          prefill: {
            email: currentUser.email
          },
          theme: {
            color: '#10b981'
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error processing payment.');
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
      if (event.cost_type === 'Free') {
        warningText = '🚨 WARNING: This event starts in less than 6 hours. Leaving now will penalize you 30 TrustPoints. Proceed?';
      } else {
        warningText = '🚨 WARNING: This event starts in less than 6 hours. Leaving now will forfeit 50% of your court share payment. Proceed?';
      }
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
        if (event.cost_type === 'Free') {
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
        } else {
          // Refund 50% / keep 50% in database record status
          await supabase
            .from('bookings')
            .update({ payment_status: 'Refunded', payment_ref: 'Forfeit_50_Percent' })
            .eq('id', bookingRecord.id);
        }
      }

      setIsJoined(false);
      setBookingRecord(null);
      if (onActionComplete) onActionComplete();
      fetchDetails();
    } catch (e) {
      alert(e.message || 'Failed to leave roster.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Host: Confirm guest UTR payment
  const handleConfirmPayment = async (bookingId, guestId) => {
    if (isMock) {
      alert('Mock payment confirmed!');
      return;
    }
    setSubmittingAction(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'Escrow_Held' })
        .eq('id', bookingId);

      if (error) throw error;

      // Notify guest
      await supabase.from('notifications').insert({
        user_id: guestId,
        title: 'Booking Confirmed! 🏸',
        message: `Your payment was verified by the host for "${event.title}". You are now a confirmed squad member!`
      });

      fetchDetails();
    } catch (e) {
      alert(e.message);
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
      alert(e.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Host: Handle event completion (upload selfie and release escrow)
  const handleCompleteEvent = async (e) => {
    e.preventDefault();
    if (!selectedPhoto && !isMock) {
      alert('Please upload a verified group selfie taken at the venue to complete the event.');
      return;
    }
    setUploadingPhoto(true);

    if (isMock) {
      setTimeout(() => {
        alert('Event successfully completed! (Mock points disbursed)');
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

      alert('Event successfully completed! Group selfie uploaded, and rewards disbursed.');
      setShowCompletionForm(false);
      if (onActionComplete) onActionComplete();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error processing completion.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] glass-premium p-6 border-l border-slate-800 shadow-2xl flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Fetching match profile...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;
  const activity = ACTIVITIES.find(a => a.value === event.activity_type) || ACTIVITIES[0];

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
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{activity.icon}</span>
            <div>
              <h2 className="font-bold text-sm text-white truncate max-w-[280px]">{event.title}</h2>
              <p className="text-[10px] text-slate-400 leading-none">{event.skill_level} · {event.locality}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900">
            <X className="h-4.5 w-4.5" />
          </button>
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
          </div>

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
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        Status: <span className={booking.payment_status === 'Pending' ? 'text-orange-400 font-bold' : 'text-emerald-400'}>
                          {booking.payment_status}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Host verification buttons (Pending UTR validation) */}
                  {event.host_id === currentUser?.id && booking.payment_status === 'Pending' && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleConfirmPayment(booking.id, booking.user_id)}
                        disabled={submittingAction}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectBooking(booking.id, booking.user_id)}
                        disabled={submittingAction}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 font-semibold border border-rose-500/20 text-[10px] transition-colors"
                      >
                        Reject
                      </button>
                    </div>
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
                    <p className="text-[10px] text-slate-500 text-center">
                      Requires uploading a verified group selfie. Releases escrow funds to your account.
                    </p>
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
                  event.cost_type === 'Free' ? (
                    <button
                      onClick={handleJoinFree}
                      disabled={submittingAction}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-98"
                    >
                      Confirm & Join Squad
                    </button>
                  ) : (
                    /* Paid join trigger */
                    <button
                      onClick={() => setShowPaymentChoice(true)}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-98"
                    >
                      Join (Pay ₹{event.cost_value})
                    </button>
                  )
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
      </motion.div>

      {/* UPI QR Payment Modal */}
      <AnimatePresence>
        {showUpiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowUpiModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl glass-premium p-6 border border-slate-800 shadow-2xl z-50 text-center space-y-4"
            >
              <h3 className="font-bold text-base text-white">Scan QR to UPI Host</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Scan the QR code below using your GPay/PhonePe/Paytm app to transfer court share of **₹{event.cost_value}** to host's UPI handle.
              </p>
              
              {/* UPI QR Code image generator */}
              <div className="flex justify-center p-2 rounded-xl bg-white w-48 h-48 mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `upi://pay?pa=activeweekend@okaxis&pn=ActiveWeekend&am=${event.cost_value}.00&tn=Join_Event_${event.id}&cu=INR`
                  )}`}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <form onSubmit={handleUpiSubmit} className="space-y-3.5 text-left pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Enter 12-Digit UPI UTR / Transaction Ref
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="e.g. 628490184719"
                    value={upiUtr}
                    onChange={(e) => setUpiUtr(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-700 text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Find the 12-digit UTR under the transaction details in your UPI app.
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
                  >
                    {submittingAction ? 'Verifying...' : 'Submit UTR Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpiModal(false)}
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

      {/* Payment Choice Selection Modal */}
      <AnimatePresence>
        {showPaymentChoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowPaymentChoice(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl glass-premium p-6 border border-slate-800 shadow-2xl z-50 text-center space-y-4"
            >
              <h3 className="font-bold text-base text-white">Choose Payment Method</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Choose how you want to pay court share of **₹{event.cost_value}** to join the squad roster.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setShowPaymentChoice(false);
                    setShowUpiModal(true);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <span className="text-base">🤝</span>
                  <span>Pay via direct UPI QR (Zero Fees)</span>
                </button>

                <button
                  onClick={handleRazorpayPayment}
                  disabled={submittingAction}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
                >
                  <span className="text-base">💳</span>
                  <span>Pay via Card/Netbanking (Platform Escrow)</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowPaymentChoice(false)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-semibold underline underline-offset-4"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
