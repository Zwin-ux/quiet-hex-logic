import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
      className="w-full border border-black bg-[#fbfaf8] px-4 py-4 text-left transition-colors hover:bg-[#efebe3] md:grid md:grid-cols-[minmax(0,1fr)_92px] md:items-center md:gap-6"
    >
      <div className="min-w-0">
        <h3 className="board-section-title">{tournament.name}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <StateTag tone={tournament.competitive_mode ? "warning" : "normal"}>
            {tournament.competitive_mode ? "competitive" : "casual"}
          </StateTag>
          {worldName ? <StateTag>{worldName}</StateTag> : null}
        </div>
        <p className="mt-3 text-sm leading-7 text-black/68">
          {tournament.description ||
            `${label === "archive" ? "Results posted. Replay ready." : "Seats open. Bracket ready."}`}
        </p>
      </div>
      <div className="mt-4 space-y-2 text-left md:mt-0 md:text-right">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-black/55">{label}</p>
        <p className="text-[2rem] font-extrabold leading-none tracking-[-0.07em] text-black">
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

  const loadTournaments = useCallback(async () => {
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
  }, []);

  const loadWorldNames = useCallback(async () => {
    try {
      const worlds = await listWorlds(user?.id);
      setWorldNames(Object.fromEntries(worlds.map((world) => [world.id, world.name])));
    } catch (error) {
      console.error("Failed to load world directory:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadTournaments();
    void loadWorldNames();

    const channel = supabase
      .channel("tournaments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments",
        },
        () => {
          void loadTournaments();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTournaments, loadWorldNames]);

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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
          <section className="border border-[#090909] bg-[#090909] px-6 py-6 text-[#f3efe6] md:px-8 md:py-8">
            <div className="flex flex-wrap gap-2">
              <StateTag tone={openTournaments.length ? "warning" : "normal"}>
                {openTournaments.length} open
              </StateTag>
              <StateTag tone={activeTournaments.length ? "success" : "normal"}>
                {activeTournaments.length} live
              </StateTag>
            </div>

            <div className="mt-6 max-w-[42rem]">
              <h1 className="text-[clamp(3rem,5vw,5.2rem)] font-black leading-[0.9] tracking-[-0.07em] text-[#f3efe6]">
                Queue brackets. Run finals. Keep the room attached.
              </h1>
              <p className="mt-5 max-w-[30rem] text-[17px] leading-8 text-white/72">
                Registration, seats, and bracket state stay in one place.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="border border-white/12 px-4 py-4">
                <p className="board-rail-label text-white/56">open</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-[#f3efe6]">
                  {openTournaments.length} registration live
                </p>
              </div>
              <div className="border border-white/12 px-4 py-4">
                <p className="board-rail-label text-white/56">running</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-[#f3efe6]">
                  {activeTournaments.length} brackets active
                </p>
              </div>
              <div className="border border-white/12 px-4 py-4">
                <p className="board-rail-label text-white/56">source</p>
                <p className="mt-2 text-[15px] font-semibold leading-7 text-[#f3efe6]">
                  {worldHostedCount} tied to worlds
                </p>
              </div>
            </div>
          </section>

          <aside className="border border-black bg-[#fbfaf8] px-5 py-5">
            <p className="board-rail-label text-black/55">Featured bracket</p>
            <h2 className="mt-5 text-[2.3rem] font-black leading-[0.92] tracking-[-0.06em] text-black">
              {primaryEvent?.name || "Host the first bracket"}
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-black/68">
              {primaryEvent?.description ||
                "Set the format. Open seats. Start rounds."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StateTag>{primaryEvent ? `board ${primaryEvent.board_size}` : "new board"}</StateTag>
              <StateTag tone={primaryEvent?.competitive_mode ? "warning" : "normal"}>
                {primaryEvent ? (primaryEvent.competitive_mode ? "competitive" : "casual") : "casual first"}
              </StateTag>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {user && !isGuest ? (
                <Button variant={primaryEvent ? "outline" : "hero"} onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Create event
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(buildAuthRoute("/events"))}>
                  Enter to host
                </Button>
              )}
              {primaryEvent ? (
                <Button variant="outline" onClick={() => navigate(`/tournament/${primaryEvent.id}`)}>
                  Open featured event
                </Button>
              ) : null}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <CounterBlock label="world-hosted" value={worldHostedCount} />
              <CounterBlock label="standalone" value={standaloneCount} />
            </div>

            {isGuest ? (
              <div className="retro-warning-strip mt-6">
                Playing as {guestUsername}. Sign in to join host-run brackets.
              </div>
            ) : null}
            {loadError ? <div className="retro-critical-strip mt-6">{loadError}</div> : null}
          </aside>
        </div>

        <VenuePanel
          eyebrow="Event queue"
          title={featuredTournaments.length > 0 ? "Open brackets" : "No events live yet"}
          description={
            featuredTournaments.length > 0
              ? "Open one. Check seats. Start rounds."
              : "Create the first bracket."
          }
        >
          {featuredTournaments.length > 0 ? (
            <div className="space-y-4">
              {featuredTournaments.map((tournament) => (
                <EventRow
                  key={tournament.id}
                  tournament={tournament}
                  worldName={tournament.world_id ? worldNames[tournament.world_id] : undefined}
                  onOpen={(tournamentId) => navigate(`/tournament/${tournamentId}`)}
                />
              ))}
            </div>
          ) : null}
        </VenuePanel>

        {remainingTournaments.length > 0 ? (
          <VenuePanel
            eyebrow="More brackets"
            title="More events"
            description="Jump into another bracket."
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
