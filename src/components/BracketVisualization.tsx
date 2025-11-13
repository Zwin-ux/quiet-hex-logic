import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Eye } from 'lucide-react';

interface TournamentMatch {
  id: string;
  round_id: string;
  match_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  bracket_position: number;
  status: string;
  player1?: { username: string; avatar_color: string };
  player2?: { username: string; avatar_color: string };
  round?: { round_number: number; round_name: string };
}

interface BracketVisualizationProps {
  tournamentId: string;
}

export function BracketVisualization({ tournamentId }: BracketVisualizationProps) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBracket();

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
        () => loadBracket()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const loadBracket = async () => {
    try {
      // Load rounds
      const { data: roundsData } = await supabase
        .from('tournament_rounds')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true });

      setRounds(roundsData || []);

      // Load matches with player info
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
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="animate-gentle-pulse text-4xl mb-4">⬡</div>
        <p className="font-mono text-muted-foreground">Loading bracket...</p>
      </Card>
    );
  }

  // Group matches by round
  const matchesByRound = rounds.map(round => ({
    ...round,
    matches: matches.filter(m => m.round_id === round.id)
  }));

  return (
    <div className="space-y-8">
      <div className="flex gap-8 overflow-x-auto pb-4">
        {matchesByRound.map((round, roundIndex) => (
          <div key={round.id} className="flex-shrink-0" style={{ minWidth: '280px' }}>
            <div className="mb-4">
              <h3 className="font-body text-lg font-semibold">{round.round_name}</h3>
              <Badge variant="outline" className="mt-1">
                Round {round.round_number}
              </Badge>
            </div>

            <div className="space-y-4">
              {round.matches.map((match: TournamentMatch) => (
                <BracketMatch
                  key={match.id}
                  match={match}
                  onViewMatch={() => match.match_id && navigate(`/match/${match.match_id}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BracketMatchProps {
  match: TournamentMatch;
  onViewMatch: () => void;
}

function BracketMatch({ match, onViewMatch }: BracketMatchProps) {
  const getStatusColor = () => {
    switch (match.status) {
      case 'completed': return 'bg-green-500/10 border-green-500/20';
      case 'active': return 'bg-blue-500/10 border-blue-500/20';
      case 'ready': return 'bg-yellow-500/10 border-yellow-500/20';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className={`p-4 ${getStatusColor()} transition-all hover:shadow-md`}>
      <div className="space-y-3">
        {/* Player 1 */}
        <div className={`flex items-center justify-between p-2 rounded ${match.winner_id === match.player1_id ? 'bg-primary/10 font-semibold' : 'bg-background/50'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.player1 ? (
              <>
                <div className={`w-2 h-2 rounded-full bg-${match.player1.avatar_color || 'indigo'}`} />
                <span className="truncate">{match.player1.username}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">TBD</span>
            )}
          </div>
          {match.winner_id === match.player1_id && (
            <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>

        {/* VS Divider */}
        <div className="text-center text-xs text-muted-foreground font-mono">VS</div>

        {/* Player 2 */}
        <div className={`flex items-center justify-between p-2 rounded ${match.winner_id === match.player2_id ? 'bg-primary/10 font-semibold' : 'bg-background/50'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.player2 ? (
              <>
                <div className={`w-2 h-2 rounded-full bg-${match.player2.avatar_color || 'ochre'}`} />
                <span className="truncate">{match.player2.username}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">TBD</span>
            )}
          </div>
          {match.winner_id === match.player2_id && (
            <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>

        {/* Actions */}
        {match.match_id && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onViewMatch}
          >
            <Eye className="h-3 w-3 mr-2" />
            View Match
          </Button>
        )}
      </div>
    </Card>
  );
}
