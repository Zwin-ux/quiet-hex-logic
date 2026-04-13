import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { usePresence } from '@/hooks/usePresence';
import { useSpectators } from '@/hooks/useSpectators';
import { AIDifficulty } from '@/lib/hex/simpleAI';
import { BoardSkin, getSkinById } from '@/lib/boardSkins';
import { loadLocalMatch } from '@/lib/localMatches/storage';
import { loadLocalAIMatch } from '@/lib/localAiMatch';
import { getGame } from '@/lib/engine/registry';
import type { GameEngine } from '@/lib/engine/types';
import { buildAuthRoute } from '@/lib/authRedirect';

export type GameKey = string;

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
  draw_offered_by?: number | null;
  version?: number;
  updated_at?: string;
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

function shouldFallbackToLegacySnapshot(error: any) {
  const message = typeof error?.message === 'string' ? error.message : '';
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    message.includes('Could not find the function') ||
    message.includes('function public.get_match_snapshot')
  );
}

export function useMatchState(matchId: string | undefined) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { isDiscordEnvironment, isAuthenticated: isDiscordAuth, discordUser } = useDiscord();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [engine, setEngine] = useState<GameEngine<any> | null>(null);
  const [lastMove, setLastMove] = useState<any | null>(null);
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [boardSkin, setBoardSkin] = useState<BoardSkin>(getSkinById('classic'));
  const [ratingResult, setRatingResult] = useState<RatingResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadInFlight = useRef(false);
  const lastAITurnProcessed = useRef<number | null>(null);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDiscordLocalMatch = matchId?.startsWith('discord-');
  const isLocalMatch = matchId?.startsWith('local-');
  const isLocalAIMatch = matchId?.startsWith('local-ai-');
  const discordLocalState = location.state as {
    isDiscordLocal?: boolean;
    aiDifficulty?: AIDifficulty;
    boardSize?: number;
    gameKey?: string;
    discordUser?: { id: string; username: string };
  } | null;
  const localAIState = location.state as {
    isLocalAI?: boolean;
    aiDifficulty?: AIDifficulty;
    boardSize?: number;
    gameKey?: string;
    playerName?: string;
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

  const localAIInit = useMemo(() => {
    if (!isLocalAIMatch || !matchId) return null;
    if (localAIState?.isLocalAI) return localAIState;
    return loadLocalAIMatch(matchId);
  }, [isLocalAIMatch, matchId, localAIState]);

  usePresence(
    (isDiscordLocalMatch || isLocalMatch || isLocalAIMatch) ? undefined : user?.id,
    (isDiscordLocalMatch || isLocalMatch || isLocalAIMatch) ? undefined : matchId,
  );

  const { spectators, isSpectating, joinAsSpectator, leaveAsSpectator } = useSpectators(
    (isDiscordLocalMatch || isLocalMatch || isLocalAIMatch) ? undefined : matchId
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
    setLastMove(null);
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
          // Legacy local match format (back-compat)
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

    const lastMoveTyped = lastMoveData ? adapter.deserializeMove(lastMoveData) : null;
    return { adapter, lastMoveData, lastMoveTyped };
  }, []);

  const setEngineFromAdapter = useCallback((
    gameKey: string,
    adapter: GameEngine<any>,
    lastMoveTyped: any | null,
  ) => {
    clearLastMoves();
    setEngine(adapter);
    setLastMove(lastMoveTyped);

    // Optional winning path support for Hex-like engines.
    const rawHex = (adapter as any)?.hex;
    if (rawHex && typeof rawHex.winner === 'function' && rawHex.winner()) {
      const path = typeof rawHex.getWinningPath === 'function' ? rawHex.getWinningPath() : null;
      setWinningPath(path || []);
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

        const { adapter, lastMoveTyped } = replayMoves(gameKey, local.moves, {
          boardSize: local.size,
          pieRule: local.pie_rule,
          fen: local.rules?.startFen,
          rules: local.rules,
        });
        setEngineFromAdapter(gameKey, adapter, lastMoveTyped);

        return { matchData: local as any };
      }

      // ---- Online match ----
      try {
        const { data: snapshotData, error: snapshotError } = await (supabase as any).rpc(
          'get_match_snapshot',
          { p_match_id: matchId },
        );

        if (snapshotError) {
          if (!shouldFallbackToLegacySnapshot(snapshotError)) {
            throw snapshotError;
          }
        } else if (snapshotData?.match) {
          const snapshot = snapshotData as any;
          const matchData = snapshot.match as MatchData & { is_arena?: boolean };
          const gameKey = (matchData as any)?.game_key ?? 'hex';

          setMatch({ ...(matchData as any), game_key: gameKey });
          setRatingResult(null);

          if ((matchData as any)?.is_arena && snapshot.arena) {
            setPlayers([
              {
                profile_id: snapshot.arena.p1BotId ?? 'arena-p1',
                color: 1,
                is_bot: true,
                username: snapshot.arena.p1Name ?? 'Bot 1',
                avatar_color: 'indigo',
              },
              {
                profile_id: snapshot.arena.p2BotId ?? 'arena-p2',
                color: 2,
                is_bot: true,
                username: snapshot.arena.p2Name ?? 'Bot 2',
                avatar_color: 'ochre',
              },
            ]);
          } else {
            setPlayers((snapshot.players ?? []) as Player[]);
          }

          const { adapter, lastMoveTyped } = replayMoves(gameKey, snapshot.moves || [], {
            boardSize: matchData.size,
            pieRule: matchData.pie_rule,
          });
          setEngineFromAdapter(gameKey, adapter, lastMoveTyped);

          const ratingHistory = (snapshot.ratingHistory ?? []) as Array<{
            profile_id: string;
            old_rating: number;
            new_rating: number;
            rating_change: number;
          }>;
          const snapshotPlayers = (snapshot.players ?? []) as Player[];

          if (matchData.status === 'finished' && matchData.is_ranked && ratingHistory.length >= 2 && matchData.winner) {
            const winnerHistory = ratingHistory.find((entry) => {
              const playerData = snapshotPlayers.find((player) => player.profile_id === entry.profile_id);
              return playerData?.color === matchData.winner;
            });
            const loserHistory = ratingHistory.find((entry) => {
              const playerData = snapshotPlayers.find((player) => player.profile_id === entry.profile_id);
              return playerData?.color !== matchData.winner;
            });

            if (winnerHistory && loserHistory) {
              setRatingResult({
                winner: {
                  old: winnerHistory.old_rating,
                  new: winnerHistory.new_rating,
                  change: winnerHistory.rating_change,
                },
                loser: {
                  old: loserHistory.old_rating,
                  new: loserHistory.new_rating,
                  change: loserHistory.rating_change,
                },
              });
            }
          }

          return { matchData };
        }
      } catch (snapshotError) {
        console.warn('[useMatchState] snapshot fallback:', snapshotError);
      }

      const { data: matchData } = await supabase
        .from('matches')
        .select('id, size, pie_rule, status, turn, winner, game_key, result, ai_difficulty, turn_timer_seconds, turn_started_at, is_ranked, draw_offered_by, version, updated_at, is_arena')
        .eq('id', matchId)
        .single();

      if (!matchData) {
        navigate('/lobby');
        return;
      }

      const gameKey = (matchData as any)?.game_key ?? 'hex';
      setMatch({ ...(matchData as any), game_key: gameKey });
      setRatingResult(null);
      let playersData: any[] | null = null;

      // Arena matches use bot metadata instead of match_players.
      if ((matchData as any)?.is_arena) {
        try {
          const { data: bm } = await supabase
            .from('bot_matches')
            .select('p1_bot_id,p2_bot_id')
            .eq('match_id', matchId)
            .single();

          const botIds = [bm?.p1_bot_id, bm?.p2_bot_id].filter(Boolean) as string[];
          const botsById = new Map<string, { name: string }>();
          if (botIds.length) {
            const { data: bots } = await supabase
              .from('bots')
              .select('id,name')
              .in('id', botIds as any);
            (bots as any[] | null)?.forEach((b: any) => {
              if (b?.id) botsById.set(b.id, { name: b.name ?? 'Bot' });
            });
          }

          const p1Name = bm?.p1_bot_id ? (botsById.get(bm.p1_bot_id)?.name ?? 'Bot P1') : 'Bot P1';
          const p2Name = bm?.p2_bot_id ? (botsById.get(bm.p2_bot_id)?.name ?? 'Bot P2') : 'Bot P2';

          setPlayers([
            { profile_id: bm?.p1_bot_id ? `bot:${bm.p1_bot_id}` : 'bot:p1', color: 1, is_bot: true, username: p1Name, avatar_color: 'indigo' },
            { profile_id: bm?.p2_bot_id ? `bot:${bm.p2_bot_id}` : 'bot:p2', color: 2, is_bot: true, username: p2Name, avatar_color: 'ochre' },
          ]);
        } catch (e) {
          console.error('Failed to load arena bots:', e);
          setPlayers([
            { profile_id: 'bot:p1', color: 1, is_bot: true, username: 'Bot P1', avatar_color: 'indigo' },
            { profile_id: 'bot:p2', color: 2, is_bot: true, username: 'Bot P2', avatar_color: 'ochre' },
          ]);
        }
      } else {
        const { data } = await supabase
          .from('match_players')
          .select(`
            profile_id,
            color,
            is_bot,
            rating_change,
            profiles!inner(username, avatar_color, elo_rating)
          `)
          .eq('match_id', matchId);

        playersData = data ?? null;

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
      }

      // Fetch moves and replay
      const { data: moves } = await supabase
        .from('moves')
        .select('ply, move, cell, color')
        .eq('match_id', matchId)
        .order('ply', { ascending: true });

      const { adapter, lastMoveTyped } = replayMoves(gameKey, moves || [], {
        boardSize: matchData.size,
        pieRule: matchData.pie_rule,
      });
      setEngineFromAdapter(gameKey, adapter, lastMoveTyped);

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
  }, [matchId, navigate, replayMoves, setEngineFromAdapter, clearLastMoves, isLocalMatch]);

  // Initialize browser-local AI matches
  useEffect(() => {
    const init =
      isDiscordLocalMatch && discordLocalInit?.isDiscordLocal
        ? discordLocalInit
        : isLocalAIMatch && localAIInit?.isLocalAI
          ? localAIInit
          : null;

    if (!init) return;

    const gameKey = (init as any).gameKey || 'hex';
    const gameDef = getGame(gameKey);
    const boardSize = init.boardSize || gameDef.defaultBoardSize;
    const difficulty = (init.aiDifficulty || 'easy') as AIDifficulty;
    const playerId = isDiscordLocalMatch ? 'discord-player' : 'local-player';
    const playerName =
      isDiscordLocalMatch
        ? discordLocalInit?.discordUser?.username || discordUser?.username || 'Player'
        : localAIInit?.playerName || (typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : null) || 'Player';

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
      { profile_id: playerId, color: 1, is_bot: false, username: playerName, avatar_color: 'indigo' },
      { profile_id: 'ai-player', color: 2, is_bot: true, username: `Computer (${difficultyLabel})`, avatar_color: 'slate' },
    ]);

    const adapter = gameDef.createEngine({ boardSize });
    setEngineFromAdapter(gameKey, adapter, null);
  }, [isDiscordLocalMatch, isLocalAIMatch, discordLocalInit, localAIInit, matchId, discordUser, user, setEngineFromAdapter]);

  // Debounced load: coalesces multiple realtime events within 100ms into one loadMatch()
  const scheduleLoad = useCallback(() => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    realtimeDebounceRef.current = setTimeout(() => {
      realtimeDebounceRef.current = null;
      loadMatch();
    }, 100);
  }, [loadMatch]);

  // Load match and subscribe to realtime for non-Discord matches
  useEffect(() => {
    if (!matchId || isDiscordLocalMatch || isLocalMatch || isLocalAIMatch) return;
    if (!isDiscordEnvironment && !loading && !user) {
      navigate(buildAuthRoute());
      return;
    }
    if (!isDiscordEnvironment && !user) return;

    loadBoardSkin();
    loadMatch();

    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, scheduleLoad)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moves', filter: `match_id=eq.${matchId}` }, scheduleLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` }, scheduleLoad)
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [matchId, user, loading, navigate, isDiscordEnvironment, isLocalMatch, isLocalAIMatch, isDiscordLocalMatch, loadBoardSkin, loadMatch, scheduleLoad]);

  return {
    match, setMatch,
    players, setPlayers,
    engine, setEngine,
    lastMove, setLastMove,
    winningPath, setWinningPath,
    boardSkin,
    ratingResult, setRatingResult,
    showConfetti, setShowConfetti,
    lastAITurnProcessed,
    isDiscordLocalMatch,
    isLocalMatch,
    isLocalAIMatch,
    discordLocalInit,
    localAIInit,
    spectators, isSpectating, joinAsSpectator, leaveAsSpectator,
    user, loading, discordUser, isDiscordEnvironment,
    loadMatch, loadBoardSkin,
    navigate,
  };
}
