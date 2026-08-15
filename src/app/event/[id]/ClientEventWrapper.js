'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DetailsDrawer from '@/components/DetailsDrawer';

export default function ClientEventWrapper({ eventId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
      setAuthLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleClose = () => {
    // Redirect back to main dashboard
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="text-center py-4 space-y-1">
        <div className="h-4 w-4 border border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] text-slate-500">Checking ticket details...</p>
      </div>
    );
  }

  return (
    <DetailsDrawer
      eventId={eventId}
      currentUser={currentUser}
      onClose={handleClose}
      onActionComplete={() => {
        // Refresh the page
        router.refresh();
      }}
    />
  );
}
