import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, TrendingDown, Play } from 'lucide-react';

type MatchHistory = {
  id: string;
  size: number;
  winner: number | null;
  created_at: string;
  updated_at: string;
  players: Array<{
    color: number;
    profile_id: string;
    is_bot: boolean;
    profile: {
      username: string;
    };
  }>;
};

export default function History() {
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchMatchHistory();
  }, [user]);

  const fetchMatchHistory = async () => {
    if (!user) return;

    try {
      const { data: matchPlayers } = await supabase
        .from('match_players')
        .select('match_id')
        .eq('profile_id', user.id);

      const matchIds = matchPlayers?.map(mp => mp.match_id) || [];

      if (matchIds.length === 0) {
        setMatches([]);
        return;
      }

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          players:match_players(
            color,
            profile_id,
            is_bot,
            profile:profiles(username)
          )
        `)
        .in('id', matchIds)
        .in('status', ['finished', 'aborted'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setMatches(data || []);
    } catch (error: any) {
      toast.error('Failed to load history', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getPlayerColor = (match: MatchHistory, userId: string) => {
    return match.players.find(p => p.profile_id === userId)?.color;
  };

  const getOpponentName = (match: MatchHistory, userId: string) => {
    const opponent = match.players.find(p => p.profile_id !== userId);
    return opponent?.is_bot ? 'AI' : opponent?.profile.username || 'Unknown';
  };

  const didWin = (match: MatchHistory, userId: string) => {
    const playerColor = getPlayerColor(match, userId);
    return match.winner === playerColor;
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/lobby')} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Lobby
          </Button>
          <h1 className="font-body text-4xl font-semibold text-foreground mb-2">Match History</h1>
          <p className="text-muted-foreground font-body">Review your past games and victories</p>
        </div>

        {matches.length === 0 ? (
          <Card className="p-12 text-center shadow-soft">
            <div className="text-6xl mb-4 opacity-20">⬡</div>
            <p className="text-muted-foreground font-body mb-2">No completed matches yet</p>
            <p className="text-sm text-muted-foreground">Play some games to see your history here</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const won = didWin(match, user!.id);
              const opponent = getOpponentName(match, user!.id);
              
              return (
                <Card
                  key={match.id}
                  className={`p-6 shadow-soft border-2 transition-all duration-300 ${
                    won ? 'border-indigo/30 hover:border-indigo/50' : 'border-border hover:border-graphite/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {won ? (
                        <Trophy className="h-10 w-10 text-ochre" />
                      ) : (
                        <TrendingDown className="h-10 w-10 text-graphite" />
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`font-mono ${won ? 'bg-indigo' : 'bg-graphite'}`}>
                            {match.size}×{match.size}
                          </Badge>
                          <Badge variant="outline" className="font-body">
                            vs {opponent}
                          </Badge>
                          <Badge variant={won ? 'default' : 'outline'} className="font-body">
                            {won ? 'Victory' : 'Defeat'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          Played {new Date(match.created_at).toLocaleDateString()} • 
                          Finished {new Date(match.updated_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/replay/${match.id}`)}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" /> Replay
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
