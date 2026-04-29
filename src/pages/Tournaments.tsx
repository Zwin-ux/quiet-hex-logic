import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Calendar, Loader2, Plus, Radio, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listWorlds } from "@/lib/worlds";
import { buildAuthRoute } from "@/lib/authRedirect";
import { FIRST_TOURNAMENT } from "@/lib/launchAnnouncements";
import { useSurfaceCapabilities } from "@/lib/surfaces";
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

type EventFilter = "all" | "open" | "live" | "hosted";

const EVENT_FILTERS: Array<{ key: EventFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "live", label: "Live" },
  { key: "hosted", label: "Worlds" },
];

const statusOrder: Record<string, number> = {
  registration: 0,
  seeding: 1,
  active: 2,
  completed: 3,
};

function getEventTone(tournament: Tournament) {
  if (tournament.status === "active" || tournament.status === "seeding") {
    return { label: "Live", tone: "is-live" as const };
  }

  if (tournament.status === "registration") {
    return { label: "Open", tone: "is-warning" as const };
  }

  return { label: "Archive", tone: "is-neutral" as const };
}

function getEventCopy(tournament: Tournament) {
  return (
    tournament.description ||
    (tournament.status === "completed"
      ? "Results posted. Replay and standings ready."
      : "Seats open. Bracket and room state stay attached.")
  );
}

function formatStartLabel(value: string | null) {
  if (!value) return "TBD";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatSeatLabel(tournament: Tournament) {
  return `${tournament.participant_count ?? 0}/${tournament.max_players}`;
}

export default function Tournaments() {
  useDocumentTitle("Events");

  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuest, guestUsername } = useGuestMode();
  const { isAuthoringSurface } = useSurfaceCapabilities();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [worldNames, setWorldNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>("all");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [tournaments],
  );

  const filteredTournaments = useMemo(() => {
    return sortedTournaments.filter((tournament) => {
      if (filter === "open") return tournament.status === "registration";
      if (filter === "live") return tournament.status === "active" || tournament.status === "seeding";
      if (filter === "hosted") return Boolean(tournament.world_id);
      return true;
    });
  }, [filter, sortedTournaments]);

  const openTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.status === "registration"),
    [tournaments],
  );
  const activeTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.status === "active" || tournament.status === "seeding"),
    [tournaments],
  );
  const completedTournaments = useMemo(
    () => tournaments.filter((tournament) => tournament.status === "completed"),
    [tournaments],
  );
  const worldHostedCount = useMemo(
    () => tournaments.filter((tournament) => Boolean(tournament.world_id)).length,
    [tournaments],
  );
  const seatCount = useMemo(
    () => tournaments.reduce((sum, tournament) => sum + tournament.max_players, 0),
    [tournaments],
  );

  useEffect(() => {
    if (!filteredTournaments.length) {
      setSelectedTournamentId(null);
      return;
    }

    setSelectedTournamentId((current) =>
      current && filteredTournaments.some((tournament) => tournament.id === current)
        ? current
        : filteredTournaments[0].id,
    );
  }, [filteredTournaments]);

  const selectedTournament =
    filteredTournaments.find((tournament) => tournament.id === selectedTournamentId) ??
    filteredTournaments[0] ??
    null;
  const selectedWorldName =
    selectedTournament?.world_id ? worldNames[selectedTournament.world_id] : undefined;

  const heroTitle = "Events";
  const heroDescription = isAuthoringSurface
    ? "Queue brackets, watch live rooms, and open the one that matters."
    : "See which brackets are open, then jump in when a room goes live.";

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
        data?.map((tournament) => ({
          ...tournament,
          participant_count: tournament.tournament_participants?.[0]?.count || 0,
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
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame contentClassName="pb-16 pt-24 md:pt-28">
      <div className="ops-events-shell">
        <section className="ops-events-head">
          <div className="ops-events-head__copy">
            <p className="ops-events-label">Events</p>
            <h1 className="ops-events-title mt-4">{heroTitle}</h1>
            <p className="ops-events-copy mt-4">{heroDescription}</p>

            <div className="ops-events-actions">
              {user && !isGuest && isAuthoringSurface ? (
                <Button
                  variant="hero"
                  onClick={() => setShowCreateDialog(true)}
                  className="ops-events-action ops-events-action--primary"
                >
                  <Plus className="h-4 w-4" />
                  Create event
                </Button>
              ) : user || isGuest ? (
                <Button
                  variant="outline"
                  onClick={() => navigate("/play")}
                  className="ops-events-action"
                >
                  Open play
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => navigate(buildAuthRoute(isAuthoringSurface ? "/events" : "/play"))}
                  className="ops-events-action"
                >
                  {isAuthoringSurface ? "Enter to host" : "Enter to play"}
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => navigate("/worlds")}
                className="ops-events-action ops-events-action--ghost"
              >
                Open worlds
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="ops-events-summary" aria-label="Event summary">
            <div className="ops-events-summary__item">
              <p className="ops-events-summary__label">Open</p>
              <p className="ops-events-summary__value">{openTournaments.length}</p>
            </div>
            <div className="ops-events-summary__item">
              <p className="ops-events-summary__label">Live</p>
              <p className="ops-events-summary__value">{activeTournaments.length}</p>
            </div>
            <div className="ops-events-summary__item">
              <p className="ops-events-summary__label">Seats</p>
              <p className="ops-events-summary__value">{seatCount}</p>
            </div>
            <div className="ops-events-summary__item">
              <p className="ops-events-summary__label">Worlds</p>
              <p className="ops-events-summary__value">{worldHostedCount}</p>
            </div>
          </div>
        </section>

        {loadError ? <div className="ops-events-error">{loadError}</div> : null}
        {isGuest ? (
          <div className="ops-events-note">
            Playing as {guestUsername}. Sign in to join host-run brackets.
          </div>
        ) : null}

        {sortedTournaments.length === 0 ? (
          <div className="ops-events-empty">
            <p className="ops-events-section-title">
              {isAuthoringSurface ? "No events yet." : "Nothing queued yet."}
            </p>
            <p className="ops-events-copy mt-3">
              {isAuthoringSurface
                ? "Create the first bracket, attach it to a room, and bring the queue online."
                : FIRST_TOURNAMENT.detail}
            </p>
            <div className="ops-events-actions">
              {user && !isGuest && isAuthoringSurface ? (
                <Button
                  variant="hero"
                  onClick={() => setShowCreateDialog(true)}
                  className="ops-events-action ops-events-action--primary"
                >
                  <Plus className="h-4 w-4" />
                  Create event
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => navigate("/play")}
                  className="ops-events-action"
                >
                  Open play
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="ops-events-grid">
            <section className="ops-events-surface">
              <div className="ops-events-section-head">
                <div>
                  <p className="ops-events-label">Queue</p>
                  <h2 className="ops-events-section-title mt-3">Available brackets</h2>
                </div>

                <div className="ops-events-segmented">
                  {EVENT_FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={
                        filter === item.key
                          ? "ops-events-segmented__item is-active"
                          : "ops-events-segmented__item"
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTournaments.length === 0 ? (
                <div className="ops-events-empty ops-events-empty--inline">
                  <p className="ops-events-copy">No brackets match this filter.</p>
                </div>
              ) : (
                <div className="ops-events-list mt-6">
                  {filteredTournaments.map((tournament) => {
                    const selected = tournament.id === selectedTournamentId;
                    const worldName = tournament.world_id ? worldNames[tournament.world_id] : undefined;
                    const tone = getEventTone(tournament);

                    return (
                      <button
                        key={tournament.id}
                        type="button"
                        onClick={() => setSelectedTournamentId(tournament.id)}
                        className={selected ? "ops-events-row is-selected" : "ops-events-row"}
                      >
                        <div className="ops-events-row__main">
                          <div className="ops-events-row__titleline">
                            <span className="ops-events-dot" aria-hidden="true" />
                            <h3 className="ops-events-row__title">{tournament.name}</h3>
                          </div>

                          <p className="ops-events-row__copy">{getEventCopy(tournament)}</p>

                          <div className="ops-events-chip-row">
                            <span className={`ops-events-chip ${tone.tone}`}>{tone.label}</span>
                            <span className="ops-events-chip">
                              {tournament.competitive_mode ? "Competitive" : "Casual"}
                            </span>
                            {worldName ? <span className="ops-events-chip is-dark">{worldName}</span> : null}
                          </div>
                        </div>

                        <div className="ops-events-row__stats">
                          <div className="ops-events-row__stat">
                            <p className="ops-events-row__stat-label">Seats</p>
                            <p className="ops-events-row__stat-value">{formatSeatLabel(tournament)}</p>
                          </div>
                          <div className="ops-events-row__stat">
                            <p className="ops-events-row__stat-label">Board</p>
                            <p className="ops-events-row__stat-value">{tournament.board_size}</p>
                          </div>
                          <div className="ops-events-row__stat">
                            <p className="ops-events-row__stat-label">Start</p>
                            <p className="ops-events-row__stat-value">{formatStartLabel(tournament.start_time)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {selectedTournament ? (
              <aside className="ops-events-surface ops-events-surface--detail">
                <div className="ops-events-detail-topline">
                  <span className={`ops-events-chip ${getEventTone(selectedTournament).tone}`}>
                    {getEventTone(selectedTournament).label}
                  </span>
                  <span className="ops-events-chip">
                    {selectedTournament.competitive_mode ? "Competitive" : "Casual"}
                  </span>
                  {selectedWorldName ? (
                    <span className="ops-events-chip is-dark">{selectedWorldName}</span>
                  ) : null}
                </div>

                <h2 className="ops-events-detail-title mt-5">{selectedTournament.name}</h2>
                <p className="ops-events-detail-copy mt-3">{getEventCopy(selectedTournament)}</p>

                <div className="ops-events-detail-hero">
                  <p className="ops-events-detail-hero__label">Seats</p>
                  <p className="ops-events-detail-hero__value">{formatSeatLabel(selectedTournament)}</p>
                  <p className="ops-events-detail-hero__foot">
                    {selectedWorldName
                      ? `${selectedWorldName}. Room and bracket stay attached.`
                      : "Standalone bracket. Open and join directly."}
                  </p>
                </div>

                <div className="ops-events-detail-grid">
                  <div className="ops-events-detail-stat">
                    <Users className="h-4 w-4" />
                    <div>
                      <p className="ops-events-detail-stat__label">Players</p>
                      <p className="ops-events-detail-stat__value">
                        {selectedTournament.participant_count ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="ops-events-detail-stat">
                    <Radio className="h-4 w-4" />
                    <div>
                      <p className="ops-events-detail-stat__label">Format</p>
                      <p className="ops-events-detail-stat__value">
                        {selectedTournament.format === "single_elimination" ? "Single" : "Round robin"}
                      </p>
                    </div>
                  </div>
                  <div className="ops-events-detail-stat">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <p className="ops-events-detail-stat__label">Start</p>
                      <p className="ops-events-detail-stat__value">
                        {formatStartLabel(selectedTournament.start_time)}
                      </p>
                    </div>
                  </div>
                  <div className="ops-events-detail-stat">
                    <ShieldCheck className="h-4 w-4" />
                    <div>
                      <p className="ops-events-detail-stat__label">Board</p>
                      <p className="ops-events-detail-stat__value">{selectedTournament.board_size}</p>
                    </div>
                  </div>
                </div>

                <div className="ops-events-actions ops-events-actions--stack mt-6">
                  <Button
                    variant="hero"
                    onClick={() => navigate(`/tournament/${selectedTournament.id}`)}
                    className="ops-events-action ops-events-action--primary"
                  >
                    Open event
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/worlds")}
                    className="ops-events-action ops-events-action--ghost"
                  >
                    Open worlds
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/play")}
                    className="ops-events-action ops-events-action--ghost"
                  >
                    Local practice
                  </Button>
                </div>

                {completedTournaments.length > 0 ? (
                  <div className="ops-events-detail-foot mt-6">
                    <p className="ops-events-detail-foot__label">Archive</p>
                    <p className="ops-events-detail-foot__value">{completedTournaments.length} complete</p>
                  </div>
                ) : null}
              </aside>
            ) : null}
          </div>
        )}

        {showCreateDialog ? (
          <CreateTournamentDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={() => {
              setShowCreateDialog(false);
              void loadTournaments();
            }}
          />
        ) : null}
      </div>
    </SiteFrame>
  );
}
