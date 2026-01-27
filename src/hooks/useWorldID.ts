import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { supabase } from '@/integrations/supabase/client';

export const WORLD_ID_APP_ID = 'app_8d9cada1f2ced37b03654cf63e62d540';
export const WORLD_ID_ACTION = 'verify-hexology-player';

interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

interface UseWorldIDReturn {
  isVerified: boolean;
  isVerifying: boolean;
  isLoading: boolean;
  verifiedAt: string | null;
  error: string | null;
  platform: 'web' | 'discord' | 'mobile';
  canVerify: boolean;
  verifyProof: (proof: WorldIDProof) => Promise<boolean>;
  clearError: () => void;
}

export function useWorldID(): UseWorldIDReturn {
  const { user } = useAuth();
  const { isDiscordEnvironment } = useDiscord();
  
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detect platform
  const platform: 'web' | 'discord' | 'mobile' = isDiscordEnvironment 
    ? 'discord' 
    : 'web';

  // Can only verify on web (for now)
  const canVerify = platform === 'web' && !!user && !isVerified;

  // Load verification status on mount
  useEffect(() => {
    async function loadVerificationStatus() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('is_verified_human, world_id_verified_at')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('[useWorldID] Failed to load status:', fetchError);
        } else if (data) {
          setIsVerified(data.is_verified_human || false);
          setVerifiedAt(data.world_id_verified_at || null);
        }
      } catch (err) {
        console.error('[useWorldID] Unexpected error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadVerificationStatus();
  }, [user]);

  const verifyProof = useCallback(async (proof: WorldIDProof): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to verify');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired, please log in again');
        return false;
      }

      const response = await supabase.functions.invoke('verify-world-id', {
        body: proof,
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Verification failed';
        setError(errorMessage);
        console.error('[useWorldID] Verification error:', response.error);
        return false;
      }

      // Check for 409 conflict (already used)
      if (response.data?.error) {
        setError(response.data.error);
        return false;
      }

      setIsVerified(true);
      setVerifiedAt(response.data?.verified_at || new Date().toISOString());
      return true;
    } catch (err) {
      console.error('[useWorldID] Unexpected error:', err);
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isVerified,
    isVerifying,
    isLoading,
    verifiedAt,
    error,
    platform,
    canVerify,
    verifyProof,
    clearError,
  };
}
