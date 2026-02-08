import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Hex } from '@/lib/hex/engine';
import { ChessEngine } from '@/lib/chess/engine';
import { TicTacToe } from '@/lib/ttt/engine';
import { CheckersEngine } from '@/lib/checkers/engine';
import { Connect4 } from '@/lib/connect4/engine';
import { SimpleHexAI, AIDifficulty } from '@/lib/hex/simpleAI';
import { useGameSounds } from '@/hooks/useGameSounds';
import { toast } from 'sonner';
import type { MatchData, Player, RatingResult } from './useMatchState';
import { loadLocalMatch, saveLocalMatch, type LocalMove } from '@/lib/localMatches/storage';

interface UseMatchActionsArgs {
  match: MatchData | null;
  setMatch: React.Dispatch<React.SetStateAction<MatchData | null>>;
  engine: Hex | ChessEngine | TicTacToe | CheckersEngine | Connect4 | null;
  setEngine: React.Dispatch<React.SetStateAction<Hex | ChessEngine | TicTacToe | CheckersEngine | Connect4 | null>>;
  players: Player[];
  user: { id: string } | null;
  isDiscordLocalMatch: boolean;
  isLocalMatch: boolean;
  isSpectating: boolean;
  setLastMove: React.Dispatch<React.SetStateAction<number | undefined>>;
  setLastChessMoveUci?: React.Dispatch<React.SetStateAction<string | null>>;
  setLastTttMove?: React.Dispatch<React.SetStateAction<number | null>>;
  setLastCheckersMovePath?: React.Dispatch<React.SetStateAction<number[] | null>>;
  setLastConnect4Move?: React.Dispatch<React.SetStateAction<number | null>>;
  setWinningPath: React.Dispatch<React.SetStateAction<number[]>>;
  setRatingResult: React.Dispatch<React.SetStateAction<RatingResult | null>>;
  setShowConfetti: React.Dispatch<React.SetStateAction<boolean>>;
  loadMatch: () => Promise<any>;
  navigate: (to: string | number, options?: any) => void;
}

export function useMatchActions({
  match, setMatch,
  engine, setEngine,
  players, user,
  isDiscordLocalMatch, isLocalMatch, isSpectating,
  setLastMove, setLastChessMoveUci, setLastTttMove, setLastCheckersMovePath, setLastConnect4Move, setWinningPath, setRatingResult, setShowConfetti,
  loadMatch, navigate,
}: UseMatchActionsArgs) {
  const moveInProgress = useRef(false);
  const { playPlaceSound, playWinSound, playLoseSound, playErrorSound } = useGameSounds();

  const applyLocalUpdate = useCallback((localMove: LocalMove, nextEngine: Hex | ChessEngine | TicTacToe | CheckersEngine | Connect4) => {
    if (!match) return;
    const local = loadLocalMatch(match.id);
    if (!local) return;

    const nextTurn = match.turn + 1;

    let status: 'active' | 'finished' = 'active';
    let winner: 1 | 2 | null = null;
    let result: 'p1' | 'p2' | 'draw' | null = null;

    if (nextEngine instanceof ChessEngine) {
      const r = nextEngine.result();
      if (r) {
        status = 'finished';
        result = r;
        winner = r === 'p1' ? 1 : r === 'p2' ? 2 : null;
      }
    } else if (nextEngine instanceof TicTacToe) {
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
      } else if (nextEngine instanceof CheckersEngine) {
        const w = nextEngine.winner();
        if (w) {
          status = 'finished';
          winner = w as 1 | 2;
          result = w === 1 ? 'p1' : 'p2';
        } else {
          // Draw rules (v1): threefold repetition OR 50 half-moves without capture.
          const moves = [...local.moves, localMove];
          const rep = new Map<string, number>();
          let noCapture = 0;
          const v = new CheckersEngine(local.rules ?? undefined);
          rep.set(v.hash(), 1);
          for (const m of moves) {
            if (m.kind !== 'checkers') continue;
            const move = { path: m.path.map((x) => Number(x)) };
            const captured = v.isCaptureMove(move);
            v.play(move);
            noCapture = captured ? 0 : noCapture + 1;
            const h = v.hash();
            rep.set(h, (rep.get(h) ?? 0) + 1);
          }
          const threefoldEnabled = v.rules.draw.threefoldRepetition === true;
          const drawByRep = threefoldEnabled && (rep.get(v.hash()) ?? 0) >= 3;
          const drawByNoCapture = noCapture >= v.rules.draw.noCaptureHalfMoves;
          if (drawByRep || drawByNoCapture) {
            status = 'finished';
            winner = null;
            result = 'draw';
          }
        }
      } else if (nextEngine instanceof Connect4) {
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
    }

    const updatedLocal = { ...local, moves: [...local.moves, localMove], turn: nextTurn, status, winner, result };
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

      if (toastMessage) {
        toast.info(toastMessage.title, { description: toastMessage.description });
      }

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
              // Convert to the existing winner/loser shape for UI.
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

  const handleCellClick = useCallback(async (cell: number) => {
    if (!engine || !match) return;
    if (((match.game_key) ?? 'hex') !== 'hex') return;
    if (!(engine instanceof Hex)) return;

    if (isDiscordLocalMatch || isLocalMatch) {
      // Handled by useAIOpponent
      return;
    }

    if (!user) return;
    if (moveInProgress.current) return;

    if (isSpectating) {
      playErrorSound();
      toast.error('Spectators cannot make moves');
      return;
    }

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    const isAITurn = !!match.ai_difficulty && currentColor === 2;
    if (isAITurn) {
      playErrorSound();
      toast.error('Wait for the computer to move');
      return;
    }
    if (!currentPlayer || currentPlayer.profile_id !== user.id) {
      playErrorSound();
      toast.error('Not your turn');
      return;
    }

    if (!engine.legal(cell)) {
      playErrorSound();
      toast.error('Invalid move');
      return;
    }

    moveInProgress.current = true;
    playPlaceSound();

    const optimisticEngine = engine.clone();
    optimisticEngine.play(cell);
    setEngine(optimisticEngine);
    setLastMove(cell);

    const actionId = crypto.randomUUID();

    try {
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, cell, actionId }
      });

      if (error || !result?.success) {
        await loadMatch();
        if (error?.message?.includes('Rate limit') || result?.error?.includes('Rate limit')) {
          toast.error('Too many moves too quickly');
          return;
        }
        if (result?.error?.includes('Match state changed')) return;
        toast.error(result?.error || error?.message || 'Invalid move');
        return;
      }

      if (result.cached) return;
      await loadMatch();

      const winner = result.winner;
      if (winner) {
        const isVictory = winner === currentPlayer.color;
        if (isVictory) { playWinSound(); setShowConfetti(true); }
        else { playLoseSound(); }
        toast.success(isVictory ? 'Victory!' : 'Game Over', {
          description: isVictory
            ? `You won as ${winner === 1 ? 'Indigo' : 'Ochre'}!`
            : `${winner === 1 ? 'Indigo' : 'Ochre'} wins!`,
          duration: 5000
        });
      }
    } catch (error) {
      await loadMatch();
      console.error('Move error:', error);
      toast.error('Failed to make move');
    } finally {
      moveInProgress.current = false;
    }
  }, [engine, match, user, players, isSpectating, isDiscordLocalMatch, isLocalMatch, loadMatch, setEngine, setLastMove, setShowConfetti, playPlaceSound, playWinSound, playLoseSound, playErrorSound]);

  const handleChessMove = useCallback(async (move: { uci: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => {
    if (!engine || !match) return;
    if (((match.game_key) ?? 'hex') !== 'chess') return;
    if (!(engine instanceof ChessEngine)) return;

    if (isDiscordLocalMatch) return;
    if (!isLocalMatch && !user) return;
    if (moveInProgress.current) return;

    if (isSpectating) {
      playErrorSound();
      toast.error('Spectators cannot make moves');
      return;
    }

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!isLocalMatch) {
      if (!user || !currentPlayer || currentPlayer.profile_id !== user.id) {
        playErrorSound();
        toast.error('Not your turn');
        return;
      }
    }

    if (!engine.legalUci(move.uci)) {
      playErrorSound();
      toast.error('Invalid move');
      return;
    }

    moveInProgress.current = true;
    playPlaceSound();

    try {
      // Optimistic apply via FEN clone.
      const optimistic = new ChessEngine(engine.fen());
      optimistic.playUci(move.uci);
      setEngine(optimistic);
      setLastMove(undefined);
      setWinningPath([]);
      setLastChessMoveUci?.(move.uci);

      if (isLocalMatch) {
        applyLocalUpdate({ kind: 'chess', uci: move.uci }, optimistic);
        if (optimistic.isGameOver()) {
          if (optimistic.result() === 'draw') toast.success('Draw', { description: 'Game ended in a draw', duration: 5000 });
          else toast.success('Game Over', { description: 'Checkmate', duration: 5000 });
        }
        return;
      }

      const actionId = crypto.randomUUID();
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, move, actionId }
      });

      if (error || !result?.success) {
        await loadMatch();
        toast.error(result?.error || error?.message || 'Invalid move');
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
          const isVictory = winner === currentPlayer.color;
          if (isVictory) { playWinSound(); setShowConfetti(true); }
          else { playLoseSound(); }
          toast.success(isVictory ? 'Victory!' : 'Game Over', {
            description: isVictory ? 'You won!' : 'Opponent wins!',
            duration: 5000
          });
        }
      }
    } catch (e) {
      await loadMatch();
      console.error('Chess move error:', e);
      toast.error('Failed to make move');
    } finally {
      moveInProgress.current = false;
    }
  }, [engine, match, user, players, isSpectating, isDiscordLocalMatch, isLocalMatch, applyLocalUpdate, loadMatch, setEngine, setLastMove, setWinningPath, setLastChessMoveUci, setShowConfetti, playPlaceSound, playWinSound, playLoseSound, playErrorSound]);

  const handleTttMove = useCallback(async (cell: number) => {
    if (!engine || !match) return;
    if (((match.game_key) ?? 'hex') !== 'ttt') return;
    if (!(engine instanceof TicTacToe)) return;

    if (isDiscordLocalMatch) return;
    if (!isLocalMatch && !user) return;
    if (moveInProgress.current) return;

    if (isSpectating) {
      playErrorSound();
      toast.error('Spectators cannot make moves');
      return;
    }

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!isLocalMatch) {
      if (!user || !currentPlayer || currentPlayer.profile_id !== user.id) {
        playErrorSound();
        toast.error('Not your turn');
        return;
      }
    }

    if (!engine.legal(cell)) {
      playErrorSound();
      toast.error('Invalid move');
      return;
    }

    moveInProgress.current = true;
    playPlaceSound();

    try {
      const optimistic = engine.clone();
      optimistic.play(cell);
      setEngine(optimistic);
      setLastMove(undefined);
      setWinningPath([]);
      setLastTttMove?.(cell);

      if (isLocalMatch) {
        applyLocalUpdate({ kind: 'ttt', cell }, optimistic);
        if (optimistic.winner()) toast.success('Game Over', { description: 'Winner', duration: 5000 });
        else if (optimistic.isDraw()) toast.success('Draw', { description: 'Game ended in a draw', duration: 5000 });
        return;
      }

      const actionId = crypto.randomUUID();
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, move: { cell }, actionId }
      });

      if (error || !result?.success) {
        await loadMatch();
        toast.error(result?.error || error?.message || 'Invalid move');
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
          const isVictory = winner === currentPlayer.color;
          if (isVictory) { playWinSound(); setShowConfetti(true); }
          else { playLoseSound(); }
          toast.success(isVictory ? 'Victory!' : 'Game Over', {
            description: isVictory ? 'You won!' : 'Opponent wins!',
            duration: 5000
          });
        }
      }
    } catch (e) {
      await loadMatch();
      console.error('TTT move error:', e);
      toast.error('Failed to make move');
    } finally {
      moveInProgress.current = false;
    }
  }, [engine, match, user, players, isSpectating, isDiscordLocalMatch, isLocalMatch, applyLocalUpdate, loadMatch, setEngine, setLastMove, setWinningPath, setLastTttMove, setShowConfetti, playPlaceSound, playWinSound, playLoseSound, playErrorSound]);

  const handleCheckersMove = useCallback(async (path: number[]) => {
    if (!engine || !match) return;
    if (((match.game_key) ?? 'hex') !== 'checkers') return;
    if (!(engine instanceof CheckersEngine)) return;

    if (isDiscordLocalMatch) return;
    if (!isLocalMatch && !user) return;
    if (moveInProgress.current) return;

    if (isSpectating) {
      playErrorSound();
      toast.error('Spectators cannot make moves');
      return;
    }

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!isLocalMatch) {
      if (!user || !currentPlayer || currentPlayer.profile_id !== user.id) {
        playErrorSound();
        toast.error('Not your turn');
        return;
      }
    }

    if (!engine.legalMove({ path })) {
      playErrorSound();
      toast.error('Invalid move');
      return;
    }

    moveInProgress.current = true;
    playPlaceSound();

    try {
      const optimistic = engine.clone();
      optimistic.play({ path });
      setEngine(optimistic);
      setLastMove(undefined);
      setWinningPath([]);
      setLastChessMoveUci?.(null);
      setLastTttMove?.(null);
      setLastCheckersMovePath?.(path);

      if (isLocalMatch) {
        applyLocalUpdate({ kind: 'checkers', path }, optimistic);
        if (optimistic.winner()) toast.success('Game Over', { description: 'Winner', duration: 5000 });
        return;
      }

      const actionId = crypto.randomUUID();
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, move: { path }, actionId }
      });

      if (error || !result?.success) {
        await loadMatch();
        toast.error(result?.error || error?.message || 'Invalid move');
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
          const isVictory = winner === currentPlayer.color;
          if (isVictory) { playWinSound(); setShowConfetti(true); }
          else { playLoseSound(); }
          toast.success(isVictory ? 'Victory!' : 'Game Over', {
            description: isVictory ? 'You won!' : 'Opponent wins!',
            duration: 5000
          });
        }
      }
    } catch (e) {
      await loadMatch();
      console.error('Checkers move error:', e);
      toast.error('Failed to make move');
    } finally {
      moveInProgress.current = false;
    }
  }, [engine, match, user, players, isSpectating, isDiscordLocalMatch, isLocalMatch, loadMatch, applyLocalUpdate, setEngine, setLastMove, setWinningPath, setLastChessMoveUci, setLastTttMove, setLastCheckersMovePath, setShowConfetti, playPlaceSound, playWinSound, playLoseSound, playErrorSound]);

  const handleConnect4Move = useCallback(async (col: number) => {
    if (!engine || !match) return;
    if (((match.game_key) ?? 'hex') !== 'connect4') return;
    if (!(engine instanceof Connect4)) return;

    if (isDiscordLocalMatch) return;
    if (!isLocalMatch && !user) return;
    if (moveInProgress.current) return;

    if (isSpectating) {
      playErrorSound();
      toast.error('Spectators cannot make moves');
      return;
    }

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!isLocalMatch) {
      if (!user || !currentPlayer || currentPlayer.profile_id !== user.id) {
        playErrorSound();
        toast.error('Not your turn');
        return;
      }
    }

    if (!engine.legal(col)) {
      playErrorSound();
      toast.error('Invalid move');
      return;
    }

    moveInProgress.current = true;
    playPlaceSound();

    try {
      const optimistic = engine.clone();
      optimistic.play(col);
      setEngine(optimistic);
      setLastMove(undefined);
      setWinningPath([]);
      setLastConnect4Move?.(col);

      if (isLocalMatch) {
        applyLocalUpdate({ kind: 'connect4', col }, optimistic);
        if (optimistic.winner()) toast.success('Game Over', { description: 'Winner', duration: 5000 });
        else if (optimistic.isDraw()) toast.success('Draw', { description: 'Board is full', duration: 5000 });
        return;
      }

      const actionId = crypto.randomUUID();
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, move: { col }, actionId }
      });

      if (error || !result?.success) {
        await loadMatch();
        toast.error(result?.error || error?.message || 'Invalid move');
        return;
      }

      if (!result.cached) await loadMatch();

      if (result.status === 'finished') {
        if (result.result === 'draw') {
          toast.success('Draw', { description: 'Board is full', duration: 5000 });
          return;
        }
        const winner = result.winner as (1 | 2 | null);
        if (winner) {
          const isVictory = winner === currentPlayer.color;
          if (isVictory) { playWinSound(); setShowConfetti(true); }
          else { playLoseSound(); }
          toast.success(isVictory ? 'Victory!' : 'Game Over', {
            description: isVictory ? 'You won!' : 'Opponent wins!',
            duration: 5000
          });
        }
      }
    } catch (e) {
      await loadMatch();
      console.error('Connect4 move error:', e);
      toast.error('Failed to make move');
    } finally {
      moveInProgress.current = false;
    }
  }, [engine, match, user, players, isSpectating, isDiscordLocalMatch, isLocalMatch, applyLocalUpdate, loadMatch, setEngine, setLastMove, setWinningPath, setLastConnect4Move, setShowConfetti, playPlaceSound, playWinSound, playLoseSound, playErrorSound]);

  const handleSwapColors = useCallback(async () => {
    if (!engine || !match || !user) return;
    if (((match.game_key) ?? 'hex') !== 'hex') return;
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!currentPlayer || currentPlayer.profile_id !== user.id) {
      toast.error('Not your turn');
      return;
    }

    const actionId = crypto.randomUUID();
    try {
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, cell: null, actionId }
      });
      if (error || !result?.success) {
        toast.error(result?.error || error?.message || 'Cannot swap colors');
        return;
      }
      if (result.cached) return;
      await loadMatch();
      toast.success('Colors swapped!', { description: 'You are now playing as Indigo' });
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('Failed to swap colors');
    }
  }, [engine, match, user, players, loadMatch]);

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
      const { data: result, error } = await supabase.functions.invoke('offer-draw', {
        body: { matchId: match.id }
      });
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
      const { data: result, error } = await supabase.functions.invoke('respond-draw', {
        body: { matchId: match.id, accept }
      });
      if (error || !result?.success) {
        toast.error(result?.error || error?.message || 'Failed to respond to draw');
        return;
      }
      if (accept) {
        toast.success('Draw accepted', { description: 'The match ended in a draw' });
      } else {
        toast.info('Draw declined', { description: 'The match continues' });
      }
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
    navigate('/lobby', { state: { createAI: true, difficulty: match.ai_difficulty, boardSize: match.size } });
  }, [match, navigate]);

  return {
    handleCellClick,
    handleChessMove,
    handleTttMove,
    handleCheckersMove,
    handleConnect4Move,
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
