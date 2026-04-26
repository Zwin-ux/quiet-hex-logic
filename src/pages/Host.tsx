import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, Layers3, ShieldCheck, Wrench } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  formatWorldSubscriptionStatus,
  isWorldSubscriptionActive,
  listWorldSubscriptions,
  openWorldBillingPortal,
  startWorldHostCheckout,
  type WorldSubscription,
} from "@/lib/hostBilling";
import { useManageableWorlds } from "@/hooks/useManageableWorlds";
import { buildAuthRoute } from "@/lib/authRedirect";
import { toast } from "sonner";

const LAUNCH_ASSIST_URL =
  "https://buy.stripe.com/9B65kE3E2cZz51rdAo6c003";

export default function Host() {
  useDocumentTitle("Host");

  const navigate = useNavigate();
  const { user } = useAuth();
  const { worlds, loading } = useManageableWorlds(user?.id);
  const [subscriptions, setSubscriptions] = useState<Map<string, WorldSubscription>>(new Map());
  const [redirectingWorldId, setRedirectingWorldId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSubscriptions = async () => {
      if (!worlds.length) {
        setSubscriptions(new Map());
        return;
      }

      try {
        const next = await listWorldSubscriptions(worlds.map((world) => world.id));
        if (!cancelled) {
          setSubscriptions(next);
        }
      } catch {
        if (!cancelled) {
          setSubscriptions(new Map());
        }
      }
    };

    void loadSubscriptions();

    return () => {
      cancelled = true;
    };
  }, [worlds]);

  const openCheckout = async (worldId: string) => {
    setRedirectingWorldId(worldId);

    try {
      const url = await startWorldHostCheckout(worldId);
      window.location.href = url;
    } catch (error: any) {
      toast.error("Failed to open Stripe checkout", {
        description: error?.message ?? "Please try again.",
      });
      setRedirectingWorldId(null);
    }
  };

  const openPortal = async (worldId: string) => {
    setRedirectingWorldId(worldId);

    try {
      const url = await openWorldBillingPortal(worldId);
      window.location.href = url;
    } catch (error: any) {
      toast.error("Failed to open Stripe portal", {
        description: error?.message ?? "Please try again.",
      });
      setRedirectingWorldId(null);
    }
  };

  return (
    <SiteFrame>
      <div className="board-page-width mx-auto space-y-6">
        <section className="border border-[#0e0e0f] bg-[#090909] px-6 py-6 text-[#f3efe6] md:px-8 md:py-8">
          <div className="flex flex-wrap gap-2">
            <StateTag>Hosted network</StateTag>
            <StateTag tone="success">hosts keep event revenue</StateTag>
            <StateTag>web authoring</StateTag>
          </div>

          <h1 className="mt-8 max-w-[720px] text-[clamp(3rem,5vw,4.9rem)] font-black leading-[0.9] tracking-[-0.07em]">
            Run the venue on web. Play everywhere else.
          </h1>
          <p className="mt-5 max-w-[36rem] text-[17px] leading-8 text-white/72">
            Worlds, events, variants, and package publishing stay here. Mobile and Discord stay focused on joining, playing, spectating, and light host controls.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              variant="hero"
              onClick={() => navigate(user ? "/worlds" : buildAuthRoute("/host"))}
            >
              <ArrowRight className="h-4 w-4" />
              {user ? "Open worlds" : "Sign in"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/events")}>
              Open events
            </Button>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <VenuePanel
            eyebrow="Surface split"
            title="Web"
            description="Create worlds, brand the venue, build variants, publish packages, and run the deeper organizer flow."
            titleBarEnd={<StateTag>authoring</StateTag>}
          >
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-foreground" />
                Surface rules editor
              </div>
              <div className="flex items-center gap-3">
                <Layers3 className="h-4 w-4 text-foreground" />
                Package upload and versioning
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-foreground" />
                World settings and publishing
              </div>
            </div>
          </VenuePanel>

          <VenuePanel
            eyebrow="Surface split"
            title="iOS / Android / Discord"
            description="Quickplay, live matches, spectating, invite copying, readiness, and match starts. No deep editing."
            titleBarEnd={<StateTag tone="warning">host-lite</StateTag>}
          >
            <div className="space-y-2 text-sm leading-7 text-muted-foreground">
              <p>Quickplay</p>
              <p>Join live rooms</p>
              <p>Copy invites and start an existing session</p>
              <p>Open on web for variants, branding, and package publishing</p>
            </div>
          </VenuePanel>

          <VenuePanel
            eyebrow="Rules model"
            title="Two editing modes"
            description="Safe knob editing lives in the browser. Deeper mod packages can be uploaded and versioned on web. Full engine code stays in the open-source dev kit."
            titleBarEnd={<StateTag>engine split</StateTag>}
          >
            <div className="space-y-3">
              <Button variant="outline" onClick={() => navigate("/mods")}>
                <ExternalLink className="h-4 w-4" />
                Open mod registry
              </Button>
            </div>
          </VenuePanel>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
          <VenuePanel
            eyebrow="Hosted billing"
            title="Club host"
            description="BOARD bills the venue software. You keep ticket and entry revenue on your own Stripe Payment Link, Eventbrite page, or club form."
            titleBarEnd={<StateTag tone="success">$29/mo</StateTag>}
          >
            <div className="space-y-5">
              <div className="border border-black/10 bg-white px-4 py-4 text-sm leading-7 text-muted-foreground">
                One venue. Recurring events. Variant authoring. Package publishing. No take rate on your brackets.
              </div>

              {user ? (
                worlds.length > 0 ? (
                  <div className="space-y-3">
                    {worlds.map((world) => {
                      const subscription = subscriptions.get(world.id);
                      const active = isWorldSubscriptionActive(subscription);
                      const redirecting = redirectingWorldId === world.id;

                      return (
                        <div
                          key={world.id}
                          className="border border-black/10 bg-white px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{world.name}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {formatWorldSubscriptionStatus(subscription?.status)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {active || subscription?.stripe_customer_id ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPortal(world.id)}
                                  disabled={redirecting}
                                >
                                  {redirecting ? "Opening..." : "Manage billing"}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => openCheckout(world.id)}
                                  disabled={redirecting}
                                >
                                  {redirecting ? "Opening..." : "Start hosted plan"}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/worlds/${world.id}/settings`)}
                              >
                                Settings
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm leading-7 text-muted-foreground">
                      Create a world first. Billing attaches to the venue, not the player account.
                    </p>
                    <Button onClick={() => navigate("/worlds")}>
                      Create or open a world
                    </Button>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Sign in on web to start a venue plan, manage variants, and publish the room map.
                  </p>
                  <Button onClick={() => navigate(buildAuthRoute("/host"))}>
                    Sign in to host
                  </Button>
                </div>
              )}
            </div>
          </VenuePanel>

          <VenuePanel
            eyebrow="Revenue rule"
            title="Organizer-owned signup"
            description="Put the entry money on your own link. BOARD stays out of the payout path."
          >
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Use a Stripe Payment Link, Eventbrite page, or your own club registration form.</p>
              <p>Paste that URL into the event form on web.</p>
              <p>Use access codes when you only want paid or invited players to enter.</p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(LAUNCH_ASSIST_URL, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Book launch assist
                </Button>
              </div>
              {loading ? <p>Loading worlds...</p> : null}
            </div>
          </VenuePanel>
        </section>
      </div>
    </SiteFrame>
  );
}
