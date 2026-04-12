import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { CounterBlock } from "@/components/board/CounterBlock";
import { MetricLine } from "@/components/board/MetricLine";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listWorlds } from "@/lib/worlds";
import { buildAuthRoute } from "@/lib/authRedirect";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";

interface Tournament {
  id: string;
  world_id?: string | null;
  name: string;
  description: string | null;
  format: string;
  competitive_mode: boolean;
  status: string;
  max_players: number;
  min_players: number;
  board_size: number;
  created_at: string;
  start_time: string | null;
  created_by: string;
  participant_count?: number;
}

const statusOrder: Record<string, number> = {
  registration: 0,
  seeding: 1,
  active: 2,
  completed: 3,
};

function EventRow({
  tournament,
  worldName,
  onOpen,
}: {
  tournament: Tournament;
  worldName?: string;
  onOpen: (tournamentId: string) => void;
}) {
  const label =
    tournament.status === "registration"
      ? "queued"
      : tournament.status === "active" || tournament.status === "seeding"
        ? "running"
        : "archive";
  const metric = tournament.participant_count ?? 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(tournament.id)}
      className="w-full border border-black bg-[#fbfaf8] px-4 py-4 text-left transition-colors hover:bg-black/[0.02] md:grid md:grid-cols-[minmax(0,1fr)_92px] md:items-center md:gap-6"
    >
      <div className="min-w-0">
        <h3 className="board-section-title">{tournament.name}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <StateTag tone={tournament.competitive_mode ? "warning" : "normal"}>
            {tournament.competitive_mode ? "competitive" : "casual"}
          </StateTag>
        </div>
        <p className="mt-3 text-sm leading-7 text-black/68">
          {tournament.description ||
            `${worldName ? `${worldName} - ` : ""}${
              label === "archive" ? "analysis and replay state" : "queue state and room resolution"
            }`}
        </p>
      </div>
      <div className="mt-4 space-y-2 text-left md:mt-0 md:text-right">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-black/55">{label}</p>
        <p className="font-display text-[2rem] font-bold leading-none tracking-[-0.04em] text-black">
          {metric}
        </p>
      </div>
    </button>
  );
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

  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [tournaments],
  );

  const openTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.status === "registration"),
    [tournaments],
  );
  const activeTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.status === "active" || tournament.status === "seeding"),
    [tournaments],
  );
  const worldHostedCount = useMemo(
    () => tournaments.filter((tournament) => Boolean(tournament.world_id)).length,
    [tournaments],
  );
  const standaloneCount = tournaments.length - worldHostedCount;
  const featuredTournaments = sortedTournaments.slice(0, 3);
  const primaryEvent = featuredTournaments[0] ?? null;
  const remainingTournaments = sortedTournaments.slice(3);

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
          <Calendar className="h-10 w-10 animate-gentle-pulse text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_356px] xl:items-start">
          <div className="space-y-6">
            <BoardWordmark className="text-[52px] md:text-[72px]" />

            <div className="retro-status-strip w-fit flex-wrap gap-3 bg-white px-4 py-4">
              <StateTag>events</StateTag>
              <StateTag tone={openTournaments.length ? "warning" : "normal"}>
                {openTournaments.length} queued finals
              </StateTag>
              <StateTag tone={activeTournaments.length ? "success" : "warning"}>
                {activeTournaments.length} running
              </StateTag>
            </div>

            <div className="max-w-3xl space-y-4">
              <h1 className="board-display-title max-w-[720px] text-[3.25rem] leading-[0.94] md:text-[4.5rem]">
                Events are orchestration, not listings.
              </h1>
              <p className="board-copy max-w-[560px] text-[18px] leading-8 text-black/68">
                Scheduling, queue state, match state, and where the host’s event logic is about to push people next all live here.
              </p>
            </div>

            <div className="space-y-4">
              {featuredTournaments.length > 0 ? (
                featuredTournaments.map((tournament) => (
                  <EventRow
                    key={tournament.id}
                    tournament={tournament}
                    worldName={tournament.world_id ? worldNames[tournament.world_id] : undefined}
                    onOpen={(tournamentId) => navigate(`/tournament/${tournamentId}`)}
                  />
                ))
              ) : (
                <div className="border border-black bg-[#fbfaf8] px-5 py-5">
                  <h2 className="board-section-title text-[2rem] tracking-[-0.04em]">No events running</h2>
                  <p className="board-copy mt-3 max-w-[480px] text-[16px] leading-7 text-black/68">
                    Start with a world, then stage the first event from there.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="border border-black bg-[#fbfaf8] px-5 py-5">
            <p className="board-rail-label text-black/55">Event Rail</p>
            <div className="mt-6 space-y-4">
              <h2 className="board-section-title text-[2.1rem] tracking-[-0.04em]">
                {primaryEvent?.name || "Create Event"}
              </h2>
              <p className="board-copy text-[16px] leading-7 text-black/68">
                {primaryEvent?.description ||
                  "Queue state, seed source, and next-room resolution belong here."}
              </p>
            </div>

            <div className="retro-status-strip mt-6 flex-wrap gap-3 bg-white px-4 py-4">
              <span className="border border-black px-3 py-2 text-[11px] uppercase tracking-[0.16em]">
                {primaryEvent ? `room ${primaryEvent.board_size}` : "event rail"}
              </span>
              <span className="border border-black px-3 py-2 text-[11px] uppercase tracking-[0.16em]">
                {primaryEvent ? (primaryEvent.competitive_mode ? "competitive" : "casual") : "round queue"}
              </span>
              <span className="border border-black px-3 py-2 text-[11px] uppercase tracking-[0.16em]">
                {primaryEvent ? "host ready" : "host first"}
              </span>
            </div>

            <div className="mt-6 border border-black px-4 py-4">
              <h3 className="board-section-title text-[2rem] tracking-[-0.04em]">Create Event</h3>
              <p className="board-copy mt-3 text-[16px] leading-7 text-black/68">
                Use this rail for event creation and queue control.
              </p>
              {user && !isGuest ? (
                <Button variant="outline" className="mt-8" onClick={() => setShowCreateDialog(true)}>
                  Open
                </Button>
              ) : (
                <Button variant="outline" className="mt-8" onClick={() => navigate(buildAuthRoute("/events"))}>
                  Enter
                </Button>
              )}
            </div>

            <div className="mt-10 space-y-2">
              <p className="font-display text-[5rem] font-bold leading-none tracking-[-0.06em] text-black">
                {String(openTournaments.length).padStart(2, "0")}
              </p>
              <p className="text-[12px] uppercase tracking-[0.18em] text-black/55">queued finals</p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <CounterBlock label="world-hosted" value={worldHostedCount} />
              <CounterBlock label="standalone" value={standaloneCount} />
            </div>

            {isGuest ? (
              <div className="retro-warning-strip mt-6">
                Playing as {guestUsername}. Create an account to join host-run events.
              </div>
            ) : null}
            {loadError ? <div className="retro-critical-strip mt-6">{loadError}</div> : null}
          </aside>
        </div>

        {remainingTournaments.length > 0 ? (
          <VenuePanel
            eyebrow="Event queue"
            title="Additional events"
            description="The network queue extends beyond the featured items above."
            titleBarEnd={<StateTag>{remainingTournaments.length} more</StateTag>}
          >
            <div className="space-y-3">
              {remainingTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="border border-black bg-[#fbfaf8] px-4 py-4 md:grid md:grid-cols-[minmax(0,1fr)_220px] md:items-center md:gap-6"
                >
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <StateTag>{tournament.status}</StateTag>
                      <StateTag tone={tournament.competitive_mode ? "warning" : "normal"}>
                        {tournament.competitive_mode ? "competitive" : "casual"}
                      </StateTag>
                      {tournament.world_id && worldNames[tournament.world_id] ? (
                        <StateTag>{worldNames[tournament.world_id]}</StateTag>
                      ) : null}
                    </div>
                    <h3 className="board-section-title">{tournament.name}</h3>
                    {tournament.description ? (
                      <p className="mt-3 text-sm leading-7 text-black/68">{tournament.description}</p>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-2 md:mt-0">
                    <MetricLine icon={Users} label="Players" value={`${tournament.participant_count}/${tournament.max_players}`} />
                    <MetricLine
                      icon={Calendar}
                      label="Start"
                      value={tournament.start_time ? new Date(tournament.start_time).toLocaleDateString() : "TBD"}
                    />
                    <Button className="mt-3 w-full" variant="outline" onClick={() => navigate(`/tournament/${tournament.id}`)}>
                      Open event
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </VenuePanel>
        ) : null}

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
      </div>
    </SiteFrame>
  );
}
