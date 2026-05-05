import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Play, Trophy, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSolanaCompetitive } from "@/hooks/useSolanaCompetitive";
import { useWorldAppAuth } from "@/hooks/useWorldAppAuth";
import { SiteFrame } from "@/components/board/SiteFrame";
import {
  DecisionEntry,
  DecisionEntryFocus,
  DecisionLane,
  SystemScreen,
  SystemSection,
  UtilityPill,
  UtilityStrip,
} from "@/components/board/SystemSurface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { BracketVisualization } from "@/components/BracketVisualization";
import { hasIssuedTournamentPass } from "@/lib/competitiveIdentity";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import { loadWorldQuickplayState } from "@/lib/worldApp/quickplay";
import { toast } from "sonner";

interface Tournament {
  id: string;
  world_id?: string | null;
  mod_version_id?: string | null;
  name: string;
  description: string | null;
  format: string;
  competitive_mode: boolean;
  status: string;
  max_players: number;
  min_players: number;
  board_size: number;
  pie_rule: boolean;
  turn_timer_seconds: number;
  registration_url?: string | null;
  access_type?: "public" | "world_members" | "access_code" | "pass_required";
  created_by: string;
  created_at: string;
}

interface Participant {
  player_id: string;
  seed: number | null;
  status: string;
  wins: number;
  losses: number;
  profiles: {
    username: string;
    avatar_color: string;
  };
}

export default function TournamentView() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWeb, isWorld } = useSurfaceCapabilities();
  const worldAuth = useWorldAppAuth();
  const bracketRef = useRef<HTMLDivElement | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [worldContext, setWorldContext] = useState<{ id: string; name: string } | null>(null);
  const [variantLabel, setVariantLabel] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [viewerIsVerifiedHuman, setViewerIsVerifiedHuman] = useState(false);
  const [competitiveJoinBlocked, setCompetitiveJoinBlocked] = useState<string | null>(null);
  const [competitiveIdentity, setCompetitiveIdentity] = useState<Awaited<ReturnType<typeof loadWorldQuickplayState>>["competitiveIdentity"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const refreshCompetitiveIdentity = useCallback(async () => {
    const currentSession = worldAuth.supabaseSession ?? (await supabase.auth.getSession()).data.session;
    if (!currentSession) {
      setCompetitiveIdentity(null);
      return null;
    }

    const state = await loadWorldQuickplayState(currentSession);
    setCompetitiveIdentity(state.competitiveIdentity ?? null);
    return state.competitiveIdentity ?? null;
  }, [worldAuth.supabaseSession]);

  const solanaCompetitive = useSolanaCompetitive(worldAuth.supabaseSession, (response) => {
    setCompetitiveIdentity(response.competitiveIdentity);
    void refreshCompetitiveIdentity();
  });

  const loadTournament = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);
      setCompetitiveJoinBlocked(null);

      if ((tournamentData as any)?.world_id) {
        const { data: world } = await (supabase as any)
          .from("worlds")
          .select("id, name")
          .eq("id", (tournamentData as any).world_id)
          .maybeSingle();

        if (world?.id) {
          setWorldContext({ id: world.id, name: world.name });
        } else {
          setWorldContext(null);
        }
      } else {
        setWorldContext(null);
      }

      if ((tournamentData as any)?.mod_version_id) {
        const { data: variantData } = await (supabase as any)
          .from("workshop_mod_versions")
          .select("id, workshop_mods!inner(name)")
          .eq("id", (tournamentData as any).mod_version_id)
          .maybeSingle();

        setVariantLabel((variantData as any)?.workshop_mods?.name ?? "Variant");
      } else {
        setVariantLabel(null);
      }

      const { data: participantsData, error: participantsError } = await supabase
        .from("tournament_participants")
        .select(
          `
          *,
          profiles:player_id(username, avatar_color)
        `,
        )
        .eq("tournament_id", tournamentId)
        .order("seed", { ascending: true, nullsFirst: false });

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);
    } catch (error) {
      console.error("Failed to load tournament:", error);
      toast.error("Failed to load event");
      navigate("/events");
    } finally {
      setLoading(false);
    }
  }, [navigate, tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;

    void loadTournament();

    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        () => {
          void loadTournament();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_participants",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          void loadTournament();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTournament, tournamentId]);

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

  useEffect(() => {
    void refreshCompetitiveIdentity();
  }, [refreshCompetitiveIdentity]);

  const ensureWorldSeat = useCallback(async () => {
    if (worldAuth.isWalletBound) return true;
    await worldAuth.connectWallet();
    await worldAuth.reloadIdentity();
    await refreshCompetitiveIdentity();
    return true;
  }, [refreshCompetitiveIdentity, worldAuth]);

  const handleJoin = async () => {
    if (!tournamentId) return;
    setActionLoading(true);

    try {
      if (tournament?.access_type === "pass_required") {
        await ensureWorldSeat();
      }

      const { data, error } = await supabase.functions.invoke("join-tournament", {
        body: { tournamentId, accessCode: accessCode.trim() || null },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Joined event");
      await loadTournament();
    } catch (error: any) {
      if (/human verification/i.test(error.message || "")) {
        setCompetitiveJoinBlocked(error.message);
        return;
      }

      toast.error("Failed to join event", {
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!tournamentId) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("leave-tournament", {
        body: { tournamentId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Left event");
      await loadTournament();
    } catch (error: any) {
      toast.error("Failed to leave event", {
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    if (!tournamentId) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("start-tournament", {
        body: { tournamentId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Event started", {
        description: "Bracket generated.",
      });
      await loadTournament();
    } catch (error: any) {
      toast.error("Failed to start event", {
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const decisionLabel = tournament
    ? tournament.status === "registration"
      ? participants.length < tournament.min_players
        ? `Need ${tournament.min_players - participants.length} more player${tournament.min_players - participants.length === 1 ? "" : "s"}.`
        : `${participants.length} players ready.`
      : "Bracket is running. Open the current state."
    : "";

  if (loading || !tournament) {
    return (
      <SiteFrame visualMode="world">
        <div className="flex min-h-[420px] items-center justify-center">
          <Trophy className="h-10 w-10 animate-gentle-pulse text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  const isParticipant = participants.some((p) => p.player_id === user?.id);
  const isCreator = tournament.created_by === user?.id;
  const isPassRequiredEvent = tournament.access_type === "pass_required";
  const linkedSolanaWallet = competitiveIdentity?.linkedWallet ?? null;
  const roomPasses = competitiveIdentity?.roomPasses ?? [];
  const tournamentEntries = competitiveIdentity?.tournamentEntries ?? [];
  const activeTournamentEntry = tournamentEntries.find((entry) => entry.tournamentId === tournament.id) ?? null;
  const hasTournamentPass = hasIssuedTournamentPass(roomPasses, tournament.id);
  const canStart =
    isCreator &&
    tournament.status === "registration" &&
    participants.length >= tournament.min_players;
  const canJoin =
    user &&
    !isParticipant &&
    tournament.status === "registration" &&
    participants.length < tournament.max_players &&
    !(tournament.competitive_mode && !viewerIsVerifiedHuman) &&
    (!isPassRequiredEvent || hasTournamentPass) &&
    (tournament.access_type !== "access_code" || Boolean(accessCode.trim()));
  const canLeave =
    user &&
    isParticipant &&
    tournament.status === "registration" &&
    !isCreator;
  const shouldShowCompetitiveGate =
    tournament.competitive_mode && Boolean(user) && !viewerIsVerifiedHuman;
  const shouldShowPassGate =
    isPassRequiredEvent &&
    tournament.status === "registration" &&
    (!worldAuth.isWalletBound || !linkedSolanaWallet || !hasTournamentPass);
  const seatsLabel = `${participants.length}/${tournament.max_players} seats`;
  const phaseLabel = tournament.status === "registration" ? "join open" : "bracket live";

  const linkSolanaWallet = async () => {
    try {
      await ensureWorldSeat();
      await solanaCompetitive.connectWallet();
      toast.success("Solana wallet linked");
    } catch (error: any) {
      toast.error("Could not link Solana wallet", {
        description: error?.message || "Try again.",
      });
    }
  };

  const activateEventPass = async () => {
    if (!tournamentId) return;

    try {
      await ensureWorldSeat();
      await solanaCompetitive.activateEventPass(tournamentId, (tournament as any).game_key ?? null);
      toast.success("Event pass active");
      await refreshCompetitiveIdentity();
    } catch (error: any) {
      toast.error("Could not activate event pass", {
        description: error?.message || "Try again.",
      });
    }
  };

  const openBracket = () => {
    bracketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SiteFrame visualMode="world" contentClassName="pb-16 pt-32 md:pt-28">
      <SystemScreen
        variant="world"
        label="Event"
        title={tournament.name}
        description={
          tournament.description ||
          (isPassRequiredEvent ? "Pass-gated competitive bracket." : tournament.competitive_mode ? "Competitive bracket." : "Open bracket.")
        }
        actions={
          <>
            <Button
              variant="ghost"
              className="border-0"
              onClick={() => navigate(worldContext ? `/worlds/${worldContext.id}` : "/events")}
            >
              <ArrowLeft className="h-4 w-4" />
              {worldContext ? `Back to ${worldContext.name}` : "Back to events"}
            </Button>
            {tournament.status !== "registration" ? (
              <Button variant="hero" className="border-0" onClick={openBracket}>
                Open bracket
              </Button>
            ) : null}
          </>
        }
      >
        <UtilityStrip>
          <UtilityPill strong>{tournament.status}</UtilityPill>
          <UtilityPill>{tournament.competitive_mode ? "competitive" : "casual"}</UtilityPill>
          <UtilityPill>{tournament.format === "single_elimination" ? "single elim" : "round robin"}</UtilityPill>
          <UtilityPill>{seatsLabel}</UtilityPill>
          <UtilityPill>
            {tournament.access_type === "world_members"
              ? "members"
              : tournament.access_type === "access_code"
                ? "code"
                : tournament.access_type === "pass_required"
                  ? "pass required"
                : "public"}
          </UtilityPill>
          {variantLabel ? <UtilityPill>{variantLabel}</UtilityPill> : null}
        </UtilityStrip>

        {shouldShowPassGate ? (
          <SystemSection
            variant="world"
            label="Competitive access"
            title={
              !worldAuth.isWalletBound
                ? "Bind your human seat."
                : !linkedSolanaWallet
                  ? "Link Solana wallet."
                  : "Activate event pass."
            }
            description={
              !worldAuth.isWalletBound
                ? "Pass-gated events require a bound World wallet first."
                : !linkedSolanaWallet
                  ? "This event uses wallet-backed entry and sealed match history."
                  : "Activate the event pass before you join the bracket."
            }
            actions={
              !worldAuth.isWalletBound ? (
                <Button variant="hero" className="border-0" onClick={() => void ensureWorldSeat()}>
                  Bind World wallet
                </Button>
              ) : !linkedSolanaWallet ? (
                <Button
                  variant="hero"
                  className="border-0"
                  onClick={() => void linkSolanaWallet()}
                  disabled={solanaCompetitive.action !== null}
                >
                  Link Solana wallet
                </Button>
              ) : (
                <Button
                  variant="hero"
                  className="border-0"
                  onClick={() => void activateEventPass()}
                  disabled={solanaCompetitive.action !== null || hasTournamentPass}
                >
                  {hasTournamentPass ? "Event pass active" : "Activate event pass"}
                </Button>
              )
            }
          >
            <UtilityStrip>
              <UtilityPill strong>{worldAuth.isWalletBound ? "human proof ready" : "human proof needed"}</UtilityPill>
              <UtilityPill>{linkedSolanaWallet ? "wallet linked" : "wallet needed"}</UtilityPill>
              <UtilityPill>{hasTournamentPass ? "pass ready" : "pass needed"}</UtilityPill>
              {activeTournamentEntry ? <UtilityPill>{activeTournamentEntry.status}</UtilityPill> : null}
            </UtilityStrip>
            {!isWorld ? (
              <p className="system-inline-note">
                The cleanest path for pass-gated entry is inside the World surface where wallet bind and human proof are already in flow.
              </p>
            ) : null}
            {solanaCompetitive.error ? <p className="system-inline-note">{solanaCompetitive.error}</p> : null}
          </SystemSection>
        ) : null}

        {shouldShowCompetitiveGate ? (
          <SystemSection
            variant="world"
            label="Competitive gate"
            title="Verify before you join."
            description={competitiveJoinBlocked || "World ID required for ranked entry."}
            actions={
              <Button variant="hero" className="border-0" onClick={() => navigate("/profile#identity")}>
                <AlertCircle className="h-4 w-4" />
                Open trust settings
              </Button>
            }
          />
        ) : null}

        <SystemSection
          variant="world"
          label="Commit"
          title={phaseLabel}
          description={
            isPassRequiredEvent && tournament.status === "registration"
              ? hasTournamentPass
                ? "Pass active. Join the event when your seat matters."
                : "This bracket stays locked until the event pass is active."
              : decisionLabel
          }
          actions={
            <div className="flex flex-wrap gap-3">
              {tournament.registration_url && isWeb ? (
                <Button
                  variant="ghost"
                  className="border-0"
                  onClick={() =>
                    window.open(tournament.registration_url as string, "_blank", "noopener,noreferrer")
                  }
                >
                  Open signup link
                </Button>
              ) : null}
              {isPassRequiredEvent && !worldAuth.isWalletBound ? (
                <Button variant="hero" className="border-0" onClick={() => void ensureWorldSeat()}>
                  Bind World wallet
                </Button>
              ) : null}
              {isPassRequiredEvent && worldAuth.isWalletBound && !linkedSolanaWallet ? (
                <Button
                  variant="hero"
                  className="border-0"
                  onClick={() => void linkSolanaWallet()}
                  disabled={solanaCompetitive.action !== null}
                >
                  Link Solana wallet
                </Button>
              ) : null}
              {isPassRequiredEvent && linkedSolanaWallet && !hasTournamentPass ? (
                <Button
                  variant="hero"
                  className="border-0"
                  onClick={() => void activateEventPass()}
                  disabled={solanaCompetitive.action !== null}
                >
                  Activate event pass
                </Button>
              ) : null}
              {canJoin ? (
                <Button variant="hero" className="border-0" onClick={handleJoin} disabled={actionLoading}>
                  <UserPlus className="h-4 w-4" />
                  Join event
                </Button>
              ) : null}
              {canLeave ? (
                <Button variant="ghost" className="border-0" onClick={handleLeave} disabled={actionLoading}>
                  <UserMinus className="h-4 w-4" />
                  Leave
                </Button>
              ) : null}
              {canStart ? (
                <Button variant="hero" className="border-0" onClick={handleStart} disabled={actionLoading}>
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              ) : null}
            </div>
          }
        >
          <UtilityStrip>
            <UtilityPill strong>{phaseLabel}</UtilityPill>
            <UtilityPill>{tournament.board_size}x{tournament.board_size}</UtilityPill>
            <UtilityPill>{tournament.turn_timer_seconds}s turn</UtilityPill>
            <UtilityPill>{tournament.pie_rule ? "swap on" : "swap off"}</UtilityPill>
            {activeTournamentEntry ? <UtilityPill>{activeTournamentEntry.receiptCount} receipts</UtilityPill> : null}
          </UtilityStrip>

          {tournament.access_type === "access_code" && tournament.status === "registration" ? (
            <div className="mt-4 max-w-xs">
              <Input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Paid or invite code"
                className="border-black/10 bg-white"
              />
            </div>
          ) : null}

          {tournament.registration_url && !isWeb ? (
            <p className="system-inline-note">
              Signup stays on web. Join here after the host clears or shares your seat.
            </p>
          ) : null}
        </SystemSection>

        <SystemSection variant="world" label="Seats" title={seatsLabel}>
          {isPassRequiredEvent || activeTournamentEntry ? (
            <DecisionLane>
              <DecisionEntry as="div" selected={Boolean(activeTournamentEntry)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="system-screen__label">Competitive state</p>
                    <h3 className="ops-directory-row__title">
                      {!linkedSolanaWallet
                        ? "Wallet not linked"
                        : !hasTournamentPass
                          ? "Pass not active"
                          : isParticipant
                            ? "Joined event"
                            : "Pass ready"}
                    </h3>
                    <p className="ops-directory-row__meta">
                      {activeTournamentEntry
                        ? `${activeTournamentEntry.status}. ${activeTournamentEntry.receiptCount} sealed result${activeTournamentEntry.receiptCount === 1 ? "" : "s"}.`
                        : "Link wallet, activate pass, then join the bracket."}
                    </p>
                  </div>
                  <UtilityPill strong>
                    {isParticipant ? "joined" : hasTournamentPass ? "ready" : "locked"}
                  </UtilityPill>
                </div>
                <DecisionEntryFocus>
                  <p className="system-inline-note">
                    This event uses pass-backed entry and sealed receipts instead of open competitive access.
                  </p>
                </DecisionEntryFocus>
              </DecisionEntry>
            </DecisionLane>
          ) : null}

          {participants.length ? (
            <DecisionLane>
              {participants.map((participant) => (
                <div key={participant.player_id} className="decision-entry">
                  <div className="flex items-center gap-3">
                    <div className="board-rail-label w-8 text-[10px] text-black/45">
                      {participant.seed ? `#${participant.seed}` : "--"}
                    </div>
                    <UserAvatar
                      username={participant.profiles.username}
                      color={participant.profiles.avatar_color}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="ops-directory-row__title">{participant.profiles.username}</p>
                      <p className="ops-directory-row__meta">
                        {participant.player_id === tournament.created_by ? "Host." : participant.status !== "active" ? participant.status : "Ready."}
                      </p>
                    </div>
                    <UtilityPill strong={participant.player_id === tournament.created_by}>
                      {participant.player_id === tournament.created_by ? "host" : participant.status}
                    </UtilityPill>
                  </div>
                </div>
              ))}
            </DecisionLane>
          ) : (
            <p className="system-empty">No players yet.</p>
          )}
        </SystemSection>

        <SystemSection
          variant="world"
          label="Bracket"
          title={tournament.status === "registration" ? "Waiting to start" : "Current state"}
          description={tournament.status === "registration" ? "Fill seats. Start bracket." : "Open the current competition state."}
        >
          <div ref={bracketRef}>
            {tournament.status === "registration" ? (
              <div className="system-empty flex min-h-[220px] flex-col items-center justify-center gap-4 text-center">
                <Trophy className="h-10 w-10 text-black/35" />
                <div>
                  <p className="text-xl font-semibold tracking-[-0.04em] text-foreground">Need more players.</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">The bracket stays quiet until the room is full enough to commit.</p>
                </div>
              </div>
            ) : (
              <BracketVisualization tournamentId={tournamentId!} />
            )}
          </div>
        </SystemSection>
      </SystemScreen>
    </SiteFrame>
  );
}
