import { useState, useEffect, useCallback } from 'react';
import type { IDKitResult } from '@worldcoin/idkit';
import { useAuth } from '@/hooks/useAuth';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { supabase } from '@/integrations/supabase/client';
import { getAppApiUrl } from '@/lib/appApi';
import {
  getWorldIdAction,
  getWorldIdAppId,
  isWorldIdConfigured,
} from '@/lib/worldIdConfig';

export interface WorldIDState {
  isVerified: boolean;
  isVerifying: boolean;
  isLoading: boolean;
  verifiedAt: string | null;
  error: string | null;
  platform: 'web' | 'discord' | 'native';
  canVerify: boolean;
}

export type WorldIdRpContext = {
  rp_id: string;
  action: string;
  sig: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
};

async function getAccessToken() {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) {
    throw new Error('Sign in before verifying human status.');
  }

  return session.access_token;
}

async function worldPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(getAppApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'World ID request failed.');
  }

  return payload as T;
}

/**
 * Current World ID integration for web/World App.
 * IDKit v4 uses backend-signed RP context and server verification against /api/v4/verify/{rp_id}.
 */
export function useWorldID() {
  const { user } = useAuth();
  const { isDiscordEnvironment } = useDiscord();

  const [state, setState] = useState<WorldIDState>({
    isVerified: false,
    isVerifying: false,
    isLoading: true,
    verifiedAt: null,
    error: null,
    platform: 'web',
    canVerify: false,
  });

  useEffect(() => {
    const isNative = typeof window !== 'undefined' &&
      (window as unknown as { isNativeApp?: boolean }).isNativeApp === true;

    let platform: 'web' | 'discord' | 'native' = 'web';
    if (isNative) {
      platform = 'native';
    } else if (isDiscordEnvironment) {
      platform = 'discord';
    }

    const canVerify = platform !== 'discord' && isWorldIdConfigured() && Boolean(user?.id);
    setState((prev) => ({ ...prev, platform, canVerify }));
  }, [isDiscordEnvironment, user?.id]);

  useEffect(() => {
    async function loadVerificationStatus() {
      if (!user?.id) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_verified_human, world_id_verified_at')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[useWorldID] Failed to load status:', error);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load verification status',
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          isVerified: data?.is_verified_human ?? false,
          verifiedAt: data?.world_id_verified_at ?? null,
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        console.error('[useWorldID] Error:', err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load verification status',
        }));
      }
    }

    loadVerificationStatus();
  }, [user?.id]);

  const requestRpContext = useCallback(async (): Promise<WorldIdRpContext> => {
    if (!user?.id) {
      throw new Error('Not authenticated.');
    }

    if (!getWorldIdAppId()) {
      throw new Error('World ID is not configured for this deployment.');
    }

    return worldPost<WorldIdRpContext>('/api/world/rp-signature', {
      action: getWorldIdAction(),
    });
  }, [user?.id]);

  const verifyIdKitResult = useCallback(
    async (idkitResponse: IDKitResult): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!getWorldIdAppId()) {
        return { success: false, error: 'World ID is not configured for this deployment.' };
      }

      setState((prev) => ({ ...prev, isVerifying: true, error: null }));

      try {
        const data = await worldPost<{ ok: boolean; verified: boolean }>('/api/world/verify-id', {
          action: getWorldIdAction(),
          idkitResponse,
        });

        if (data?.verified) {
          setState((prev) => ({
            ...prev,
            isVerified: true,
            isVerifying: false,
            verifiedAt: new Date().toISOString(),
            error: null,
          }));
          return { success: true };
        }

        setState((prev) => ({
          ...prev,
          isVerifying: false,
          error: 'Verification failed',
        }));
        return { success: false, error: 'Verification failed' };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[useWorldID] Error:', err);
        setState((prev) => ({
          ...prev,
          isVerifying: false,
          error: errorMsg,
        }));
        return { success: false, error: errorMsg };
      }
    },
    [user?.id],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    requestRpContext,
    verifyIdKitResult,
    clearError,
  };
}
