import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

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
      console.log('[Discord] Not in Discord or already initialized');
      return;
    }
    
    initRef.current = true;

    const setupDiscordSdk = async () => {
      try {
        console.log('[Discord] Initializing Discord SDK...');
        
        // Client ID is public/publishable - safe to hardcode as fallback
        const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '1443319127170089172';
        
        console.log('[Discord] Using Client ID:', clientId);

        // Dynamic import to avoid bundler issues
        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        
        const sdk = new DiscordSDK(clientId);
        setDiscordSdk(sdk);

        await sdk.ready();
        console.log('[Discord] SDK is ready');
        setIsReady(true);

        setGuildId(sdk.guildId ?? null);
        setChannelId(sdk.channelId ?? null);
        setInstanceId(sdk.instanceId ?? null);

        console.log('[Discord] Requesting authorization...');
        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds', 'rpc.activities.write'],
        });

        console.log('[Discord] Exchanging code for token...');
        const response = await fetch(
          `https://ptuxqfwicdpdslqwnswd.supabase.co/functions/v1/discord-token-exchange`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to exchange token');
        }

        const { access_token } = await response.json();
        setAccessToken(access_token);

        console.log('[Discord] Authenticating...');
        const auth = await sdk.commands.authenticate({ access_token });
        
        if (auth?.user) {
          setDiscordUser(auth.user as DiscordUser);
          setIsAuthenticated(true);
          console.log('[Discord] Authenticated as:', auth.user.username);
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