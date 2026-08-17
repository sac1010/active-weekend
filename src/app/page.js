'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LOCALITIES, ACTIVITIES, SKILL_LEVELS } from '@/lib/constants';
import { MOCK_EVENTS } from '@/lib/mockData';
import { Search, MapPin, Calendar, Filter, Plus, SlidersHorizontal, RefreshCw, Sparkles, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DetailsDrawer from '@/components/DetailsDrawer';
import HostFormModal from '@/components/HostFormModal';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/ToastContext';
import Link from 'next/link';

export default function ExploreDashboard() {
  const { showToast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('explore'); // 'explore', 'scheduled', 'hosted'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchLocality, setSearchLocality] = useState('');
  const [showLocalitySuggestions, setShowLocalitySuggestions] = useState(false);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Detail Drawer & Host Modal states
  const [activeEventId, setActiveEventId] = useState(null);
  const [showHostModal, setShowHostModal] = useState(false);

  // Set up auth state listener
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Parse direct query parameter to open detail drawer (e.g. from SEO landing links)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get('event');
      if (eventId) {
        setActiveEventId(eventId);
      }
    }
  }, []);

  // Fetch events from Supabase or Mock fallback
  const fetchEvents = async () => {
    setLoading(true);
    const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? true;

    if (isMock) {
      // Simulate API load
      setTimeout(() => {
        setEvents(MOCK_EVENTS);
        setLoading(false);
      }, 600);
      return;
    }

    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          host:host_id (username, avatar_url),
          bookings (
            user_id,
            payment_status,
            user:user_id (avatar_url, username)
          )
        `);

      // Modify query based on Tab
      if (activeTab === 'explore') {
        query = query.eq('status', 'Open');
      } else if (activeTab === 'scheduled') {
        if (!currentUser) {
          setEvents([]);
          setLoading(false);
          return;
        }
        // Query events where current user is booked and NOT the host
        const { data: bookedIds } = await supabase
          .from('bookings')
          .select('event_id')
          .eq('user_id', currentUser.id);

        const ids = bookedIds?.map(b => b.event_id) || [];
        if (ids.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }
        query = query.in('id', ids).neq('host_id', currentUser.id);
      } else if (activeTab === 'hosted') {
        if (!currentUser) {
          setEvents([]);
          setLoading(false);
          return;
        }
        query = query.eq('host_id', currentUser.id);
      }

      const { data, error } = await query.order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      console.error('Error fetching events:', e);
      setEvents(MOCK_EVENTS); // Fallback to mock on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeTab, currentUser]);

  // Filter dynamic list locally
  const filteredEvents = events.filter(event => {
    if (selectedCategory !== 'All' && event.activity_type !== selectedCategory) return false;
    if (searchLocality && !event.locality.toLowerCase().includes(searchLocality.toLowerCase())) return false;
    if (selectedSkillLevel !== 'All' && event.skill_level !== selectedSkillLevel) return false;
    if (selectedDate && event.event_date !== selectedDate) return false;
    return true;
  });

  const filteredLocalities = LOCALITIES.filter(loc =>
    loc.toLowerCase().includes(searchLocality.toLowerCase())
  ).slice(0, 5);

  const handleLocalitySelect = (loc) => {
    setSearchLocality(loc);
    setShowLocalitySuggestions(false);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedCategory('All');
    setSearchLocality('');
    setSelectedSkillLevel('All');
    setSelectedDate('');
  };

  // Render Visual Roster Circles
  const renderRosterCircles = (event) => {
    const currentBookings = event.bookings || [];
    const circles = [];
    
    // Fill joined members
    currentBookings.forEach((booking, i) => {
      circles.push(
        <div key={`filled-${i}`} className="relative group shrink-0">
          <img
            src={booking.user?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
            alt="Attendee"
            className="h-8 w-8 rounded-full border border-emerald-500/40 bg-slate-900 object-cover"
          />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 rounded bg-slate-950 px-2 py-0.5 text-[10px] text-white transition-all group-hover:scale-100 whitespace-nowrap z-10 border border-slate-800">
            {booking.user?.username || 'Player'}
          </span>
        </div>
      );
    });

    // Fill remaining spots
    const emptySpots = Math.max(0, event.max_slots - currentBookings.length);
    for (let i = 0; i < emptySpots; i++) {
      circles.push(
        <div 
          key={`empty-${i}`} 
          className="h-8 w-8 rounded-full border-2 border-dashed border-slate-700/60 bg-slate-900/30 flex items-center justify-center text-[10px] text-slate-500 font-medium shrink-0"
          title="Empty Spot"
        >
          +
        </div>
      );
    }

    return (
      <div className="flex items-center -space-x-1.5 overflow-hidden">
        {circles}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header Promo Banner / SEO Marketing Landing Hero */}
      {currentUser ? (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-emerald-950/40 via-indigo-950/20 to-slate-950 p-6 border border-emerald-500/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="space-y-1.5 text-center md:text-left z-10">
            <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center justify-center md:justify-start gap-2">
              Namma Bengaluru, Play Active! <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
            </h2>
            <p className="text-slate-400 text-xs md:text-sm max-w-lg leading-relaxed">
              Find local doubles partners, board gamers, and pickleball players in your layouts. Split court fees securely with zero platform overhead.
            </p>
          </div>
          <button
            onClick={() => setShowHostModal(true)}
            className="relative px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xl shadow-emerald-950/45 transition-all flex items-center gap-2 shrink-0 active:scale-95 z-10"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3px]" />
            <span>Host Weekend Game</span>
          </button>
          {/* Glow decoration */}
          <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
        </motion.div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#05070e] p-8 md:p-12 border border-slate-800/80 shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent opacity-60" />
          <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
          <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />

          <div className="space-y-3.5 max-w-3xl z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
              Namma Bengaluru Meetups
            </span>
            <h1 className="text-2xl md:text-5xl font-black text-white leading-tight tracking-tight">
              Host & Join Local Meetups, Sports, and Hangouts in Bangalore
            </h1>
            <p className="text-slate-400 text-xs md:text-base leading-relaxed max-w-2xl mx-auto">
              Discover active cycling crews, book court shares, join trekking expeditions, or meet new people at pubs and cafes. 100% Free, community-driven, and moderated by TrustPoints reliability scores.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 z-10 w-full sm:w-auto">
            <button
              onClick={() => {
                const signInBtn = document.querySelector('[aria-label="Sign-In with Google"]');
                if (signInBtn) signInBtn.click();
              }}
              className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-xl shadow-emerald-950/45 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              Get Started (Sign In)
            </button>
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[placeholder*="Search Bangalore locality"]');
                if (searchInput) searchInput.focus();
              }}
              className="px-8 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              Browse Active Roster
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <div className="flex gap-2">
          {['explore', 'scheduled', 'hosted'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === tab ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'explore' ? 'Explore Plans' : tab === 'scheduled' ? 'My Schedule' : 'Hosted Events'}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-emerald-400 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
        <button 
          onClick={fetchEvents}
          className="p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Refresh List"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Interactive Filters Panel */}
      <div className="glass p-4 rounded-2xl border border-slate-800/80 space-y-4">
        {/* Row 1: Category & Locality Autocomplete */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Categories Selector */}
          <div className="md:col-span-6 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                selectedCategory === 'All'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Sports
            </button>
            {ACTIVITIES.map((act) => (
              <button
                key={act.value}
                onClick={() => setSelectedCategory(act.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                  selectedCategory === act.value
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{act.icon}</span>
                <span>{act.name}</span>
              </button>
            ))}
          </div>

          {/* Locality Search Autocomplete */}
          <div className="md:col-span-4 relative">
            <div className="flex items-center bg-slate-950/30 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <MapPin className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search Bangalore locality (e.g. HSR)..."
                value={searchLocality}
                onChange={(e) => {
                  setSearchLocality(e.target.value);
                  setShowLocalitySuggestions(true);
                }}
                onFocus={() => setShowLocalitySuggestions(true)}
                className="w-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
              />
              {searchLocality && (
                <button onClick={() => setSearchLocality('')} className="text-slate-500 hover:text-slate-300">×</button>
              )}
            </div>

            {/* Locality Suggestions Dropdown */}
            {showLocalitySuggestions && searchLocality && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto glass-premium border border-slate-800 rounded-xl p-1 z-30 shadow-2xl">
                {filteredLocalities.length === 0 ? (
                  <p className="text-slate-500 text-[10px] p-2 text-center">No localities match.</p>
                ) : (
                  filteredLocalities.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => handleLocalitySelect(loc)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-900 text-slate-300 hover:text-white transition-colors"
                    >
                      {loc}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Toggle Advanced Filters Button */}
          <div className="md:col-span-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{showAdvancedFilters ? 'Hide Filters' : 'More Filters'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Advanced Filters (Conditional) */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">

                {/* Skill Level Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Skill Level</label>
                  <select
                    value={selectedSkillLevel}
                    onChange={(e) => setSelectedSkillLevel(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                  >
                    <option value="All">All Skills</option>
                    {SKILL_LEVELS.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>

                {/* Match Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Match Date</label>
                  <div className="flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
                    <Calendar className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <button
                  onClick={resetFilters}
                  className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4"
                >
                  Reset All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Listing Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Loading squad listings near you...</p>
        </div>
      ) : (activeTab !== 'explore' && !currentUser) ? (
        <div className="text-center py-16 border border-slate-800 bg-slate-950/20 rounded-2xl p-8 max-w-md mx-auto space-y-4">
          <Award className="h-12 w-12 text-indigo-400 mx-auto animate-pulse" />
          <div className="space-y-1">
            <p className="text-slate-300 text-sm font-bold">Sign-In Required</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Please sign in with your Google account to view your scheduled games, chat with squads, or view your hosted events history.
            </p>
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800/80 rounded-2xl p-6">
          <p className="text-slate-400 text-sm font-semibold mb-1">No active squads found.</p>
          <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
            There are currently no events matching your selected filters. Try broadening your location or sport.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((event) => {
            const activity = ACTIVITIES.find(a => a.value === event.activity_type) || ACTIVITIES[0];
            return (
              <motion.div
                key={event.id}
                layoutId={`card-${event.id}`}
                onClick={() => setActiveEventId(event.id)}
                className={`glass p-5 rounded-2xl border hover:scale-[1.01] hover:shadow-lg cursor-pointer transition-all flex flex-col justify-between gap-4 ${activity.borderClass}`}
              >
                <div className="space-y-3">
                  {/* Top info row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${activity.bgClass} ${activity.textClass}`}>
                        {activity.icon} {event.activity_type}
                      </span>
                      {event.status !== 'Open' && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                          event.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {event.status}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(event.event_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Title & Venue */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white leading-snug truncate">
                      {event.title}
                    </h3>
                    <p className="text-slate-400 text-xs flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate">{event.locality} · {event.venue_name}</span>
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-800/50 my-1" />

                {/* Bottom row: Squad Slots Tracker & Price details */}
                <div className="flex items-center justify-between">
                  {/* Squad slot circles */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Squad Roster
                    </span>
                    {renderRosterCircles(event)}
                  </div>

                  {/* Status / Action tag */}
                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Status
                    </span>
                    <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${
                      event.status === 'Open'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                        : event.status === 'Completed'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Detail Drawer (Framer Motion) */}
      <AnimatePresence>
        {activeEventId && (
          <DetailsDrawer
            eventId={activeEventId}
            currentUser={currentUser}
            onClose={() => setActiveEventId(null)}
            onActionComplete={fetchEvents}
          />
        )}
      </AnimatePresence>

      {/* Host Event Form Modal */}
      <AnimatePresence>
        {showHostModal && (
          <HostFormModal
            currentUser={currentUser}
            onClose={() => setShowHostModal(false)}
            onActionComplete={fetchEvents}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Link SEO Footer Grid */}
      <footer className="border-t border-slate-900 bg-[#060a10] py-12 px-5 mt-16 rounded-2xl">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-left">
            <div className="space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Active Localities</h4>
              <ul className="space-y-2 text-slate-500">
                {["HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Whitefield", "Jayanagar", "JP Nagar"].map((loc) => (
                  <li key={loc}>
                    <Link href={`/bangalore/badminton/${loc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="hover:text-emerald-400 transition-colors">
                      Badminton in {loc}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Weekend Meetups</h4>
              <ul className="space-y-2 text-slate-500">
                {["HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Whitefield", "Jayanagar", "JP Nagar"].map((loc) => (
                  <li key={loc}>
                    <Link href={`/bangalore/board-games/${loc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="hover:text-emerald-400 transition-colors">
                      Board Games in {loc}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Active Rides</h4>
              <ul className="space-y-2 text-slate-500">
                {["HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Whitefield", "Jayanagar", "JP Nagar"].map((loc) => (
                  <li key={loc}>
                    <Link href={`/bangalore/cycling/${loc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="hover:text-emerald-400 transition-colors">
                      Cycling in {loc}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Pubs & Coffee</h4>
              <ul className="space-y-2 text-slate-500">
                {["HSR Layout", "Koramangala", "Indiranagar", "Bellandur", "Whitefield", "Jayanagar", "JP Nagar"].map((loc) => (
                  <li key={loc}>
                    <Link href={`/bangalore/pubs-&-bars/${loc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="hover:text-emerald-400 transition-colors">
                      Pubs & Bars in {loc}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-900/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10.5px] text-slate-600">
            <p>© 2026 ActiveWeekend. Namma Bengaluru's premier weekend coordinator.</p>
            <div className="flex gap-4">
              <Link href="/blog" className="hover:text-slate-400 transition-colors">Blog</Link>
              <Link href="/admin" className="hover:text-slate-400 transition-colors">Ops Console</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
