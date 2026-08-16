'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, LogIn, LogOut, Award, ChevronDown, Sparkles, Check, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/lib/ToastContext';

export default function Header() {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set up Supabase Auth state listener
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchNotifications(session.user.id);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchNotifications(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profiles table data
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
    } else if (error && error.code === 'PGRST116') {
      // In case trigger didn't run yet or profile doesn't exist, retry shortly
      setTimeout(() => fetchProfile(userId), 1500);
    }
  };

  // Subscribe to real-time updates for profiles and notifications
  useEffect(() => {
    if (!user) return;

    // 1. Profile Realtime Channel
    const profileChannel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();

    // 2. Notifications Realtime Channel
    const notificationsChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);

  // Fetch notifications
  const fetchNotifications = async (userId) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const handleLogin = async () => {
    // In local development with mock credentials, sign in with a mock test session
    const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true;
    if (isMock) {
      showToast('Supabase credentials are not configured. Launching simulated profile.', 'warning');
      const mockId = '00000000-0000-0000-0000-000000000000';
      setUser({ id: mockId, email: 'bangalore.player@activeweekend.com' });
      setProfile({
        id: mockId,
        username: 'Siddharth (Namma HSR)',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sid',
        trust_points: 150,
        successful_hostings: 1
      });
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`
      }
    });
  };

  const handleLogout = async () => {
    const isMock = user?.id === '00000000-0000-0000-0000-000000000000';
    if (isMock) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-[rgba(255,255,255,0.06)] px-4 py-3 md:px-8">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div
            initial={{ rotate: -15, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 shadow-lg shadow-emerald-500/20"
          >
            <span className="font-bold text-white text-lg sm:text-xl">A</span>
          </motion.div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-300 bg-clip-text text-transparent">
              ActiveWeekend
            </h1>
          </div>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
          {user && profile ? (
            <>
              {/* TrustPoints Indicator */}
              <div className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-900/60 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-medium shadow-inner shadow-emerald-950/20">
                <span className="text-sm sm:text-base select-none">🤝</span>
                <span>{profile.trust_points}</span>
                <span className="text-[10px] text-slate-400 font-normal ml-0.5 hidden sm:inline">TrustPoints</span>
              </div>

              {/* Host Level Badge Progress */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
                <Award className="h-4 w-4 text-indigo-400" />
                <span className="text-xs">
                  {profile.successful_hostings >= 3 
                    ? '🏆 Premium Host' 
                    : `🏆 ${profile.successful_hostings}/3 Free Hosts`
                  }
                </span>
              </div>

              {/* Notifications Bell Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 transition-colors text-slate-300 hover:text-white"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0b0f19]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Panel */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 rounded-2xl glass-premium p-4 z-50 shadow-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                          >
                            <CheckSquare className="h-3 w-3" /> Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {notifications.length === 0 ? (
                          <p className="text-center text-slate-400 text-xs py-4">No notifications yet.</p>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => !notification.is_read && markAsRead(notification.id)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                notification.is_read
                                  ? 'bg-slate-900/20 border-slate-900/60 text-slate-400'
                                  : 'bg-emerald-950/20 border-emerald-900/40 text-slate-200 shadow-md shadow-emerald-950/15'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1 font-semibold mb-0.5">
                                <span>{notification.title}</span>
                                {!notification.is_read && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />}
                              </div>
                              <p className="text-[11px] leading-relaxed">{notification.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Avatar Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                  />
                  <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:inline" />
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-56 rounded-2xl glass-premium p-3 z-50 shadow-2xl text-slate-300"
                    >
                      <div className="px-2.5 py-1.5 border-b border-slate-800 mb-2">
                        <p className="font-semibold text-sm text-white truncate">{profile.username}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-rose-950/20 hover:text-rose-400 text-slate-300 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* Sign In Button */
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 font-medium text-xs text-white shadow-lg shadow-indigo-950/30 transition-all active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span>Google Sign-In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
