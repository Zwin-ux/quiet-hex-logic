import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Building2, CalendarRange, Loader2, Plus, RadioTower, Users } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";
import { MetricLine } from "@/components/board/MetricLine";
import { CreateWorldDialog } from "@/components/CreateWorldDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { listWorlds, type WorldSummary } from "@/lib/worlds";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "sonner";

export default function Worlds() {
  useDocumentTitle("Worlds");

  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const [loading, setLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const nextWorlds = await listWorlds(user?.id);
      setWorlds(nextWorlds);
    } catch (error: any) {
      toast.error("Failed to load worlds", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  return (
    <SiteFrame>
      <SectionRail
        eyebrow="World directory"
        title="Worlds are host-owned venues, not floating pages."
        description={
          <>
            Every recurring club, creator league, school group, or local open
            should be able to own its place, identity, rooms, and event history
            inside BOARD.
          </>
        }
        meta={
          <>
            <span className="board-meta-chip">Mode / venue directory</span>
            <span className="board-meta-chip">Primary use / clubs, leagues, local opens</span>
            <span className="board-meta-chip">System status / {worlds.length ? `${worlds.length} visible` : "ready for first venue"}</span>
          </>
        }
        actions={
          user && !isGuest ? (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Create world
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")}>Sign in to host</Button>
          )
        }
      />

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <VenuePanel
            eyebrow="Active directory"
            title={worlds.length ? `${worlds.length} live venues` : "No worlds live yet"}
            description={
              worlds.length
                ? "Joined worlds appear first, followed by public venues across the network."
                : "BOARD is ready for the first serious recurring venue. The next step is turning one real organizer into an owned world."
            }
            className="min-h-[460px] bg-white/92"
          >
            {worlds.length === 0 ? (
              <div className="board-ledger mt-2">
                <div className="grid gap-8 py-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-black/45" />
                      <p className="board-rail-label">Empty directory</p>
                    </div>
                    <p className="board-section-title mt-4 text-foreground">
                      No venues yet
                    </p>
                    <p className="board-copy mt-4 max-w-xl">
                      Start with one recurring organizer, not a generic public hub.
                      The strongest first worlds are clubs, creator leagues,
                      school programs, and local opens with a cadence people
                      already recognize.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Button onClick={() => navigate("/auth")}>
                        Sign in to host
                      </Button>
                      <Button variant="outline" onClick={() => navigate("/events")}>
                        Browse events
                      </Button>
                    </div>
                  </div>

                  <div className="border-l border-black/10 pl-0 md:pl-5">
                    <MetricLine label="Role" value="host first" />
                    <MetricLine label="Pattern" value="recurring" />
                    <MetricLine label="Scope" value="world owned" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="board-ledger mt-2">
                {worlds.map((world, index) => (
                  <button
                    key={world.id}
                    onClick={() => navigate(`/worlds/${world.id}`)}
                    className="board-ledger-row w-full text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[72px_minmax(0,1fr)_220px]"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="board-meta-stack mb-3">
                        <span className="board-meta-chip">visibility / {world.visibility}</span>
                        <span className="board-meta-chip">host / {world.ownerName}</span>
                        {world.userRole ? <span className="board-meta-chip">role / {world.userRole}</span> : null}
                      </div>
                      <h2 className="board-section-title text-foreground">
                        {world.name}
                      </h2>
                      <p className="board-copy mt-4 max-w-2xl">
                        {world.description || "No description yet."}
                      </p>
                    </div>
                    <div className="space-y-1 border-l border-black/10 pl-5">
                      <MetricLine icon={Users} label="Members" value={world.memberCount} />
                      <MetricLine icon={CalendarRange} label="Events" value={world.eventCount} />
                      <MetricLine icon={RadioTower} label="Instances" value={world.instanceCount} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </VenuePanel>

          <div className="space-y-6">
            <VenuePanel
              eyebrow="Venue anatomy"
              title="BOARD is a venue system."
              description="A world turns recurring host identity into something rooms, events, members, and moderation can all inherit."
            >
              <MetricLine label="Host-owned" value="identity first" />
              <MetricLine label="Not a portal" value="rooms under venue" />
              <MetricLine label="Not one game" value="board systems ready" />
            </VenuePanel>

            <VenuePanel
              eyebrow="Operator note"
              title="What to stage first"
              description="The first world should belong to someone who already gathers people, not to an abstract product demo."
            >
              <div className="board-ledger pt-1">
                <div className="board-ledger-row py-4">
                  <div>
                    <p className="board-rail-label">Best first fit</p>
                    <p className="board-copy mt-3">
                      A recurring club, league, school group, or local open with
                      an obvious return rhythm.
                    </p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 text-black/35" />
                </div>
              </div>
            </VenuePanel>
          </div>
        </div>
      )}

      {user && !isGuest ? (
        <CreateWorldDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          userId={user.id}
          onSuccess={(worldId) => {
            setShowCreateDialog(false);
            navigate(`/worlds/${worldId}`);
          }}
        />
      ) : null}
    </SiteFrame>
  );
}
