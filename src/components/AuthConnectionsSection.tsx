import { Chrome, Disc3, Link2, Loader2, ShieldCheck, Unplug } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    description: "Fast sign-in and recovery for web onboarding.",
  },
  discord: {
    label: "Discord",
    icon: Disc3,
    description: "Community identity and easier event-side entry.",
  },
};

export function AuthConnectionsSection() {
  const { user } = useAuth();
  const {
    identities,
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
      description: "Your BOARD account still keeps the remaining sign-in methods.",
    });
  };

  return (
    <Card className="relative p-8 mb-12 bg-gradient-to-br from-background via-background to-indigo/5 border-indigo/20 hover:border-indigo/40 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-[520ms] overflow-hidden">
      <div className="absolute top-4 right-4 text-8xl opacity-5 pointer-events-none">↔</div>

      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-indigo/10">
                <ShieldCheck className="h-7 w-7 text-indigo" />
              </div>
              <h2 className="font-body text-3xl font-bold bg-gradient-to-br from-indigo to-ochre bg-clip-text text-transparent">
                Account Connections
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              One BOARD account should own your progress. Connect Google and Discord here so worlds,
              rooms, ratings, and tournament history stay attached to the same identity.
            </p>
          </div>

          <Badge variant="outline" className="font-mono px-3 py-1.5">
            {identities.length} linked
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">Recovery Email</p>
            <p className="text-base font-semibold break-all">{user.email || "No email on file"}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {emailIdentity
                ? "Email/password recovery is attached to this account."
                : "OAuth accounts can add password recovery later through account update flows."}
            </p>
          </div>

          {(["google", "discord"] as const).map((provider) => {
            const meta = PROVIDER_META[provider];
            const connected = hasIdentity(provider);
            const Icon = meta.icon;
            const isPending = pendingProvider === provider;

            return (
              <div
                key={provider}
                className="rounded-xl border border-border/60 bg-card/70 p-5 transition-all duration-300 hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={connected
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                        : "text-muted-foreground"}
                    >
                      {connected ? "Connected" : "Available"}
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    variant={connected ? "outline" : "default"}
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
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    Keep at least one other sign-in method connected before removing this one.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Connection rule</p>
          <p className="text-sm leading-7 text-muted-foreground">
            Enable Supabase manual identity linking so Google and Discord attach to the current user
            instead of creating separate accounts.
          </p>
          {error ? (
            <p className="text-sm leading-7 text-red-500">{normalizeConnectionError(error)}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function normalizeConnectionError(message: string) {
  if (/manual linking/i.test(message)) {
    return "Enable manual identity linking in Supabase Auth settings before using provider connections.";
  }

  return message;
}
