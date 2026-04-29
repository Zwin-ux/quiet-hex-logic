import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Play, Trophy, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteFrame } from "@/components/board/SiteFrame";
import {
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
import { useSurfaceCapabilities } from "@/lib/surfaces";
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
  access_type?: "public" | "world_members" | "access_code";
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
  const { isWeb } = useSurfaceCapabilities();
  const bracketRef = useRef<HTMLDivElement | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [worldContext, setWorldContext] = useState<{ id: string; name: string } | null>(null);
  const [variantLabel, setVariantLabel] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [viewerIsVerifiedHuman, setViewerIsVerifiedHuman] = useState(false);
  const [competitiveJoinBlocked, setCompetitiveJoinBlocked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleJoin = async () => {
    if (!tournamentId) return;
    setActionLoading(true);

    try {
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
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] items-center justify-center">
          <Trophy className="h-10 w-10 animate-gentle-pulse text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  const isParticipant = participants.some((p) => p.player_id === user?.id);
  const isCreator = tournament.created_by === user?.id;
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
    (tournament.access_type !== "access_code" || Boolean(accessCode.trim()));
  const canLeave =
    user &&
    isParticipant &&
    tournament.status === "registration" &&
    !isCreator;
  const shouldShowCompetitiveGate =
    tournament.competitive_mode && Boolean(user) && !viewerIsVerifiedHuman;
  const seatsLabel = `${participants.length}/${tournament.max_players} seats`;
  const phaseLabel = tournament.status === "registration" ? "join open" : "bracket live";

  const openBracket = () => {
    bracketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SiteFrame visualMode="mono" contentClassName="pb-16 pt-32 md:pt-28">
      <SystemScreen
        label="Event"
        title={tournament.name}
        description={
          tournament.description || (tournament.competitive_mode ? "Competitive bracket." : "Open bracket.")
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
                : "public"}
          </UtilityPill>
          {variantLabel ? <UtilityPill>{variantLabel}</UtilityPill> : null}
        </UtilityStrip>

        {shouldShowCompetitiveGate ? (
          <SystemSection
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
          label="Commit"
          title={phaseLabel}
          description={decisionLabel}
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

        <SystemSection label="Seats" title={seatsLabel}>
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
