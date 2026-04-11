import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Bot, Globe, KeyRound, Plus, RefreshCw, Swords, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { NavBar } from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { guestAuthMessage } from '@/lib/authErrors';
import type { BotRow, FeedRow, GameKey, RatingRow } from './arenaTypes';
import { fetchActiveSeason, fetchBots, fetchFeed, fetchLadder } from './arenaApi';
import { VARIANTS, variantLabel } from './variants';

export default function ArenaPage() {
  const navigate = useNavigate();
  const { user, signInAnonymously } = useAuth();

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'live' | 'ladder' | 'create' | 'bots'>('live');

  const [gameKey, setGameKey] = useState<GameKey>('hex');
  const [hexBoardSize, setHexBoardSize] = useState<7 | 9 | 11 | 13>(11);
  const [variantKey, setVariantKey] = useState<string>(VARIANTS.hex[0].key);

  const [tokenOnce, setTokenOnce] = useState<string | null>(null);
  const [newBotName, setNewBotName] = useState('My Bot');
  const [newBotVisibility, setNewBotVisibility] = useState<'private' | 'unlisted' | 'public'>('private');

  const [myBots, setMyBots] = useState<BotRow[]>([]);
  const [publicBots, setPublicBots] = useState<BotRow[]>([]);
  const [botSearch, setBotSearch] = useState('');
  const [p1BotId, setP1BotId] = useState('');
  const [p2BotId, setP2BotId] = useState('');

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [activeSeasonName, setActiveSeasonName] = useState('Season 0');
  const [ladder, setLadder] = useState<RatingRow[]>([]);

  const [liveMatches, setLiveMatches] = useState<FeedRow[]>([]);
  const [recentMatches, setRecentMatches] = useState<FeedRow[]>([]);

  const ensureSession = async () => {
    if (user) return true;
    const { error } = await signInAnonymously();
    if (error) {
      toast.error('Sign in required', { description: guestAuthMessage(error, 'use the arena') });
      return false;
    }
    return true;
  };

  const allGameBots = useMemo(() => myBots.filter((b) => (b.game_key ?? 'hex') === gameKey), [myBots, gameKey]);

  const selectedVariant = useMemo(() => {
    return (VARIANTS[gameKey] || []).find((v) => v.key === variantKey) ?? (VARIANTS[gameKey] || [])[0];
  }, [gameKey, variantKey]);

  const filteredPublicBots = useMemo(() => {
    const q = botSearch.trim().toLowerCase();
    if (!q) return publicBots;
    return publicBots.filter((b) => (b.name ?? '').toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  }, [publicBots, botSearch]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const season = await fetchActiveSeason();
      setActiveSeasonId(season?.id ?? null);
      setActiveSeasonName(season?.name ?? 'Season 0');

      const bots = await fetchBots(gameKey, user?.id ?? null);
      setPublicBots(bots.publicBots);
      setMyBots(bots.myBots);

      if (season?.id) setLadder(await fetchLadder(season.id, gameKey));
      else setLadder([]);

      const feed = await fetchFeed(gameKey);
      setLiveMatches(feed.live);
      setRecentMatches(feed.recent);
    } catch (e) {
      console.error('[Arena] refresh error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setP1BotId('');
    setP2BotId('');
    setVariantKey((VARIANTS[gameKey] || [])[0]?.key ?? 'Standard');
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, user?.id]);

  const onCreateBot = async () => {
    setTokenOnce(null);
    if (!(await ensureSession())) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-bot', {
        body: { name: newBotName, gameKey, visibility: newBotVisibility },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to create bot');
      setTokenOnce(data.token ?? null);
      toast.success('Bot created', { description: data.bot?.name ?? '' });
      await refreshAll();
    } catch (e: any) {
      toast.error('Failed to create bot', { description: e?.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const onRotateToken = async (botId: string) => {
    setTokenOnce(null);
    if (!(await ensureSession())) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rotate-bot-token', { body: { botId } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to rotate token');
      setTokenOnce(data.token ?? null);
      toast.success('Token rotated', { description: 'New token is shown once' });
    } catch (e: any) {
      toast.error('Failed to rotate token', { description: e?.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const onCreateMatch = async () => {
    setTokenOnce(null);
    if (!p1BotId || !p2BotId) return toast.error('Pick two bots');
    if (p1BotId === p2BotId) return toast.error('Pick two different bots');
    if (!(await ensureSession())) return;
    setLoading(true);
    try {
      const rules = selectedVariant?.rules ?? null;
      const { data, error } = await supabase.functions.invoke('arena-create-match', {
        body: {
          gameKey,
          boardSize: gameKey === 'hex' ? hexBoardSize : undefined,
          rules,
          p1BotId,
          p2BotId,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Failed to create match');
      toast.success('Arena match created');
      navigate(`/match/${data.matchId}`);
    } catch (e: any) {
      toast.error('Failed to create arena match', { description: e?.message ?? 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    if (!tokenOnce) return;
    try {
      await navigator.clipboard.writeText(tokenOnce);
      toast.success('Copied token');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <Swords className="h-8 w-8 text-primary" />
              BOARD Arena
            </h1>
            <p className="text-muted-foreground mt-2 max-w-3xl">
              Bring your own runner, plug in any AI, and let bots fight across BOARD's game surfaces.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/workbench')} className="gap-2">
              <KeyRound className="h-4 w-4" />
              Workbench
            </Button>
            <Button variant="outline" onClick={refreshAll} disabled={loading} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Game</label>
              <Select value={gameKey} onValueChange={(v) => setGameKey(v as GameKey)}>
                <SelectTrigger className="h-10 w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hex">Hex</SelectItem>
                  <SelectItem value="chess">Chess</SelectItem>
                  <SelectItem value="checkers">Checkers</SelectItem>
                  <SelectItem value="ttt">Tic Tac Toe</SelectItem>
                  <SelectItem value="connect4">Connect 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              Season: <span className="font-mono">{activeSeasonName}</span>
              {activeSeasonId ? <span className="ml-2 font-mono text-[11px]">{activeSeasonId.slice(0, 8)}</span> : null}
            </div>
          </CardContent>
        </Card>

        {tokenOnce && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                New Bot Token (shown once)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Save this token now. You will not be able to view it again; rotate to issue a new one.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Input value={tokenOnce} readOnly className="font-mono" />
                <Button onClick={copyToken} className="sm:w-auto w-full">Copy</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="live" className="gap-2">
              <Activity className="h-4 w-4" />
              Live
            </TabsTrigger>
            <TabsTrigger value="ladder" className="gap-2">
              <Trophy className="h-4 w-4" />
              Ladder
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="bots" className="gap-2">
              <Globe className="h-4 w-4" />
              Bots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Live Now</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {liveMatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active arena matches right now.</p>
                  ) : liveMatches.map((m) => {
                    const v = variantLabel(m.game_key, m.rules);
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.p1Name} vs {m.p2Name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {m.game_key}{v ? ` | ${v}` : ''} | turn {m.turn}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Updated {formatDistanceToNow(new Date(m.updated_at), { addSuffix: true })}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/match/${m.id}`)}>Spectate</Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Recently Finished</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {recentMatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No finished matches yet.</p>
                  ) : recentMatches.map((m) => {
                    const v = variantLabel(m.game_key, m.rules);
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.p1Name} vs {m.p2Name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {m.game_key}{v ? ` | ${v}` : ''} | {m.result ?? 'finished'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Updated {formatDistanceToNow(new Date(m.updated_at), { addSuffix: true })}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/match/${m.id}`)}>Replay</Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ladder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Bots ({activeSeasonName})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ladder.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No ladder entries yet. Start a bot match in the Create tab, then run your bots from the Workbench.
                  </p>
                ) : ladder.map((r, idx) => (
                  <div key={`${r.bot_id}:${r.season_id}:${r.game_key}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        <span className="font-mono text-muted-foreground mr-2">#{idx + 1}</span>
                        {r.bots?.name ?? r.bot_id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        Elo {r.elo_rating} | games {r.games_rated} | updated {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/bot/${r.bot_id}`)}>View</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create Bot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <Input value={newBotName} onChange={(e) => setNewBotName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Visibility</label>
                    <Select value={newBotVisibility} onValueChange={(v) => setNewBotVisibility(v as any)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="unlisted">Unlisted</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={onCreateBot} disabled={loading} className="w-full gap-2">
                    <Bot className="h-4 w-4" />
                    Create Bot
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Bots connect via a token. The Arena sends your runner the full match state plus a server-generated list of legal moves.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Swords className="h-5 w-5" />
                    Start Bot-vs-Bot Match
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gameKey === 'hex' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Hex Board Size</label>
                        <Select value={String(hexBoardSize)} onValueChange={(v) => setHexBoardSize(Number(v) as any)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7x7</SelectItem>
                            <SelectItem value="9">9x9</SelectItem>
                            <SelectItem value="11">11x11</SelectItem>
                            <SelectItem value="13">13x13</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Variant</label>
                        <Select value={variantKey} onValueChange={setVariantKey}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {VARIANTS[gameKey].map((v) => <SelectItem key={v.key} value={v.key}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {gameKey !== 'hex' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Variant</label>
                      <Select value={variantKey} onValueChange={setVariantKey}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VARIANTS[gameKey].map((v) => <SelectItem key={v.key} value={v.key}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">P1 Bot</label>
                      <Select value={p1BotId} onValueChange={setP1BotId}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {allGameBots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">P2 Bot</label>
                      <Select value={p2BotId} onValueChange={setP2BotId}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {allGameBots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={onCreateMatch} disabled={loading} className="w-full">
                    Create Arena Match
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Arena matches are public-spectate. Ratings are bot-only: humans stay unranked here.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">My Bots</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {myBots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bots yet. Create one above.</p>
                  ) : myBots.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{b.game_key} | {b.visibility}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{b.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/bot/${b.id}`)}>View</Button>
                        <Button variant="outline" size="sm" disabled={loading} onClick={() => onRotateToken(b.id)}>Rotate Token</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5" />Public Bots ({gameKey})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {publicBots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No public bots yet for this game.</p>
                  ) : publicBots.slice(0, 20).map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{b.id}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/bot/${b.id}`)}>View</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bots" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5" />Bot Directory ({gameKey})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input value={botSearch} onChange={(e) => setBotSearch(e.target.value)} placeholder="Search bots by name or id..." />
                {filteredPublicBots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No public bots found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredPublicBots.slice(0, 80).map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{b.name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/bot/${b.id}`)}>View</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="text-xs text-muted-foreground">
              Tip: run the reference runner from <span className="font-mono">/workbench</span>.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

