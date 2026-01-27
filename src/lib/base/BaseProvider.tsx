import { ReactNode, createContext, useContext, useMemo } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import { wagmiConfig, ONCHAINKIT_API_KEY } from './config';
import { useDiscord } from '@/lib/discord/DiscordContext';

interface BaseContextValue {
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

// Separate query client for wagmi to avoid conflicts
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

export function BaseProvider({ children }: BaseProviderProps) {
  const { isDiscordEnvironment } = useDiscord();
  
  // Detect platform
  const platform: 'web' | 'discord' | 'mobile' = useMemo(() => {
    if (isDiscordEnvironment) return 'discord' as const;
    if (typeof window !== 'undefined' && (window as any).isNativeApp) return 'mobile' as const;
    return 'web' as const;
  }, [isDiscordEnvironment]);

  // Base is only available on web platform (not Discord Activity or native app wrapper)
  const isBaseAvailable = platform === 'web';

  const contextValue = useMemo(() => ({
    isBaseAvailable,
    platform,
  }), [isBaseAvailable, platform]);

  // If Base is not available, just provide context without wallet infrastructure
  if (!isBaseAvailable) {
    return (
      <BaseContext.Provider value={contextValue}>
        {children}
      </BaseContext.Provider>
    );
  }

  // Full Base infrastructure for web
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={wagmiQueryClient}>
        <OnchainKitProvider
          apiKey={ONCHAINKIT_API_KEY}
          chain={base}
        >
          <BaseContext.Provider value={contextValue}>
            {children}
          </BaseContext.Provider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
