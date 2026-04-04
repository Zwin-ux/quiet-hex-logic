import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { getBooleanPublicEnv, getPublicEnv } from '@/lib/runtimeEnv';

// Load OnchainKit styles dynamically to avoid PostCSS/Tailwind layer conflicts.
// Important: keep this behind the "enabled" gate so Web3 libs don't execute for most users.
let stylesLoaded = false;
function loadOnchainKitStyles() {
  if (stylesLoaded || typeof document === 'undefined') return;
  stylesLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // Note: kept as "latest" to match prior behavior; pinning can be done later.
  link.href = 'https://unpkg.com/@coinbase/onchainkit@latest/dist/assets/style.css';
  document.head.appendChild(link);
}

interface BaseContextValue {
  /**
   * True only when the Base/Web3 stack is explicitly enabled AND the providers
   * are successfully loaded. Most of Hexology should work without it.
   */
  isBaseAvailable: boolean;
  platform: 'web' | 'discord' | 'mobile';
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
  const platform: 'web' | 'discord' | 'mobile' = useMemo(() => {
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
        loadOnchainKitStyles();

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

