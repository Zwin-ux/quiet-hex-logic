import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
  Loader2,
  Plus,
  RadioTower,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";
import { MetricLine } from "@/components/board/MetricLine";
import { Button } from "@/components/ui/button";
import { CreateLobby } from "@/components/CreateLobby";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { LobbyCard } from "@/components/LobbyCard";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { canManageWorld, joinWorld, loadWorldOverview, type WorldOverview } from "@/lib/worlds";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "sonner";

export default function WorldView() {
  useDocumentTitle("World");

  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [overview, setOverview] = useState<WorldOverview | null>(null);

  const load = async () => {
    if (!worldId) return;

    setLoading(true);

    try {
      const nextOverview = await loadWorldOverview(worldId, user?.id);
      setOverview(nextOverview);
    } catch (error: any) {
      toast.error("Failed to load world", {
        description: error?.message ?? "Please try again.",
      });
      navigate("/worlds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [worldId, user?.id]);

  if (loading || !overview) {
    return (
      <SiteFrame>
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  const { world, events, lobbies, matches } = overview;
  const canManage = canManageWorld(world);

  const handleJoin = async () => {
    if (!worldId) return;

    if (!user || isGuest) {
      navigate("/auth");
      return;
    }

    setJoining(true);

    try {
      await joinWorld(worldId, user.id);
      toast.success("Joined world");
      await load();
    } catch (error: any) {
      toast.error("Failed to join world", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <SiteFrame>
      <button
        onClick={() => navigate("/worlds")}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to worlds
      </button>

      <SectionRail
        eyebrow="World"
        title={world.name}
        description={
          <>
            {world.description || "No description yet."} Hosted by {world.ownerName}.
          </>
        }
        meta={
          <>
            <span className="board-meta-chip">visibility / {world.visibility}</span>
            <span className="board-meta-chip">host / {world.ownerName}</span>
            {world.userRole ? <span className="board-meta-chip">role / {world.userRole}</span> : null}
          </>
        }
        actions={
          canManage ? (
            <Button onClick={() => setShowCreateTournament(true)}>
              <Plus className="h-4 w-4" />
              Create event
            </Button>
          ) : (
            <Button onClick={handleJoin} disabled={joining || Boolean(world.userRole)}>
              {joining ? "Joining..." : world.userRole ? "Already inside" : "Join world"}
            </Button>
          )
        }
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <VenuePanel eyebrow="World telemetry" title="Venue status">
            <MetricLine icon={Users} label="Members" value={world.memberCount} />
            <MetricLine icon={CalendarRange} label="Events" value={world.eventCount} />
            <MetricLine icon={RadioTower} label="Instances" value={world.instanceCount} />
          </VenuePanel>

          <VenuePanel
            eyebrow="Events"
            title="Organizer layer"
            description="Competitions staged under this world inherit its host identity instead of floating as disconnected pages."
          >
            {events.length === 0 ? (
              <div className="board-ledger pt-4 text-sm leading-7 text-muted-foreground">
                No events yet. The next serious step is attaching the first recurring competition to this venue.
              </div>
            ) : (
              <div className="board-ledger mt-2">
                {events.map((event, index) => (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/tournament/${event.id}`)}
                    className="board-ledger-row w-full text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[56px_minmax(0,1fr)_170px]"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="board-meta-stack mb-3">
                        <span className="board-meta-chip">status / {event.status}</span>
                        <span className="board-meta-chip">format / {event.format.replace(/_/g, " ")}</span>
                      </div>
                      <h3 className="board-section-title text-foreground">
                        {event.name}
                      </h3>
                      {event.description ? (
                        <p className="board-copy mt-4">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 border-l border-black/10 pl-4">
                      <MetricLine label="Players" value={`${event.participantCount}/${event.maxPlayers}`} />
                      <MetricLine label="Format" value={event.format.replace(/_/g, " ")} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </VenuePanel>
        </div>

        <div className="space-y-6">
          {canManage ? (
            <CreateLobby userId={user!.id} worldId={world.id} />
          ) : (
            <VenuePanel
              eyebrow="Organizer controls"
              title="World admins stage the live system."
              description="Room and event creation stay tied to the world owner or admins so recurring venues do not dissolve into global clutter."
            >
              <MetricLine icon={ShieldCheck} label="Host control" value="world scoped" />
            </VenuePanel>
          )}

          <VenuePanel
            eyebrow="Instances"
            title="Live rooms"
            description="Rooms and linked matches are the objects that make this world feel occupied."
          >
            {lobbies.length === 0 && matches.length === 0 ? (
              <div className="board-ledger pt-4 text-sm leading-7 text-muted-foreground">
                No live instances yet. Create a room here or wait for a linked match to go live.
              </div>
            ) : null}

            {lobbies.length > 0 ? (
              <div className="mt-2 space-y-3">
                {lobbies.map((lobby) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={{
                      id: lobby.id,
                      code: lobby.code,
                      host_id: lobby.hostId,
                      game_key: lobby.gameKey,
                      board_size: lobby.boardSize,
                      pie_rule: lobby.pieRule,
                      created_at: lobby.createdAt,
                      profiles: { username: lobby.hostUsername },
                    }}
                    playerCount={lobby.playerCount}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            ) : null}

            {matches.length > 0 ? (
              <div className="board-ledger mt-4">
                {matches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/match/${match.id}`)}
                    className="board-ledger-row w-full text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[minmax(0,1fr)_160px]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <Swords className="h-4 w-4 text-foreground" />
                        <p className="text-lg font-bold tracking-[-0.04em] text-foreground">
                          {match.gameKey} match
                        </p>
                      </div>
                      <p className="board-copy mt-3">
                        Active now. Board size {match.size}. {match.allowSpectators ? "Spectators allowed." : "Player access only."}
                      </p>
                    </div>
                    <div className="space-y-1 border-l border-black/10 pl-4">
                      <MetricLine label="Status" value="active" />
                      <MetricLine label="Access" value={match.allowSpectators ? "watch" : "open"} />
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </VenuePanel>
        </div>
      </div>

      {canManage ? (
        <CreateTournamentDialog
          open={showCreateTournament}
          onClose={() => setShowCreateTournament(false)}
          onSuccess={async () => {
            setShowCreateTournament(false);
            await load();
          }}
          worldId={world.id}
        />
      ) : null}
    </SiteFrame>
  );
}
