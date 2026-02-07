import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { usePresence } from '@/hooks/usePresence';
import { useSpectators } from '@/hooks/useSpectators';
import { Hex } from '@/lib/hex/engine';
import { AIDifficulty } from '@/lib/hex/simpleAI';
import { BoardSkin, getSkinById } from '@/lib/boardSkins';
import { ChessEngine } from '@/lib/chess/engine';
import { TicTacToe } from '@/lib/ttt/engine';
import { CheckersEngine } from '@/lib/checkers/engine';
import { Connect4 } from '@/lib/connect4/engine';
import { loadLocalMatch } from '@/lib/localMatches/storage';
import { getGame, createEngine } from '@/lib/engine/registry';
import type { GameEngine } from '@/lib/engine/types';

export interface MatchData {
  id: string;
  size: number;
  pie_rule: boolean;
  status: string;
  turn: number;
  winner: number | null;
  game_key?: string | null;
  result?: 'p1' | 'p2' | 'draw' | string | null;
  ai_difficulty?: AIDifficulty | null;
  turn_timer_seconds?: number | null;
  turn_started_at?: string | null;
  is_ranked?: boolean | null;
}

export interface Player {
  profile_id: string;
  color: number;
  is_bot: boolean;
  username: string;
  avatar_color?: string;
  elo?: number;
  rating_change?: number;
}

export interface RatingResult {
  winner: { old: number; new: number; change: number };
  loser: { old: number; new: number; change: number };
}

export function useMatchState(matchId: string | undefined) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { isDiscordEnvironment, isAuthenticated: isDiscordAuth, discordUser } = useDiscord();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  // Keep legacy engine state for backward compatibility with existing board components
  const [engine, setEngine] = useState<Hex | ChessEngine | TicTacToe | CheckersEngine | Connect4 | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>();
  const [lastChessMoveUci, setLastChessMoveUci] = useState<string | null>(null);
  const [lastTttMove, setLastTttMove] = useState<number | null>(null);
  const [lastCheckersMovePath, setLastCheckersMovePath] = useState<number[] | null>(null);
  const [lastConnect4Move, setLastConnect4Move] = useState<number | null>(null);
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [boardSkin, setBoardSkin] = useState<BoardSkin>(getSkinById('classic'));
  const [ratingResult, setRatingResult] = useState<RatingResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadInFlight = useRef(false);
  const lastAITurnProcessed = useRef<number | null>(null);

  const isDiscordLocalMatch = matchId?.startsWith('discord-');
  const isLocalMatch = matchId?.startsWith('local-');
  const discordLocalState = location.state as {
    isDiscordLocal?: boolean;
    aiDifficulty?: AIDifficulty;
    boardSize?: number;
    gameKey?: string;
    discordUser?: { id: string; username: string };
  } | null;

  const discordLocalInit = useMemo(() => {
    if (!isDiscordLocalMatch || !matchId) return null;
    if (discordLocalState?.isDiscordLocal) return discordLocalState;
    try {
      const raw = sessionStorage.getItem(`discord_local_match:${matchId}`);
      if (raw) return JSON.parse(raw) as typeof discordLocalState;
    } catch { /* ignore */ }
    if (isDiscordEnvironment && discordUser) {
      return {
        isDiscordLocal: true,
        aiDifficulty: 'medium' as AIDifficulty,
        boardSize: 11,
        discordUser: { id: discordUser.id, username: discordUser.username },
      };
    }
    return null;
  }, [isDiscordLocalMatch, matchId, discordLocalState, isDiscordEnvironment, discordUser]);

  usePresence((isDiscordLocalMatch || isLocalMatch) ? undefined : user?.id, (isDiscordLocalMatch || isLocalMatch) ? undefined : matchId);

  const { spectators, isSpectating, joinAsSpectator, leaveAsSpectator } = useSpectators(
    (isDiscordLocalMatch || isLocalMatch) ? undefined : matchId
  );

  const loadBoardSkin = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('board_skin')
        .eq('id', user.id)
        .single();
      if (data && (data as any).board_skin) {
        setBoardSkin(getSkinById((data as any).board_skin));
      }
    } catch (error) {
      console.error('Failed to load board skin:', error);
    }
  }, [user]);

  /** Clear all per-game last-move state. */
  const clearLastMoves = useCallback(() => {
    setLastMove(undefined);
    setLastChessMoveUci(null);
    setLastTttMove(null);
    setLastCheckersMovePath(null);
    setLastConnect4Move(null);
    setWinningPath([]);
  }, []);

  /**
   * Generic engine replay: create an engine via the registry and replay
   * serialised moves from the database (or local storage).
   */
  const replayMoves = useCallback((
    gameKey: string,
    moves: any[],
    opts?: { boardSize?: number; pieRule?: boolean; fen?: string; rules?: any },
  ) => {
    const gameDef = getGame(gameKey);
    const adapter = gameDef.createEngine({
      boardSize: opts?.boardSize,
      pieRule: opts?.pieRule,
      fen: opts?.fen,
      rules: opts?.rules,
    });

    let lastMoveData: Record<string, unknown> | null = null;

    for (const m of moves) {
      try {
        // Determine the serialised move data depending on source format
        let moveData: Record<string, unknown>;
        if (m.move !== undefined && m.move !== null) {
          // Online match: move is stored in the `move` JSONB column
          moveData = typeof m.move === 'object' ? m.move : { cell: m.move };
        } else if (m.cell !== undefined && m.cell !== null) {
          // Hex online: cell is a top-level column
          moveData = { cell: m.cell };
        } else if (m.kind) {
          // Local match format
          if (m.kind === 'chess') moveData = { uci: m.uci };
          else if (m.kind === 'ttt') moveData = { cell: m.cell };
          else if (m.kind === 'checkers') moveData = { path: m.path };
          else if (m.kind === 'connect4') moveData = { col: m.col };
          else moveData = { cell: m.cell };
        } else {
          continue;
        }

        const typedMove = adapter.deserializeMove(moveData);
        adapter.applyMove(typedMove);
        lastMoveData = moveData;
      } catch (e) {
        console.error(`Invalid ${gameKey} move in history:`, e);
      }
    }

    return { adapter, lastMoveData };
  }, []);

  /**
   * Set the legacy per-game engine + last-move state from a registry adapter.
   * This bridges the new adapter system to the existing board components
   * which still expect the raw engine classes.
   */
  const setEngineFromAdapter = useCallback((
    gameKey: string,
    adapter: any,
    lastMoveData: Record<string, unknown> | null,
  ) => {
    clearLastMoves();

    if (gameKey === 'chess') {
      setEngine(adapter.chess);
      if (lastMoveData?.uci) setLastChessMoveUci(String(lastMoveData.uci));
    } else if (gameKey === 'ttt') {
      setEngine(adapter.ttt);
      if (lastMoveData?.cell !== undefined && lastMoveData?.cell !== null) {
        setLastTttMove(Number(lastMoveData.cell));
      }
    } else if (gameKey === 'checkers') {
      setEngine(adapter.checkers);
      if (Array.isArray(lastMoveData?.path)) {
        setLastCheckersMovePath((lastMoveData.path as number[]).map(Number));
      }
    } else if (gameKey === 'connect4') {
      setEngine(adapter.c4);
      if (lastMoveData?.col !== undefined && lastMoveData?.col !== null) {
        setLastConnect4Move(Number(lastMoveData.col));
      }
    } else {
      // Hex (default)
      setEngine(adapter.hex);
      if (lastMoveData?.cell !== undefined && lastMoveData?.cell !== null) {
        setLastMove(Number(lastMoveData.cell));
      }
      // Check for winning path
      const hex = adapter.hex as Hex;
      if (hex.winner()) {
        const path = hex.getWinningPath();
        setWinningPath(path || []);
      }
    }
  }, [clearLastMoves]);

  const loadMatch = useCallback(async () => {
    if (!matchId || loadInFlight.current) return;
    loadInFlight.current = true;

    try {
      // ---- Local match ----
      if (isLocalMatch) {
        const local = loadLocalMatch(matchId);
        if (!local) {
          navigate('/mods');
          return;
        }

        const gameKey = local.game_key;
        setMatch({
          id: local.id,
          size: local.size,
          pie_rule: local.pie_rule,
          status: local.status,
          turn: local.turn,
          winner: local.winner,
          result: local.result,
          game_key: gameKey,
          ai_difficulty: null,
          turn_timer_seconds: null,
          turn_started_at: null,
          is_ranked: false,
        } as any);

        setPlayers([
          { profile_id: 'local-p1', color: 1, is_bot: false, username: 'Player 1', avatar_color: 'indigo' },
          { profile_id: 'local-p2', color: 2, is_bot: false, username: 'Player 2', avatar_color: 'ochre' },
        ]);

        const { adapter, lastMoveData } = replayMoves(gameKey, local.moves, {
          boardSize: local.size,
          pieRule: local.pie_rule,
          fen: local.rules?.startFen,
          rules: local.rules,
        });
        setEngineFromAdapter(gameKey, adapter, lastMoveData);

        return { matchData: local as any };
      }

      // ---- Online match ----
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!matchData) {
        navigate('/lobby');
        return;
      }

      const gameKey = (matchData as any)?.game_key ?? 'hex';
      setMatch({ ...(matchData as any), game_key: gameKey });

      const { data: playersData } = await supabase
        .from('match_players')
        .select(`
          profile_id,
          color,
          is_bot,
          rating_change,
          profiles!inner(username, avatar_color, elo_rating)
        `)
        .eq('match_id', matchId);

      if (playersData) {
        const ratingMap = new Map<string, number>();
        try {
          const ids = playersData.filter((p: any) => !p.is_bot).map((p: any) => p.profile_id);
          if (ids.length) {
            const { data: ratings } = await supabase
              .from('player_ratings')
              .select('profile_id, elo_rating')
              .eq('game_key', gameKey)
              .in('profile_id', ids as any);
            (ratings as any[] | null)?.forEach((r: any) => {
              if (r?.profile_id) ratingMap.set(r.profile_id, r.elo_rating ?? 1200);
            });
          }
        } catch {
          // Ignore until migrations/types land everywhere.
        }

        const enrichedPlayers = playersData.map(p => ({
          profile_id: p.profile_id,
          color: p.color,
          is_bot: p.is_bot,
          username: (p.profiles as any).username,
          avatar_color: (p.profiles as any).avatar_color || 'indigo',
          elo: ratingMap.get(p.profile_id) ?? (p.profiles as any).elo_rating,
          rating_change: p.rating_change
        }));

        if (matchData.ai_difficulty && !enrichedPlayers.find(p => p.color === 2)) {
          const difficultyLabel = matchData.ai_difficulty.charAt(0).toUpperCase() + matchData.ai_difficulty.slice(1);
          enrichedPlayers.push({
            profile_id: 'ai-player',
            color: 2,
            is_bot: true,
            username: `Computer (${difficultyLabel})`,
            avatar_color: 'slate',
            elo: undefined,
            rating_change: undefined
          });
        }

        setPlayers(enrichedPlayers);
      }

      // Fetch moves and replay
      const { data: moves } = await supabase
        .from('moves')
        .select('*')
        .eq('match_id', matchId)
        .order('ply', { ascending: true });

      const { adapter, lastMoveData } = replayMoves(gameKey, moves || [], {
        boardSize: matchData.size,
        pieRule: matchData.pie_rule,
      });
      setEngineFromAdapter(gameKey, adapter, lastMoveData);

      // Load rating results for finished ranked matches
      if (matchData.status === 'finished' && matchData.is_ranked) {
        const { data: ratingHistory } = await supabase
          .from('rating_history')
          .select('profile_id, old_rating, new_rating, rating_change, game_key')
          .eq('match_id', matchId);

        const filtered = (ratingHistory as any[] | null)?.filter((h) => (h as any).game_key ? (h as any).game_key === gameKey : true) ?? ratingHistory;

        if (filtered && filtered.length === 2 && matchData.winner) {
          const winnerHistory = filtered.find(h => {
            const playerData = playersData?.find(p => p.profile_id === h.profile_id);
            return playerData?.color === matchData.winner;
          });
          const loserHistory = filtered.find(h => {
            const playerData = playersData?.find(p => p.profile_id === h.profile_id);
            return playerData?.color !== matchData.winner;
          });

          if (winnerHistory && loserHistory) {
            setRatingResult({
              winner: {
                old: winnerHistory.old_rating,
                new: winnerHistory.new_rating,
                change: winnerHistory.rating_change
              },
              loser: {
                old: loserHistory.old_rating,
                new: loserHistory.new_rating,
                change: loserHistory.rating_change
              }
            });
          }
        }
      }

      return { matchData };
    } catch (e) {
      console.error('Failed to load match:', e);
    } finally {
      loadInFlight.current = false;
    }
  }, [matchId, navigate, replayMoves, setEngineFromAdapter, clearLastMoves]);

  // Initialize Discord local match
  useEffect(() => {
    if (!isDiscordLocalMatch || !discordLocalInit?.isDiscordLocal) return;
    const gameKey = (discordLocalInit as any).gameKey || 'hex';
    const gameDef = getGame(gameKey);
    const boardSize = discordLocalInit.boardSize || gameDef.defaultBoardSize;
    const difficulty = (discordLocalInit.aiDifficulty || 'easy') as AIDifficulty;
    const discordUsername = discordLocalInit.discordUser?.username || discordUser?.username || 'Player';

    setMatch({
      id: matchId!,
      size: boardSize,
      pie_rule: gameDef.supportsPieRule,
      status: 'active',
      turn: 1,
      winner: null,
      game_key: gameKey,
      ai_difficulty: difficulty,
      turn_timer_seconds: null,
      turn_started_at: null,
    });

    const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    setPlayers([
      { profile_id: 'discord-player', color: 1, is_bot: false, username: discordUsername, avatar_color: 'indigo' },
      { profile_id: 'ai-player', color: 2, is_bot: true, username: `Computer (${difficultyLabel})`, avatar_color: 'slate' },
    ]);

    const adapter = gameDef.createEngine({ boardSize });
    setEngineFromAdapter(gameKey, adapter, null);
  }, [isDiscordLocalMatch, discordLocalInit, matchId, discordUser]);

  // Load match and subscribe to realtime for non-Discord matches
  useEffect(() => {
    if (!matchId || isDiscordLocalMatch || isLocalMatch) return;
    if (!isDiscordEnvironment && !loading && !user) {
      navigate('/auth');
      return;
    }
    if (!isDiscordEnvironment && !user) return;

    loadBoardSkin();
    loadMatch();

    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, () => loadMatch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moves', filter: `match_id=eq.${matchId}` }, () => loadMatch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` }, () => loadMatch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId, user, loading, navigate]);

  return {
    match, setMatch,
    players, setPlayers,
    engine, setEngine,
    lastMove, setLastMove,
    lastChessMoveUci, setLastChessMoveUci,
    lastTttMove, setLastTttMove,
    lastCheckersMovePath, setLastCheckersMovePath,
    lastConnect4Move, setLastConnect4Move,
    winningPath, setWinningPath,
    boardSkin,
    ratingResult, setRatingResult,
    showConfetti, setShowConfetti,
    lastAITurnProcessed,
    isDiscordLocalMatch,
    isLocalMatch,
    discordLocalInit,
    spectators, isSpectating, joinAsSpectator, leaveAsSpectator,
    user, loading, discordUser, isDiscordEnvironment,
    loadMatch, loadBoardSkin,
    navigate,
  };
}
