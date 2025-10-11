import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Users, LogOut, History as HistoryIcon, UserPlus, Copy, Check } from 'lucide-react';
import { JoinWithCode } from '@/components/JoinWithCode';

type Match = {
  id: string;
  size: number;
  pie_rule: boolean;
  status: string;
  created_at: string;
  owner: string;
};

export default function Lobby() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    // Fetch waiting matches
    fetchWaitingMatches();

    // Subscribe to match changes
    const channel = supabase
      .channel('lobby')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `status=eq.waiting`,
        },
        () => {
          fetchWaitingMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchWaitingMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching matches:', error);
    } else {
      setMatches(data || []);
    }
  };

  const createMatch = async (size: number, withAI: boolean = false) => {
    if (!user) return;
    setCreatingMatch(true);

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          owner: user.id,
          size,
          pie_rule: true,
          status: withAI ? 'active' : 'waiting',
        })
        .select()
        .single();

      if (matchError) throw matchError;

      const { error: playerError } = await supabase
        .from('match_players')
        .insert({
          match_id: match.id,
          profile_id: user.id,
          color: 1, // indigo
        });

      if (playerError) throw playerError;

      if (withAI) {
        await supabase.from('match_players').insert({
          match_id: match.id,
          profile_id: user.id,
          color: 2,
          is_bot: true
        });
      }

      toast.success(withAI ? 'AI match created!' : 'Match created!', {
        description: withAI ? 'The AI will play as Ochre' : 'Waiting for opponent...'
      });

      navigate(`/match/${match.id}`);
    } catch (error: any) {
      toast.error('Failed to create match', {
        description: error.message
      });
    } finally {
      setCreatingMatch(false);
    }
  };

  const joinMatch = async (matchId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('match_players')
        .insert({
          match_id: matchId,
          profile_id: user.id,
          color: 2, // ochre
        });

      if (error) throw error;

      // Update match status to active
      await supabase
        .from('matches')
        .update({ status: 'active' })
        .eq('id', matchId);

      navigate(`/match/${matchId}`);
    } catch (error: any) {
      toast.error('Failed to join match', {
        description: error.message
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getMatchCode = async (matchId: string) => {
    const { data } = await supabase.rpc('generate_match_code', { match_uuid: matchId });
    return data as string;
  };

  const copyMatchCode = async (matchId: string) => {
    const code = await getMatchCode(matchId);
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(matchId);
      toast.success('Match code copied!', { description: `Share ${code} with your friend` });
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-ink/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="font-body text-4xl md:text-5xl font-semibold text-foreground mb-3">
              The Lobby
            </h1>
            <p className="text-muted-foreground text-lg font-body">
              Choose your board, find your match
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/friends')} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Friends
            </Button>
            <Button variant="outline" onClick={() => navigate('/history')} className="gap-2">
              <HistoryIcon className="h-4 w-4" />
              History
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Join with Code */}
          {user && <JoinWithCode userId={user.id} />}
          {/* AI Practice */}
          <Card className="p-8 shadow-paper border-2 border-border">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-ochre" />
              <h2 className="font-body text-2xl font-semibold text-foreground">
                AI Practice
              </h2>
            </div>
            <p className="text-muted-foreground mb-6 font-body leading-relaxed">
              Train against our thoughtful AI opponent. It pauses, considers, and occasionally 
              explains its reasoning—like a patient teacher across the board.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[7, 9, 11, 13].map((size) => (
                <Button
                  key={size}
                  onClick={() => createMatch(size, true)}
                  disabled={creatingMatch}
                  className="font-mono"
                >
                  {size}×{size}
                </Button>
              ))}
            </div>
          </Card>

          {/* Multiplayer */}
          <Card className="p-8 shadow-paper border-2 border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-indigo" />
              <h2 className="font-body text-2xl font-semibold text-foreground">
                Play with Friends
              </h2>
            </div>
            <p className="text-muted-foreground mb-6 font-body leading-relaxed">
              Create a match and invite a friend. Share the code, or wait for someone 
              to find you in the lobby below.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[7, 9, 11, 13].map((size) => (
                <Button
                  key={size}
                  variant="secondary"
                  onClick={() => createMatch(size, false)}
                  disabled={creatingMatch}
                  className="font-mono"
                >
                  {size}×{size}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Waiting Matches */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-body text-2xl font-semibold text-foreground">
              Open Matches
            </h2>
            <Badge variant="outline" className="font-mono">
              {matches.length} waiting
            </Badge>
          </div>
          
          {matches.length === 0 ? (
            <Card className="p-12 text-center shadow-soft">
              <div className="text-6xl mb-4 opacity-20">⬡</div>
              <p className="text-muted-foreground font-body">
                No open matches at the moment. Create one above.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <Card
                  key={match.id}
                  className="p-6 flex items-center justify-between shadow-soft hover:shadow-medium transition-all duration-300 border-2 hover:border-indigo/30"
                >
                  <div className="flex items-center gap-6">
                    <div className="text-4xl text-muted-foreground/30">⬡</div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="font-mono bg-indigo text-primary-foreground">
                          {match.size}×{match.size}
                        </Badge>
                        {match.pie_rule && (
                          <Badge variant="outline" className="font-mono text-xs">
                            Pie Rule
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        Created {new Date(match.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {match.owner === user?.id ? (
                      <Button
                        variant="outline"
                        onClick={() => copyMatchCode(match.id)}
                        className="gap-2"
                      >
                        {copiedCode === match.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedCode === match.id ? 'Copied!' : 'Copy Code'}
                      </Button>
                    ) : (
                      <Button onClick={() => joinMatch(match.id)}>
                        Join Match
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
