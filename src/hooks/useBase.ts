import { useState, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { useBaseContext } from '@/lib/base/BaseProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BASE_CHAIN_ID } from '@/lib/base/config';

interface UseBaseReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | undefined;
  
  // Network state
  isOnBase: boolean;
  chainId: number | undefined;
  
  // Platform state
  isBaseAvailable: boolean;
  platform: 'web' | 'discord' | 'mobile';
  
  // Profile state
  baseName: string | null;
  walletLinked: boolean;
  
  // Actions
  disconnect: () => void;
  switchToBase: () => Promise<void>;
  linkWalletToProfile: () => Promise<boolean>;
  
  // Loading/error
  isLinking: boolean;
  linkError: string | null;
}

export function useBase(): UseBaseReturn {
  const { isBaseAvailable, platform } = useBaseContext();
  const { user } = useAuth();
  
  // These hooks are only valid when Base is available
  const account = isBaseAvailable ? useAccountSafe() : null;
  const chainId = isBaseAvailable ? useChainIdSafe() : undefined;
  const { switchChainAsync } = isBaseAvailable ? useSwitchChainSafe() : { switchChainAsync: undefined };
  const { disconnect: wagmiDisconnect } = isBaseAvailable ? useDisconnectSafe() : { disconnect: () => {} };
  
  const [baseName, setBaseName] = useState<string | null>(null);
  const [walletLinked, setWalletLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const isConnected = account?.isConnected ?? false;
  const isConnecting = account?.isConnecting ?? false;
  const address = account?.address;
  const isOnBase = chainId === BASE_CHAIN_ID;

  // Load profile wallet data
  useEffect(() => {
    async function loadWalletData() {
      if (!user || !address) {
        setBaseName(null);
        setWalletLinked(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('wallet_address, base_name')
        .eq('id', user.id)
        .single();

      if (data) {
        setWalletLinked(data.wallet_address?.toLowerCase() === address.toLowerCase());
        setBaseName(data.base_name || null);
      }
    }

    loadWalletData();
  }, [user, address]);

  const switchToBase = useCallback(async () => {
    if (!switchChainAsync) return;
    try {
      await switchChainAsync({ chainId: BASE_CHAIN_ID });
    } catch (error) {
      console.error('[useBase] Failed to switch to Base:', error);
    }
  }, [switchChainAsync]);

  const linkWalletToProfile = useCallback(async (): Promise<boolean> => {
    if (!user || !address) {
      setLinkError('You must be logged in and have a wallet connected');
      return false;
    }

    setIsLinking(true);
    setLinkError(null);

    try {
      // Check if this wallet is already linked to another account
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();

      if (existingProfile && existingProfile.id !== user.id) {
        setLinkError('This wallet is already linked to another account');
        return false;
      }

      // Update the profile with wallet address
      const { error } = await supabase
        .from('profiles')
        .update({
          wallet_address: address.toLowerCase(),
          wallet_connected_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        setLinkError('Failed to link wallet');
        console.error('[useBase] Link error:', error);
        return false;
      }

      setWalletLinked(true);
      return true;
    } catch (err) {
      console.error('[useBase] Unexpected error:', err);
      setLinkError('An unexpected error occurred');
      return false;
    } finally {
      setIsLinking(false);
    }
  }, [user, address]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  return {
    isConnected,
    isConnecting,
    address,
    isOnBase,
    chainId,
    isBaseAvailable,
    platform,
    baseName,
    walletLinked,
    disconnect,
    switchToBase,
    linkWalletToProfile,
    isLinking,
    linkError,
  };
}

// Safe wrapper hooks that return defaults when wagmi context isn't available
function useAccountSafe() {
  try {
    return useAccount();
  } catch {
    return { isConnected: false, isConnecting: false, address: undefined };
  }
}

function useChainIdSafe() {
  try {
    return useChainId();
  } catch {
    return undefined;
  }
}

function useSwitchChainSafe() {
  try {
    return useSwitchChain();
  } catch {
    return { switchChainAsync: undefined };
  }
}

function useDisconnectSafe() {
  try {
    return useDisconnect();
  } catch {
    return { disconnect: () => {} };
  }
}
