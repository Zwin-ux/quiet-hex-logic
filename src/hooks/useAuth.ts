import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  const signUp = async (email: string, password: string, username: string, avatarColor: string = 'indigo') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
            avatar_color: avatarColor,
          },
        },
      });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/lobby`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
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

  const signInAnonymously = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth?reset=true`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
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

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/lobby`,
        },
      });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signInWithDiscord = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/lobby`,
        },
      });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
  };

  const signInWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/lobby`,
        },
      });
      return { error };
    } catch (err) {
      return { error: normalizeError(err) as any };
    }
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
  };
}
