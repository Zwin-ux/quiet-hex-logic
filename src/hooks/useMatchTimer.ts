import { useEffect, useState, useRef } from 'react';
import type { MatchData } from './useMatchState';

interface UseMatchTimerArgs {
  match: MatchData | null;
  endMatch: (winnerColor: number, reason: 'forfeit' | 'timeout' | 'disconnect', toastMessage?: { title: string; description?: string }) => Promise<boolean>;
}

export function useMatchTimer({ match, endMatch }: UseMatchTimerArgs) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timeoutHandled = useRef(false);

  useEffect(() => {
    if (!match || match.status !== 'active' || !match.turn_timer_seconds || !match.turn_started_at) {
      setTimeRemaining(null);
      timeoutHandled.current = false;
      return;
    }

    const handleTimeout = async () => {
      if (timeoutHandled.current) return;
      timeoutHandled.current = true;
      const currentColor = match.turn % 2 === 1 ? 1 : 2;
      const winnerColor = currentColor === 1 ? 2 : 1;
      await endMatch(winnerColor, 'timeout', {
        title: 'Time ran out!',
        description: `${currentColor === 1 ? 'Indigo' : 'Ochre'} forfeits the game.`
      });
    };

    const updateTimer = () => {
      const turnStartTime = new Date(match.turn_started_at!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - turnStartTime) / 1000);
      const remaining = Math.max(0, match.turn_timer_seconds! - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0 && !timeoutHandled.current) {
        handleTimeout();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [match, endMatch]);

  return { timeRemaining };
}
