import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getWorldAppUser, runWorldWalletAuth } from '@/lib/worldApp/client';
import { worldAppApiJson } from '@/lib/worldApp/api';
import { useWorldApp } from '@/hooks/useWorldApp';

export type WorldAppIdentity = {
  profile_id: string;
  world_username: string | null;
  profile_picture_url: string | null;
  wallet_auth_at: string | null;
  idkit_verified_at: string | null;
};

type ConnectStatus = 'idle' | 'creating-session' | 'connecting' | 'connected' | 'error';

export function useWorldAppAuth() {
  const { user, session, loading, signInAnonymously } = useAuth();
  const worldApp = useWorldApp();
  const [identity, setIdentity] = useState<WorldAppIdentity | null>(null);
  const [status, setStatus] = useState<ConnectStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const anonymousAttemptedRef = useRef(false);

  const ensureSession = useCallback(async () => {
    const existing = (await supabase.auth.getSession()).data.session;
    if (existing) return existing;

    setStatus('creating-session');
    const { error: anonymousError } = await signInAnonymously();
    if (anonymousError) {
      throw new Error(anonymousError.message || 'Could not create anonymous Supabase session.');
    }

    const nextSession = (await supabase.auth.getSession()).data.session;
    if (!nextSession) {
      throw new Error('Supabase did not return an anonymous session.');
    }

    return nextSession;
  }, [signInAnonymously]);

  const loadIdentity = useCallback(async () => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      setIdentity(null);
      return null;
    }

    const { data, error: loadError } = await (supabase as any)
      .from('world_app_identities')
      .select('profile_id, world_username, profile_picture_url, wallet_auth_at, idkit_verified_at')
      .eq('profile_id', currentUser.id)
      .maybeSingle();

    if (loadError) {
      throw loadError;
    }

    setIdentity((data ?? null) as WorldAppIdentity | null);
    return (data ?? null) as WorldAppIdentity | null;
  }, []);

  useEffect(() => {
    if (!worldApp.isWorldApp || loading || user || anonymousAttemptedRef.current) return;

    let cancelled = false;
    anonymousAttemptedRef.current = true;
    setStatus('creating-session');

    signInAnonymously().then(({ error: anonymousError }) => {
      if (cancelled) return;
      if (anonymousError) {
        setError(anonymousError.message || 'Could not create anonymous Supabase session.');
        setStatus('error');
        return;
      }
      setStatus('idle');
    });

    return () => {
      cancelled = true;
    };
  }, [loading, signInAnonymously, user, worldApp.isWorldApp]);

  useEffect(() => {
    if (!user) {
      setIdentity(null);
      return;
    }

    loadIdentity().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Could not load World App identity.');
    });
  }, [loadIdentity, user]);

  const connectWallet = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    try {
      const currentSession = session ?? (await ensureSession());
      const nonce = await worldAppApiJson<{
        nonce: string;
        requestId: string;
        statement: string;
        expirationTime: string;
      }>('/api/world/nonce', currentSession, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const walletPayload = await runWorldWalletAuth(nonce);
      const complete = await worldAppApiJson<{ ok: boolean; identity: WorldAppIdentity }>(
        '/api/world/complete-wallet-auth',
        currentSession,
        {
          method: 'POST',
          body: JSON.stringify({
            nonce: nonce.nonce,
            requestId: nonce.requestId,
            payload: walletPayload,
            worldUser: getWorldAppUser(),
          }),
        },
      );

      setIdentity(complete.identity);
      setStatus('connected');
      return complete.identity;
    } catch (connectError) {
      const message =
        connectError instanceof Error ? connectError.message : 'World wallet auth failed.';
      setError(message);
      setStatus('error');
      throw connectError;
    }
  }, [ensureSession, session]);

  return useMemo(
    () => ({
      ...worldApp,
      supabaseUser: user,
      supabaseSession: session,
      identity,
      status,
      error,
      isWalletBound: Boolean(identity?.wallet_auth_at),
      isHumanVerified: Boolean(identity?.idkit_verified_at),
      connectWallet,
      reloadIdentity: loadIdentity,
    }),
    [connectWallet, error, identity, loadIdentity, session, status, user, worldApp],
  );
}
