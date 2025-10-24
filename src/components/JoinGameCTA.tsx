import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Users } from 'lucide-react';

type PendingLobby = {
  lobby_id: string;
  lobby_code: string;
  lobby_status: string;
  player_count: number;
};

type JoinGameCTAProps = {
  userId: string | undefined;
};

export function JoinGameCTA({ userId }: JoinGameCTAProps) {
  const [pendingLobby, setPendingLobby] = useState<PendingLobby | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let channel: any;

    const fetchPendingLobby = async () => {
      try {
        // Find lobbies where user is a player and status is waiting or ready
        const { data: playerLobbies, error } = await supabase
          .from('lobby_players')
          .select(`
            lobby_id,
            lobbies!inner(
              id,
              code,
              status
            )
          `)
          .eq('player_id', userId);

        if (error) throw error;

        if (playerLobbies && playerLobbies.length > 0) {
          // Find the first lobby that's still waiting or ready
          for (const playerLobby of playerLobbies) {
            const lobby = (playerLobby as any).lobbies;
            if (lobby && (lobby.status === 'waiting' || lobby.status === 'ready')) {
              // Count players in this lobby
              const { count } = await supabase
                .from('lobby_players')
                .select('*', { count: 'exact', head: true })
                .eq('lobby_id', lobby.id);

              setPendingLobby({
                lobby_id: lobby.id,
                lobby_code: lobby.code,
                lobby_status: lobby.status,
                player_count: count || 0
              });
              setLoading(false);
              return;
            }
          }
        }

        setPendingLobby(null);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching pending lobby:', err);
        setPendingLobby(null);
        setLoading(false);
      }
    };

    fetchPendingLobby();

    // Set up realtime subscription to detect lobby changes
    channel = supabase
      .channel('pending-lobby-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobbies'
        },
        () => {
          fetchPendingLobby();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players'
        },
        () => {
          fetchPendingLobby();
        }
      )
      .subscribe();

    // Poll every 15 seconds as fallback
    const pollInterval = setInterval(fetchPendingLobby, 15000);

    return () => {
      clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const handleJoinGame = () => {
    if (pendingLobby) {
      navigate(`/lobby/${pendingLobby.lobby_id}`);
    }
  };

  if (loading || !pendingLobby) {
    return null;
  }

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-ochre/10 to-amber/10 border-2 border-ochre/30 shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-ochre/20">
            <AlertCircle className="h-5 w-5 text-ochre" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              You have a pending game
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                Lobby <span className="font-mono font-bold">{pendingLobby.lobby_code}</span>
                {' • '}
                {pendingLobby.player_count}/2 players
              </span>
            </div>
          </div>
        </div>
        <Button
          onClick={handleJoinGame}
          className="gap-2 bg-ochre hover:bg-ochre/90"
        >
          Join Game
        </Button>
      </div>
    </Card>
  );
}
