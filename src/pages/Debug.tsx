import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BoardSceneLab } from '@/components/board/BoardSceneLab';
import { FintechDesignLab } from '@/components/board/FintechDesignLab';
import { NavBar } from '@/components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSupabaseConfigSnapshot, supabase } from '@/integrations/supabase/client';
import { getPublicEnv } from '@/lib/runtimeEnv';

function envString(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

function tryParseJwtRef(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json?.ref === 'string' ? json.ref : null;
  } catch {
    return null;
  }
}

export default function Debug() {
  const location = useLocation();
  const navigate = useNavigate();
  const buildId = typeof __HEXLOGY_BUILD_ID__ === 'string' ? __HEXLOGY_BUILD_ID__ : '';
  const apiBase = envString(getPublicEnv('VITE_API_BASE_URL')).trim();
  const url = envString(getPublicEnv('VITE_SUPABASE_URL')).trim();
  const pid = envString(getPublicEnv('VITE_SUPABASE_PROJECT_ID')).trim();
  const anon = envString(getPublicEnv('VITE_SUPABASE_PUBLISHABLE_KEY')).trim();
  const { configError } = getSupabaseConfigSnapshot();
  const anonRef = useMemo(() => (anon ? tryParseJwtRef(anon) : null), [anon]);

  const computedRef = useMemo(() => {
    const urlRef = url.includes('.supabase.co')
      ? url.replace('https://', '').split('.supabase.co')[0]
      : '';
    return (urlRef || pid || '').trim();
  }, [url, pid]);

  const [authHealth, setAuthHealth] = useState<{ ok: boolean; status?: number; error?: string } | null>(null);
  const [restHealth, setRestHealth] = useState<{ ok: boolean; status?: number; error?: string } | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ hasSession: boolean; userId?: string } | null>(null);
  const modeFromSearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode === 'lab' || mode === 'scenes') return mode;
    return 'system';
  }, [location.search]);
  const [mode, setMode] = useState<'system' | 'lab' | 'scenes'>(modeFromSearch);
  const knownBadRef = 'ptuxqfwicdpdslqwnswd';

  useEffect(() => {
    setMode(modeFromSearch);
  }, [modeFromSearch]);

  const setModeRoute = (nextMode: 'system' | 'lab' | 'scenes') => {
    const params = new URLSearchParams(location.search);

    if (nextMode === 'lab' || nextMode === 'scenes') {
      params.set('mode', nextMode);
    } else {
      params.delete('mode');
    }

    setMode(nextMode);
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    );
  };

  const runChecks = async () => {
    setAuthHealth(null);
    setRestHealth(null);

    try {
      const r = await fetch(`${url}/auth/v1/health`, { method: 'GET', headers: anon ? { apikey: anon } : undefined });
      setAuthHealth({ ok: r.ok, status: r.status });
    } catch (e: any) {
      setAuthHealth({ ok: false, error: e?.message ?? 'fetch_failed' });
    }

    try {
      const r = await fetch(`${url}/rest/v1/`, { method: 'GET', headers: anon ? { apikey: anon } : undefined });
      setRestHealth({ ok: r.ok, status: r.status });
    } catch (e: any) {
      setRestHealth({ ok: false, error: e?.message ?? 'fetch_failed' });
    }

    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? undefined;
      setSessionInfo({ hasSession: !!data.session, userId });
    } catch {
      setSessionInfo({ hasSession: false });
    }
  };

  useEffect(() => {
    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {mode === 'system' ? <NavBar /> : null}
      <div
        className={
          mode === 'lab'
            || mode === 'scenes'
            ? 'container mx-auto max-w-7xl px-4 pb-16 pt-10 space-y-8'
            : 'container mx-auto max-w-4xl px-4 pb-12 pt-20 space-y-6'
        }
      >
        {mode === 'system' ? (
          <>
            <div>
              <h1 className="text-4xl font-display font-bold">Debug</h1>
              <p className="text-muted-foreground mt-2">
                This page shows what the running frontend is actually using after Railway runtime env injection.
              </p>
            </div>

            <div className="market-debug-toggle">
              <button
                type="button"
                onClick={() => setModeRoute('system')}
                className={mode === 'system' ? 'market-debug-toggle__item is-active' : 'market-debug-toggle__item'}
              >
                System
              </button>
              <button
                type="button"
                onClick={() => setModeRoute('lab')}
                className={mode === 'lab' ? 'market-debug-toggle__item is-active' : 'market-debug-toggle__item'}
              >
                Fintech Lab
              </button>
              <button
                type="button"
                onClick={() => setModeRoute('scenes')}
                className={mode === 'scenes' ? 'market-debug-toggle__item is-active' : 'market-debug-toggle__item'}
              >
                Board Scenes
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-black/45">
                Interface Lab
              </p>
              <p className="mt-2 text-sm text-black/58">
                Borderless venue study.
              </p>
            </div>
            <div className="market-debug-toggle">
              <button
                type="button"
                onClick={() => setModeRoute('system')}
                className={mode === 'system' ? 'market-debug-toggle__item is-active' : 'market-debug-toggle__item'}
              >
                System
              </button>
              <button
                type="button"
                onClick={() => setModeRoute('lab')}
                className={mode === 'lab' ? 'market-debug-toggle__item is-active' : 'market-debug-toggle__item'}
              >
                Fintech Lab
              </button>
              <button
                type="button"
                onClick={() => setModeRoute('scenes')}
                className={mode === 'scenes' ? 'market-debug-toggle__item is-active' : 'market-debug-toggle__item'}
              >
                Board Scenes
              </button>
            </div>
          </div>
        )}

        {mode === 'system' ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supabase Env</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  Build ID: <span className="font-mono">{buildId || '(unknown)'}</span>
                </div>
                <div>
                  VITE_API_BASE_URL: <span className="font-mono">{apiBase || '(same-origin /api)'}</span>
                </div>
                <div>
                  VITE_SUPABASE_URL: <span className="font-mono">{url || '(missing)'}</span>
                </div>
                <div>
                  VITE_SUPABASE_PROJECT_ID: <span className="font-mono">{pid || '(missing)'}</span>
                </div>
                <div>
                  Computed ref: <span className="font-mono">{computedRef || '(missing)'}</span>
                </div>
                <div>
                  Anon key ref: <span className="font-mono">{anonRef || '(unknown)'}</span>
                </div>
                <div>
                  Config error: <span className="font-mono">{configError || '(none)'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Known-bad ref (deleted project): <span className="font-mono">{knownBadRef}</span>
                </div>
                <div className="pt-2">
                  <Button onClick={runChecks} variant="outline">Re-run Checks</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  Auth health: <span className="font-mono">
                    {authHealth ? (authHealth.ok ? `OK (${authHealth.status})` : `FAIL (${authHealth.status ?? authHealth.error})`) : '...'}
                  </span>
                </div>
                <div>
                  REST root: <span className="font-mono">
                    {restHealth ? (restHealth.ok ? `OK (${restHealth.status})` : `FAIL (${restHealth.status ?? restHealth.error})`) : '...'}
                  </span>
                </div>
                <div>
                  Session: <span className="font-mono">
                    {sessionInfo ? (sessionInfo.hasSession ? `yes (${sessionInfo.userId})` : 'no') : '...'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground pt-2">
                  If you still see `ptuxqfwicdpdslqwnswd.supabase.co` anywhere here, you are on an old deployment or cached JS bundle.
                </div>
              </CardContent>
            </Card>
          </>
        ) : mode === 'lab' ? (
          <FintechDesignLab />
        ) : (
          <BoardSceneLab />
        )}
      </div>
    </div>
  );
}
