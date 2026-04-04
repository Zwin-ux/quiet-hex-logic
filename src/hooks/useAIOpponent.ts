import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Hex } from '@/lib/hex/engine';
import { SimpleHexAI, AIDifficulty } from '@/lib/hex/simpleAI';
import { getGame } from '@/lib/engine/registry';
import type { GameEngine } from '@/lib/engine/types';
import { toast } from 'sonner';
import type { MatchData } from './useMatchState';

interface UseAIOpponentArgs {
  setEngine: React.Dispatch<React.SetStateAction<any>>;
  setMatch: React.Dispatch<React.SetStateAction<MatchData | null>>;
  setLastMove: React.Dispatch<React.SetStateAction<any>>;
  setWinningPath: React.Dispatch<React.SetStateAction<number[]>>;
  setShowConfetti: React.Dispatch<React.SetStateAction<boolean>>;
  loadMatch: () => Promise<any>;
  playPlaceSound: () => void;
  playWinSound: () => void;
  playLoseSound: () => void;
}

export function useAIOpponent({
  setEngine, setMatch, setLastMove, setWinningPath, setShowConfetti,
  loadMatch,
  playPlaceSound, playWinSound, playLoseSound,
}: UseAIOpponentArgs) {
  const aiMoveInProgress = useRef(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [isAggressiveMove, setIsAggressiveMove] = useState(false);

  /** Get an AI move using the registry's createAI for non-Hex games, or SimpleHexAI / server for Hex. */
  const getAIMoveForGame = useCallback(async (
    engine: GameEngine<any>,
    gameKey: string,
    difficulty: string,
  ): Promise<{ move: any; reasoning: string }> => {
    // For Hex hard/expert, try the server-side AI first
    if (gameKey === 'hex' && (difficulty === 'hard' || difficulty === 'expert')) {
      // Fall through to SimpleHexAI below if server fails
    }

    // For Hex, use SimpleHexAI (which has its own reasoning format)
    if (gameKey === 'hex') {
      const hexEngine = (engine as any)._engine ?? engine;
      const ai = new SimpleHexAI(hexEngine as Hex, difficulty as AIDifficulty);
      const result = ai.getMove();
      return { move: result.cell, reasoning: result.reasoning };
    }

    // For all other games, use the registry's createAI
    const gameDef = getGame(gameKey);
    if (!gameDef.createAI) {
      throw new Error(`No AI available for ${gameKey}`);
    }
    const ai = gameDef.createAI(difficulty);
    if (!ai) {
      throw new Error(`AI difficulty "${difficulty}" not available for ${gameKey}`);
    }
    const result = await ai.getMove(engine);
    return { move: result.move, reasoning: result.reasoning };
  }, []);

  const makeAIMove = useCallback(async (engine: GameEngine<any>, matchData: MatchData, retryCount = 0) => {
    if (aiMoveInProgress.current) return;
    aiMoveInProgress.current = true;
    setAiThinking(true);

    try {
      const difficulty = matchData.ai_difficulty || 'medium';
      const gameKey = matchData.game_key ?? 'hex';
      let move: any;
      let reasoning: string;

      // For Hex hard/expert, try server-side AI first
      if (gameKey === 'hex' && (difficulty === 'hard' || difficulty === 'expert')) {
        const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-move-v2', {
          body: { matchId: matchData.id, difficulty }
        });
        if (!aiError && aiResult?.cell != null) {
          move = aiResult.cell;
          reasoning = aiResult.reasoning || 'Server AI move';
        }
      }

      // If we don't have a move yet (non-Hex, or server fallback), use local AI
      if (move === undefined) {
        const result = await getAIMoveForGame(engine, gameKey, difficulty);
        move = result.move;
        reasoning = result.reasoning;
      }

      const isAggressive = reasoning!.includes('\u{1F6D1}') || reasoning!.includes('\u{1F9E0}') || reasoning!.includes('\u{1F6E1}\u{FE0F}');
      setAiReasoning(reasoning!);
      setIsAggressiveMove(isAggressive);
      playPlaceSound();
      setAiThinking(false);
      aiMoveInProgress.current = false;

      // Serialize the move for the server
      const actionId = crypto.randomUUID();

      // Hex uses the legacy `cell` field (including null for pie swap).
      if (gameKey === 'hex') {
        const { data: result, error } = await supabase.functions.invoke('apply-move', {
          body: { matchId: matchData.id, cell: move ?? null, actionId }
        });

        if (error || !result?.success) {
          const errorMsg = result?.error || error?.message || 'Failed to apply AI move';
          if ((errorMsg.includes('Rate limit') || error?.status === 429) && retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => {
              aiMoveInProgress.current = false;
              setAiThinking(false);
              makeAIMove(engine, matchData, retryCount + 1);
            }, delay);
            return;
          }
          if (!errorMsg.includes('Not your turn') && !errorMsg.includes('Not AI turn')) {
            toast.error('Computer move failed', {
              description: retryCount > 0 ? 'Failed after retries' : 'The game will continue when ready'
            });
          }
          return;
        }

        if (result.winner) {
          playLoseSound();
        }
        await loadMatch();
        return;
      }

      const serializedMove = engine.serializeMove(move);
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: {
          matchId: matchData.id,
          move: serializedMove,
          actionId,
          gameKey,
        }
      });

      if (error || !result?.success) {
        const errorMsg = result?.error || error?.message || 'Failed to apply AI move';
        if ((errorMsg.includes('Rate limit') || error?.status === 429) && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            aiMoveInProgress.current = false;
            setAiThinking(false);
            makeAIMove(engine, matchData, retryCount + 1);
          }, delay);
          return;
        }
        if (!errorMsg.includes('Not your turn') && !errorMsg.includes('Not AI turn')) {
          toast.error('Computer move failed', {
            description: retryCount > 0 ? 'Failed after retries' : 'The game will continue when ready'
          });
        }
        return;
      }

      if (result.winner) {
        playLoseSound();
      }
      await loadMatch();
    } catch (error) {
      console.error('AI move error:', error);
      toast.error('Unexpected error', { description: 'AI move encountered an error' });
    } finally {
      aiMoveInProgress.current = false;
      setAiThinking(false);
    }
  }, [loadMatch, playPlaceSound, playLoseSound, getAIMoveForGame]);

  const makeLocalAIMove = useCallback(
    async (baseEngine: GameEngine<any>, difficulty: AIDifficulty, gameKey = 'hex') => {
      if (aiMoveInProgress.current) return;
      aiMoveInProgress.current = true;
      setAiThinking(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const result = await getAIMoveForGame(baseEngine, gameKey, difficulty);
        const isAggressive = result.reasoning.includes('\u{1F6D1}') || result.reasoning.includes('\u{1F9E0}') || result.reasoning.includes('\u{1F6E1}\u{FE0F}');
        setAiReasoning(result.reasoning);
        setIsAggressiveMove(isAggressive);

        const nextEngine = baseEngine.clone();
        nextEngine.applyMove(result.move);
        setEngine(nextEngine);
        setLastMove(result.move);
        playPlaceSound();
        setMatch((prev) => (prev ? { ...prev, turn: prev.turn + 1 } : null));

        const winner = nextEngine.winner();
        if (winner) {
          if (gameKey === 'hex') {
            setWinningPath((nextEngine as any).getWinningPath?.() || []);
          }
          setMatch((prev) => (prev ? { ...prev, status: 'finished', winner } : null));
          playLoseSound();
          toast.success('Game Over', { description: 'Computer wins!', duration: 5000 });
        }
      } catch (e) {
        console.error('[Discord Match] AI move failed:', e);
        toast.error('Computer move failed');
      } finally {
        aiMoveInProgress.current = false;
        setAiThinking(false);
      }
    },
    [playPlaceSound, playLoseSound, setEngine, setLastMove, setMatch, setWinningPath, getAIMoveForGame]
  );

  return {
    aiThinking,
    aiReasoning,
    isAggressiveMove, setIsAggressiveMove,
    makeAIMove,
    makeLocalAIMove,
    aiMoveInProgress,
  };
}
