import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMode } from '@/hooks/useGuestMode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateTournamentDialog } from '@/components/CreateTournamentDialog';
import { Trophy, Users, Clock, Calendar, Plus } from 'lucide-react';
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
  created_at: string;
  start_time: string | null;
  created_by: string;
  participant_count?: number;
}

export default function Tournaments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest, guestUsername } = useGuestMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadTournaments();

    // Subscribe to tournament changes
    const channel = supabase
      .channel('tournaments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        () => loadTournaments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_participants(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tournamentsWithCount = data?.map(t => ({
        ...t,
        participant_count: t.tournament_participants?.[0]?.count || 0
      })) || [];

      setTournaments(tournamentsWithCount);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'active': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'completed': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'single_elimination': return 'Single Elimination';
      case 'round_robin': return 'Round Robin';
      default: return format;
    }
  };

  const filterTournaments = (status: string[]) => {
    return tournaments.filter(t => status.includes(t.status));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-primary animate-gentle-pulse" />
          <p className="font-mono text-muted-foreground">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Guest Mode Banner */}
        {isGuest && (
          <Card className="mb-8 p-6 bg-gradient-to-r from-violet/10 to-indigo/10 border-2 border-violet/30">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-violet/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-violet" />
              </div>
              <div>
                <h3 className="font-body text-xl font-bold text-foreground mb-2">
                  Tournaments Locked
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Playing as {guestUsername}. Create a free account to join tournaments and compete for glory!
                </p>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-gradient-to-r from-violet to-indigo hover:from-violet/90 hover:to-indigo/90"
              >
                Create Free Account
              </Button>
            </div>
          </Card>
        )}
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-body text-4xl font-bold mb-2">Tournaments</h1>
              <p className="text-muted-foreground">Compete against players in organized brackets</p>
            </div>
            {user && !isGuest && (
              <Button onClick={() => setShowCreateDialog(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Tournament
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="open" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-4">
            {filterTournaments(['registration']).length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No open tournaments</p>
                <p className="text-sm text-muted-foreground mt-2">Create one to get started!</p>
              </Card>
            ) : (
              filterTournaments(['registration']).map(tournament => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onView={() => navigate(`/tournament/${tournament.id}`)}
                  getStatusColor={getStatusColor}
                  getFormatLabel={getFormatLabel}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {filterTournaments(['active', 'seeding']).length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No active tournaments</p>
              </Card>
            ) : (
              filterTournaments(['active', 'seeding']).map(tournament => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onView={() => navigate(`/tournament/${tournament.id}`)}
                  getStatusColor={getStatusColor}
                  getFormatLabel={getFormatLabel}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filterTournaments(['completed']).length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed tournaments</p>
              </Card>
            ) : (
              filterTournaments(['completed']).map(tournament => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onView={() => navigate(`/tournament/${tournament.id}`)}
                  getStatusColor={getStatusColor}
                  getFormatLabel={getFormatLabel}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showCreateDialog && (
        <CreateTournamentDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            loadTournaments();
          }}
        />
      )}
    </div>
  );
}

interface TournamentCardProps {
  tournament: Tournament;
  onView: () => void;
  getStatusColor: (status: string) => string;
  getFormatLabel: (format: string) => string;
}

function TournamentCard({ tournament, onView, getStatusColor, getFormatLabel }: TournamentCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-body text-xl font-semibold">{tournament.name}</h3>
            <Badge className={getStatusColor(tournament.status)}>
              {tournament.status === 'registration' ? 'Open' : tournament.status}
            </Badge>
          </div>
          {tournament.description && (
            <p className="text-muted-foreground text-sm mb-3">{tournament.description}</p>
          )}
        </div>
        <Trophy className="h-6 w-6 text-primary ml-4" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{tournament.participant_count}/{tournament.max_players}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{tournament.board_size}×{tournament.board_size}</span>
        </div>
        <div className="text-muted-foreground">
          {getFormatLabel(tournament.format)}
        </div>
        {tournament.start_time && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(tournament.start_time).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
