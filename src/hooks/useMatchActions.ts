import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGameSounds } from '@/hooks/useGameSounds';
import type { GameEngine } from '@/lib/engine/types';
import { loadLocalMatch, saveLocalMatch } from '@/lib/localMatches/storage';
import type { MatchData, Player, RatingResult } from './useMatchState';

interface UseMatchActionsArgs {
  match: MatchData | null;
  setMatch: React.Dispatch<React.SetStateAction<MatchData | null>>;
  engine: GameEngine<any> | null;
  setEngine: React.Dispatch<React.SetStateAction<GameEngine<any> | null>>;
  players: Player[];
  user: { id: string } | null;
  isDiscordLocalMatch: boolean;
  isLocalMatch: boolean;
  isSpectating: boolean;
  setLastMove: React.Dispatch<React.SetStateAction<any | null>>;
  setWinningPath: React.Dispatch<React.SetStateAction<number[]>>;
  setRatingResult: React.Dispatch<React.SetStateAction<RatingResult | null>>;
  setShowConfetti: React.Dispatch<React.SetStateAction<boolean>>;
  loadMatch: () => Promise<any>;
  navigate: (to: string | number, options?: any) => void;
}

function normalizeErrorMessage(err: any): string {
  return err?.message || err?.error_description || err?.error || 'Request failed';
}

export function useMatchActions({
  match, setMatch,
  engine, setEngine,
  players, user,
  isDiscordLocalMatch, isLocalMatch, isSpectating,
  setLastMove, setWinningPath, setRatingResult, setShowConfetti,
  loadMatch, navigate,
}: UseMatchActionsArgs) {
  const moveInProgress = useRef(false);
  const { playPlaceSound, playWinSound, playLoseSound, playErrorSound } = useGameSounds();

  const applyLocalUpdate = useCallback((moveData: Record<string, unknown>, nextEngine: GameEngine<any>) => {
    if (!match) return;
    const local = loadLocalMatch(match.id);
    if (!local) return;

    const nextTurn = match.turn + 1;

    let status: 'active' | 'finished' = 'active';
    let winner: 1 | 2 | null = null;
    let result: 'p1' | 'p2' | 'draw' | null = null;

    const w = nextEngine.winner();
    if (w) {
      status = 'finished';
      winner = w as 1 | 2;
      result = w === 1 ? 'p1' : 'p2';
    } else if (nextEngine.isDraw()) {
      status = 'finished';
      winner = null;
      result = 'draw';
    }

    const updatedLocal = {
      ...local,
      moves: [...local.moves, { move: moveData }],
      turn: nextTurn,
      status,
      winner,
      result,
    };
    saveLocalMatch(updatedLocal);

    setMatch((prev) => prev ? { ...prev, turn: nextTurn, status, winner, result } : prev);
  }, [match, setMatch]);

  const endMatch = useCallback(async (
    winnerColor: number,
    reason: 'forfeit' | 'timeout' | 'disconnect',
    toastMessage?: { title: string; description?: string }
  ) => {
    if (!match || match.status !== 'active') return false;

    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'finished', winner: winnerColor, updated_at: new Date().toISOString() })
        .eq('id', match.id)
        .eq('status', 'active');

      if (error) {
        console.error(`Failed to end match (${reason}):`, error);
        return false;
      }

      if (toastMessage) toast.info(toastMessage.title, { description: toastMessage.description });

      if (match.is_ranked) {
        const { data: matchPlayers } = await supabase
          .from('match_players')
          .select('profile_id, color')
          .eq('match_id', match.id)
          .eq('is_bot', false);

        if (matchPlayers && matchPlayers.length === 2) {
          const p1 = matchPlayers.find(p => p.color === 1);
          const p2 = matchPlayers.find(p => p.color === 2);
          const gameKey = match.game_key ?? 'hex';
          const resultKey = winnerColor === 1 ? 'p1' : 'p2';

          if (p1 && p2) {
            const { data: res, error: ratingError } = await supabase.functions.invoke('update-ratings', {
              body: { matchId: match.id, gameKey, result: resultKey, p1Id: p1.profile_id, p2Id: p2.profile_id }
            });
            if (!ratingError && res?.p1 && res?.p2) {
              const winnerIsP1 = winnerColor === 1;
              setRatingResult({
                winner: winnerIsP1 ? res.p1 : res.p2,
                loser: winnerIsP1 ? res.p2 : res.p1,
              });
            }
          }
        }
      }

      await loadMatch();
      return true;
    } catch (e) {
      console.error(`Error ending match (${reason}):`, e);
      return false;
    }
  }, [match, loadMatch, setRatingResult]);

  const handleMove = useCallback(async (move: any) => {
    if (!engine || !match) return;
    if (isDiscordLocalMatch) return; // handled in Match.ts

    if (!isLocalMatch && !user) return;
    if (moveInProgress.current) return;

    if (isSpectating) {
      playErrorSound();
      toast.error('Spectators cannot make moves');
      return;
    }

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    const isAIMatch = match.ai_difficulty != null;
    const isAITurn = isAIMatch && currentColor === 2;

    if (isAITurn) {
      playErrorSound();
      toast.error('Wait for the computer to move');
      return;
    }

    if (!isLocalMatch) {
      if (!currentPlayer || currentPlayer.profile_id !== user?.id) {
        playErrorSound();
        toast.error('Not your turn');
        return;
      }
    }

    if (!engine.isLegal(move)) {
      playErrorSound();
      toast.error('Invalid move');
      return;
    }

    moveInProgress.current = true;
    playPlaceSound();

    const optimistic = engine.clone();
    optimistic.applyMove(move);
    setEngine(optimistic);
    setLastMove(move);

    // Winning path (Hex)
    const rawHex = (optimistic as any)?.hex;
    if (rawHex && typeof rawHex.winner === 'function' && rawHex.winner()) {
      const path = typeof rawHex.getWinningPath === 'function' ? rawHex.getWinningPath() : null;
      setWinningPath(path || []);
    } else {
      setWinningPath([]);
    }

    try {
      if (isLocalMatch) {
        const moveData = engine.serializeMove(move);
        applyLocalUpdate(moveData, optimistic);
        return;
      }

      const actionId = crypto.randomUUID();
      const gameKey = match.game_key ?? 'hex';

      // Hex uses legacy `cell` for moves (including swap as null).
      const body =
        gameKey === 'hex'
          ? { matchId: match.id, cell: (move ?? null), actionId }
          : { matchId: match.id, move: engine.serializeMove(move), actionId };

      const { data: result, error } = await supabase.functions.invoke('apply-move', { body });

      if (error || !result?.success) {
        await loadMatch();
        const msg = result?.error || error?.message || 'Invalid move';
        if (msg.includes('Rate limit')) toast.error('Too many moves too quickly');
        else toast.error(msg);
        return;
      }

      if (!result.cached) await loadMatch();

      if (result.status === 'finished') {
        if (result.result === 'draw') {
          toast.success('Draw', { description: 'Game ended in a draw', duration: 5000 });
          return;
        }
        const winner = result.winner as (1 | 2 | null);
        if (winner) {
          const isVictory = winner === currentPlayer?.color;
          if (isVictory) { playWinSound(); setShowConfetti(true); }
          else { playLoseSound(); }
          toast.success(isVictory ? 'Victory!' : 'Game Over', {
            description: isVictory ? 'You won!' : 'Opponent wins!',
            duration: 5000
          });
        }
      }
    } catch (err) {
      await loadMatch();
      console.error('Move error:', err);
      toast.error('Failed to make move', { description: normalizeErrorMessage(err) });
    } finally {
      moveInProgress.current = false;
    }
  }, [
    engine, match, user, players,
    isDiscordLocalMatch, isLocalMatch, isSpectating,
    applyLocalUpdate, loadMatch,
    setEngine, setLastMove, setWinningPath, setShowConfetti,
    playPlaceSound, playWinSound, playLoseSound, playErrorSound,
  ]);

  const handleSwapColors = useCallback(async () => {
    if (!match) return;
    const gameKey = match.game_key ?? 'hex';
    if (gameKey !== 'hex') return;
    await handleMove(null);
  }, [match, handleMove]);

  const handleForfeit = useCallback(async () => {
    if (!match || !user || match.status !== 'active') return;
    const userPlayer = players.find(p => p.profile_id === user.id);
    if (!userPlayer) return;
    const winnerColor = userPlayer.color === 1 ? 2 : 1;
    const success = await endMatch(winnerColor, 'forfeit', { title: 'You forfeited the match' });
    if (!success) toast.error('Failed to forfeit');
  }, [match, user, players, endMatch]);

  const handleOfferDraw = useCallback(async () => {
    if (!match || !user || match.status !== 'active') return;
    try {
      const { data: result, error } = await supabase.functions.invoke('offer-draw', { body: { matchId: match.id } });
      if (error || !result?.success) {
        toast.error(result?.error || error?.message || 'Failed to offer draw');
        return;
      }
      toast.success('Draw offered', { description: 'Waiting for opponent to respond' });
      await loadMatch();
    } catch (e) {
      console.error('Draw offer error:', e);
      toast.error('Failed to offer draw');
    }
  }, [match, user, loadMatch]);

  const handleRespondDraw = useCallback(async (accept: boolean) => {
    if (!match || !user || match.status !== 'active') return;
    try {
      const { data: result, error } = await supabase.functions.invoke('respond-draw', { body: { matchId: match.id, accept } });
      if (error || !result?.success) {
        toast.error(result?.error || error?.message || 'Failed to respond to draw');
        return;
      }
      toast[accept ? 'success' : 'info'](accept ? 'Draw accepted' : 'Draw declined', { description: accept ? 'The match ended in a draw' : 'The match continues' });
      await loadMatch();
    } catch (e) {
      console.error('Draw response error:', e);
      toast.error('Failed to respond to draw');
    }
  }, [match, user, loadMatch]);

  const handleRematch = useCallback(async (matchId: string, isPlayer: boolean) => {
    if (!matchId || !isPlayer) return;
    try {
      const { data, error } = await supabase.functions.invoke('rematch-lobby', { body: { matchId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Rematch lobby created!', { description: 'Navigating to new lobby...', duration: 3000 });
      navigate(`/lobby/${data.lobby.id}`);
    } catch (error: any) {
      console.error('Rematch error:', error);
      toast.error('Failed to create rematch', { description: error.message });
    }
  }, [navigate]);

  const handlePlayAgainAI = useCallback(() => {
    if (!match) return;
    navigate('/lobby', {
      state: {
        createAI: true,
        difficulty: match.ai_difficulty,
        boardSize: match.size,
        gameKey: match.game_key ?? 'hex',
      },
    });
  }, [match, navigate]);

  return {
    handleMove,
    handleSwapColors,
    handleForfeit,
    handleOfferDraw,
    handleRespondDraw,
    handleRematch,
    handlePlayAgainAI,
    endMatch,
    moveInProgress,
    playPlaceSound, playWinSound, playLoseSound, playErrorSound,
  };
}

