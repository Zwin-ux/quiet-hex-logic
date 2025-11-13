import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useGuestMode } from './useGuestMode';
import { supabase } from '@/integrations/supabase/client';

export function useGuestConversion() {
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);

  useEffect(() => {
    if (!user || !isGuest || hasShownModal) return;

    // Check if guest has completed any AI matches
    const checkGuestMatches = async () => {
      const { data: completedMatches, error } = await supabase
        .from('matches')
        .select('id, status')
        .eq('owner', user.id)
        .eq('status', 'finished')
        .not('ai_difficulty', 'is', null)
        .limit(1);

      if (error) {
        console.error('Error checking guest matches:', error);
        return;
      }

      // Show modal after first completed AI match
      if (completedMatches && completedMatches.length > 0) {
        // Check if user has seen the modal in this session
        const modalShown = sessionStorage.getItem('guest_conversion_modal_shown');
        if (!modalShown) {
          setShowConversionModal(true);
          setHasShownModal(true);
          sessionStorage.setItem('guest_conversion_modal_shown', 'true');
        }
      }
    };

    checkGuestMatches();
  }, [user, isGuest, hasShownModal]);

  // Listen for new match completions
  useEffect(() => {
    if (!user || !isGuest || hasShownModal) return;

    const channel = supabase
      .channel('match_completion')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `owner=eq.${user.id}`,
        },
        (payload) => {
          const newMatch = payload.new as any;
          if (newMatch.status === 'finished' && newMatch.ai_difficulty) {
            const modalShown = sessionStorage.getItem('guest_conversion_modal_shown');
            if (!modalShown) {
              setShowConversionModal(true);
              setHasShownModal(true);
              sessionStorage.setItem('guest_conversion_modal_shown', 'true');
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isGuest, hasShownModal]);

  return {
    showConversionModal,
    setShowConversionModal,
  };
}
