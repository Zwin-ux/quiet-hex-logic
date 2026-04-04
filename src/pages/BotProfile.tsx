import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bot, Swords, Trophy, ArrowLeft, RefreshCw } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { guestAuthMessage } from '@/lib/authErrors';
import { toast } from 'sonner';

type BotRow = {
  id: string;
  name: string;
  game_key: string;
  visibility: 'private' | 'unlisted' | 'public';
  owner_profile_id: string;
  created_at: string;
};

type RatingRow = {
  bot_id: string;
  season_id: string;
  game_key: string;
  elo_rating: number;
  games_rated: number;
  updated_at: string;
};

type HistoryRow = {
  id: string;
  match_id: string;
  game_key: string;
  old_rating: number;
  new_rating: number;
  rating_change: number;
  created_at: string;
};

type BotMatchRow = { match_id: string; p1_bot_id: string; p2_bot_id: string };

type MatchRow = {
  id: string;
  status: string;
  result: string | null;
  winner: number | null;
  game_key: string;
  size: number;
  updated_at: string;
  rules: any;
};

function variantLabel(gameKey: string, rules: any): string | null {
  const key = typeof rules?.presetKey === 'string' ? rules.presetKey : null;
  if (key) return key;
  if (gameKey === 'ttt' && rules?.misere === true) return 'Misere';
  if (gameKey === 'connect4' && Number.isInteger(rules?.connect) && Number(rules.connect) !== 4) return `Connect ${Number(rules.connect)}`;
  if (gameKey === 'checkers' && rules?.mandatoryCapture === false) return 'No Forced Capture';
  if (gameKey === 'chess' && typeof rules?.startFen === 'string' && rules.startFen.trim()) return 'Custom FEN';
  if (gameKey === 'hex' && rules && typeof rules?.pieRule === 'boolean' && rules.pieRule === false) return 'No Swap';
  return null;
}

export default function BotProfile() {
  const navigate = useNavigate();
  const { botId } = useParams();
  const { user, signInAnonymously } = useAuth();

  const [loading, setLoading] = useState(false);
  const [bot, setBot] = useState<BotRow | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [activeSeasonName, setActiveSeasonName] = useState<string>('Season 0');
  const [rating, setRating] = useState<RatingRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [myBots, setMyBots] = useState<BotRow[]>([]);
  const [challengeBotId, setChallengeBotId] = useState<string>('');

  const [recentMatches, setRecentMatches] = useState<(MatchRow & { p1Name: string; p2Name: string })[]>([]);

  const ensureSession = async () => {
    if (user) return true;
    const { error } = await signInAnonymously();
    if (error) {
      toast.error('Sign in required', { description: guestAuthMessage(error, 'challenge bots') });
      return false;
    }
    return true;
  };

  const canChallenge = useMemo(() => {
    if (!bot) return false;
    return myBots.some((b) => (b.game_key ?? 'hex') === (bot.game_key ?? 'hex'));
  }, [bot, myBots]);

  const eligibleChallengers = useMemo(() => {
    if (!bot) return [];
    return myBots.filter((b) => (b.game_key ?? 'hex') === (bot.game_key ?? 'hex'));
  }, [bot, myBots]);

  const load = async () => {
    if (!botId) return;
    setLoading(true);
    try {
      const { data: b, error: botErr } = await supabase
        .from('bots')
        .select('id,name,game_key,visibility,owner_profile_id,created_at')
        .eq('id', botId)
        .maybeSingle();
      if (botErr) throw botErr;
      if (!b) {
        setBot(null);
        return;
      }
      setBot(b as any);

      const { data: season } = await supabase
        .from('bot_seasons')
        .select('id,name,is_active')
        .eq('is_active', true)
        .maybeSingle();
      if (season?.id) {
        setActiveSeasonId(season.id);
        setActiveSeasonName(season.name ?? 'Season 0');
      }

      if (season?.id) {
        const { data: r } = await supabase
          .from('bot_ratings')
          .select('bot_id,season_id,game_key,elo_rating,games_rated,updated_at')
          .eq('bot_id', botId)
          .eq('season_id', season.id)
          .eq('game_key', (b as any).game_key ?? 'hex')
          .maybeSingle();
        setRating((r as any) ?? null);

        const { data: h } = await supabase
          .from('bot_rating_history')
          .select('id,match_id,game_key,old_rating,new_rating,rating_change,created_at')
          .eq('bot_id', botId)
          .eq('season_id', season.id)
          .eq('game_key', (b as any).game_key ?? 'hex')
          .order('created_at', { ascending: false })
          .limit(25);
        setHistory((h as any) ?? []);
      } else {
        setRating(null);
        setHistory([]);
      }

      // Recent arena matches for this bot
      const { data: bm } = await supabase
        .from('bot_matches')
        .select('match_id,p1_bot_id,p2_bot_id')
        .or(`p1_bot_id.eq.${botId},p2_bot_id.eq.${botId}`)
        .limit(30);

      const matchIds = ((bm as any) ?? []).map((x: BotMatchRow) => x.match_id);
      if (matchIds.length) {
        const { data: matches } = await supabase
          .from('matches')
          .select('id,status,result,winner,game_key,size,updated_at,rules')
          .in('id', matchIds as any)
          .eq('is_arena', true)
          .order('updated_at', { ascending: false })
          .limit(30);

        const botIds = Array.from(new Set(((bm as any) ?? []).flatMap((x: BotMatchRow) => [x.p1_bot_id, x.p2_bot_id])));
        const { data: bots } = await supabase
          .from('bots')
          .select('id,name')
          .in('id', botIds as any);
        const nameById = new Map<string, string>();
        ((bots as any) ?? []).forEach((x: any) => nameById.set(x.id, x.name ?? 'Bot'));

        const bmByMatch = new Map<string, BotMatchRow>();
        ((bm as any) ?? []).forEach((x: BotMatchRow) => bmByMatch.set(x.match_id, x));

        const rows = ((matches as any) ?? []).map((m: MatchRow) => {
          const meta = bmByMatch.get(m.id);
          return {
            ...(m as any),
            p1Name: meta?.p1_bot_id ? (nameById.get(meta.p1_bot_id) ?? 'Bot P1') : 'Bot P1',
            p2Name: meta?.p2_bot_id ? (nameById.get(meta.p2_bot_id) ?? 'Bot P2') : 'Bot P2',
          };
        });
        setRecentMatches(rows);
      } else {
        setRecentMatches([]);
      }

      if (user) {
        const { data: mine } = await supabase
          .from('bots')
          .select('id,name,game_key,visibility,owner_profile_id,created_at')
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false });
        setMyBots((mine as any) ?? []);
      } else {
        setMyBots([]);
      }
    } catch (e: any) {
      console.error('[BotProfile] load error', e);
      toast.error('Failed to load bot', { description: e?.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId, user?.id]);

  const onChallenge = async () => {
    if (!bot) return;
    if (!challengeBotId) {
      toast.error('Pick one of your bots');
      return;
    }
    if (!(await ensureSession())) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('arena-create-match', {
        body: {
          gameKey: bot.game_key ?? 'hex',
          p1BotId: challengeBotId,
          p2BotId: bot.id,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to create match');
      toast.success('Challenge match created');
      navigate(`/match/${data.matchId}`);
    } catch (e: any) {
      toast.error('Failed to create challenge', { description: e?.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  if (!botId) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl">
          <Card>
            <CardHeader><CardTitle>Bot not found</CardTitle></CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/arena')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Arena
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/arena')} className="h-10 w-10 p-0 shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-display font-bold truncate flex items-center gap-2">
                <Bot className="h-7 w-7 text-primary" />
                {bot?.name ?? 'Bot'}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2 font-mono text-sm">
              {(bot?.game_key ?? 'hex')} · {(bot?.visibility ?? 'public')} · {botId}
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Ladder ({activeSeasonName})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!rating ? (
                <p className="text-sm text-muted-foreground">No rated arena matches yet.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg border bg-card/50 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Elo</div>
                    <div className="text-xl font-semibold">{rating.elo_rating}</div>
                  </div>
                  <div className="rounded-lg border bg-card/50 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Games</div>
                    <div className="text-xl font-semibold">{rating.games_rated}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(rating.updated_at), { addSuffix: true })}
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Recent Rating Changes</div>
                  {history.slice(0, 10).map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">Match {h.match_id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      <div className={`font-mono text-sm ${h.rating_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {h.rating_change >= 0 ? `+${h.rating_change}` : String(h.rating_change)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Swords className="h-5 w-5" />
                Challenge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canChallenge ? (
                <p className="text-sm text-muted-foreground">
                  Create a {bot?.game_key ?? 'hex'} bot in <span className="font-mono">/arena</span> to challenge this one.
                </p>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Your Bot</label>
                    <Select value={challengeBotId} onValueChange={setChallengeBotId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleChallengers.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={onChallenge} disabled={loading} className="w-full">
                    Start Match
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => navigate('/workbench')} className="w-full">
                Bot Workbench
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Arena Matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent matches.</p>
            ) : (
              recentMatches.map((m) => {
                const v = variantLabel(m.game_key ?? 'hex', (m as any).rules);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.p1Name} vs {m.p2Name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {m.game_key}{v ? ` · ${v}` : ''} · {m.status}{m.result ? ` · ${m.result}` : ''}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(m.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/match/${m.id}`)}>
                      Spectate
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

