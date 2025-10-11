import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

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
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const createMatch = async (size: number) => {
    if (!user) return;
    setCreatingMatch(true);

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          owner: user.id,
          size,
          pie_rule: true,
          status: 'waiting',
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

      toast({
        title: 'Match created',
        description: 'Waiting for opponent...',
      });

      navigate(`/match/${match.id}`);
    } catch (error: any) {
      toast({
        title: 'Failed to create match',
        description: error.message,
        variant: 'destructive',
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
      toast({
        title: 'Failed to join match',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-ink/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-body text-4xl text-ink mb-2">Hexology Lobby</h1>
            <p className="text-ink/60 text-sm">Choose your board, find your opponent</p>
          </div>
          <Button variant="quiet" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <Card className="p-6 mb-8 bg-paper border-graphite/30">
          <h2 className="text-xl font-body text-ink mb-4">Create New Match</h2>
          <div className="flex gap-3">
            {[7, 9, 11, 13].map((size) => (
              <Button
                key={size}
                variant="hero"
                onClick={() => createMatch(size)}
                disabled={creatingMatch}
                className="flex-1"
              >
                {size}×{size}
              </Button>
            ))}
          </div>
        </Card>

        <div>
          <h2 className="text-xl font-body text-ink mb-4">Available Matches</h2>
          
          {matches.length === 0 ? (
            <Card className="p-8 text-center bg-paper border-graphite/30">
              <p className="text-ink/60">No matches waiting. Create one above.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <Card
                  key={match.id}
                  className="p-4 flex justify-between items-center bg-paper border-graphite/30 hover:border-indigo/50 transition-gentle"
                >
                  <div>
                    <p className="text-ink font-mono">{match.size}×{match.size} board</p>
                    <p className="text-ink/60 text-sm">
                      {match.pie_rule ? 'With pie rule' : 'No pie rule'} • 
                      Created {new Date(match.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    variant="hero"
                    onClick={() => joinMatch(match.id)}
                    disabled={match.owner === user?.id}
                  >
                    {match.owner === user?.id ? 'Your Match' : 'Join'}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
