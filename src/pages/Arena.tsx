import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bot, Trophy, Swords, Plus, RefreshCw } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GAME_METADATA, getGameMeta } from '@/lib/gameMetadata';
import { toast } from 'sonner';

type BotRow = {
  id: string;
  name: string;
  game_key: string;
  visibility: string;
  owner_profile_id: string;
  created_at: string;
};

type LeaderboardRow = {
  bot_id: string;
  elo_rating: number;
  games_rated: number;
  bot_name: string;
};

type ArenaMatchRow = {
  id: string;
  status: string;
  result: string | null;
  game_key: string;
  updated_at: string;
  p1Name: string;
  p2Name: string;
};

const GAME_KEYS = Object.keys(GAME_METADATA);

export default function Arena() {
  const navigate = useNavigate();
  const { user, signInAnonymously } = useAuth();

  const [gameKey, setGameKey] = useState('hex');
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [recentMatches, setRecentMatches] = useState<ArenaMatchRow[]>([]);
  const [myBots, setMyBots] = useState<BotRow[]>([]);

  const [newBotName, setNewBotName] = useState('');
  const [creating, setCreating] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const ensureSession = async () => {
    if (user) return true;
    const { error } = await signInAnonymously();
    if (error) {
      toast.error('Failed to create guest session', { description: error.message });
      return false;
    }
    return true;
  };

  const load = async () => {
    setLoading(true);
    try {
      // Leaderboard: top bots by elo for active season
      const { data: season } = await supabase
        .from('bot_seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (season?.id) {
        const { data: ratings } = await supabase
          .from('bot_ratings')
          .select('bot_id, elo_rating, games_rated')
          .eq('season_id', season.id)
          .eq('game_key', gameKey)
          .order('elo_rating', { ascending: false })
          .limit(20);

        if (ratings && ratings.length > 0) {
          const botIds = ratings.map((r: any) => r.bot_id);
          const { data: bots } = await supabase
            .from('bots')
            .select('id, name')
            .in('id', botIds);
          const nameById = new Map<string, string>();
          (bots ?? []).forEach((b: any) => nameById.set(b.id, b.name));

          setLeaderboard(
            ratings.map((r: any) => ({
              bot_id: r.bot_id,
              elo_rating: r.elo_rating,
              games_rated: r.games_rated,
              bot_name: nameById.get(r.bot_id) ?? 'Bot',
            }))
          );
        } else {
          setLeaderboard([]);
        }
      } else {
        setLeaderboard([]);
      }

      // Recent arena matches
      const { data: matches } = await supabase
        .from('matches')
        .select('id, status, result, game_key, updated_at')
        .eq('is_arena', true)
        .eq('game_key', gameKey)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (matches && matches.length > 0) {
        const matchIds = matches.map((m: any) => m.id);
        const { data: botMatches } = await supabase
          .from('bot_matches')
          .select('match_id, p1_bot_id, p2_bot_id')
          .in('match_id', matchIds);

        const allBotIds = Array.from(
          new Set((botMatches ?? []).flatMap((bm: any) => [bm.p1_bot_id, bm.p2_bot_id].filter(Boolean)))
        );
        const { data: bots } = allBotIds.length
          ? await supabase.from('bots').select('id, name').in('id', allBotIds)
          : { data: [] };
        const nameById = new Map<string, string>();
        (bots ?? []).forEach((b: any) => nameById.set(b.id, b.name));

        const bmByMatch = new Map<string, any>();
        (botMatches ?? []).forEach((bm: any) => bmByMatch.set(bm.match_id, bm));

        setRecentMatches(
          matches.map((m: any) => {
            const bm = bmByMatch.get(m.id);
            return {
              ...m,
              p1Name: bm?.p1_bot_id ? (nameById.get(bm.p1_bot_id) ?? 'Bot') : '?',
              p2Name: bm?.p2_bot_id ? (nameById.get(bm.p2_bot_id) ?? 'Bot') : '?',
            };
          })
        );
      } else {
        setRecentMatches([]);
      }

      // My bots
      if (user) {
        const { data: mine } = await supabase
          .from('bots')
          .select('id, name, game_key, visibility, owner_profile_id, created_at')
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false });
        setMyBots((mine as any) ?? []);
      } else {
        setMyBots([]);
      }
    } catch (e: any) {
      console.error('[Arena] load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, user?.id]);

  const onCreateBot = async () => {
    if (!newBotName.trim()) {
      toast.error('Enter a bot name');
      return;
    }
    if (!(await ensureSession())) return;

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bot', {
        body: { name: newBotName.trim(), gameKey, visibility: 'public' },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed');
      toast.success(`Bot "${data.bot.name}" created!`);
      setLastToken(data.token);
      setNewBotName('');
      load();
    } catch (e: any) {
      toast.error('Failed to create bot', { description: e?.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              Bot Arena
            </h1>
            <p className="text-muted-foreground mt-1">
              Create bots, battle on the ladder, spectate matches.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={gameKey} onValueChange={setGameKey}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAME_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rated bots yet for this game.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((row, i) => (
                    <div
                      key={row.bot_id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50 cursor-pointer hover:bg-card/80 transition-colors"
                      onClick={() => navigate(`/bot/${row.bot_id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-mono text-muted-foreground w-6 text-right">
                          {i + 1}
                        </span>
                        <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{row.bot_name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm text-muted-foreground">{row.games_rated}G</span>
                        <span className="font-mono font-semibold">{row.elo_rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Bot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Bot name"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                maxLength={64}
                onKeyDown={(e) => e.key === 'Enter' && onCreateBot()}
              />
              <Button onClick={onCreateBot} disabled={creating} className="w-full">
                {creating ? 'Creating...' : `Create ${gameKey} bot`}
              </Button>

              {lastToken && (
                <div className="p-3 rounded-lg border bg-yellow-950/20 border-yellow-800/30 space-y-1">
                  <p className="text-xs font-medium text-yellow-400">Bot token (shown once):</p>
                  <code className="text-xs break-all select-all">{lastToken}</code>
                </div>
              )}

              {myBots.length > 0 && (
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">My Bots</p>
                  {myBots.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 p-2 rounded border bg-card/50 cursor-pointer hover:bg-card/80 transition-colors"
                      onClick={() => navigate(`/bot/${b.id}`)}
                    >
                      <span className="text-sm truncate">{b.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{b.game_key}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={() => navigate('/workbench')} className="w-full">
                Workbench
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No arena matches yet for this game.</p>
            ) : (
              <div className="space-y-2">
                {recentMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.p1Name} vs {m.p2Name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {m.status}{m.result ? ` · ${m.result}` : ''}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(m.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/match/${m.id}`)}>
                      {m.status === 'active' ? 'Spectate' : 'Replay'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
