import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CalendarRange, Loader2, Plus, RadioTower, Users } from "lucide-react";
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
        <div className="mt-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <VenuePanel
            eyebrow="Active directory"
            title={worlds.length ? `${worlds.length} live venues` : "No worlds yet"}
            description={
              worlds.length
                ? "Joined worlds appear first, followed by public venues across the network."
                : "This is where recurring host-owned venues will appear once the first organizer stages one."
            }
            className="min-h-[520px] bg-white/92"
          >
            {worlds.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
                <Building2 className="h-10 w-10 text-black/30" />
                <div>
                  <p className="text-xl font-bold tracking-[-0.04em] text-foreground">
                    No venues yet
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                    The world slice is ready. The next move is turning the first
                    recurring club or organizer into a real host-owned space.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-black/10">
                {worlds.map((world, index) => (
                  <button
                    key={world.id}
                    onClick={() => navigate(`/worlds/${world.id}`)}
                    className="grid w-full gap-4 px-0 py-5 text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[70px_minmax(0,1fr)_220px]"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-[-0.06em] text-foreground">
                          {world.name}
                        </h2>
                        <span className="board-rail-label rounded-md border border-black/10 px-2 py-1 text-[10px] text-black/55">
                          {world.visibility}
                        </span>
                        {world.userRole ? (
                          <span className="board-rail-label rounded-md border border-black bg-black px-2 py-1 text-[10px] text-white">
                            {world.userRole}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                        {world.description || "No description yet."}
                      </p>
                      <p className="mt-3 board-rail-label text-[10px] text-black/45">
                        Hosted by {world.ownerName}
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
              eyebrow="Why worlds exist"
              title="BOARD is a venue system."
              description="Worlds are the container that gives rooms, events, moderators, spectators, and recurring hosts one place to live together."
            >
              <MetricLine label="Host-owned" value="identity first" />
              <MetricLine label="Not a portal" value="rooms under venue" />
              <MetricLine label="Not one game" value="board systems ready" />
            </VenuePanel>

            <VenuePanel
              eyebrow="Operator note"
              title="What to stage first"
              description="The highest-value first worlds are recurring organizers: clubs, creator leagues, school programs, and local opens with a clear cadence."
            >
              <div className="border-t border-black/10 pt-4 text-sm leading-7 text-muted-foreground">
                <p>Start with one serious venue. Give it a world, attach rooms and events, and let the product prove that recurring host identity is the real wedge.</p>
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
