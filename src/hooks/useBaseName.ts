import { useState, useEffect, useCallback } from 'react';
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'wagmi/chains';
import { useBase } from './useBase';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UseBaseNameReturn {
  baseName: string | null;
  isLoading: boolean;
  error: string | null;
  resolveBaseName: (address: string) => Promise<string | null>;
  saveBaseName: (name: string) => Promise<boolean>;
}

export function useBaseName(): UseBaseNameReturn {
  const { address, isBaseAvailable, isConnected } = useBase();
  const { user } = useAuth();
  
  const [baseName, setBaseName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve basename for connected wallet
  useEffect(() => {
    async function resolveConnectedWallet() {
      if (!isBaseAvailable || !isConnected || !address) {
        setBaseName(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const name = await getName({ address: address as `0x${string}`, chain: base });
        setBaseName(name || null);
      } catch (err) {
        console.error('[useBaseName] Resolution failed:', err);
        setError('Failed to resolve basename');
      } finally {
        setIsLoading(false);
      }
    }

    resolveConnectedWallet();
  }, [isBaseAvailable, isConnected, address]);

  const resolveBaseName = useCallback(async (addr: string): Promise<string | null> => {
    if (!isBaseAvailable) return null;
    
    try {
      const name = await getName({ address: addr as `0x${string}`, chain: base });
      return name || null;
    } catch (err) {
      console.error('[useBaseName] Resolution failed for:', addr, err);
      return null;
    }
  }, [isBaseAvailable]);

  const saveBaseName = useCallback(async (name: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ base_name: name })
        .eq('id', user.id);

      if (updateError) {
        console.error('[useBaseName] Save failed:', updateError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[useBaseName] Unexpected error:', err);
      return false;
    }
  }, [user]);

  return {
    baseName,
    isLoading,
    error,
    resolveBaseName,
    saveBaseName,
  };
}
