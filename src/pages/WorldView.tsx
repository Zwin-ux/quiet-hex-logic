import { useCallback, useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
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
  const [viewerIsVerifiedHuman, setViewerIsVerifiedHuman] = useState(false);

  const load = useCallback(async () => {
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
  }, [navigate, user?.id, worldId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    const loadVerificationState = async () => {
      if (!user?.id) {
        setViewerIsVerifiedHuman(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("is_verified_human")
        .eq("id", user.id)
        .single();

      if (!cancelled) {
        setViewerIsVerifiedHuman(Boolean(data?.is_verified_human));
      }
    };

    void loadVerificationState();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
  const canManage = Boolean(user?.id) && canManageWorld(world);
  const setupMode = searchParams.get("setup") === "1";
  const hasLiveSurfaces = lobbies.length > 0 || matches.length > 0 || events.length > 0;
  const hasCompetitiveEvent = events.some((event) => event.competitiveMode);
  const competitiveReady = !hasCompetitiveEvent || viewerIsVerifiedHuman;
  const shouldShowSetupRail =
    canManage &&
    setupMode &&
    (lobbies.length === 0 || events.length === 0 || (hasCompetitiveEvent && !competitiveReady));
  const setupSteps = [
    { label: "Create the first room", done: lobbies.length > 0 },
    { label: "Copy the invite link", done: inviteCopied },
    { label: "Queue the first event", done: events.length > 0 },
    { label: "Competitive-ready", done: competitiveReady, optional: true },
  ];

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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_318px] xl:items-start">
          <section className="border border-[#090909] bg-[#090909] px-6 py-6 text-[#f3efe6] md:px-8 md:py-8">
            <div className="flex flex-wrap gap-2">
              <StateTag>{world.visibility}</StateTag>
              <StateTag tone="success">{world.hostCount ?? 1} host{(world.hostCount ?? 1) === 1 ? "" : "s"}</StateTag>
              <StateTag>{world.instanceCount} tables</StateTag>
              <StateTag>{world.eventCount} events</StateTag>
            </div>

            <h1 className="mt-8 max-w-[620px] text-[clamp(3rem,5vw,4.8rem)] font-black leading-[0.9] tracking-[-0.07em] text-[#f3efe6]">
              {world.name}
            </h1>
            <p className="mt-5 max-w-[32rem] text-[17px] leading-8 text-white/72">
              {world.description || "Tables open. Finals live."}
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="border border-white/12 px-4 py-4">
                <p className="board-rail-label text-white/56">host</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-[#f3efe6]">
                  Open rooms. Start events.
                </p>
              </div>
              <div className="border border-white/12 px-4 py-4">
                <p className="board-rail-label text-white/56">watch</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-[#f3efe6]">
                  Follow live tables and finals.
                </p>
              </div>
              <div className="border border-white/12 px-4 py-4">
                <p className="board-rail-label text-white/56">ranked</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-[#f3efe6]">
                  {competitiveReady ? "Ready now." : "Verify before entry."}
                </p>
              </div>
            </div>
          </section>

          <aside className="border border-black bg-[#fbfaf8] p-5 md:p-6">
            <p className="board-rail-label text-[11px] text-[#525257]">Host tools</p>
            <h2 className="mt-4 text-[2rem] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
              {canManage ? "Run this room map" : "Enter this room map"}
            </h2>
            <p className="mt-4 text-[16px] leading-8 text-[#525257]">
              {canManage
                ? "Open rooms. Queue matches. Copy one invite."
                : "Join to enter tables and brackets."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="retro-status-strip">
                <span>members {world.memberCount}</span>
                <span>hosts {world.hostCount ?? 1}</span>
                <span>{competitiveReady ? "ranked ready" : "verify for ranked"}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {canManage ? (
                <>
                  {!hasLiveSurfaces || !user ? null : <CreateLobby userId={user.id} worldId={world.id} />}
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
              <p className="text-[68px] font-extrabold leading-none tracking-[-0.08em] text-[#0e0e0f]">
                {world.instanceCount}
              </p>
              <p className="board-rail-label mt-2 text-[11px] text-[#525257]">
                open tables
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_318px]">
          <div>
            <div className="space-y-4">
              {shouldShowSetupRail ? (
                <section className="border border-[#0e0e0f] bg-[#fbfaf8] p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <StateTag tone="warning">{setupMode ? "setup mode" : "first world"}</StateTag>
                    <StateTag>{lobbies.length === 0 ? "no rooms yet" : "next steps"}</StateTag>
                  </div>
                  <h2 className="mt-5 text-[2rem] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
                    Open tables. Queue first event.
                  </h2>
                  <p className="mt-4 max-w-[620px] text-[16px] leading-8 text-[#525257]">
                    Create room. Copy link. Queue event.
                  </p>

                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {setupSteps.map((step, index) => (
                      <div key={step.label} className="border border-[#0e0e0f]/12 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="board-rail-label text-[11px] text-[#525257]">
                            {String(index + 1).padStart(2, "0")}
                          </p>
                          <StateTag tone={step.done ? "success" : step.optional ? "warning" : "normal"}>
                            {step.done ? "done" : step.optional ? "optional" : "open"}
                          </StateTag>
                        </div>
                        <p className="mt-2 text-[15px] font-semibold leading-7 text-[#0e0e0f]">{step.label}</p>
                      </div>
                    ))}
                  </div>

                  {hasCompetitiveEvent && !competitiveReady ? (
                    <div className="mt-6 retro-warning-strip">
                      Competitive event locked. Verify first.
                    </div>
                  ) : null}

                  {user ? (
                    <div className="mt-8">
                      <CreateLobby userId={user.id} worldId={world.id} />
                    </div>
                  ) : null}
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
                      Live now. {match.size}x{match.size}. {match.allowSpectators ? "Spectators allowed." : "Players only."}
                    </p>
                  </div>
                  <div className="border-l border-[#0e0e0f]/12 pl-4">
                    <p className="board-rail-label text-[11px] text-[#525257]">LIVE</p>
                    <p className="mt-2 text-[2.1rem] font-extrabold leading-none tracking-[-0.07em] text-[#0e0e0f]">
                      {match.allowSpectators ? "OPEN" : "LOCK"}
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StateTag tone={event.competitiveMode ? "warning" : "normal"}>
                        {event.competitiveMode ? "competitive" : "casual"}
                      </StateTag>
                    </div>
                    <p className="mt-2 text-[15px] leading-7 text-[#525257]">
                      {event.description || `Starts ${event.status === "active" ? "now" : "soon"}. Open bracket.`}
                    </p>
                  </div>
                  <div className="border-l border-[#0e0e0f]/12 pl-4">
                    <p className="board-rail-label text-[11px] text-[#525257]">
                      {event.status.toUpperCase()}
                    </p>
                    <p className="mt-2 text-[2.1rem] font-extrabold leading-none tracking-[-0.07em] text-[#0e0e0f]">
                      {String(event.participantCount).padStart(2, "0")}
                    </p>
                  </div>
                </button>
              ))}

              {!canManage && !hasLiveSurfaces ? (
                <div className="border border-[#0e0e0f] bg-[#fbfaf8] p-6">
                  <p className="text-[16px] leading-7 text-[#525257]">
                    No rooms. No events. Host has not opened play.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-[#0e0e0f] bg-[#fbfaf8] p-5">
              <p className="board-rail-label text-[11px] text-[#525257]">Room count</p>
              <p className="mt-4 text-[68px] font-extrabold leading-none tracking-[-0.08em] text-[#0e0e0f]">
                {world.instanceCount}
              </p>
              <p className="board-rail-label mt-2 text-[11px] text-[#525257]">open tables</p>
            </div>

            <div className="border border-[#0e0e0f] bg-[#fbfaf8] p-5">
              <p className="board-rail-label text-[11px] text-[#525257]">Event count</p>
              <p className="mt-4 text-[68px] font-extrabold leading-none tracking-[-0.08em] text-[#0e0e0f]">
                {world.eventCount}
              </p>
              <p className="board-rail-label mt-2 text-[11px] text-[#525257]">events queued</p>
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
