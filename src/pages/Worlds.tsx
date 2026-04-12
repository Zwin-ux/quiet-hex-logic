import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { CounterBlock } from "@/components/board/CounterBlock";
import { SectionRail } from "@/components/board/SectionRail";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { SiteFrame } from "@/components/board/SiteFrame";
import { CreateWorldDialog } from "@/components/CreateWorldDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGuestMode } from "@/hooks/useGuestMode";
import { listWorlds, type WorldSummary } from "@/lib/worlds";
import { buildAuthRoute } from "@/lib/authRedirect";
import { toast } from "sonner";

export default function Worlds() {
  useDocumentTitle("Worlds");

  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const [loading, setLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const orderedWorlds = useMemo(() => {
    return [...worlds].sort((left, right) => {
      const leftJoined = left.userRole ? 0 : 1;
      const rightJoined = right.userRole ? 0 : 1;
      if (leftJoined !== rightJoined) return leftJoined - rightJoined;
      return left.name.localeCompare(right.name);
    });
  }, [worlds]);

  const joinedCount = orderedWorlds.filter((world) => Boolean(world.userRole)).length;
  const publicCount = orderedWorlds.filter((world) => world.visibility === "public").length;

  return (
    <SiteFrame>
      <SectionRail
        eyebrow="World directory"
        title="Find the right venue before you open the room."
        description={
          <>
            Joined worlds rise to the top. Public worlds stay visible below them. The
            directory should tell you host, access, and activity without opening a detail page.
          </>
        }
        status={
          <StateTag tone={loadError ? "critical" : orderedWorlds.length ? "success" : "warning"}>
            {loadError ? "directory issue" : orderedWorlds.length ? "live" : "empty"}
          </StateTag>
        }
        actions={
          user && !isGuest ? (
            <Button variant="hero" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              Create world
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate(buildAuthRoute())}>
              Sign in to host
            </Button>
          )
        }
      />

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <VenuePanel
            eyebrow="Directory ledger"
            title={orderedWorlds.length ? `${orderedWorlds.length} visible venues` : "No worlds live yet"}
            description={
              orderedWorlds.length
                ? "Joined worlds appear first, followed by public venues across the network."
                : "The first strong world should belong to a real recurring organizer, not a demo."
            }
            titleBarEnd={
              <StateTag tone={orderedWorlds.length ? "success" : "warning"}>
                {orderedWorlds.length || "none"}
              </StateTag>
            }
            state={loadError ? "critical" : orderedWorlds.length ? "normal" : "warning"}
          >
            {loadError ? (
              <div className="retro-critical-strip">{loadError}</div>
            ) : orderedWorlds.length === 0 ? (
              <div className="retro-warning-strip">No venues published yet.</div>
            ) : (
              <div className="board-ledger">
                {orderedWorlds.map((world, index) => (
                  <button
                    key={world.id}
                    onClick={() => navigate(`/worlds/${world.id}`)}
                    className="board-ledger-row w-full text-left md:grid-cols-[72px_minmax(0,1fr)_220px]"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="board-meta-stack mb-3">
                        {world.userRole ? <StateTag tone="success">{world.userRole}</StateTag> : null}
                        <StateTag tone={world.visibility === "private" ? "warning" : "normal"}>
                          {world.visibility}
                        </StateTag>
                        <StateTag>{world.ownerName}</StateTag>
                      </div>
                      <h2 className="board-section-title text-foreground">{world.name}</h2>
                      <p className="mt-3 text-sm leading-6 text-black">
                        {world.description || "No description yet."}
                      </p>
                    </div>
                    <div className="space-y-2 border-l border-black pl-4">
                      <div className="retro-status-strip justify-between bg-white px-3 py-2">
                        <span>Events</span>
                        <span>{world.eventCount}</span>
                      </div>
                      <div className="retro-status-strip justify-between bg-[#e8e8e8] px-3 py-2">
                        <span>Instances</span>
                        <span>{world.instanceCount}</span>
                      </div>
                      <div className="retro-status-strip justify-between bg-white px-3 py-2">
                        <span>Members</span>
                        <span>{world.memberCount}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </VenuePanel>

          <div className="space-y-6">
            <VenuePanel
              eyebrow="Operator note"
              title="What to stage first"
              description="The first world should belong to someone who already gathers people. Clubs, creator leagues, school programs, and local opens are the right starting shape."
              titleBarEnd={<StateTag tone="warning">host first</StateTag>}
              state="warning"
            >
              <div className="grid gap-3">
                <CounterBlock label="Joined" value={joinedCount} />
                <CounterBlock label="Public" value={publicCount} />
                <CounterBlock label="Operator" value={user && !isGuest ? "active" : "sign-in"} />
              </div>
            </VenuePanel>

            <VenuePanel
              eyebrow="Access logic"
              title="Read state before opening"
              description="Private worlds need an invite or role. Public worlds stay browsable. The directory should make that obvious before a user clicks through."
              titleBarEnd={<StateTag>{orderedWorlds.length ? "scannable" : "awaiting first world"}</StateTag>}
            >
              <div className="space-y-3">
                <div className="retro-status-strip justify-between bg-white">
                  <span>Joined world</span>
                  <StateTag tone="success">open fast</StateTag>
                </div>
                <div className="retro-status-strip justify-between bg-[#ffffcc]">
                  <span>Private world</span>
                  <StateTag tone="warning">check access</StateTag>
                </div>
                <div className="retro-status-strip justify-between bg-[#ffe5e5]">
                  <span>Directory failure</span>
                  <StateTag tone="critical">retry</StateTag>
                </div>
              </div>
            </VenuePanel>
          </div>
        </div>
      )}

      <div className="mt-8 retro-status-strip justify-between gap-3 bg-[#e8e8e8]">
        <div className="flex flex-wrap items-center gap-3">
          <StateTag tone={user && !isGuest ? "success" : "warning"}>
            {user && !isGuest ? "host capable" : "viewer mode"}
          </StateTag>
          <span>joined {joinedCount}</span>
          <span>public {publicCount}</span>
          <span>visible {orderedWorlds.length}</span>
        </div>
        <span>{loadError ? "retry suggested" : "directory synced"}</span>
      </div>

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
