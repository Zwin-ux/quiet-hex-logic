import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getAppApiUrl } from '@/lib/appApi';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

interface DiscordContextType {
  discordSdk: any | null;
  isDiscordEnvironment: boolean;
  isReady: boolean;
  isAuthenticated: boolean;
  discordUser: DiscordUser | null;
  accessToken: string | null;
  guildId: string | null;
  channelId: string | null;
  instanceId: string | null;
  participants: { id: string; username: string }[];
  error: string | null;
}

const DiscordContext = createContext<DiscordContextType>({
  discordSdk: null,
  isDiscordEnvironment: false,
  isReady: false,
  isAuthenticated: false,
  discordUser: null,
  accessToken: null,
  guildId: null,
  channelId: null,
  instanceId: null,
  participants: [],
  error: null,
});

export const useDiscord = () => useContext(DiscordContext);

// Check if we're running inside Discord
const checkIsDiscordEnvironment = (): boolean => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('frame_id') || urlParams.has('instance_id') || 
           window.location.hostname.includes('discordsays.com');
  } catch {
    return false;
  }
};

interface DiscordProviderProps {
  children: React.ReactNode;
}

export const DiscordProvider: React.FC<DiscordProviderProps> = ({ children }) => {
  const [discordSdk, setDiscordSdk] = useState<any | null>(null);
  const [isDiscordEnvironment, setIsDiscordEnvironment] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<{ id: string; username: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    const isDiscord = checkIsDiscordEnvironment();
    setIsDiscordEnvironment(isDiscord);
    
    if (!isDiscord || initRef.current) {
      return;
    }
    
    initRef.current = true;

    const setupDiscordSdk = async () => {
      try {
        // Client ID is public/publishable - safe to hardcode as fallback
        const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '1443319127170089172';

        // Dynamic import to avoid bundler issues
        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        
        const sdk = new DiscordSDK(clientId);
        setDiscordSdk(sdk);

        await sdk.ready();
        setIsReady(true);

        setGuildId(sdk.guildId ?? null);
        setChannelId(sdk.channelId ?? null);
        setInstanceId(sdk.instanceId ?? null);

        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds', 'rpc.activities.write'],
        });

        // In Discord Activities, outbound HTTP requests may require a proxy mapping.
        // If you configured a Discord "Proxy Path Mapping" like:
        //   Prefix: /api
        //   Target: https://<your-backend-domain>/functions/v1
        // then we should call the token exchange via a relative URL.
        const tokenExchangeUrl = isDiscord
          ? getAppApiUrl('/api/discord-token-exchange')
          : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-token-exchange`;

        let response: Response;
        try {
          response = await fetch(tokenExchangeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
        } catch (fetchErr) {
          console.error('[Discord] Token exchange fetch failed:', fetchErr);
          throw new Error('Failed to fetch (token exchange)');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to exchange token');
        }

        const { access_token } = await response.json();
        setAccessToken(access_token);

        const auth = await sdk.commands.authenticate({ access_token });
        
        if (auth?.user) {
          setDiscordUser(auth.user as DiscordUser);
          setIsAuthenticated(true);
        }

        sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (event: any) => {
          if (event.participants) {
            setParticipants(
              event.participants.map((p: { id: string; username: string }) => ({
                id: p.id,
                username: p.username,
              }))
            );
          }
        });

      } catch (err) {
        console.error('[Discord] Setup error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Discord SDK');
      }
    };

    setupDiscordSdk();
  }, []);

  return (
    <DiscordContext.Provider
      value={{
        discordSdk,
        isDiscordEnvironment,
        isReady,
        isAuthenticated,
        discordUser,
        accessToken,
        guildId,
        channelId,
        instanceId,
        participants,
        error,
      }}
    >
      {children}
    </DiscordContext.Provider>
  );
};
