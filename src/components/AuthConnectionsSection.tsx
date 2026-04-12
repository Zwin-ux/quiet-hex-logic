import { Chrome, Disc3, Link2, Loader2, Mail, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  type ConnectionProvider,
  useAuthConnections,
} from "@/hooks/useAuthConnections";
import { toast } from "sonner";

const PROVIDER_META: Record<
  ConnectionProvider,
  {
    label: string;
    icon: typeof Chrome;
    description: string;
  }
> = {
  google: {
    label: "Google",
    icon: Chrome,
    description: "Primary sign-in and recovery path.",
  },
  discord: {
    label: "Discord",
    icon: Disc3,
    description: "Community-facing secondary sign-in.",
  },
};

export function AuthConnectionsSection() {
  const { user } = useAuth();
  const {
    identities,
    connections,
    loading,
    error,
    pendingProvider,
    connectProvider,
    disconnectProvider,
    hasIdentity,
    canDisconnectProvider,
  } = useAuthConnections();

  if (!user || user.is_anonymous) {
    return null;
  }

  const emailIdentity = identities.find((identity) => identity.provider === "email");
  const getConnection = (provider: ConnectionProvider) =>
    connections.find((connection) => connection.provider === provider) ?? null;

  const handleConnect = async (provider: ConnectionProvider) => {
    const { error } = await connectProvider(provider);

    if (error) {
      toast.error(`Failed to connect ${PROVIDER_META[provider].label}`, {
        description: normalizeConnectionError(error.message),
      });
      return;
    }

    toast.info(`Continue with ${PROVIDER_META[provider].label}`, {
      description: "Finish the provider flow to attach it to this BOARD account.",
    });
  };

  const handleDisconnect = async (provider: ConnectionProvider) => {
    const { error } = await disconnectProvider(provider);

    if (error) {
      toast.error(`Failed to disconnect ${PROVIDER_META[provider].label}`, {
        description: normalizeConnectionError(error.message),
      });
      return;
    }

    toast.success(`${PROVIDER_META[provider].label} disconnected`, {
      description: "The remaining sign-in methods still keep this BOARD account recoverable.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="border border-black bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="board-rail-label text-black/55">Recovery anchor</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-full border border-black/14 p-2">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-black">{user.email || "No email on file"}</p>
                <p className="text-sm leading-6 text-black/62">
                  {emailIdentity
                    ? "Email recovery is attached to this account."
                    : "This account was created through OAuth. Add a backup method before removing providers."}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
            {identities.length} linked
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["google", "discord"] as const).map((provider) => {
          const meta = PROVIDER_META[provider];
          const connected = hasIdentity(provider);
          const connection = getConnection(provider);
          const Icon = meta.icon;
          const isPending = pendingProvider === provider;

          return (
            <div key={provider} className="border border-black bg-[#fbfaf8] px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-black/14 p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-black">{meta.label}</p>
                      <p className="text-sm leading-6 text-black/62">{meta.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={connected
                        ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                        : "text-black/62"}
                    >
                      {connected ? "Connected" : "Available"}
                    </Badge>
                  </div>

                  {connection ? (
                    <div className="mt-4 space-y-1 text-sm leading-6 text-black/62">
                      {connection.displayName ? (
                        <p className="font-medium text-black">{connection.displayName}</p>
                      ) : null}
                      {connection.handle && connection.handle !== connection.displayName ? (
                        <p>@{connection.handle}</p>
                      ) : null}
                      {connection.email ? <p className="break-all">{connection.email}</p> : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-black/62">
                      Connect this after first sign-in so worlds, ratings, and moderation state stay on one BOARD identity.
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant={connected ? "outline" : "secondary"}
                  className="shrink-0"
                  onClick={() => (connected ? handleDisconnect(provider) : handleConnect(provider))}
                  disabled={loading || isPending || (connected && !canDisconnectProvider)}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working
                    </>
                  ) : connected ? (
                    <>
                      <Unplug className="h-4 w-4" />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
              </div>

              {connected && !canDisconnectProvider ? (
                <p className="mt-4 text-xs leading-6 text-black/55">
                  Add another usable sign-in method before removing this one.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border border-dashed border-black/20 bg-white px-4 py-4">
        <p className="board-rail-label text-black/55">Connection rule</p>
        <p className="mt-3 text-sm leading-7 text-black/62">
          Enable Supabase manual identity linking so added providers attach to the current user instead of creating separate accounts.
        </p>
        {error ? (
          <p className="mt-3 text-sm leading-7 text-red-600">{normalizeConnectionError(error)}</p>
        ) : null}
      </div>
    </div>
  );
}

function normalizeConnectionError(message: string) {
  if (/manual linking/i.test(message)) {
    return "Enable manual identity linking in Supabase Auth settings before using provider connections.";
  }

  return message;
}
