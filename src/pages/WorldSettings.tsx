import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Settings2 } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  formatWorldSubscriptionStatus,
  isWorldSubscriptionActive,
  loadWorldSubscription,
  openWorldBillingPortal,
  startWorldHostCheckout,
  type WorldSubscription,
} from "@/lib/hostBilling";
import { canManageWorld, loadWorldOverview, updateWorldSettings, type WorldOverview, type WorldVisibility } from "@/lib/worlds";
import { toast } from "sonner";

export default function WorldSettings() {
  useDocumentTitle("World Settings");

  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [overview, setOverview] = useState<WorldOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingRedirecting, setBillingRedirecting] = useState(false);
  const [subscription, setSubscription] = useState<WorldSubscription | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    tagline: "",
    visibility: "public" as WorldVisibility,
    publicStatus: "draft" as "draft" | "live",
    accentColor: "#0e0e0f",
  });

  const load = useCallback(async () => {
    if (!worldId) return;

    setLoading(true);
    setBillingLoading(true);

    try {
      const nextOverview = await loadWorldOverview(worldId, user?.id);
      if (!canManageWorld(nextOverview.world)) {
        toast.error("Only hosts can edit this world");
        navigate(`/worlds/${worldId}`);
        return;
      }

      setOverview(nextOverview);
      setForm({
        name: nextOverview.world.name,
        description: nextOverview.world.description ?? "",
        tagline: nextOverview.world.tagline ?? "",
        visibility: nextOverview.world.visibility,
        publicStatus: nextOverview.world.publicStatus ?? "draft",
        accentColor: nextOverview.world.accentColor ?? "#0e0e0f",
      });

      const nextSubscription = await loadWorldSubscription(worldId);
      setSubscription(nextSubscription);
    } catch (error: any) {
      toast.error("Failed to load world settings", {
        description: error?.message ?? "Please try again.",
      });
      navigate("/worlds");
    } finally {
      setLoading(false);
      setBillingLoading(false);
    }
  }, [navigate, user?.id, worldId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const billingState = searchParams.get("billing");
    if (!billingState) return;

    if (billingState === "success") {
      toast.success("Stripe checkout complete", {
        description: "The venue plan is syncing now.",
      });
    }

    if (billingState === "cancel") {
      toast.message("Stripe checkout canceled");
    }

    const next = new URLSearchParams(searchParams);
    next.delete("billing");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!worldId) return;

    setSaving(true);

    try {
      await updateWorldSettings({
        worldId,
        name: form.name,
        description: form.description,
        tagline: form.tagline,
        visibility: form.visibility,
        publicStatus: form.publicStatus,
        accentColor: form.accentColor,
      });

      toast.success("World updated", {
        description: "Venue settings saved.",
      });

      await load();
    } catch (error: any) {
      toast.error("Failed to save world settings", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartBilling = async () => {
    if (!worldId) return;

    setBillingRedirecting(true);

    try {
      const url = await startWorldHostCheckout(worldId);
      window.location.href = url;
    } catch (error: any) {
      toast.error("Failed to open Stripe checkout", {
        description: error?.message ?? "Please try again.",
      });
      setBillingRedirecting(false);
    }
  };

  const handleManageBilling = async () => {
    if (!worldId) return;

    setBillingRedirecting(true);

    try {
      const url = await openWorldBillingPortal(worldId);
      window.location.href = url;
    } catch (error: any) {
      toast.error("Failed to open Stripe portal", {
        description: error?.message ?? "Please try again.",
      });
      setBillingRedirecting(false);
    }
  };

  if (loading || !overview) {
    return (
      <SiteFrame>
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <div className="board-page-width mx-auto space-y-6">
        <Button variant="outline" size="sm" onClick={() => navigate(`/worlds/${overview.world.id}`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to world
        </Button>

        <section className="border border-[#0e0e0f] bg-[#090909] px-6 py-6 text-[#f3efe6] md:px-8 md:py-8">
          <div className="flex flex-wrap gap-2">
            <StateTag>World settings</StateTag>
            <StateTag tone="success">{overview.world.visibility}</StateTag>
            <StateTag>{overview.world.publicStatus ?? "draft"}</StateTag>
          </div>

          <h1 className="mt-8 max-w-[620px] text-[clamp(3rem,5vw,4.8rem)] font-black leading-[0.9] tracking-[-0.07em]">
            Tune the venue, not the pitch.
          </h1>
          <p className="mt-5 max-w-[34rem] text-[17px] leading-8 text-white/72">
            Name, visibility, live state, and a short line for the public room map.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
          <VenuePanel
            eyebrow="Venue state"
            title="Identity"
            description="Keep the world page clean. One name. One line. One clear public state."
            titleBarEnd={<Settings2 className="h-4 w-4 text-foreground" />}
          >
            <form onSubmit={onSave} className="space-y-5">
              <Field label="World name">
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-11 border-black/10 bg-white"
                  required
                />
              </Field>

              <Field label="Tagline">
                <Input
                  value={form.tagline}
                  onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
                  placeholder="Tables open. Finals live."
                  className="h-11 border-black/10 bg-white"
                />
              </Field>

              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                  className="border-black/10 bg-white"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Visibility">
                  <Select
                    value={form.visibility}
                    onValueChange={(value: WorldVisibility) =>
                      setForm((current) => ({ ...current, visibility: value }))
                    }
                  >
                    <SelectTrigger className="h-11 border-black/10 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Public state">
                  <Select
                    value={form.publicStatus}
                    onValueChange={(value: "draft" | "live") =>
                      setForm((current) => ({ ...current, publicStatus: value }))
                    }
                  >
                    <SelectTrigger className="h-11 border-black/10 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Accent">
                <Input
                  type="color"
                  value={form.accentColor}
                  onChange={(event) => setForm((current) => ({ ...current, accentColor: event.target.value }))}
                  className="h-11 border-black/10 bg-white p-1"
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save settings"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`/worlds/${overview.world.id}/variants`)}>
                  Open variants
                </Button>
              </div>
            </form>
          </VenuePanel>

          <VenuePanel
            eyebrow="Current world"
            title={overview.world.name}
            description={overview.world.tagline || "No short line yet."}
          >
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Visibility: {overview.world.visibility}</p>
              <p>Public state: {overview.world.publicStatus ?? "draft"}</p>
              <p>Rooms + matches: {overview.world.instanceCount}</p>
              <p>Events: {overview.world.eventCount}</p>
            </div>
          </VenuePanel>

          <VenuePanel
            eyebrow="Hosted billing"
            title="Club host"
            description="BOARD bills the venue. Your event revenue stays on your own Stripe link, Eventbrite, or club form."
            titleBarEnd={
              <StateTag tone={isWorldSubscriptionActive(subscription) ? "success" : "warning"}>
                {formatWorldSubscriptionStatus(subscription?.status)}
              </StateTag>
            }
          >
            <div className="space-y-4">
              <div className="border border-black/10 bg-white px-4 py-4">
                <p className="text-[2rem] font-black leading-none tracking-[-0.06em] text-[#0e0e0f]">
                  $29<span className="text-base font-semibold text-[#525257]">/mo</span>
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  One hosted club world. Recurring events. Variant authoring. Package publishing. No take rate on your brackets.
                </p>
              </div>

              <div className="space-y-2 text-sm leading-7 text-muted-foreground">
                <p>Status: {formatWorldSubscriptionStatus(subscription?.status)}</p>
                <p>Plan: {subscription?.plan === "club_host" ? "Club host" : "Not started"}</p>
                {subscription?.current_period_end ? (
                  <p>
                    Period end: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                ) : null}
                <p>Organizer signup: use the event field for a Stripe Payment Link or external registration page.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {isWorldSubscriptionActive(subscription) || subscription?.stripe_customer_id ? (
                  <Button
                    type="button"
                    onClick={handleManageBilling}
                    disabled={billingRedirecting || billingLoading}
                  >
                    {billingRedirecting ? "Opening..." : "Manage in Stripe"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleStartBilling}
                    disabled={billingRedirecting || billingLoading}
                  >
                    {billingRedirecting ? "Opening..." : "Start hosted plan"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/worlds/${overview.world.id}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                  Back to venue
                </Button>
              </div>
            </div>
          </VenuePanel>
        </div>
      </div>
    </SiteFrame>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}
