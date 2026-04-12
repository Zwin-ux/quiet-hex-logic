import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { Button } from "@/components/ui/button";
import { CreateLobby } from "@/components/CreateLobby";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { LobbyCard } from "@/components/LobbyCard";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { canManageWorld, joinWorld, loadWorldOverview, type WorldOverview } from "@/lib/worlds";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { buildAuthRoute } from "@/lib/authRedirect";
import { toast } from "sonner";

export default function WorldView() {
  useDocumentTitle("World");

  const { worldId } = useParams<{ worldId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
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
  const setupMode = searchParams.get("setup") === "1";
  const hasLiveSurfaces = lobbies.length > 0 || matches.length > 0 || events.length > 0;

  const copyInviteLink = async () => {
    if (typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/worlds/${world.id}`);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
      toast.success("Invite link copied", {
        description: "Send this world link to members and spectators.",
      });
    } catch (error: any) {
      toast.error("Failed to copy invite link", {
        description: error?.message ?? "Clipboard access was unavailable.",
      });
    }
  };

  const handleJoin = async () => {
    if (!worldId) return;

    if (!user || isGuest) {
      navigate(buildAuthRoute(`/worlds/${worldId}`));
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
      <div className="board-page-width mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/worlds")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to worlds
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <StateTag>{world.visibility}</StateTag>
          <StateTag tone="success">Host online</StateTag>
          <StateTag>{world.instanceCount} live tables</StateTag>
          <StateTag>{world.eventCount} events queued</StateTag>
        </div>

        <h1 className="mt-8 max-w-[620px] text-[clamp(3rem,5vw,4.6rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#0e0e0f]">
          {world.name}
        </h1>
        <p className="mt-5 max-w-[620px] text-[18px] leading-8 text-[#525257]">
          {world.description || "Public host-run venue with active rooms, queued events, and live spectator traffic."}
        </p>

        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
          <div>
            <div className="space-y-4">
              {canManage && !hasLiveSurfaces ? (
                <section className="border border-[#0e0e0f] bg-[#fbfaf8] p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <StateTag tone="warning">{setupMode ? "setup mode" : "first world"}</StateTag>
                    <StateTag>no live surfaces yet</StateTag>
                  </div>
                  <h2 className="mt-5 text-[2rem] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
                    Stage the first room before inviting people in.
                  </h2>
                  <p className="mt-4 max-w-[620px] text-[16px] leading-8 text-[#525257]">
                    A strong first hosted flow is: open one room, copy the world link, then queue the first event once the room is working.
                  </p>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="border border-[#0e0e0f]/12 bg-white px-4 py-4">
                      <p className="board-rail-label text-[11px] text-[#525257]">01</p>
                      <p className="mt-2 text-[15px] font-semibold leading-7 text-[#0e0e0f]">Create the first room</p>
                    </div>
                    <div className="border border-[#0e0e0f]/12 bg-white px-4 py-4">
                      <p className="board-rail-label text-[11px] text-[#525257]">02</p>
                      <p className="mt-2 text-[15px] font-semibold leading-7 text-[#0e0e0f]">Copy the invite link</p>
                    </div>
                    <div className="border border-[#0e0e0f]/12 bg-white px-4 py-4">
                      <p className="board-rail-label text-[11px] text-[#525257]">03</p>
                      <p className="mt-2 text-[15px] font-semibold leading-7 text-[#0e0e0f]">Queue the first event</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <CreateLobby userId={user!.id} worldId={world.id} />
                  </div>
                </section>
              ) : null}

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

              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="grid w-full gap-4 border border-[#0e0e0f]/16 bg-[#fbfaf8] px-4 py-4 text-left transition-colors duration-150 hover:bg-[#efebe3] md:grid-cols-[minmax(0,1fr)_72px]"
                >
                  <div>
                    <h2 className="text-[1.6rem] font-black leading-[0.96] tracking-[-0.05em] text-[#0e0e0f]">
                      {match.label ?? `${match.gameKey} match`}
                    </h2>
                    <p className="mt-2 text-[15px] leading-7 text-[#525257]">
                      Live now. {match.size}x{match.size}. {match.allowSpectators ? "8 watching" : "players only"}.
                    </p>
                  </div>
                  <div className="border-l border-[#0e0e0f]/12 pl-4">
                    <p className="board-rail-label text-[11px] text-[#525257]">LIVE</p>
                    <p className="mt-2 font-['League_Spartan'] text-[2.1rem] font-black leading-none tracking-[-0.05em] text-[#0e0e0f]">
                      {match.allowSpectators ? "08" : "03"}
                    </p>
                  </div>
                </button>
              ))}

              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => navigate(`/tournament/${event.id}`)}
                  className="grid w-full gap-4 border border-[#0e0e0f]/16 bg-[#fbfaf8] px-4 py-4 text-left transition-colors duration-150 hover:bg-[#efebe3] md:grid-cols-[minmax(0,1fr)_72px]"
                >
                  <div>
                    <h2 className="text-[1.6rem] font-black leading-[0.96] tracking-[-0.05em] text-[#0e0e0f]">
                      {event.name}
                    </h2>
                    <p className="mt-2 text-[15px] leading-7 text-[#525257]">
                      {event.description || `Starts in ${event.status === "active" ? "now" : "18 minutes"} — seeded from the active bracket.`}
                    </p>
                  </div>
                  <div className="border-l border-[#0e0e0f]/12 pl-4">
                    <p className="board-rail-label text-[11px] text-[#525257]">
                      {event.status.toUpperCase()}
                    </p>
                    <p className="mt-2 font-['League_Spartan'] text-[2.1rem] font-black leading-none tracking-[-0.05em] text-[#0e0e0f]">
                      {String(event.participantCount).padStart(2, "0")}
                    </p>
                  </div>
                </button>
              ))}

              {!canManage && !hasLiveSurfaces ? (
                <div className="border border-[#0e0e0f] bg-[#fbfaf8] p-6">
                  <p className="text-[16px] leading-7 text-[#525257]">
                    No live rooms or events are open yet. This world exists, but the host has not staged the first surface.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="border border-[#0e0e0f] bg-[#fbfaf8] p-5 md:p-6">
            <p className="board-rail-label text-[11px] text-[#525257]">Operator Rail</p>
            <h2 className="mt-4 text-[2rem] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
              {canManage ? "Host verified" : "World access"}
            </h2>
            <p className="mt-4 text-[16px] leading-8 text-[#525257]">
              {canManage
                ? "Use this rail for occupancy, moderation state, and entry actions."
                : "Join this world to enter hosted rooms and events."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="retro-status-strip">
                <span>members {world.memberCount}</span>
                <span>hosts {world.hostCount ?? 1}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {canManage ? (
                <>
                  {!hasLiveSurfaces ? null : <CreateLobby userId={user!.id} worldId={world.id} />}
                  <Button variant="outline" onClick={() => setShowCreateTournament(true)}>
                    Create event
                  </Button>
                  <Button variant="outline" onClick={copyInviteLink}>
                    {inviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {inviteCopied ? "Invite link copied" : "Copy invite link"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="hero"
                  onClick={handleJoin}
                  disabled={joining || Boolean(world.userRole)}
                >
                  {joining ? "Joining..." : world.userRole ? "Already inside" : "Join world"}
                </Button>
              )}
            </div>

            <div className="mt-10">
              <p className="font-['League_Spartan'] text-[68px] font-black leading-none tracking-[-0.06em] text-[#0e0e0f]">
                {world.instanceCount}
              </p>
              <p className="board-rail-label mt-2 text-[11px] text-[#525257]">
                active surfaces
              </p>
            </div>
          </aside>
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
