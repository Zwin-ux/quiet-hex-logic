import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserIdentity } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { buildAppUrl } from "@/lib/authRedirect";
import { useAuth } from "@/hooks/useAuth";

export type ConnectionProvider = "google" | "discord";
export type ProviderConnection = {
  provider: ConnectionProvider;
  identity: UserIdentity;
  email: string | null;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  providerUserId: string | null;
};

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
    const identities = data?.identities ?? [];

    if (!error) {
      await syncProfileIdentityFields(user.id, identities);
    }

    setState((current) => ({
      ...current,
      identities,
      loading: false,
      error: error?.message ?? null,
    }));

    return { data: identities, error };
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

  const connections = useMemo(() => {
    return CONNECTABLE_PROVIDERS.flatMap((provider) => {
      const identity = providerMap.get(provider);
      if (!identity) return [];
      return [mapIdentityToConnection(provider, identity)];
    });
  }, [providerMap]);

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
    connections,
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

function mapIdentityToConnection(
  provider: ConnectionProvider,
  identity: UserIdentity,
): ProviderConnection {
  const identityData = readIdentityData(identity);

  return {
    provider,
    identity,
    email: readFirstString(identityData, ["email", "email_address"]),
    handle: readFirstString(identityData, [
      "preferred_username",
      "user_name",
      "username",
      "name",
    ]),
    displayName: readFirstString(identityData, [
      "full_name",
      "name",
      "preferred_username",
      "email",
    ]),
    avatarUrl: readFirstString(identityData, ["avatar_url", "picture"]),
    providerUserId: readFirstString(identityData, ["sub", "id", "user_id"]),
  };
}

function readIdentityData(identity: UserIdentity): Record<string, unknown> {
  if (identity.identity_data && typeof identity.identity_data === "object") {
    return identity.identity_data as Record<string, unknown>;
  }
  return {};
}

function readFirstString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

async function syncProfileIdentityFields(userId: string, identities: UserIdentity[]) {
  const discordIdentity = identities.find((identity) => identity.provider === "discord");
  const discordData = discordIdentity ? readIdentityData(discordIdentity) : {};

  await supabase
    .from("profiles")
    .update({
      discord_id: readFirstString(discordData, ["sub", "id", "user_id"]),
      discord_username: readFirstString(discordData, [
        "preferred_username",
        "user_name",
        "username",
        "name",
      ]),
    })
    .eq("id", userId);
}
