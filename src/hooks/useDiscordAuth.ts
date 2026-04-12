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

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (!session?.user) {
          setIsDiscordLinked(false);
          setLoading(false);
          return;
        }

        if (!isAuthenticated || !discordUser || !accessToken) {
          setIsDiscordLinked(false);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('discord_id')
          .eq('id', session.user.id)
          .single();

        const linked = profile?.discord_id === discordUser.id;
        setIsDiscordLinked(linked);

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
      const authWithLink = supabase.auth as typeof supabase.auth & {
        linkIdentity?: (credentials: { provider: string }) => Promise<{ error: { message?: string } | null }>;
      };

      if (typeof authWithLink.linkIdentity !== 'function') {
        throw new Error('Identity linking is not available in this client');
      }

      const { error } = await authWithLink.linkIdentity({ provider: 'discord' });
      if (error) throw new Error(error.message || 'Failed to link Discord identity');

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
