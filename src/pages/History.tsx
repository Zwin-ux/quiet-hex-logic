import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, TrendingDown, Play, Sparkles } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buildAuthRoute } from '@/lib/authRedirect';

type MatchHistory = {
  id: string;
  size: number;
  winner: number | null;
  created_at: string;
  updated_at: string;
  ai_difficulty: 'easy' | 'medium' | 'hard' | 'expert' | null;
  is_ranked: boolean | null;
  players: Array<{
    color: number;
    profile_id: string;
    is_bot: boolean;
    rating_change: number | null;
    profile: {
      username: string;
    };
  }>;
};

export default function History() {
  useDocumentTitle('Match History');
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(buildAuthRoute());
    }
  }, [user, authLoading, navigate]);

  const fetchMatchHistory = useCallback(async () => {
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
            rating_change,
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
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchMatchHistory();
  }, [fetchMatchHistory, user]);

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

  const getRatingChange = (match: MatchHistory, userId: string) => {
    return match.players.find(p => p.profile_id === userId)?.rating_change;
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="p-4 md:p-8 pt-14">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
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
              const won = didWin(match, user.id);
              const opponent = getOpponentName(match, user.id);
              const ratingChange = getRatingChange(match, user.id);
              const isRanked = match.is_ranked;
              
              return (
                <Card
                  key={match.id}
                  className={`p-6 shadow-soft border-2 transition-all duration-300 ${
                    won ? 'border-indigo/30 hover:border-indigo/50' : 'border-border hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {won ? (
                        <Trophy className="h-10 w-10 text-ochre" />
                      ) : (
                        <TrendingDown className="h-10 w-10 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`font-mono ${won ? 'bg-indigo' : 'bg-muted'}`}>
                            {match.size}×{match.size}
                          </Badge>
                          {match.ai_difficulty && (
                            <Badge variant="outline" className="font-mono text-xs border-ochre/30 text-ochre">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI {match.ai_difficulty.toUpperCase()}
                            </Badge>
                          )}
                          <Badge variant="outline" className="font-body">
                            vs {opponent}
                          </Badge>
                          <Badge variant={isRanked ? 'secondary' : 'outline'} className={`font-body ${isRanked ? 'bg-ochre' : ''}`}>
                            {isRanked ? 'Ranked' : 'Quickplay'}
                          </Badge>
                          <Badge variant={won ? 'default' : 'outline'} className="font-body">
                            {won ? 'Victory' : 'Defeat'}
                          </Badge>
                          {isRanked && ratingChange !== undefined && ratingChange !== null && (
                            <Badge 
                              variant="outline" 
                              className={`font-mono font-bold border-2 ${
                                ratingChange >= 0 
                                  ? 'border-green-500/50 text-green-600 bg-green-500/10' 
                                  : 'border-red-500/50 text-red-600 bg-red-500/10'
                              }`}
                            >
                              {ratingChange > 0 ? '+' : ''}{ratingChange} ELO
                            </Badge>
                          )}
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
    </div>
  );
}
