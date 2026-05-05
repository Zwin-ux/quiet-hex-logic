import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { getBooleanPublicEnv, getPublicEnv } from '@/lib/runtimeEnv';
import { isLikelyWorldApp } from '@/lib/worldApp/client';

// Load OnchainKit styles dynamically and bundle them with the app so production
// behavior does not depend on a third-party CDN.
let stylesPromise: Promise<unknown> | null = null;
function loadOnchainKitStyles() {
  if (stylesPromise || typeof document === 'undefined') return stylesPromise;
  stylesPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>('link[data-onchainkit-styles="true"]');
    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vendor/onchainkit.css';
    link.dataset.onchainkitStyles = 'true';
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Failed to load local OnchainKit styles'));
    document.head.appendChild(link);
  });
  return stylesPromise;
}

interface BaseContextValue {
  /**
   * True only when the Base/Web3 stack is explicitly enabled AND the providers
   * are successfully loaded. Most of Hexology should work without it.
   */
  isBaseAvailable: boolean;
  platform: 'web' | 'discord' | 'mobile' | 'world';
}

const BaseContext = createContext<BaseContextValue>({
  isBaseAvailable: false,
  platform: 'web',
});

export function useBaseContext() {
  return useContext(BaseContext);
}

// Separate query client for wagmi to avoid conflicts.
const wagmiQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
    },
  },
});

interface BaseProviderProps {
  children: ReactNode;
}

type LoadedProviders = {
  WagmiProvider: any;
  OnchainKitProvider: any;
  baseChain: any;
  wagmiConfig: any;
  onchainKitApiKey: string;
};

export function BaseProvider({ children }: BaseProviderProps) {
  const { isDiscordEnvironment } = useDiscord();

  // Detect platform.
  const platform: 'web' | 'discord' | 'mobile' | 'world' = useMemo(() => {
    if (isLikelyWorldApp()) return 'world' as const;
    if (isDiscordEnvironment) return 'discord' as const;
    if (typeof window !== 'undefined' && (window as any).isNativeApp) return 'mobile' as const;
    return 'web' as const;
  }, [isDiscordEnvironment]);

  const enableWallet =
    platform === 'web' &&
    getBooleanPublicEnv('VITE_ENABLE_BASE_WALLET') &&
    Boolean(getPublicEnv('VITE_ONCHAINKIT_API_KEY'));

  const [loaded, setLoaded] = useState<LoadedProviders | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!enableWallet) {
      setLoaded(null);
      setLoadFailed(false);
      return;
    }

    (async () => {
      try {
        await loadOnchainKitStyles();

        // Dynamic imports prevent SES/lockdown-style libs from executing unless explicitly enabled.
        const [{ WagmiProvider }, { OnchainKitProvider }, { base }, cfg] = await Promise.all([
          import('wagmi'),
          import('@coinbase/onchainkit'),
          import('wagmi/chains'),
          import('./config'),
        ]);

        if (cancelled) return;
        setLoaded({
          WagmiProvider,
          OnchainKitProvider,
          baseChain: base,
          wagmiConfig: (cfg as any).wagmiConfig,
          onchainKitApiKey: String((cfg as any).ONCHAINKIT_API_KEY ?? ''),
        });
      } catch (e) {
        console.error('[BaseProvider] Wallet stack failed to load. Continuing without wallet features.', e);
        if (!cancelled) {
          setLoaded(null);
          setLoadFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enableWallet]);

  const isBaseAvailable = enableWallet && !!loaded && !loadFailed;

  const contextValue = useMemo(() => ({
    isBaseAvailable,
    platform,
  }), [isBaseAvailable, platform]);

  // Default: no wallet infrastructure (keeps the open-source game engine stable).
  if (!isBaseAvailable || !loaded) {
    return (
      <BaseContext.Provider value={contextValue}>
        {children}
      </BaseContext.Provider>
    );
  }

  const { WagmiProvider, OnchainKitProvider, wagmiConfig, baseChain, onchainKitApiKey } = loaded;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={wagmiQueryClient}>
        <OnchainKitProvider apiKey={onchainKitApiKey} chain={baseChain}>
          <BaseContext.Provider value={contextValue}>
            {children}
          </BaseContext.Provider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

