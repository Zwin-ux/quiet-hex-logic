import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Plus, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { CounterBlock } from "@/components/board/CounterBlock";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { MetricLine } from "@/components/board/MetricLine";
import { Button } from "@/components/ui/button";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listWorlds } from "@/lib/worlds";
import { buildAuthRoute } from "@/lib/authRedirect";

interface Tournament {
  id: string;
  world_id?: string | null;
  name: string;
  description: string | null;
  format: string;
  status: string;
  max_players: number;
  min_players: number;
  board_size: number;
  created_at: string;
  start_time: string | null;
  created_by: string;
  participant_count?: number;
}

export default function Tournaments() {
  useDocumentTitle("Events");

  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest, guestUsername } = useGuestMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [worldNames, setWorldNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const openTournaments = useMemo(
    () => tournaments.filter((tournament) => ["registration"].includes(tournament.status)),
    [tournaments],
  );
  const activeTournaments = useMemo(
    () => tournaments.filter((tournament) => ["active", "seeding"].includes(tournament.status)),
    [tournaments],
  );
  const completedTournaments = useMemo(
    () => tournaments.filter((tournament) => ["completed"].includes(tournament.status)),
    [tournaments],
  );
  const worldHostedCount = useMemo(
    () => tournaments.filter((tournament) => Boolean(tournament.world_id)).length,
    [tournaments],
  );
  const standaloneCount = tournaments.length - worldHostedCount;

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select(
          `
          *,
          tournament_participants(count)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tournamentsWithCount =
        data?.map((t) => ({
          ...t,
          participant_count: t.tournament_participants?.[0]?.count || 0,
        })) || [];

      setTournaments(tournamentsWithCount);
      setLoadError(null);
    } catch (error) {
      console.error("Failed to load tournaments:", error);
      setLoadError("Directory offline");
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const loadWorldNames = async () => {
    try {
      const worlds = await listWorlds(user?.id);
      setWorldNames(Object.fromEntries(worlds.map((world) => [world.id, world.name])));
    } catch (error) {
      console.error("Failed to load world directory:", error);
    }
  };

  useEffect(() => {
    loadTournaments();
    loadWorldNames();

    const channel = supabase
      .channel("tournaments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments",
        },
        () => loadTournaments(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <SiteFrame>
        <div className="flex min-h-[420px] items-center justify-center">
          <Trophy className="h-10 w-10 animate-gentle-pulse text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <SectionRail
        eyebrow="Event directory"
        title="Cross-world competition, scheduled from real venues."
        description={
          <>
            This is the network-wide event list. Recurring competitions should be
            staged from a world, not from a floating one-off page.
          </>
        }
        meta={
          <>
            <span className="board-meta-chip">Mode / event directory</span>
            <span className="board-meta-chip">World-hosted / {worldHostedCount}</span>
            <span className="board-meta-chip">Standalone / {standaloneCount}</span>
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/worlds")}>
              Browse worlds
            </Button>
            {user && !isGuest ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" />
                Create event
              </Button>
            ) : null}
          </>
        }
        status={
          <StateTag tone={loadError ? "critical" : activeTournaments.length ? "success" : "warning"}>
            {loadError ? loadError : activeTournaments.length ? "active brackets" : "quiet schedule"}
          </StateTag>
        }
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <VenuePanel eyebrow="Network telemetry" title="Event system status" titleBarEnd={<StateTag tone={loadError ? "critical" : "normal"}>{loadError ? "warning" : "readout"}</StateTag>}>
          <div className="grid gap-3 sm:grid-cols-3">
            <CounterBlock label="world-hosted" value={worldHostedCount} />
            <CounterBlock label="standalone" value={standaloneCount} />
            <CounterBlock label="open now" value={openTournaments.length} />
          </div>
          {loadError ? <div className="retro-critical-strip mt-5 text-sm">{loadError}. Refresh the page or try again in a moment.</div> : null}
        </VenuePanel>

        {isGuest ? (
          <VenuePanel
            eyebrow="Identity gate"
            title="Events are account-bound."
            description={`Playing as ${guestUsername}. Create an account to join host-run events and recurring competitions.`}
            state="warning"
            titleBarEnd={<StateTag tone="warning">guest blocked</StateTag>}
          >
            <Button onClick={() => navigate(buildAuthRoute())}>Create account</Button>
          </VenuePanel>
        ) : (
          <VenuePanel
            eyebrow="Operator note"
            title="Worlds should own recurring event identity."
            description="The event directory remains useful, but the venue context is what makes competition feel durable instead of disposable."
            titleBarEnd={<StateTag tone="normal">world first</StateTag>}
          >
            <MetricLine label="BOARD stance" value="world first" />
          </VenuePanel>
        )}
      </div>

      <div className="mt-6 space-y-6">
        <TournamentSection
          title="Open events"
          description="Registration is live and seats are still available."
          tournaments={openTournaments}
          worldNames={worldNames}
          onView={(tournamentId) => navigate(`/tournament/${tournamentId}`)}
        />
        <TournamentSection
          title="Active events"
          description="Rounds are live or the bracket is being seeded."
          tournaments={activeTournaments}
          worldNames={worldNames}
          onView={(tournamentId) => navigate(`/tournament/${tournamentId}`)}
        />
        <TournamentSection
          title="Completed events"
          description="Finished competitions with standings and history."
          tournaments={completedTournaments}
          worldNames={worldNames}
          onView={(tournamentId) => navigate(`/tournament/${tournamentId}`)}
        />
      </div>

      {showCreateDialog ? (
        <CreateTournamentDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            loadTournaments();
          }}
        />
      ) : null}
    </SiteFrame>
  );
}

function TournamentSection({
  title,
  description,
  tournaments,
  worldNames,
  onView,
}: {
  title: string;
  description: string;
  tournaments: Tournament[];
  worldNames: Record<string, string>;
  onView: (tournamentId: string) => void;
}) {
  return (
    <VenuePanel
      eyebrow={title}
      title={tournaments.length ? title : `No ${title.toLowerCase()}`}
      description={description}
      state={tournaments.length ? "normal" : "warning"}
      titleBarEnd={
        <StateTag tone={tournaments.length ? "normal" : "warning"}>
          {tournaments.length ? `${tournaments.length} listed` : "empty"}
        </StateTag>
      }
    >
      {tournaments.length === 0 ? (
        <div className="retro-warning-strip mt-4 text-sm">
          Nothing here yet.
        </div>
      ) : (
        <div className="board-ledger mt-2">
          {tournaments.map((tournament, index) => (
            <button
              key={tournament.id}
              onClick={() => onView(tournament.id)}
              className="board-ledger-row w-full text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[56px_minmax(0,1fr)_210px]"
            >
              <div className="board-rail-label pt-1 text-[10px] text-black/45">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="board-meta-stack mb-3">
                  <span className="board-meta-chip">status / {tournament.status}</span>
                  {tournament.world_id && worldNames[tournament.world_id] ? (
                    <span className="board-meta-chip">world / {worldNames[tournament.world_id]}</span>
                  ) : (
                    <span className="board-meta-chip">type / standalone</span>
                  )}
                </div>
                <h3 className="board-section-title text-foreground">{tournament.name}</h3>
                {tournament.description ? (
                  <p className="board-copy mt-4 max-w-2xl">
                    {tournament.description}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1 border-l border-black/10 pl-4">
                <MetricLine icon={Users} label="Players" value={`${tournament.participant_count}/${tournament.max_players}`} />
                <MetricLine icon={Clock} label="Board" value={`${tournament.board_size}x${tournament.board_size}`} />
                <MetricLine
                  icon={Calendar}
                  label="Start"
                  value={tournament.start_time ? new Date(tournament.start_time).toLocaleDateString() : "TBD"}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </VenuePanel>
  );
}
