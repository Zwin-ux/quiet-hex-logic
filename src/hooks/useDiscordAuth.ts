import { useEffect, useState } from 'react';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface DiscordAuthState {
  user: User | null;
  loading: boolean;
  isDiscordLinked: boolean;
  linkDiscordAccount: () => Promise<void>;
}

/**
 * Hook that bridges Discord authentication with Supabase auth.
 * When running in Discord, it automatically creates/links a Supabase user
 * based on the Discord identity.
 */
export function useDiscordAuth(): DiscordAuthState {
  const { isDiscordEnvironment, isAuthenticated, discordUser, accessToken } = useDiscord();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDiscordLinked, setIsDiscordLinked] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // If not in Discord, just check regular Supabase session
      if (!isDiscordEnvironment) {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        setLoading(false);
        return;
      }

      // Wait for Discord authentication
      if (!isAuthenticated || !discordUser || !accessToken) {
        setLoading(true);
        return;
      }

      try {
        console.log('[Discord Auth] Checking for existing Supabase session...');
        
        // Check if user already has a Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if Discord is linked to this account
          const { data: profile } = await supabase
            .from('profiles')
            .select('discord_id')
            .eq('id', session.user.id)
            .single();
          
          setIsDiscordLinked(profile?.discord_id === discordUser.id);
          setUser(session.user);
          setLoading(false);
          return;
        }

        // No session - sign in anonymously and link Discord
        console.log('[Discord Auth] Creating anonymous session for Discord user...');
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        
        if (anonError) {
          console.error('[Discord Auth] Anonymous sign-in failed:', anonError);
          throw anonError;
        }

        if (anonData.user) {
          // Update the profile with Discord info
          const username = discordUser.global_name || discordUser.username;
          
          await supabase
            .from('profiles')
            .update({
              username: username,
              discord_id: discordUser.id,
              discord_username: discordUser.username,
              avatar_color: 'discord', // Special indicator
              is_guest: false, // Discord users are not guests
            })
            .eq('id', anonData.user.id);

          setIsDiscordLinked(true);
          setUser(anonData.user);
        }

      } catch (error) {
        console.error('[Discord Auth] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [isDiscordEnvironment, isAuthenticated, discordUser, accessToken]);

  const linkDiscordAccount = async () => {
    if (!discordUser || !user) return;

    try {
      await supabase
        .from('profiles')
        .update({
          discord_id: discordUser.id,
          discord_username: discordUser.username,
        })
        .eq('id', user.id);

      setIsDiscordLinked(true);
    } catch (error) {
      console.error('[Discord Auth] Failed to link Discord account:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    isDiscordLinked,
    linkDiscordAccount,
  };
}
