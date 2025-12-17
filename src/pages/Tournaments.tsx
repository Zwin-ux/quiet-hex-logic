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
import { Trophy, Users, Clock, Calendar, Plus, Search, Filter, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { TournamentStats } from '@/components/TournamentStats';
import { FeaturedTournament } from '@/components/FeaturedTournament';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
  participant_count: number;
  prize_pool?: string;
  is_featured?: boolean;
}

export default function Tournaments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest, guestUsername } = useGuestMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    activeTournaments: 0,
    totalPoints: 0,
    globalRank: '#12', // Placeholder
    wins: 0
  });

  useEffect(() => {
    loadTournaments();

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
          tournament_participants(count, player_id, points, wins)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tournamentsWithCount = data?.map(t => ({
        ...t,
        participant_count: t.tournament_participants?.[0]?.count || 0
      })) || [];

      setTournaments(tournamentsWithCount);

      // Calculate simple stats
      if (user) {
        let userPoints = 0;
        let userWins = 0;
        let activeCount = 0;

        tournamentsWithCount.forEach(t => {
          const participant = (t as any).tournament_participants?.find((p: any) => p.player_id === user.id);
          if (participant) {
            userPoints += participant.points || 0;
            userWins += participant.wins || 0;
            if (t.status === 'active') activeCount++;
          }
        });

        setStats(prev => ({
          ...prev,
          totalPoints: userPoints,
          wins: userWins,
          activeTournaments: activeCount
        }));
      }
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

  const filteredTournaments = tournaments.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const featuredTournament = filteredTournaments.find(t => t.is_featured && t.status === 'registration');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-amber-500 animate-gentle-pulse" />
          <p className="font-mono text-muted-foreground">Syncing tournament data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground p-4 md:p-8 space-y-12">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-5xl font-body font-bold tracking-tight mb-3">Arena</h1>
            <p className="text-muted-foreground text-lg">Compete in high-stakes brackets and claim your glory.</p>
          </div>
          {user && !isGuest && (
            <Button onClick={() => setShowCreateDialog(true)} size="lg" className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 backdrop-blur-sm">
              <Plus className="h-5 w-5 mr-2" />
              HOST EVENT
            </Button>
          )}
        </section>

        {/* User Stats Dashboard */}
        {!isGuest && user && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <TournamentStats stats={stats} />
          </section>
        )}

        {/* Featured Tournament */}
        {featuredTournament && (
          <section className="animate-in zoom-in-95 duration-700 delay-200">
            <FeaturedTournament 
              tournament={featuredTournament} 
              onView={() => navigate(`/tournament/${featuredTournament.id}`)} 
            />
          </section>
        )}

        {/* Browser Section */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tournaments by name or description..." 
                className="pl-12 bg-white/5 border-white/10 h-12 text-lg focus:ring-primary/50"
              />
            </div>
            <Button variant="outline" className="h-12 border-white/10 bg-white/5 gap-2 px-6">
              <Filter className="h-5 w-5" />
              FILTER
            </Button>
          </div>

          <Tabs defaultValue="open" className="space-y-8">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
              <TabsTrigger value="open" className="px-8 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                OPEN ({filteredTournaments.filter(t => t.status === 'registration').length})
              </TabsTrigger>
              <TabsTrigger value="active" className="px-8 py-2 rounded-lg data-[state=active]:bg-primary transition-all">
                IN PROGRESS ({filteredTournaments.filter(t => ['active', 'seeding'].includes(t.status)).length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="px-8 py-2 rounded-lg data-[state=active]:bg-primary transition-all">
                COMPLETED ({filteredTournaments.filter(t => t.status === 'completed').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.filter(t => t.status === 'registration').map(tournament => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onView={() => navigate(`/tournament/${tournament.id}`)}
                    getStatusColor={getStatusColor}
                    getFormatLabel={getFormatLabel}
                  />
                ))}
                {filteredTournaments.filter(t => t.status === 'registration').length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-xl text-muted-foreground">No open tournaments found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="active" className="animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.filter(t => ['active', 'seeding'].includes(t.status)).map(tournament => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onView={() => navigate(`/tournament/${tournament.id}`)}
                    getStatusColor={getStatusColor}
                    getFormatLabel={getFormatLabel}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.filter(t => t.status === 'completed').map(tournament => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onView={() => navigate(`/tournament/${tournament.id}`)}
                    getStatusColor={getStatusColor}
                    getFormatLabel={getFormatLabel}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>
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
    <Card 
      className="group relative bg-white/5 backdrop-blur-xl border-white/10 p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 cursor-pointer overflow-hidden" 
      onClick={onView}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
        <Trophy className="h-20 w-20 text-amber-500 -mr-6 -mt-6" />
      </div>

      <div className="relative flex flex-col h-full space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-body group-hover:text-amber-500 transition-colors">{tournament.name}</h3>
            {tournament.prize_pool && (
              <p className="text-amber-500 font-mono text-sm inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {tournament.prize_pool} PRIZE
              </p>
            )}
          </div>
            <Badge className={cn("px-2 py-0.5", getStatusColor(tournament.status))}>
              {tournament.status === 'registration' ? 'OPEN' : tournament.status.toUpperCase()}
            </Badge>
        </div>

        {tournament.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
            {tournament.description}
          </p>
        )}

        <div className="pt-4 grid grid-cols-2 gap-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{tournament.participant_count} / {tournament.max_players}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{tournament.board_size}x{tournament.board_size}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>{getFormatLabel(tournament.format)}</span>
          </div>
          {tournament.start_time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(tournament.start_time).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

