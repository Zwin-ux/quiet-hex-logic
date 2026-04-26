import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { CreateWorldDialog } from "@/components/CreateWorldDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import { listWorlds, type WorldSummary } from "@/lib/worlds";
import { buildAuthRoute } from "@/lib/authRedirect";
import { toast } from "sonner";

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
  const heroTitle = isAuthoringSurface
    ? "Pick a world. See the room map before you enter."
    : "Pick a room. Jump in when a table opens.";
  const heroDescription = isAuthoringSurface
    ? "Each world shows who is hosting, what is live, and whether it is worth joining."
    : "Worlds show which tables are live, which brackets are running, and where to jump in.";

  return (
    <SiteFrame>
      <div className="board-page-width mx-auto">
        <div
          className={`grid gap-6 ${orderedWorlds.length > 0 ? "xl:grid-cols-[minmax(0,1fr)_318px] xl:items-start" : ""}`}
        >
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StateTag>World Directory</StateTag>
              <div className="retro-status-strip">
                <span>{orderedWorlds.length} worlds</span>
                <span>{publicCount} public</span>
                <span>{joinedCount} joined</span>
              </div>
            </div>

            <h1 className="mt-8 max-w-[560px] text-[clamp(3rem,6vw,5.1rem)] font-black leading-[0.9] tracking-[-0.06em] text-[#0e0e0f]">
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-[470px] text-[18px] leading-8 text-[#525257]">
              {heroDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {user && !isGuest && isAuthoringSurface ? (
                <Button variant="hero" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Create world
                </Button>
              ) : user && !isGuest ? (
                <Button variant="outline" onClick={() => navigate("/play")}>
                  Open play
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(buildAuthRoute(isAuthoringSurface ? "/worlds?create=true" : "/play"))
                  }
                >
                  {isAuthoringSurface ? "Sign in to host" : "Enter to play"}
                </Button>
              )}
            </div>
          </div>

          {orderedWorlds.length > 0 ? (
            <aside className="border border-[#0e0e0f] bg-[#fbfaf8] p-5 md:p-6">
              {selectedWorld ? (
                <>
                  <p className="board-rail-label text-[11px] text-[#525257]">Selected World</p>
                  <h2 className="mt-4 text-[clamp(2rem,3vw,3rem)] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
                    {selectedWorld.name}
                  </h2>
                  <p className="mt-4 text-[17px] leading-8 text-[#525257]">
                    {selectedWorld.description || "Rooms, events, and live finals in one place."}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <StateTag>{selectedWorld.visibility}</StateTag>
                    <StateTag tone="success">{selectedWorld.ownerName}</StateTag>
                    <StateTag>{selectedWorld.instanceCount} live</StateTag>
                  </div>

                  <div className="mt-8">
                    <p className="text-[68px] font-extrabold leading-none tracking-[-0.08em] text-[#0e0e0f]">
                      {selectedWorld.memberCount + selectedWorld.instanceCount}
                    </p>
                    <p className="board-rail-label mt-2 text-[11px] text-[#525257]">
                      members + live tables
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
              ) : null}
            </aside>
          ) : null}
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
              {isAuthoringSurface
                ? "No worlds live yet. Create the first host space."
                : "No worlds live yet. Open quickplay or check back when a room goes live."}
            </p>
            {!isAuthoringSurface ? (
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate("/play")}>
                  Open play
                </Button>
              </div>
            ) : null}
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
                        `${world.visibility === "public" ? "Public" : "Private"} room map with host, room, and event state.`}
                    </p>
                  </div>
                  <div className="border-l border-[#0e0e0f]/12 pl-4">
                    <p className="board-rail-label text-[11px] text-[#525257]">{stateLabel}</p>
                    <p className="mt-2 text-[2.1rem] font-extrabold leading-none tracking-[-0.07em] text-[#0e0e0f]">
                      {countLabel}
                    </p>
                  </div>
                </button>
              );
            })}
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
