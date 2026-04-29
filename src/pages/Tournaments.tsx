import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { CreateTournamentDialog } from "@/components/CreateTournamentDialog";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listWorlds } from "@/lib/worlds";
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

function getEventDecisionLine(tournament: Tournament) {
  return `${formatSeatLabel(tournament)} seats / ${formatStartLabel(tournament.start_time)}`;
}

function getEventMeta(tournament: Tournament, worldName?: string) {
  return [
    worldName ?? "Independent",
    tournament.competitive_mode ? "Competitive" : "Casual",
    `Board ${tournament.board_size}`,
  ].join(" / ");
}

function getEventFocusSummary(tournament: Tournament, worldName?: string) {
  const format = tournament.format === "single_elimination" ? "Single" : "Round robin";
  return `${format} / ${worldName ?? "Standalone"}`;
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

  const heroTitle = "Pick a bracket";
  const heroDescription = isAuthoringSurface
    ? "Choose one queue. Run it when the room is ready."
    : "Choose one queue. Open it when you are ready.";

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
    <SiteFrame contentClassName="pb-16 pt-32 md:pt-28">
      <div className="ops-events-shell">
        <section className="ops-events-head">
          <div className="ops-events-head__copy">
            <p className="ops-events-label">Events</p>
            <h1 className="ops-events-title mt-4">{heroTitle}</h1>
            <p className="ops-events-copy mt-4">{heroDescription}</p>
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
              {isAuthoringSurface ? "No brackets queued." : "Nothing queued."}
            </p>
            <p className="ops-events-copy mt-3">
              {isAuthoringSurface
                ? "Create the first bracket and bring the room online."
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
            <section className="ops-events-surface ops-events-surface--list">
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
                  <p className="ops-events-copy">Nothing matches this filter.</p>
                </div>
              ) : (
                <div className="ops-events-list mt-6">
                  {filteredTournaments.map((tournament) => {
                    const selected = tournament.id === selectedTournamentId;
                    const worldName = tournament.world_id ? worldNames[tournament.world_id] : undefined;
                    const tone = getEventTone(tournament);

                    return (
                      <div
                        key={tournament.id}
                        className={selected ? "ops-events-entry is-selected" : "ops-events-entry"}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedTournamentId(tournament.id)}
                          className={selected ? "ops-events-row is-selected" : "ops-events-row"}
                        >
                          <div className="ops-events-row__main">
                            <div className="ops-events-row__titleline">
                              <span className={`ops-events-chip ${tone.tone}`}>{tone.label}</span>
                              <h3 className="ops-events-row__title">{tournament.name}</h3>
                            </div>

                            <p className="ops-events-row__meta">{getEventMeta(tournament, worldName)}</p>
                          </div>

                          <div className="ops-events-row__decision">
                            <p className="ops-events-row__decision-line">
                              {getEventDecisionLine(tournament)}
                            </p>

                            <div className="ops-events-row__decision-grid">
                              <div className="ops-events-row__decision-block">
                                <p className="ops-events-row__stat-label">Seats</p>
                                <p className="ops-events-row__stat-value">{formatSeatLabel(tournament)}</p>
                              </div>
                              <div className="ops-events-row__decision-block">
                                <p className="ops-events-row__stat-label">Start</p>
                                <p className="ops-events-row__stat-value">
                                  {formatStartLabel(tournament.start_time)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>

                        {selected ? (
                          <div className="ops-events-focus">
                            <p className="ops-events-focus__summary">
                              {getEventFocusSummary(tournament, worldName)}
                            </p>

                            <div className="ops-events-focus__actions">
                              <Button
                                variant="hero"
                                onClick={() => navigate(`/tournament/${tournament.id}`)}
                                className="ops-events-action ops-events-action--primary"
                              >
                                Open event
                              </Button>

                              <button
                                type="button"
                                onClick={() => navigate(worldName ? "/worlds" : "/play")}
                                className="ops-events-inline-link"
                              >
                                {worldName ? "Open world" : "Local practice"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
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
