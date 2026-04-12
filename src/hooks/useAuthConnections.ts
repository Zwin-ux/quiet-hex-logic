import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { buildAppUrl } from "@/lib/authRedirect";
import { useAuth } from "@/hooks/useAuth";

export type ConnectionProvider = "google" | "discord";

type ConnectionState = {
  identities: UserIdentity[];
  loading: boolean;
  pendingProvider: ConnectionProvider | null;
  error: string | null;
};

const CONNECTABLE_PROVIDERS: ConnectionProvider[] = ["google", "discord"];

export function useAuthConnections() {
  const { user } = useAuth();
  const [state, setState] = useState<ConnectionState>({
    identities: [],
    loading: true,
    pendingProvider: null,
    error: null,
  });

  const refreshIdentities = useCallback(async () => {
    if (!user || user.is_anonymous) {
      setState((current) => ({
        ...current,
        identities: [],
        loading: false,
        error: null,
      }));
      return { data: [] as UserIdentity[], error: null };
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    const { data, error } = await supabase.auth.getUserIdentities();

    setState((current) => ({
      ...current,
      identities: data?.identities ?? [],
      loading: false,
      error: error?.message ?? null,
    }));

    return { data: data?.identities ?? [], error };
  }, [user]);

  useEffect(() => {
    void refreshIdentities();
  }, [refreshIdentities]);

  const providerMap = useMemo(() => {
    return new Map(
      state.identities
        .filter((identity) =>
          CONNECTABLE_PROVIDERS.includes(identity.provider as ConnectionProvider),
        )
        .map((identity) => [identity.provider as ConnectionProvider, identity]),
    );
  }, [state.identities]);

  const hasIdentity = useCallback(
    (provider: ConnectionProvider) => providerMap.has(provider),
    [providerMap],
  );

  const connectProvider = useCallback(
    async (provider: ConnectionProvider, returnTo: string = "/profile?connections=1") => {
      if (!user || user.is_anonymous) {
        const error = new Error("Sign in to manage account connections.");
        setState((current) => ({ ...current, error: error.message }));
        return { error };
      }

      if (hasIdentity(provider)) {
        setState((current) => ({ ...current, error: null }));
        return { error: null };
      }

      setState((current) => ({ ...current, pendingProvider: provider, error: null }));

      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: buildAppUrl(returnTo),
        },
      });

      setState((current) => ({
        ...current,
        pendingProvider: error ? null : current.pendingProvider,
        error:
          error?.message
          ?? null,
      }));

      return { error };
    },
    [hasIdentity, user],
  );

  const disconnectProvider = useCallback(
    async (provider: ConnectionProvider) => {
      if (!user || user.is_anonymous) {
        const error = new Error("Sign in to manage account connections.");
        setState((current) => ({ ...current, error: error.message }));
        return { error };
      }

      const identity = providerMap.get(provider);
      if (!identity) {
        const error = new Error(`${provider} is not linked to this account.`);
        setState((current) => ({ ...current, error: error.message }));
        return { error };
      }

      if (state.identities.length < 2) {
        const error = new Error("Keep at least one sign-in method connected before removing this one.");
        setState((current) => ({ ...current, error: error.message }));
        return { error };
      }

      setState((current) => ({ ...current, pendingProvider: provider, error: null }));
      const { error } = await supabase.auth.unlinkIdentity(identity);

      if (error) {
        setState((current) => ({
          ...current,
          pendingProvider: null,
          error: error.message,
        }));
        return { error };
      }

      await refreshIdentities();
      setState((current) => ({ ...current, pendingProvider: null, error: null }));
      return { error: null };
    },
    [providerMap, refreshIdentities, state.identities.length, user],
  );

  return {
    identities: state.identities,
    loading: state.loading,
    error: state.error,
    pendingProvider: state.pendingProvider,
    refreshIdentities,
    connectProvider,
    disconnectProvider,
    hasIdentity,
    canDisconnectProvider: state.identities.length > 1,
  };
}
