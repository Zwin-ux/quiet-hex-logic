import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Loader2, Plus, Radio, ShieldCheck, Users } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { CreateWorldDialog } from "@/components/CreateWorldDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import { listWorlds, type WorldSummary } from "@/lib/worlds";
import { buildAuthRoute } from "@/lib/authRedirect";
import { toast } from "sonner";

type WorldFilter = "all" | "joined" | "public";

const WORLD_FILTERS: Array<{ key: WorldFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "joined", label: "Joined" },
  { key: "public", label: "Public" },
];

function getWorldCopy(world: WorldSummary) {
  return (
    world.description ||
    world.tagline ||
    `${world.visibility === "public" ? "Open venue" : "Private venue"} with rooms, events, and live tables.`
  );
}

function getWorldActivity(world: WorldSummary) {
  if (world.instanceCount > 0) {
    return { label: "Live", tone: "is-live" as const };
  }

  if (world.eventCount > 0) {
    return { label: "Queued", tone: "is-warning" as const };
  }

  return { label: "Quiet", tone: "is-neutral" as const };
}

export default function Worlds() {
  useDocumentTitle("Worlds");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { isAuthoringSurface } = useSurfaceCapabilities();
  const [loading, setLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [filter, setFilter] = useState<WorldFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const nextWorlds = await listWorlds(user?.id);
      setWorlds(nextWorlds);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Failed to load worlds");
      toast.error("Failed to load worlds", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedWorlds = useMemo(() => {
    return [...worlds].sort((left, right) => {
      const leftJoined = left.userRole ? 0 : 1;
      const rightJoined = right.userRole ? 0 : 1;
      if (leftJoined !== rightJoined) return leftJoined - rightJoined;
      return left.name.localeCompare(right.name);
    });
  }, [worlds]);

  const filteredWorlds = useMemo(() => {
    return orderedWorlds.filter((world) => {
      if (filter === "joined") return Boolean(world.userRole);
      if (filter === "public") return world.visibility === "public";
      return true;
    });
  }, [filter, orderedWorlds]);

  useEffect(() => {
    if (!filteredWorlds.length) {
      setSelectedWorldId(null);
      return;
    }

    setSelectedWorldId((current) =>
      current && filteredWorlds.some((world) => world.id === current)
        ? current
        : filteredWorlds[0].id,
    );
  }, [filteredWorlds]);

  useEffect(() => {
    if (user && !isGuest && searchParams.get("create") === "true") {
      setShowCreateDialog(true);
    }
  }, [isGuest, searchParams, user]);

  const selectedWorld =
    filteredWorlds.find((world) => world.id === selectedWorldId) ?? filteredWorlds[0] ?? null;
  const joinedCount = orderedWorlds.filter((world) => Boolean(world.userRole)).length;
  const publicCount = orderedWorlds.filter((world) => world.visibility === "public").length;
  const liveTableCount = orderedWorlds.reduce((sum, world) => sum + world.instanceCount, 0);
  const eventCount = orderedWorlds.reduce((sum, world) => sum + world.eventCount, 0);
  const heroTitle = "Worlds";
  const heroDescription = isAuthoringSurface
    ? "Browse venues, see what is live, and move into the room that matters."
    : "See which venues are active, then jump in when a table opens.";
  const trailingMetricLabel = user && !isGuest ? "Joined" : "Public";
  const trailingMetricValue = user && !isGuest ? joinedCount : publicCount;
  const emptyFilterLabel =
    filter === "joined" ? "joined" : filter === "public" ? "public" : "available";

  return (
    <SiteFrame contentClassName="pb-16 pt-24 md:pt-28">
      <div className="ops-directory-shell">
        <section className="ops-directory-head">
          <div className="ops-directory-head__copy">
            <p className="ops-directory-label">Worlds</p>
            <h1 className="ops-directory-title mt-4">{heroTitle}</h1>
            <p className="ops-directory-copy mt-4">{heroDescription}</p>

            <div className="ops-directory-actions">
              {user && !isGuest && isAuthoringSurface ? (
                <Button
                  variant="hero"
                  onClick={() => setShowCreateDialog(true)}
                  className="ops-directory-action ops-directory-action--primary"
                >
                  <Plus className="h-4 w-4" />
                  Create world
                </Button>
              ) : user && !isGuest ? (
                <Button
                  variant="outline"
                  onClick={() => navigate("/play")}
                  className="ops-directory-action"
                >
                  Open play
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(buildAuthRoute(isAuthoringSurface ? "/worlds?create=true" : "/play"))
                  }
                  className="ops-directory-action"
                >
                  {isAuthoringSurface ? "Sign in to host" : "Enter to play"}
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => navigate("/events")}
                className="ops-directory-action ops-directory-action--ghost"
              >
                Open events
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="ops-directory-summary" aria-label="World summary">
            <div className="ops-directory-summary__item">
              <p className="ops-directory-summary__label">Worlds</p>
              <p className="ops-directory-summary__value">{orderedWorlds.length}</p>
            </div>
            <div className="ops-directory-summary__item">
              <p className="ops-directory-summary__label">Live tables</p>
              <p className="ops-directory-summary__value">{liveTableCount}</p>
            </div>
            <div className="ops-directory-summary__item">
              <p className="ops-directory-summary__label">Events</p>
              <p className="ops-directory-summary__value">{eventCount}</p>
            </div>
            <div className="ops-directory-summary__item">
              <p className="ops-directory-summary__label">{trailingMetricLabel}</p>
              <p className="ops-directory-summary__value">{trailingMetricValue}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="ops-directory-empty">{loadError}</div>
        ) : orderedWorlds.length === 0 ? (
          <div className="ops-directory-empty">
            <p className="ops-directory-section-title">
              {isAuthoringSurface ? "No worlds yet." : "Nothing live yet."}
            </p>
            <p className="ops-directory-copy mt-3">
              {isAuthoringSurface
                ? "Create the first venue, then attach rooms and events to it."
                : "Open quickplay now, or come back when a room goes live."}
            </p>
            <div className="ops-directory-actions">
              {user && !isGuest && isAuthoringSurface ? (
                <Button
                  variant="hero"
                  onClick={() => setShowCreateDialog(true)}
                  className="ops-directory-action ops-directory-action--primary"
                >
                  <Plus className="h-4 w-4" />
                  Create world
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(buildAuthRoute(isAuthoringSurface ? "/worlds?create=true" : "/play"))
                  }
                  className="ops-directory-action"
                >
                  {isAuthoringSurface ? "Sign in to host" : "Open play"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="ops-directory-grid">
            <section className="ops-directory-surface">
              <div className="ops-directory-section-head">
                <div>
                  <p className="ops-directory-label">Directory</p>
                  <h2 className="ops-directory-section-title mt-3">Available worlds</h2>
                </div>

                <div className="ops-directory-segmented">
                  {WORLD_FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={
                        filter === item.key
                          ? "ops-directory-segmented__item is-active"
                          : "ops-directory-segmented__item"
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredWorlds.length === 0 ? (
                <div className="ops-directory-empty ops-directory-empty--inline">
                  <p className="ops-directory-copy">
                    No {emptyFilterLabel} worlds match this filter yet.
                  </p>
                </div>
              ) : (
                <div className="ops-directory-list mt-6">
                  {filteredWorlds.map((world) => {
                    const selected = world.id === selectedWorldId;
                    const activity = getWorldActivity(world);
                    const rowStyle = {
                      "--ops-accent": world.accentColor || "#1c64f2",
                    } as CSSProperties;

                    return (
                      <button
                        key={world.id}
                        type="button"
                        onClick={() => setSelectedWorldId(world.id)}
                        className={selected ? "ops-directory-row is-selected" : "ops-directory-row"}
                        style={rowStyle}
                      >
                        <div className="ops-directory-row__main">
                          <div className="ops-directory-row__titleline">
                            <span className="ops-directory-dot" aria-hidden="true" />
                            <h3 className="ops-directory-row__title">{world.name}</h3>
                          </div>

                          <p className="ops-directory-row__copy">{getWorldCopy(world)}</p>

                          <div className="ops-directory-chip-row">
                            <span className={`ops-directory-chip ${activity.tone}`}>{activity.label}</span>
                            <span className="ops-directory-chip">
                              {world.visibility === "public" ? "Public" : "Private"}
                            </span>
                            {world.userRole ? (
                              <span className="ops-directory-chip is-dark">{world.userRole}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="ops-directory-row__stats">
                          <div className="ops-directory-row__stat">
                            <p className="ops-directory-row__stat-label">Live</p>
                            <p className="ops-directory-row__stat-value">{world.instanceCount}</p>
                          </div>
                          <div className="ops-directory-row__stat">
                            <p className="ops-directory-row__stat-label">Events</p>
                            <p className="ops-directory-row__stat-value">{world.eventCount}</p>
                          </div>
                          <div className="ops-directory-row__stat">
                            <p className="ops-directory-row__stat-label">Members</p>
                            <p className="ops-directory-row__stat-value">{world.memberCount}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedWorld ? (
              <aside className="ops-directory-surface ops-directory-surface--detail">
                <div className="ops-directory-detail-topline">
                  <span className={`ops-directory-chip ${getWorldActivity(selectedWorld).tone}`}>
                    {getWorldActivity(selectedWorld).label}
                  </span>
                  <span className="ops-directory-chip">{selectedWorld.visibility}</span>
                  {selectedWorld.userRole ? (
                    <span className="ops-directory-chip is-dark">{selectedWorld.userRole}</span>
                  ) : null}
                </div>

                <h2 className="ops-directory-detail-title mt-5">{selectedWorld.name}</h2>
                <p className="ops-directory-detail-copy mt-3">{getWorldCopy(selectedWorld)}</p>

                <div className="ops-directory-detail-hero">
                  <p className="ops-directory-detail-hero__label">Live tables</p>
                  <p className="ops-directory-detail-hero__value">
                    {String(selectedWorld.instanceCount).padStart(2, "0")}
                  </p>
                  <p className="ops-directory-detail-hero__foot">
                    Hosted by {selectedWorld.ownerName}. {selectedWorld.eventCount} events attached.
                  </p>
                </div>

                <div className="ops-directory-detail-grid">
                  <div className="ops-directory-detail-stat">
                    <Radio className="h-4 w-4" />
                    <div>
                      <p className="ops-directory-detail-stat__label">Live</p>
                      <p className="ops-directory-detail-stat__value">{selectedWorld.instanceCount}</p>
                    </div>
                  </div>
                  <div className="ops-directory-detail-stat">
                    <ShieldCheck className="h-4 w-4" />
                    <div>
                      <p className="ops-directory-detail-stat__label">Events</p>
                      <p className="ops-directory-detail-stat__value">{selectedWorld.eventCount}</p>
                    </div>
                  </div>
                  <div className="ops-directory-detail-stat">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="ops-directory-detail-stat__label">Members</p>
                      <p className="ops-directory-detail-stat__value">{selectedWorld.memberCount}</p>
                    </div>
                  </div>
                  <div className="ops-directory-detail-stat">
                    <ArrowUpRight className="h-4 w-4" />
                    <div>
                      <p className="ops-directory-detail-stat__label">Access</p>
                      <p className="ops-directory-detail-stat__value">
                        {selectedWorld.visibility === "public" ? "Open" : "Private"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ops-directory-actions ops-directory-actions--stack mt-6">
                  <Button
                    variant="hero"
                    onClick={() => navigate(`/worlds/${selectedWorld.id}`)}
                    className="ops-directory-action ops-directory-action--primary"
                  >
                    Enter world
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/events")}
                    className="ops-directory-action"
                  >
                    View events
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/play")}
                    className="ops-directory-action"
                  >
                    Local practice
                  </Button>
                </div>
              </aside>
            ) : null}
          </div>
        )}

        {user && !isGuest && isAuthoringSurface ? (
          <CreateWorldDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            userId={user.id}
            onSuccess={(worldId) => {
              setShowCreateDialog(false);
              navigate(`/worlds/${worldId}?setup=1`);
            }}
          />
        ) : null}
      </div>
    </SiteFrame>
  );
}
