import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { BracketVisualization } from '@/components/BracketVisualization';
import { Trophy, Users, ArrowLeft, Play, UserPlus, UserMinus, Award } from 'lucide-react';
import { toast } from 'sonner';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  max_players: number;
  min_players: number;
  board_size: number;
  pie_rule: boolean;
  turn_timer_seconds: number;
  created_by: string;
  created_at: string;
}

interface Participant {
  player_id: string;
  seed: number | null;
  status: string;
  wins: number;
  losses: number;
  profiles: {
    username: string;
    avatar_color: string;
  };
}

export default function TournamentView() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    loadTournament();

    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        () => loadTournament()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => loadTournament()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const loadTournament = async () => {
    if (!tournamentId) return;
    
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          profiles:player_id(username, avatar_color)
        `)
        .eq('tournament_id', tournamentId)
        .order('seed', { ascending: true, nullsFirst: false });

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Failed to load tournament:', error);
      toast.error('Failed to load tournament');
      navigate('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!tournamentId) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('join-tournament', {
        body: { tournamentId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Joined tournament!');
      await loadTournament();
    } catch (error: any) {
      toast.error('Failed to join tournament', {
        description: error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!tournamentId) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('leave-tournament', {
        body: { tournamentId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Left tournament');
      await loadTournament();
    } catch (error: any) {
      toast.error('Failed to leave tournament', {
        description: error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    if (!tournamentId) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('start-tournament', {
        body: { tournamentId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Tournament started!', {
        description: 'Bracket has been generated'
      });
      await loadTournament();
    } catch (error: any) {
      toast.error('Failed to start tournament', {
        description: error.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-primary animate-gentle-pulse" />
          <p className="font-mono text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  const isParticipant = participants.some(p => p.player_id === user?.id);
  const isCreator = tournament.created_by === user?.id;
  const canStart = isCreator && tournament.status === 'registration' && participants.length >= tournament.min_players;
  const canJoin = user && !isParticipant && tournament.status === 'registration' && participants.length < tournament.max_players;
  const canLeave = user && isParticipant && tournament.status === 'registration' && !isCreator;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tournaments')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-body text-4xl font-bold">{tournament.name}</h1>
                <Badge variant="outline" className="capitalize">
                  {tournament.status}
                </Badge>
              </div>
              {tournament.description && (
                <p className="text-muted-foreground mb-4">{tournament.description}</p>
              )}
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{participants.length}/{tournament.max_players} Players</span>
                </div>
                <div>Board: {tournament.board_size}×{tournament.board_size}</div>
                <div>Format: {tournament.format === 'single_elimination' ? 'Single Elimination' : 'Round Robin'}</div>
              </div>
            </div>

            <div className="flex gap-2">
              {canJoin && (
                <Button onClick={handleJoin} disabled={actionLoading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Tournament
                </Button>
              )}
              {canLeave && (
                <Button variant="outline" onClick={handleLeave} disabled={actionLoading}>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Leave
                </Button>
              )}
              {canStart && (
                <Button onClick={handleStart} disabled={actionLoading}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Tournament
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8">
          {/* Participants Sidebar */}
          <div>
            <Card className="p-6">
              <h3 className="font-body text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Participants
              </h3>
              
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No participants yet
                </p>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.player_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      {participant.seed && (
                        <span className="text-sm font-mono text-muted-foreground w-6">
                          #{participant.seed}
                        </span>
                      )}
                      <UserAvatar
                        username={participant.profiles.username}
                        color={participant.profiles.avatar_color}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {participant.profiles.username}
                        </p>
                        {participant.status !== 'active' && (
                          <p className="text-xs text-muted-foreground">
                            {participant.status}
                          </p>
                        )}
                      </div>
                      {participant.player_id === tournament.created_by && (
                        <Badge variant="outline" className="text-xs">Host</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Main Content */}
          <div>
            {tournament.status === 'registration' ? (
              <Card className="p-12 text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h2 className="font-body text-2xl font-bold mb-2">
                  Registration Open
                </h2>
                <p className="text-muted-foreground mb-4">
                  Waiting for players to join...
                </p>
                <p className="text-sm text-muted-foreground">
                  {participants.length < tournament.min_players ? (
                    <>Need {tournament.min_players - participants.length} more player(s) to start</>
                  ) : (
                    <>Ready to start! ({participants.length}/{tournament.max_players} players)</>
                  )}
                </p>
              </Card>
            ) : (
              <BracketVisualization tournamentId={tournamentId!} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
