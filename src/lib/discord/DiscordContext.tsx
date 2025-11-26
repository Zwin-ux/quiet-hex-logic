import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

interface DiscordContextType {
  discordSdk: DiscordSDK | DiscordSDKMock | null;
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
const isRunningInDiscord = (): boolean => {
  try {
    // Discord activities run in an iframe with specific query params
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('frame_id') || urlParams.has('instance_id') || 
           window.location.hostname.includes('discordsays.com') ||
           window.parent !== window;
  } catch {
    return false;
  }
};

interface DiscordProviderProps {
  children: React.ReactNode;
}

export const DiscordProvider: React.FC<DiscordProviderProps> = ({ children }) => {
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | DiscordSDKMock | null>(null);
  const [isDiscordEnvironment] = useState(() => isRunningInDiscord());
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<{ id: string; username: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const setupDiscordSdk = useCallback(async () => {
    if (!isDiscordEnvironment) {
      console.log('[Discord] Not running in Discord environment');
      return;
    }

    try {
      console.log('[Discord] Initializing Discord SDK...');
      
      // Get client ID from environment or use placeholder for development
      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
      
      if (!clientId) {
        console.warn('[Discord] No DISCORD_CLIENT_ID found, SDK initialization skipped');
        setError('Discord Client ID not configured');
        return;
      }

      const sdk = new DiscordSDK(clientId);
      setDiscordSdk(sdk);

      // Wait for the SDK to be ready
      await sdk.ready();
      console.log('[Discord] SDK is ready');
      setIsReady(true);

      // Get instance info
      setGuildId(sdk.guildId ?? null);
      setChannelId(sdk.channelId ?? null);
      setInstanceId(sdk.instanceId ?? null);

      // Authorize with Discord
      console.log('[Discord] Requesting authorization...');
      const { code } = await sdk.commands.authorize({
        client_id: clientId,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: [
          'identify',
          'guilds',
          'rpc.activities.write',
        ],
      });

      console.log('[Discord] Authorization code received, exchanging for token...');

      // Exchange code for access token via our edge function
      const response = await fetch(
        `https://ptuxqfwicdpdslqwnswd.supabase.co/functions/v1/discord-token-exchange`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to exchange token');
      }

      const { access_token } = await response.json();
      setAccessToken(access_token);

      // Authenticate with the Discord client
      console.log('[Discord] Authenticating with Discord client...');
      const auth = await sdk.commands.authenticate({ access_token });
      
      if (auth?.user) {
        setDiscordUser(auth.user as DiscordUser);
        setIsAuthenticated(true);
        console.log('[Discord] Successfully authenticated as:', auth.user.username);
      }

      // Subscribe to activity instance participants
      sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (event) => {
        console.log('[Discord] Participants updated:', event);
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
      console.error('[Discord] SDK setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Discord SDK');
    }
  }, [isDiscordEnvironment]);

  useEffect(() => {
    setupDiscordSdk();
  }, [setupDiscordSdk]);

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
