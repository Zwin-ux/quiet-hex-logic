import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Eye, Clock, Circle, CheckCircle2 } from 'lucide-react';

interface TournamentMatch {
  id: string;
  round_id: string;
  match_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  bracket_position: number;
  status: string;
  next_match_id: string | null;
  player1?: { username: string; avatar_color: string };
  player2?: { username: string; avatar_color: string };
  round?: { round_number: number; round_name: string };
}

interface TournamentRound {
  id: string;
  round_number: number;
  round_name: string;
  tournament_id: string;
}

interface RoundWithMatches extends TournamentRound {
  matches: TournamentMatch[];
}

interface BracketVisualizationProps {
  tournamentId: string;
}

// Layout constants
const COLUMN_WIDTH = 240;
const COLUMN_GAP = 64;
const MATCH_CARD_HEIGHT = 108;
const MATCH_GAP = 16;
const ROUND_HEADER_HEIGHT = 60;

export function BracketVisualization({ tournamentId }: BracketVisualizationProps) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeRoundRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the first active or ready round
  useEffect(() => {
    if (!loading && activeRoundRef.current) {
      activeRoundRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [loading, matches]);

  const loadBracket = useCallback(async () => {
    try {
      const { data: roundsData } = await supabase
        .from('tournament_rounds')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true });

      setRounds(roundsData || []);

      const { data: matchesData } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          player1:profiles!tournament_matches_player1_id_fkey(username, avatar_color),
          player2:profiles!tournament_matches_player2_id_fkey(username, avatar_color),
          round:tournament_rounds!tournament_matches_round_id_fkey(round_number, round_name)
        `)
        .eq('tournament_id', tournamentId)
        .order('bracket_position', { ascending: true });

      setMatches(matchesData || []);
    } catch (error) {
      console.error('Failed to load bracket:', error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void loadBracket();

    const channel = supabase
      .channel(`tournament-bracket:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          void loadBracket();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBracket, tournamentId]);

  // Group matches by round, sorted by round_number
  const matchesByRound: RoundWithMatches[] = useMemo(() => {
    return rounds.map(round => ({
      ...round,
      matches: matches
        .filter(m => m.round_id === round.id)
        .sort((a, b) => a.bracket_position - b.bracket_position),
    }));
  }, [rounds, matches]);

  // Find the first round that has an active or ready match (for auto-scroll)
  const firstActiveRoundId = useMemo(() => {
    for (const round of matchesByRound) {
      if (round.matches.some(m => m.status === 'active' || m.status === 'ready')) {
        return round.id;
      }
    }
    return null;
  }, [matchesByRound]);

  // Build a lookup of match id -> { roundIndex, matchIndexInRound }
  const matchPositionMap = useMemo(() => {
    const map = new Map<string, { roundIndex: number; matchIndex: number }>();
    matchesByRound.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        map.set(match.id, { roundIndex, matchIndex });
      });
    });
    return map;
  }, [matchesByRound]);

  // Compute the vertical center Y of a match card given round index and match index
  const getMatchCenterY = useCallback((roundIndex: number, matchIndex: number, totalMatchesInRound: number) => {
    // Each round column distributes its matches evenly with justify-around behavior.
    // We compute the total bracket height based on the first round (max matches).
    const maxMatches = matchesByRound.length > 0
      ? Math.max(...matchesByRound.map(r => r.matches.length), 1)
      : 1;
    const totalHeight = maxMatches * (MATCH_CARD_HEIGHT + MATCH_GAP) - MATCH_GAP;

    if (totalMatchesInRound === 1) {
      return ROUND_HEADER_HEIGHT + totalHeight / 2;
    }

    // Distribute matches evenly within the total height
    const slotHeight = totalHeight / totalMatchesInRound;
    return ROUND_HEADER_HEIGHT + slotHeight * matchIndex + slotHeight / 2;
  }, [matchesByRound]);

  // Generate SVG connector paths
  const connectorPaths = useMemo(() => {
    const paths: { key: string; d: string; isActive: boolean }[] = [];

    matchesByRound.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        if (!match.next_match_id) return;

        const targetPos = matchPositionMap.get(match.next_match_id);
        if (!targetPos) return;

        const targetRound = matchesByRound[targetPos.roundIndex];
        if (!targetRound) return;

        // Source: right edge of current match card, vertical center
        const srcX = roundIndex * (COLUMN_WIDTH + COLUMN_GAP) + COLUMN_WIDTH;
        const srcY = getMatchCenterY(roundIndex, matchIndex, round.matches.length);

        // Target: left edge of next match card, vertical center
        const tgtX = targetPos.roundIndex * (COLUMN_WIDTH + COLUMN_GAP);
        const tgtY = getMatchCenterY(targetPos.roundIndex, targetPos.matchIndex, targetRound.matches.length);

        // Cubic bezier: go right from source, then curve to target
        const midX = (srcX + tgtX) / 2;
        const d = `M ${srcX} ${srcY} C ${midX} ${srcY}, ${midX} ${tgtY}, ${tgtX} ${tgtY}`;

        const isActive = match.status === 'completed';

        paths.push({
          key: `${match.id}-${match.next_match_id}`,
          d,
          isActive,
        });
      });
    });

    return paths;
  }, [matchesByRound, matchPositionMap, getMatchCenterY]);

  // Calculate total SVG dimensions
  const totalWidth = useMemo(() => {
    return matchesByRound.length * COLUMN_WIDTH + (matchesByRound.length - 1) * COLUMN_GAP;
  }, [matchesByRound]);

  const totalHeight = useMemo(() => {
    const maxMatches = matchesByRound.length > 0
      ? Math.max(...matchesByRound.map(r => r.matches.length), 1)
      : 1;
    return ROUND_HEADER_HEIGHT + maxMatches * (MATCH_CARD_HEIGHT + MATCH_GAP) - MATCH_GAP + 24;
  }, [matchesByRound]);

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="animate-gentle-pulse text-4xl mb-4">&#x2B21;</div>
        <p className="font-mono text-muted-foreground">Loading bracket...</p>
      </Card>
    );
  }

  if (matchesByRound.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="font-mono text-muted-foreground">No bracket data yet.</p>
      </Card>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="overflow-x-auto pb-4 -mx-2 px-2"
    >
      <div
        className="relative"
        style={{
          minWidth: `${totalWidth}px`,
          height: `${totalHeight}px`,
        }}
      >
        {/* SVG overlay for connecting lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalWidth}
          height={totalHeight}
          style={{ zIndex: 0 }}
        >
          {connectorPaths.map(({ key, d, isActive }) => (
            <path
              key={key}
              d={d}
              fill="none"
              stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
              strokeWidth={isActive ? 2 : 1.5}
              strokeDasharray={isActive ? 'none' : '6 4'}
              className="transition-all duration-500"
            />
          ))}
        </svg>

        {/* Round columns */}
        <div className="relative flex" style={{ gap: `${COLUMN_GAP}px`, zIndex: 1 }}>
          {matchesByRound.map((round, roundIndex) => {
            const isActiveRound = round.id === firstActiveRoundId;
            const maxMatches = Math.max(...matchesByRound.map(r => r.matches.length), 1);
            const totalColumnHeight = maxMatches * (MATCH_CARD_HEIGHT + MATCH_GAP) - MATCH_GAP;

            return (
              <div
                key={round.id}
                ref={isActiveRound ? activeRoundRef : undefined}
                className="flex-shrink-0 flex flex-col"
                style={{ width: `${COLUMN_WIDTH}px` }}
              >
                {/* Round header */}
                <div className="mb-3" style={{ height: `${ROUND_HEADER_HEIGHT - 12}px` }}>
                  <h3 className="font-body text-sm font-semibold text-foreground truncate">
                    {round.round_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Round {round.round_number}
                    </Badge>
                    {round.matches.some(m => m.status === 'active') && (
                      <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Live
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Match cards distributed evenly */}
                <div
                  className="flex flex-col justify-around"
                  style={{ height: `${totalColumnHeight}px` }}
                >
                  {round.matches.map((match) => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      onClick={() => {
                        if (match.match_id) {
                          navigate(`/match/${match.match_id}`);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Match Card Sub-component ---

interface BracketMatchCardProps {
  match: TournamentMatch;
  onClick: () => void;
}

function BracketMatchCard({ match, onClick }: BracketMatchCardProps) {
  const isClickable = !!match.match_id;

  const statusStyles = getStatusStyles(match.status);

  return (
    <Card
      className={`
        relative overflow-hidden transition-all duration-300
        ${statusStyles.border}
        ${statusStyles.bg}
        ${isClickable ? 'cursor-pointer hover:shadow-medium hover:scale-[1.02]' : ''}
        ${match.status === 'pending' ? 'opacity-50' : ''}
      `}
      style={{ height: `${MATCH_CARD_HEIGHT}px` }}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Status glow effect for active matches */}
      {match.status === 'active' && (
        <div className="absolute inset-0 rounded-lg border-2 border-blue-500/50 animate-pulse pointer-events-none" />
      )}
      {/* Pulsing border for ready matches */}
      {match.status === 'ready' && (
        <div className="absolute inset-0 rounded-lg border-2 border-yellow-500/50 animate-pulse pointer-events-none" />
      )}

      <div className="p-3 h-full flex flex-col justify-between">
        {/* Player 1 row */}
        <PlayerRow
          player={match.player1}
          playerId={match.player1_id}
          isWinner={!!match.winner_id && match.winner_id === match.player1_id}
          fallbackColor="indigo"
        />

        {/* Divider with status indicator */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px bg-border" />
          <StatusIndicator status={match.status} />
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Player 2 row */}
        <PlayerRow
          player={match.player2}
          playerId={match.player2_id}
          isWinner={!!match.winner_id && match.winner_id === match.player2_id}
          fallbackColor="ochre"
        />
      </div>

      {/* Clickable indicator */}
      {isClickable && (
        <div className="absolute top-1.5 right-1.5">
          <Eye className="h-3 w-3 text-muted-foreground/50" />
        </div>
      )}
    </Card>
  );
}

// --- Player Row Sub-component ---

interface PlayerRowProps {
  player?: { username: string; avatar_color: string };
  playerId: string | null;
  isWinner: boolean;
  fallbackColor: string;
}

function PlayerRow({ player, playerId, isWinner, fallbackColor }: PlayerRowProps) {
  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1 rounded text-sm
        ${isWinner ? 'bg-primary/10' : ''}
      `}
    >
      {/* Color dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor: player
            ? `hsl(var(--${player.avatar_color || fallbackColor}))`
            : 'hsl(var(--muted-foreground) / 0.3)',
        }}
      />

      {/* Player name */}
      <span
        className={`
          truncate flex-1
          ${isWinner ? 'font-semibold text-foreground' : ''}
          ${!player ? 'text-muted-foreground italic text-xs' : ''}
        `}
      >
        {player ? player.username : 'TBD'}
      </span>

      {/* Winner trophy */}
      {isWinner && (
        <Trophy className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
      )}
    </div>
  );
}

// --- Status Indicator Sub-component ---

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span className="text-[10px] font-mono text-green-500">Done</span>
        </span>
      );
    case 'active':
      return (
        <span className="flex items-center gap-1">
          <Circle className="h-2.5 w-2.5 text-blue-400 fill-blue-400 animate-pulse" />
          <span className="text-[10px] font-mono text-blue-400">Live</span>
        </span>
      );
    case 'ready':
      return (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-yellow-500" />
          <span className="text-[10px] font-mono text-yellow-500">Ready</span>
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-mono text-muted-foreground">vs</span>
      );
  }
}

// --- Helpers ---

function getStatusStyles(status: string): { border: string; bg: string } {
  switch (status) {
    case 'completed':
      return {
        border: 'border-green-500/30',
        bg: 'bg-green-500/5',
      };
    case 'active':
      return {
        border: 'border-blue-500/40',
        bg: 'bg-blue-500/5',
      };
    case 'ready':
      return {
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/5',
      };
    default:
      return {
        border: 'border-border',
        bg: 'bg-card',
      };
  }
}
