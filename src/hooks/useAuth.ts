import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { buildAuthRedirectUrl, buildPasswordResetRedirectUrl } from '@/lib/authRedirect';

function normalizeError(err: unknown): { message: string } {
  if (err && typeof err === 'object') {
    const anyErr = err as any;
    if (typeof anyErr.message === 'string' && anyErr.message.trim()) return { message: anyErr.message };
    if (typeof anyErr.error_description === 'string' && anyErr.error_description.trim()) return { message: anyErr.error_description };
  }
  return { message: 'Request failed' };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    avatarColor: string = 'indigo',
    returnTo?: string | null,
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildAuthRedirectUrl(returnTo),
          data: {
            username,
            avatar_color: avatarColor,
          },
        },
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: normalizeError(err) as any };
    }
  };

  const signInWithMagicLink = async (email: string, returnTo?: string | null) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: buildAuthRedirectUrl(returnTo),
        },
      });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const deleteAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {},
      });

      if (error) {
        return { data: null, error };
      }

      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // The auth user may already be soft-deleted server-side. Clear local state anyway.
      }

      setSession(null);
      setUser(null);

      return { data, error: null };
    } catch (err) {
      return { data: null, error: normalizeError(err) as any };
    }
  };

  const signInAnonymously = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const resetPassword = async (email: string, returnTo?: string | null) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildPasswordResetRedirectUrl(returnTo),
      });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signInWithGoogle = async (returnTo?: string | null) => {
    try {
      const { error } = await signInOrLinkIdentity('google', returnTo);
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signInWithDiscord = async (returnTo?: string | null) => {
    try {
      const { error } = await signInOrLinkIdentity('discord', returnTo);
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signInWithApple = async (returnTo?: string | null) => {
    try {
      const { error } = await signInOrLinkIdentity('apple', returnTo);
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signInOrLinkIdentity = async (
    provider: 'google' | 'discord' | 'apple',
    returnTo?: string | null,
  ) => {
    const redirectTo = buildAuthRedirectUrl(returnTo);
    const currentSession = session ?? (await supabase.auth.getSession()).data.session;
    const authWithLink = supabase.auth as typeof supabase.auth & {
      linkIdentity?: (credentials: { provider: string }) => Promise<{ error: { message?: string } | null }>;
    };

    if (currentSession?.user?.is_anonymous && typeof authWithLink.linkIdentity === 'function') {
      return authWithLink.linkIdentity({ provider });
    }

    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    signInAnonymously,
    signInWithGoogle,
    signInWithDiscord,
    signInWithApple,
    resetPassword,
    updatePassword,
    deleteAccount,
  };
}
