import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
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

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const [loading, setLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!orderedWorlds.length) {
      setSelectedWorldId(null);
      return;
    }

    setSelectedWorldId((current) =>
      current && orderedWorlds.some((world) => world.id === current)
        ? current
        : orderedWorlds[0].id,
    );
  }, [orderedWorlds]);

  useEffect(() => {
    if (user && !isGuest && searchParams.get("create") === "true") {
      setShowCreateDialog(true);
    }
  }, [isGuest, searchParams, user]);

  const selectedWorld =
    orderedWorlds.find((world) => world.id === selectedWorldId) ?? orderedWorlds[0] ?? null;
  const joinedCount = orderedWorlds.filter((world) => Boolean(world.userRole)).length;
  const publicCount = orderedWorlds.filter((world) => world.visibility === "public").length;

  return (
    <SiteFrame>
      <div className="board-page-width mx-auto">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px] xl:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StateTag>World Directory</StateTag>
              <div className="retro-status-strip">
                <span>{orderedWorlds.length} live worlds</span>
                <span>{publicCount} public</span>
                <span>{joinedCount} joined</span>
              </div>
            </div>

            <h1 className="mt-8 max-w-[560px] text-[clamp(3rem,6vw,5.1rem)] font-black leading-[0.9] tracking-[-0.06em] text-[#0e0e0f]">
              Choose a world, not a page.
            </h1>
            <p className="mt-5 max-w-[470px] text-[18px] leading-8 text-[#525257]">
              Hosts own these places. Access, occupancy, and live state should be visible before the user clicks through.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {user && !isGuest ? (
                <Button variant="hero" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Create world
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(buildAuthRoute("/worlds?create=true"))}>
                  Sign in to host
                </Button>
              )}
            </div>
          </div>

          <aside className="border border-[#0e0e0f] bg-[#fbfaf8] p-5 md:p-6">
            {selectedWorld ? (
              <>
                <p className="board-rail-label text-[11px] text-[#525257]">Selected World</p>
                <h2 className="mt-4 text-[clamp(2rem,3vw,3rem)] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
                  {selectedWorld.name}
                </h2>
                <p className="mt-4 text-[17px] leading-8 text-[#525257]">
                  {selectedWorld.description || "Host-run venue with rooms, events, and live entry state."}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <StateTag>{selectedWorld.visibility}</StateTag>
                  <StateTag tone="success">{selectedWorld.ownerName}</StateTag>
                  <StateTag>{selectedWorld.instanceCount} live</StateTag>
                </div>

                <div className="mt-8">
                  <p className="font-['League_Spartan'] text-[68px] font-black leading-none tracking-[-0.06em] text-[#0e0e0f]">
                    {selectedWorld.memberCount + selectedWorld.instanceCount}
                  </p>
                  <p className="board-rail-label mt-2 text-[11px] text-[#525257]">
                    watchers + queued players
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <Button variant="hero" onClick={() => navigate(`/worlds/${selectedWorld.id}`)}>
                    Enter world
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/events")}>
                    View events
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/play")}>
                    Local practice
                  </Button>
                </div>
              </>
            ) : (
              <div className="retro-warning-strip">No world selected.</div>
            )}
          </aside>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="mt-10 retro-critical-strip">{loadError}</div>
        ) : orderedWorlds.length === 0 ? (
          <div className="mt-10 border border-[#0e0e0f] bg-[#fbfaf8] p-6">
            <p className="text-[18px] leading-8 text-[#525257]">
              No worlds are live yet. The first alpha world should belong to a real organizer.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4">
            {orderedWorlds.map((world) => {
              const selected = world.id === selectedWorldId;
              const stateLabel =
                world.visibility === "private" ? "PRIVATE" : world.userRole ? world.userRole.toUpperCase() : "OPEN";
              const countLabel =
                world.visibility === "private"
                  ? `${world.memberCount}`.padStart(2, "0")
                  : `${world.instanceCount}`.padStart(2, "0");

              return (
                <button
                  key={world.id}
                  onClick={() => setSelectedWorldId(world.id)}
                  className={`
                    grid gap-4 border px-4 py-4 text-left transition-colors duration-150 md:grid-cols-[minmax(0,1fr)_80px]
                    ${selected ? "border-[#0e0e0f] bg-[#efebe3]" : "border-[#0e0e0f]/16 bg-[#fbfaf8] hover:bg-[#efebe3]"}
                  `}
                >
                  <div>
                    <h2 className="text-[1.6rem] font-black leading-[0.96] tracking-[-0.05em] text-[#0e0e0f]">
                      {world.name}
                    </h2>
                    <p className="mt-2 text-[15px] leading-7 text-[#525257]">
                      {world.description ||
                        `${world.visibility === "public" ? "Public" : "Private"} venue with rooms, host controls, and event state.`}
                    </p>
                  </div>
                  <div className="border-l border-[#0e0e0f]/12 pl-4">
                    <p className="board-rail-label text-[11px] text-[#525257]">{stateLabel}</p>
                    <p className="mt-2 font-['League_Spartan'] text-[2.1rem] font-black leading-none tracking-[-0.05em] text-[#0e0e0f]">
                      {countLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {user && !isGuest ? (
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
