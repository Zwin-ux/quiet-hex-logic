import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Award, Play, Trophy, UserMinus, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { MetricLine } from "@/components/board/MetricLine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { BracketVisualization } from "@/components/BracketVisualization";
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

  if (loading || !tournament) {
    return (
      <SiteFrame>
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

  return (
    <SiteFrame>
      <div className="mb-5 flex flex-wrap items-center gap-4 text-sm font-semibold text-muted-foreground">
        {worldContext ? (
          <button onClick={() => navigate(`/worlds/${worldContext.id}`)} className="transition-colors hover:text-foreground">
            Back to {worldContext.name}
          </button>
        ) : null}
        <button onClick={() => navigate("/events")} className="transition-colors hover:text-foreground">
          Back to events
        </button>
      </div>

      <section className="border border-[#090909] bg-[#090909] px-6 py-6 text-[#f3efe6] md:px-8 md:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <StateTag>{tournament.status}</StateTag>
          <StateTag tone={tournament.competitive_mode ? "warning" : "normal"}>
            {tournament.competitive_mode ? "competitive" : "casual"}
          </StateTag>
          <StateTag>{tournament.format === "single_elimination" ? "single elim" : "round robin"}</StateTag>
          {variantLabel ? <StateTag>{variantLabel}</StateTag> : null}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <h1 className="text-[clamp(3rem,5vw,5rem)] font-black leading-[0.9] tracking-[-0.07em] text-[#f3efe6]">
              {tournament.name}
            </h1>
            <p className="mt-5 max-w-[34rem] text-[17px] leading-8 text-white/72">
              {tournament.description || (tournament.competitive_mode ? "Competitive bracket." : "Open bracket.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 xl:max-w-[280px] xl:justify-end">
            {tournament.registration_url ? (
              <Button
                variant="outline"
                onClick={() => window.open(tournament.registration_url as string, "_blank", "noopener,noreferrer")}
              >
                Open signup
              </Button>
            ) : null}
            {canJoin ? (
              <Button onClick={handleJoin} disabled={actionLoading}>
                <UserPlus className="h-4 w-4" />
                Join event
              </Button>
            ) : null}
            {canLeave ? (
              <Button variant="outline" onClick={handleLeave} disabled={actionLoading}>
                <UserMinus className="h-4 w-4" />
                Leave
              </Button>
            ) : null}
            {canStart ? (
              <Button onClick={handleStart} disabled={actionLoading}>
                <Play className="h-4 w-4" />
                Start
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {shouldShowCompetitiveGate ? (
        <VenuePanel
          className="mt-6"
          eyebrow="Competitive gate"
          title="Verify to join."
          description={competitiveJoinBlocked || "World ID required."}
          state="warning"
          titleBarEnd={<StateTag tone="warning">verification required</StateTag>}
        >
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/profile#identity")}>
              <AlertCircle className="h-4 w-4" />
              Open trust settings
            </Button>
            <Button variant="outline" onClick={() => navigate("/events")}>
              Back to events
            </Button>
          </div>
        </VenuePanel>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <VenuePanel eyebrow="Participants" title={`${participants.length}/${tournament.max_players} seats`}>
          {participants.length === 0 ? (
            <div className="border-t border-black/10 pt-4 text-sm leading-7 text-muted-foreground">
              No players yet.
            </div>
          ) : (
            <div className="divide-y divide-black/10 border-t border-black/10">
              {participants.map((participant) => (
                <div key={participant.player_id} className="flex items-center gap-3 py-4">
                  <div className="board-rail-label w-8 text-[10px] text-black/45">
                    {participant.seed ? `#${participant.seed}` : "--"}
                  </div>
                  <UserAvatar
                    username={participant.profiles.username}
                    color={participant.profiles.avatar_color}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{participant.profiles.username}</p>
                    {participant.status !== "active" ? (
                      <p className="text-xs text-muted-foreground">{participant.status}</p>
                    ) : null}
                  </div>
                  {participant.player_id === tournament.created_by ? (
                    <span className="board-rail-label rounded-md border border-black bg-black px-2 py-1 text-[10px] text-white">
                      Host
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </VenuePanel>

        <VenuePanel
          eyebrow="Competition state"
          title={tournament.status === "registration" ? "Join open" : "Bracket live"}
          description={
            tournament.status === "registration"
              ? participants.length < tournament.min_players
                ? `Need ${tournament.min_players - participants.length} more player(s).`
                : `${participants.length} ready.`
              : "Bracket live."
          }
        >
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-1 border-b border-black/10 pb-4 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
              <MetricLine icon={Users} label="Players" value={`${participants.length}/${tournament.max_players}`} />
              <MetricLine label="Board" value={`${tournament.board_size}x${tournament.board_size}`} />
              <MetricLine label="Format" value={tournament.format === "single_elimination" ? "single elim" : "round robin"} />
              <MetricLine label="Mode" value={tournament.competitive_mode ? "competitive" : "casual"} />
              <MetricLine label="Access" value={tournament.access_type === "world_members" ? "members" : tournament.access_type === "access_code" ? "code" : "public"} />
              <MetricLine label="Variant" value={variantLabel ?? "standard"} />
              <MetricLine icon={Award} label="Host" value={isCreator ? "you" : "world owner"} />
            </div>
            <div>
              {tournament.status === "registration" ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                  <Trophy className="h-14 w-14 text-black/25" />
                  <div>
                    <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">
                      Need more players.
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                      Fill seats. Start bracket.
                    </p>
                  </div>
                  {tournament.access_type === "access_code" ? (
                    <div className="w-full max-w-[260px] space-y-2">
                      <Input
                        value={accessCode}
                        onChange={(event) => setAccessCode(event.target.value)}
                        placeholder="Access code"
                        className="border-black/10 bg-white"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <BracketVisualization tournamentId={tournamentId!} />
              )}
            </div>
          </div>
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}
