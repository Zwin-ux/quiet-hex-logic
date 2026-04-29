import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { CreateLobby } from "@/components/CreateLobby";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { LobbyCard } from "@/components/LobbyCard";
import {
  DecisionLane,
  SystemScreen,
  SystemSection,
  UtilityPill,
  UtilityStrip,
} from "@/components/board/SystemSurface";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { WebHandoffNotice } from "@/components/surfaces/WebSurfaceGate";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { buildAuthRoute } from "@/lib/authRedirect";
import { canManageWorld, joinWorld, loadWorldOverview, type WorldOverview } from "@/lib/worlds";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import { toast } from "sonner";

export default function WorldView() {
  useDocumentTitle("World");

  const { worldId } = useParams<{ worldId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest } = useGuestMode();
  const { isAuthoringSurface } = useSurfaceCapabilities();
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
      <SiteFrame visualMode="mono">
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
    <SiteFrame visualMode="mono" contentClassName="pb-16 pt-32 md:pt-28">
      <SystemScreen
        label="World"
        title={world.name}
        description={world.description || "Tables open. Finals live."}
        actions={
          <>
            <Button variant="ghost" className="border-0" onClick={() => navigate("/worlds")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {!canManage ? (
              <Button
                variant="hero"
                className="border-0"
                onClick={handleJoin}
                disabled={joining || Boolean(world.userRole)}
              >
                {joining ? "Joining..." : world.userRole ? "Already inside" : "Join world"}
              </Button>
            ) : null}
          </>
        }
      >
        <UtilityStrip>
          <UtilityPill strong>{world.visibility}</UtilityPill>
          <UtilityPill>{world.memberCount} members</UtilityPill>
          <UtilityPill>{world.hostCount ?? 1} hosts</UtilityPill>
          <UtilityPill>{world.instanceCount} tables</UtilityPill>
          <UtilityPill>{world.eventCount} events</UtilityPill>
          {!competitiveReady ? <UtilityPill strong>verify for ranked</UtilityPill> : null}
        </UtilityStrip>

        {canManage ? (
          <SystemSection
            label="Host"
            title={isAuthoringSurface ? "Run this venue" : "Run the live room"}
            description={
              isAuthoringSurface
                ? "Open rooms. Copy one invite. Queue the next event."
                : "Copy invites. Start live tables. Open web for deeper setup."
            }
            actions={
              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" className="border-0" onClick={copyInviteLink}>
                  {inviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {inviteCopied ? "Copied" : "Copy invite"}
                </Button>
                {isAuthoringSurface ? (
                  <Button variant="hero" className="border-0" onClick={() => setShowCreateTournament(true)}>
                    Create event
                  </Button>
                ) : null}
              </div>
            }
          >
            <UtilityStrip>
              <UtilityPill strong>{hasLiveSurfaces ? "live surfaces online" : "quiet venue"}</UtilityPill>
              <UtilityPill>{competitiveReady ? "ranked ready" : "verification pending"}</UtilityPill>
            </UtilityStrip>

            {shouldShowSetupRail ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {setupSteps.map((step, index) => (
                  <div key={step.label} className="system-section">
                    <UtilityStrip>
                      <UtilityPill>{String(index + 1).padStart(2, "0")}</UtilityPill>
                      <UtilityPill strong={step.done}>{step.done ? "done" : step.optional ? "optional" : "open"}</UtilityPill>
                    </UtilityStrip>
                    <p className="ops-directory-row__title">{step.label}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {hasCompetitiveEvent && !competitiveReady ? (
              <p className="system-inline-note">Competitive event locked until verification is complete.</p>
            ) : null}

            {!isAuthoringSurface ? (
              <WebHandoffNotice
                title="Venue setup stays on web."
                detail="Room creation, event setup, branding, and rules editing stay on the browser surface."
                to={`/worlds/${world.id}/settings`}
              />
            ) : null}

            {user && isAuthoringSurface ? <CreateLobby userId={user.id} worldId={world.id} /> : null}
          </SystemSection>
        ) : null}

        <SystemSection
          label="Rooms"
          title={lobbies.length ? `${lobbies.length} waiting room${lobbies.length === 1 ? "" : "s"}` : "No waiting rooms"}
          description="Choose one room when you are ready to enter."
        >
          {lobbies.length ? (
            <DecisionLane className="mt-1">
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
            </DecisionLane>
          ) : (
            <p className="system-empty">No rooms are waiting right now.</p>
          )}
        </SystemSection>

        {matches.length ? (
          <SystemSection label="Live boards" title={`${matches.length} active board${matches.length === 1 ? "" : "s"}`}>
            <DecisionLane>
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="decision-entry"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <UtilityPill strong>{match.allowSpectators ? "open" : "locked"}</UtilityPill>
                    <h3 className="ops-directory-row__title">{match.label ?? `${match.gameKey} live board`}</h3>
                  </div>
                  <p className="ops-directory-row__meta">
                    {match.size}x{match.size}. {match.allowSpectators ? "Spectators allowed." : "Players only."}
                  </p>
                </button>
              ))}
            </DecisionLane>
          </SystemSection>
        ) : null}

        <SystemSection
          label="Events"
          title={events.length ? `${events.length} queued event${events.length === 1 ? "" : "s"}` : "No queued events"}
          description="Open the current bracket only when the room matters."
        >
          {events.length ? (
            <DecisionLane>
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => navigate(`/tournament/${event.id}`)}
                  className="decision-entry"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <UtilityPill strong>{event.competitiveMode ? "competitive" : "casual"}</UtilityPill>
                    <h3 className="ops-directory-row__title">{event.name}</h3>
                  </div>
                  <p className="ops-directory-row__meta">
                    {event.description || `Starts ${event.status === "active" ? "now" : "soon"}. Open bracket.`}
                  </p>
                </button>
              ))}
            </DecisionLane>
          ) : (
            <p className="system-empty">
              {canManage ? "No events are queued yet." : "No rooms. No events. Host has not opened play."}
            </p>
          )}
        </SystemSection>
      </SystemScreen>

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
