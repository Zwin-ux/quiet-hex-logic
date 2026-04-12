import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { supabase } from '@/integrations/supabase/client';
import { getWorldIdAppId, isWorldIdConfigured } from '@/lib/worldIdConfig';

export type VerificationLevel = 'orb' | 'device';

export interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: VerificationLevel;
}

export interface WorldIDState {
  isVerified: boolean;
  isVerifying: boolean;
  isLoading: boolean;
  verifiedAt: string | null;
  error: string | null;
  platform: 'web' | 'discord' | 'native';
  canVerify: boolean;
}

/**
 * Hook for World ID integration across all platforms
 * - Web: Uses IDKit widget
 * - Discord: Shows info card (verification available on web/native)
 * - Native (iOS/Android): Uses native IDKit SDK
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

  // Detect platform
  useEffect(() => {
    const isNative = typeof window !== 'undefined' &&
      (window as unknown as { isNativeApp?: boolean }).isNativeApp === true;

    let platform: 'web' | 'discord' | 'native' = 'web';
    if (isNative) {
      platform = 'native';
    } else if (isDiscordEnvironment) {
      platform = 'discord';
    }

    // Web and native can verify when the deployment is configured.
    const canVerify = platform !== 'discord' && isWorldIdConfigured() && Boolean(user?.id);

    setState(prev => ({ ...prev, platform, canVerify }));
  }, [isDiscordEnvironment, user?.id]);

  // Load verification status from database
  useEffect(() => {
    async function loadVerificationStatus() {
      if (!user?.id) {
        setState(prev => ({ ...prev, isLoading: false }));
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
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load verification status'
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          isVerified: data?.is_verified_human ?? false,
          verifiedAt: data?.world_id_verified_at ?? null,
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        console.error('[useWorldID] Error:', err);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load verification status'
        }));
      }
    }

    loadVerificationStatus();
  }, [user?.id]);

  // Submit proof to backend for verification
  const verifyProof = useCallback(async (proof: WorldIDProof): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!getWorldIdAppId()) {
      return { success: false, error: 'World ID is not configured for this deployment.' };
    }

    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('verify-world-id', {
        body: proof,
      });

      if (error) {
        console.error('[useWorldID] Verification error:', error);
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: error.message || 'Verification failed'
        }));
        return { success: false, error: error.message };
      }

      if (data?.success) {
        setState(prev => ({
          ...prev,
          isVerified: true,
          isVerifying: false,
          verifiedAt: new Date().toISOString(),
          error: null,
        }));
        return { success: true };
      }

      const errorMsg = data?.error || 'Verification failed';
      setState(prev => ({
        ...prev,
        isVerifying: false,
        error: errorMsg
      }));
      return { success: false, error: errorMsg };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useWorldID] Error:', err);
      setState(prev => ({
        ...prev,
        isVerifying: false,
        error: errorMsg
      }));
      return { success: false, error: errorMsg };
    }
  }, [user?.id]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    verifyProof,
    clearError,
  };
}
