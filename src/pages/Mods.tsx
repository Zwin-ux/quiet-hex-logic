import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { importModFromFile } from '@/lib/mods/import';
import { listMods, removeMod, upsertMod } from '@/lib/mods/storage';
import type { InstalledMod } from '@/lib/mods/schema';
import { createLocalMatch } from '@/lib/localMatches/storage';
import { listGames } from '@/lib/engine/registry';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkshopMods } from '@/hooks/useWorkshopMods';

const SAMPLE_MODS: Array<{
  id: string;
  name: string;
  description: string;
  file: string;
}> = [
  {
    id: 'sample-ttt-misere',
    name: 'Misere Tic Tac Toe',
    description: 'Make three in a row and you lose.',
    file: '/mods/sample-ttt-misere.openboardmod',
  },
  {
    id: 'sample-connect4-blitz',
    name: 'Connect 3 Blitz',
    description: 'First to connect 3 wins.',
    file: '/mods/sample-connect4-blitz.openboardmod',
  },
  {
    id: 'sample-checkers-chill',
    name: 'Chill Checkers',
    description: 'No forced captures, shorter no-capture draws.',
    file: '/mods/sample-checkers-chill.openboardmod',
  },
  {
    id: 'sample-chess-endgame-arena',
    name: 'Endgame Arena',
    description: 'Start from a king and pawn endgame.',
    file: '/mods/sample-chess-endgame-arena.openboardmod',
  },
  {
    id: 'sample-hex-no-pie',
    name: 'No Pie Rule',
    description: 'Disables the pie swap.',
    file: '/mods/sample-hex-no-pie.openboardmod',
  },
];

export default function Mods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mods, setMods] = useState<InstalledMod[]>(() => {
    try { return listMods(); } catch { return []; }
  });
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const games = useMemo(() => listGames(), []);
  const [localGameKey, setLocalGameKey] = useState<string>(() => games.find((g) => g.key === 'checkers')?.key ?? (games[0]?.key ?? 'hex'));
  const [selectedModId, setSelectedModId] = useState<string>('__none__');
  const { mods: workshopMods, loading: workshopLoading } = useWorkshopMods({});

  const filteredMods = useMemo(() => {
    return mods.filter((m) => (m.manifest.games as any)?.[localGameKey]?.rules != null);
  }, [mods, localGameKey]);

  const refresh = () => { try { setMods(listMods()); } catch { setMods([]); } };

  const onImport = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const manifest = await importModFromFile(file);
      upsertMod(manifest);
      refresh();
      toast.success('Mod installed', { description: `${manifest.name} (${manifest.id})` });
    } catch (e: any) {
      console.error('[Mods] import error:', e);
      toast.error('Failed to import mod', { description: e?.message ?? 'Unknown error' });
    } finally {
      setImporting(false);
    }
  };

  const onStartLocal = () => {
    const mod = selectedModId === '__none__' ? null : mods.find((m) => m.manifest.id === selectedModId) ?? null;
    const rules = mod ? (mod.manifest.games as any)?.[localGameKey]?.rules ?? null : null;
    const pieRule = localGameKey === 'hex' && typeof (rules as any)?.pieRule === 'boolean' ? (rules as any).pieRule : undefined;
    const match = createLocalMatch({ gameKey: localGameKey, rules, pieRule });
    navigate(`/match/${match.id}`);
  };

  const onInstallSample = async (sample: (typeof SAMPLE_MODS)[number]) => {
    setImporting(true);
    try {
      const res = await fetch(sample.file);
      if (!res.ok) throw new Error(`Failed to fetch ${sample.file}`);
      const blob = await res.blob();
      const file = new File([blob], `${sample.id}.openboardmod`, { type: 'application/octet-stream' });
      const manifest = await importModFromFile(file);
      upsertMod(manifest);
      refresh();
      toast.success('Mod installed', { description: `${manifest.name} (${manifest.id})` });
    } catch (e: any) {
      console.error('[Mods] sample install error:', e);
      toast.error('Failed to install sample mod', { description: e?.message ?? 'Unknown error' });
    } finally {
      setImporting(false);
    }
  };

  const onInstallWorkshop = async (modId: string) => {
    const mod = workshopMods.find((m) => m.id === modId);
    const versionId = mod?.latest_version_id ?? null;
    if (!versionId) {
      toast.error('This mod has no downloadable version yet');
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase
        .from('workshop_mod_versions' as any)
        .select('manifest')
        .eq('id', versionId)
        .single();

      if (error) throw error;
      const manifest = (data as any)?.manifest;
      if (!manifest) throw new Error('Missing manifest in version row');

      upsertMod(manifest);
      refresh();
      toast.success('Mod installed', { description: `${mod?.name ?? 'Workshop mod'}` });
    } catch (e: any) {
      console.error('[Mods] workshop install error:', e);
      toast.error('Failed to install workshop mod', { description: e?.message ?? 'Unknown error' });
    } finally {
      setImporting(false);
    }
  };

  const onPublishWorkshop = async (file: File | null) => {
    if (!file) return;
    if (!user) {
      toast.error('Sign in to publish');
      return;
    }

    setPublishing(true);
    try {
      const manifest = await importModFromFile(file);
      const { data, error } = await supabase.functions.invoke('workshop-publish-mod', {
        body: { manifest },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success('Published to Workshop', { description: `${manifest.name} (${manifest.id}@${manifest.version})` });
    } catch (e: any) {
      console.error('[Mods] publish error:', e);
      toast.error('Failed to publish', { description: e?.message ?? 'Unknown error' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-8">
          <Package className="h-12 w-12 text-indigo mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold">Mods</h1>
          <p className="text-muted-foreground">Local-only variants and skins (v1)</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Install Mod</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Installed mods affect local games started from this page. For online multiplayer variants, use Workshop mods via lobby settings (server-enforced).
            </p>
            <input
              type="file"
              accept=".zip,.json,.openboardmod"
              disabled={importing}
              onChange={(e) => onImport(e.target.files?.[0] ?? null)}
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Workshop (Public Registry)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Browse published variants. Install adds the mod to your local library; online matches use a server rules snapshot.
            </p>

            {workshopLoading ? (
              <p className="text-sm text-muted-foreground">Loading workshop...</p>
            ) : workshopMods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published mods yet.</p>
            ) : (
              <div className="space-y-2">
                {workshopMods.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.description || m.game_key}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {m.manifest_id ? `${m.manifest_id}` : m.id}{m.latest_version_id ? '' : ' (no version)'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={importing || !m.latest_version_id}
                      onClick={() => onInstallWorkshop(m.id)}
                    >
                      Install
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t space-y-2">
              <p className="text-sm font-medium">Publish a Mod</p>
              <p className="text-xs text-muted-foreground">
                Upload a `.openboardmod` or `.zip` with `manifest.json` and `rules/{game}.json`.
              </p>
              <input
                type="file"
                accept=".zip,.json,.openboardmod"
                disabled={publishing || !user}
                onChange={(e) => onPublishWorkshop(e.target.files?.[0] ?? null)}
              />
              {!user ? (
                <p className="text-xs text-muted-foreground">
                  Sign in to publish.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Sample Mods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Install a couple examples to see what v1 rules mods can do.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_MODS.map((m) => (
                <div key={m.id} className="p-3 rounded-lg border bg-card/50">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{m.description}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={importing}
                    onClick={() => onInstallSample(m)}
                  >
                    Install
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Start Local Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Game</label>
                <Select value={localGameKey} onValueChange={(v) => { setLocalGameKey(v as any); setSelectedModId('__none__'); }}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                    {games.map((g) => (
                      <SelectItem key={g.key} value={g.key}>{g.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Rules Mod</label>
                <Select value={selectedModId} onValueChange={(v) => setSelectedModId(v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {filteredMods.map((m) => (
                      <SelectItem key={m.manifest.id} value={m.manifest.id}>
                        {m.manifest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={onStartLocal} className="w-full h-11" disabled={importing}>
              Start Local Game
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Installed Mods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No mods installed yet. Import a `.zip` containing `manifest.json` (and optional `rules/{game}.json`).
              </p>
            ) : (
              <div className="space-y-2">
                {mods.map((m) => (
                  <div key={m.manifest.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.manifest.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {m.manifest.id}@{m.manifest.version}
                      </p>
                      {m.manifest.author ? (
                        <p className="text-xs text-muted-foreground truncate">by {m.manifest.author}</p>
                      ) : null}
                      {m.manifest.description ? (
                        <p className="text-xs text-muted-foreground truncate">{m.manifest.description}</p>
                      ) : null}
                      <p className="text-[11px] text-muted-foreground truncate">
                        Rules:{' '}
                        {Object.entries((m.manifest.games as any) ?? {})
                          .filter(([, v]) => (v as any)?.rules != null)
                          .map(([k]) => k)
                          .sort()
                          .join(', ') || 'none'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        removeMod(m.manifest.id);
                        refresh();
                        toast.success('Mod removed');
                      }}
                    >
                      Remove
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
