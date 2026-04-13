import { Chrome, Disc3, Link2, Loader2, Mail, Unplug } from "lucide-react";
import { SupportSoon } from "@/components/support/SupportSoon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  type ConnectionProvider,
  useAuthConnections,
} from "@/hooks/useAuthConnections";
import { getPublicEnv } from "@/lib/runtimeEnv";
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
    description: "Main login.",
  },
  discord: {
    label: "Discord",
    icon: Disc3,
    description: "Second login.",
  },
};

export function AuthConnectionsSection({ variant = "default" }: { variant?: "default" | "support" }) {
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

  const isSupport = variant === "support";
  const discordReady = Boolean(getPublicEnv("VITE_DISCORD_CLIENT_ID"));

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
      <div className={isSupport ? "support-inline-card" : "border border-black bg-white px-4 py-4"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={isSupport ? "support-mini-label text-white/60" : "board-rail-label text-black/55"}>Recovery anchor</p>
            <div className="mt-3 flex items-center gap-3">
              <div className={isSupport ? "rounded-full border-2 border-white/18 bg-white/6 p-2" : "rounded-full border border-black/14 p-2"}>
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className={isSupport ? "font-semibold text-white" : "font-semibold text-black"}>{user.email || "No email on file"}</p>
                <p className={isSupport ? "text-sm leading-6 text-white/68" : "text-sm leading-6 text-black/62"}>
                  {emailIdentity
                    ? "Email sign-in is linked."
                    : "OAuth account. Add backup login first."}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={isSupport ? "border-[#ffe600]/45 bg-[#0d0d1a]/65 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white" : "px-3 py-1 text-[11px] uppercase tracking-[0.16em]"}>
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
          const providerReady = provider === "discord" ? discordReady : true;

          return (
            <div key={provider} className={isSupport ? "support-inline-card" : "border border-black bg-[#fbfaf8] px-4 py-4"}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className={isSupport ? "rounded-full border-2 border-white/18 bg-white/6 p-2" : "rounded-full border border-black/14 p-2"}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={isSupport ? "font-semibold text-white" : "font-semibold text-black"}>{meta.label}</p>
                      <p className={isSupport ? "text-sm leading-6 text-white/68" : "text-sm leading-6 text-black/62"}>
                        {!providerReady && !connected ? "SOOON." : meta.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={connected
                        ? isSupport
                          ? "border-[#00f5d4]/45 bg-[#00f5d4]/14 text-[#9ffbf0]"
                          : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                        : !providerReady
                          ? isSupport
                            ? "border-[#ff6b35]/45 bg-[#ff6b35]/12 text-[#ffd0b7]"
                            : "border-orange-400/40 bg-orange-100 text-orange-700"
                        : isSupport
                          ? "border-white/20 bg-white/6 text-white/62"
                          : "text-black/62"}
                    >
                      {connected ? "Connected" : !providerReady ? "SOOON" : "Available"}
                    </Badge>
                  </div>

                  {connection ? (
                    <div className={isSupport ? "mt-4 space-y-1 text-sm leading-6 text-white/68" : "mt-4 space-y-1 text-sm leading-6 text-black/62"}>
                      {connection.displayName ? (
                        <p className={isSupport ? "font-medium text-white" : "font-medium text-black"}>{connection.displayName}</p>
                      ) : null}
                      {connection.handle && connection.handle !== connection.displayName ? (
                        <p>@{connection.handle}</p>
                      ) : null}
                      {connection.email ? <p className="break-all">{connection.email}</p> : null}
                    </div>
                  ) : (
                    providerReady ? (
                      <p className={isSupport ? "mt-4 text-sm leading-6 text-white/68" : "mt-4 text-sm leading-6 text-black/62"}>
                        Link this login later.
                      </p>
                    ) : (
                      <SupportSoon
                        className="mt-4"
                        tone={isSupport ? "dark" : "paper"}
                        detail="Discord link lands here after Google + World ID are locked."
                      />
                    )
                  )}
                </div>

                <Button
                  type="button"
                  variant={isSupport ? (connected ? "supportOutline" : "support") : connected ? "outline" : "secondary"}
                  className="shrink-0"
                  onClick={() => (connected ? handleDisconnect(provider) : handleConnect(provider))}
                  disabled={loading || isPending || (connected && !canDisconnectProvider) || (!providerReady && !connected)}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working
                    </>
                  ) : !providerReady && !connected ? (
                    "SOOON"
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
                <p className={isSupport ? "mt-4 text-xs leading-6 text-white/58" : "mt-4 text-xs leading-6 text-black/55"}>
                  Add another usable sign-in method before removing this one.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={isSupport ? "support-note" : "border border-dashed border-black/20 bg-white px-4 py-4"}>
        <p className={isSupport ? "support-mini-label text-white/58" : "board-rail-label text-black/55"}>Connection rule</p>
        <p className={isSupport ? "mt-3 text-sm leading-7 text-white/72" : "mt-3 text-sm leading-7 text-black/62"}>
          Turn on Supabase manual linking.
        </p>
        {error ? (
          <p className={isSupport ? "mt-3 text-sm leading-7 text-[#ffe600]" : "mt-3 text-sm leading-7 text-red-600"}>{normalizeConnectionError(error)}</p>
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
