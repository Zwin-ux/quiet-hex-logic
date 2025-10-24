import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type Lobby = {
  id: string;
  code: string;
  host_id: string | null;
  status: string;
  board_size: number;
  pie_rule: boolean;
  turn_timer_seconds: number;
  created_at: string;
  updated_at: string;
};

type LobbyPlayer = {
  lobby_id: string;
  player_id: string;
  role: string;
  is_ready: boolean;
  last_seen: string;
};

type LobbyPlayerWithProfile = LobbyPlayer & {
  profiles: {
    username: string;
    avatar_color?: string;
  };
};

export const useLobby = (lobbyId: string | null, userId: string | undefined) => {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lobbyId || !userId) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    const fetchLobby = async () => {
      try {
        // Fetch lobby details
        const { data: lobbyData, error: lobbyError } = await supabase
          .from('lobbies')
          .select('*')
          .eq('id', lobbyId)
          .single();

        if (lobbyError) throw lobbyError;
        setLobby(lobbyData);

        // Fetch players with defensive null-safety for profiles
        const { data: playersData, error: playersError } = await supabase
          .from('lobby_players')
          .select('*, profiles(username, avatar_color)')
          .eq('lobby_id', lobbyId);

        if (playersError) throw playersError;

        // Filter out players with null profiles and add fallback data
        const validPlayers = (playersData || [])
          .filter(p => p.profiles)
          .map(p => ({
            ...p,
            profiles: {
              username: p.profiles?.username || 'Unknown',
              avatar_color: p.profiles?.avatar_color || 'indigo'
            }
          }));

        setPlayers(validPlayers as any);

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    const setupRealtimeSubscriptions = () => {
      // Subscribe to lobby changes
      channel = supabase.channel(`lobby:${lobbyId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lobbies',
            filter: `id=eq.${lobbyId}`
          },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              console.log(`[useLobby] Lobby updated:`, {
                lobby_id: lobbyId,
                old_status: payload.old?.status,
                new_status: payload.new?.status,
                user_id: userId
              });
              setLobby(payload.new as Lobby);
            } else if (payload.eventType === 'DELETE') {
              console.log(`[useLobby] Lobby deleted:`, { lobby_id: lobbyId });
              setError('Lobby was deleted');
              setLobby(null);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lobby_players',
            filter: `lobby_id=eq.${lobbyId}`
          },
          async () => {
            // Refetch players on any player change with null-safety
            const { data } = await supabase
              .from('lobby_players')
              .select('*, profiles(username, avatar_color)')
              .eq('lobby_id', lobbyId);

            if (data) {
              const validPlayers = data
                .filter(p => p.profiles)
                .map(p => ({
                  ...p,
                  profiles: {
                    username: p.profiles?.username || 'Unknown',
                    avatar_color: p.profiles?.avatar_color || 'indigo'
                  }
                }));
              setPlayers(validPlayers as any);
            }
          }
        )
        .subscribe();
    };

    fetchLobby();
    setupRealtimeSubscriptions();

    // Heartbeat to update last_seen
    const heartbeat = setInterval(async () => {
      await supabase
        .from('lobby_players')
        .update({ last_seen: new Date().toISOString() })
        .eq('lobby_id', lobbyId)
        .eq('player_id', userId);
    }, 15000);

    return () => {
      clearInterval(heartbeat);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [lobbyId, userId]);

  return { lobby, players, loading, error };
};
