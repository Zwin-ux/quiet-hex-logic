import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  PlayCircle,
  RotateCcw,
  Share2,
  ShieldCheck,
  Swords,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";
import WorldIDWidget from "@/components/WorldID";
import { BoardScene, type BoardSceneKey } from "@/components/board/BoardScene";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { useWorldAppAuth } from "@/hooks/useWorldAppAuth";
import { useWorldShare } from "@/hooks/useWorldShare";
import { supabase } from "@/integrations/supabase/client";
import { getGameMeta, SHOWCASE_GAME_KEYS } from "@/lib/gameMetadata";
import { buildWebUrl } from "@/lib/surfaces";
import { loadWorldQuickplayState, runWorldQuickplay } from "@/lib/worldApp/quickplay";
import type { WorldQuickplayState } from "@/lib/worldApp/quickplay";
import type { WorldSummary } from "@/lib/worlds";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ConsoleTab = "play" | "rooms" | "events" | "profile";

type RoomRow = {
  id: string;
  code: string;
  game_key: string | null;
  board_size: number;
  status: string;
  created_at: string;
  world_id: string | null;
  playerCount: number;
};

type EventRow = {
  id: string;
  name: string;
  status: string;
  competitive_mode: boolean | null;
  start_time: string | null;
  max_players: number | null;
};

type ProfileState = {
  username: string;
  world_username: string | null;
  world_app_bound_at: string | null;
  is_verified_human: boolean | null;
};

type CompetitiveState = WorldQuickplayState["competitive"];
type RankedGameState = CompetitiveState["games"][number];
type RecentResultState = CompetitiveState["recentResults"][number];

const tabItems: Array<{ id: ConsoleTab; label: string; icon: typeof Zap }> = [
  { id: "play", label: "Play", icon: Zap },
  { id: "rooms", label: "Rooms", icon: UsersRound },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "profile", label: "Profile", icon: UserRound },
];

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function gameLabel(gameKey: string | null | undefined) {
  if (gameKey === "connect4") return "Connect 4";
  if (gameKey === "ttt") return "Tic-Tac-Toe";
  if (!gameKey) return "Hex";
  return `${gameKey.charAt(0).toUpperCase()}${gameKey.slice(1)}`;
}

export default function WorldAppHome() {
  const navigate = useNavigate();
  const worldAuth = useWorldAppAuth();
  const { share, haptic } = useWorldShare();
  const [activeTab, setActiveTab] = useState<ConsoleTab>("play");
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [competitive, setCompetitive] = useState<CompetitiveState | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedGame, setSelectedGame] = useState<(typeof SHOWCASE_GAME_KEYS)[number]>("hex");
  const [roomCode, setRoomCode] = useState("");
  const [starting, setStarting] = useState<"ranked" | "room" | "resume" | "rematch" | "join" | null>(null);

  const isWalletBound = worldAuth.isWalletBound || Boolean(profile?.world_app_bound_at);
  const isHumanVerified = worldAuth.isHumanVerified || Boolean(profile?.is_verified_human);
  const worldHandle = worldAuth.identity?.world_username || profile?.world_username || worldAuth.user?.username || "World player";
  const primaryRoom = rooms.find((room) => room.playerCount < 2) ?? rooms[0] ?? null;
  const liveWorld = worlds.find((world) => world.instanceCount > 0) ?? worlds[0] ?? null;
  const activeRankedMatch = competitive?.activeMatch ?? null;
  const recentResult = competitive?.recentResults[0] ?? null;
  const selectedRankedGame = competitive?.games.find((game) => game.gameKey === selectedGame) ?? null;

  const selectedGameMeta = useMemo(() => getGameMeta(selectedGame), [selectedGame]);
  const selectedSceneKey = selectedGameMeta.key as BoardSceneKey;

  const loadConsoleData = useCallback(async () => {
    setLoadingData(true);

    try {
      const session = worldAuth.supabaseSession ?? (await supabase.auth.getSession()).data.session;
      if (!session) {
        setWorlds([]);
        setRooms([]);
        setEvents([]);
        setProfile(null);
        setCompetitive(null);
        return;
      }

      const state = await loadWorldQuickplayState(session);
      setWorlds(state.worlds as WorldSummary[]);
      setRooms(state.rooms as RoomRow[]);
      setEvents(state.events as EventRow[]);
      setProfile((state.profile ?? null) as ProfileState | null);
      setCompetitive(state.competitive);
    } catch (error) {
      toast.error("World console data failed to load", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setLoadingData(false);
    }
  }, [worldAuth.supabaseSession]);

  useEffect(() => {
    loadConsoleData();
  }, [loadConsoleData]);

  const ensureWorldSeat = useCallback(async () => {
    if (isWalletBound) return true;
    await worldAuth.connectWallet();
    await worldAuth.reloadIdentity();
    await loadConsoleData();
    await haptic("success");
    return true;
  }, [haptic, isWalletBound, loadConsoleData, worldAuth]);

  const getQuickplaySession = useCallback(async () => {
    const currentSession = worldAuth.supabaseSession ?? (await supabase.auth.getSession()).data.session;
    if (!currentSession) {
      throw new Error("Create a BOARD session before entering Quickplay.");
    }
    return currentSession;
  }, [worldAuth.supabaseSession]);

  const startRanked = useCallback(async () => {
    setStarting("ranked");

    try {
      await ensureWorldSeat();

      if (!isHumanVerified) {
        setActiveTab("profile");
        await haptic("invalid");
        toast.error("Verify to enter ranked");
        return;
      }

      const session = await getQuickplaySession();
      const result = await runWorldQuickplay(session, {
        mode: "ranked",
        gameKey: selectedGame,
      });

      await haptic("selection");
      navigate(result.destination);
    } catch (error) {
      toast.error("Ranked entry failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setStarting(null);
    }
  }, [ensureWorldSeat, getQuickplaySession, haptic, isHumanVerified, navigate, selectedGame]);

  const resumeRanked = useCallback(async () => {
    setStarting("resume");

    try {
      await ensureWorldSeat();

      if (!isHumanVerified) {
        setActiveTab("profile");
        await haptic("invalid");
        toast.error("Verify to resume ranked");
        return;
      }

      const session = await getQuickplaySession();
      const result = await runWorldQuickplay(session, {
        mode: "resume-ranked",
        matchId: activeRankedMatch?.id,
      });

      await haptic("selection");
      navigate(result.destination);
    } catch (error) {
      toast.error("Could not resume ranked", {
        description: error instanceof Error ? error.message : "Try again.",
      });
      await loadConsoleData();
    } finally {
      setStarting(null);
    }
  }, [activeRankedMatch?.id, ensureWorldSeat, getQuickplaySession, haptic, isHumanVerified, loadConsoleData, navigate]);

  const startRankedRematch = useCallback(async () => {
    setStarting("rematch");

    try {
      await ensureWorldSeat();

      if (!isHumanVerified) {
        setActiveTab("profile");
        await haptic("invalid");
        toast.error("Verify to rematch");
        return;
      }

      const session = await getQuickplaySession();
      const result = await runWorldQuickplay(
        session,
        recentResult?.matchId
          ? {
              mode: "ranked-rematch",
              matchId: recentResult.matchId,
            }
          : {
              mode: "ranked-rematch",
              gameKey: recentResult?.gameKey ?? selectedGame,
            },
      );

      await haptic("selection");
      navigate(result.destination);
    } catch (error) {
      toast.error("Rematch failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
      await loadConsoleData();
    } finally {
      setStarting(null);
    }
  }, [ensureWorldSeat, getQuickplaySession, haptic, isHumanVerified, loadConsoleData, navigate, recentResult, selectedGame]);

  const openUnrankedRoom = useCallback(async () => {
    setStarting("room");

    try {
      await ensureWorldSeat();

      const session = await getQuickplaySession();
      const result = await runWorldQuickplay(session, {
        mode: "room",
        gameKey: selectedGame,
      });

      await haptic("success");
      navigate(result.destination);
    } catch (error) {
      toast.error("Could not open room", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setStarting(null);
    }
  }, [ensureWorldSeat, getQuickplaySession, haptic, navigate, selectedGame]);

  const joinRoom = useCallback(
    async (room: RoomRow) => {
      setStarting("join");

      try {
        await ensureWorldSeat();

        const session = await getQuickplaySession();
        const result = await runWorldQuickplay(session, {
          mode: "join-room",
          code: room.code,
        });

        await haptic("selection");
        navigate(result.destination);
      } catch (error) {
        toast.error("Could not join room", {
          description: error instanceof Error ? error.message : "Try again.",
        });
      } finally {
        setStarting(null);
      }
    },
    [ensureWorldSeat, getQuickplaySession, haptic, navigate],
  );

  const joinRoomByCode = useCallback(async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length < 4) {
      await haptic("invalid");
      toast.error("Enter a room code");
      return;
    }

    setStarting("join");

    try {
      await ensureWorldSeat();

      const session = await getQuickplaySession();
      const result = await runWorldQuickplay(session, {
        mode: "join-room",
        code,
      });

      setRoomCode("");
      await haptic("selection");
      navigate(result.destination);
    } catch (error) {
      toast.error("Could not join room", {
        description: error instanceof Error ? error.message : "Check the code and try again.",
      });
    } finally {
      setStarting(null);
    }
  }, [ensureWorldSeat, getQuickplaySession, haptic, navigate, roomCode]);

  const updateRoomCode = useCallback((value: string) => {
    setRoomCode(value.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase());
  }, []);

  const shareRoom = useCallback(
    async (room: RoomRow) => {
      await share({
        title: "BOARD room open",
        text: `Room ${room.code} is open.`,
        url: buildWebUrl(`/lobby/${room.id}`),
      });
      await haptic("selection");
    },
    [haptic, share],
  );

  return (
    <SiteFrame
      showNav={false}
      visualMode="mono"
      contentMode="full"
      className="ios-safe-area"
      contentClassName="pb-0 pt-0"
    >
      <main className="world-console-shell">
        <div className="world-console-app">
          <header className="world-console-topbar">
            <div className="flex items-center justify-between gap-3">
              <BoardWordmark className="text-[#101114]" />
              <div className="world-console-seat">
                World seat
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/48">
                  {isWalletBound ? worldHandle : "Seat not bound"}
                </p>
                <h1 className="mt-1 text-[2.35rem] font-black leading-[0.9] tracking-[-0.075em]">
                  Enter a human room.
                </h1>
              </div>
              <button
                type="button"
                onClick={loadConsoleData}
                className="world-console-refresh"
                aria-label="Refresh World App console"
              >
                <CircleDot className={cn("h-5 w-5", loadingData && "animate-spin")} />
              </button>
            </div>
          </header>

          <section className="world-console-scroll">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatusTile
                label="Wallet"
                value={isWalletBound ? "bound" : "bind"}
                active={isWalletBound}
              />
              <StatusTile
                label="Ranked"
                value={isHumanVerified ? "human" : "locked"}
                active={isHumanVerified}
              />
            </div>

          {activeTab === "play" ? (
            <div className="space-y-4">
              {activeRankedMatch ? (
                <CompetitiveActionCard
                  eyebrow="Resume ranked"
                  title={`${gameLabel(activeRankedMatch.gameKey)} match`}
                  body={activeRankedMatch.status === "waiting" ? "Seat is waiting. Keep the queue alive." : "Match is live. Continue from the board."}
                  meta={activeRankedMatch.status}
                  action={starting === "resume" ? "Resuming" : "Resume"}
                  icon={PlayCircle}
                  disabled={Boolean(starting)}
                  onClick={resumeRanked}
                />
              ) : null}

              <section className="world-console-card text-[#101114]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/44">
                      Quick entry
                    </p>
                    <h2 className="mt-2 text-[2.15rem] font-black leading-[0.9] tracking-[-0.065em]">
                      {gameLabel(selectedGame)}
                    </h2>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#090909] text-white">
                    <BoardScene game={selectedSceneKey} state="selected" decorative className="h-6 w-6 text-[#f6f4f0]" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {SHOWCASE_GAME_KEYS.map((gameKey) => {
                    const meta = getGameMeta(gameKey);
                    return (
                      <button
                        key={gameKey}
                        type="button"
                        onClick={() => setSelectedGame(gameKey)}
                        className={cn(
                          "rounded-[18px] px-3 py-3 text-left text-[12px] font-black uppercase tracking-[0.16em] transition-colors",
                          selectedGame === gameKey
                            ? "bg-[#090909] text-white"
                            : "bg-[#f3efe6] text-black/58",
                        )}
                      >
                        {gameLabel(meta.key)}
                      </button>
                    );
                  })}
                </div>

                <RankedGameStats game={selectedRankedGame} />

                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    variant="hero"
                    onClick={startRanked}
                    disabled={Boolean(starting)}
                    className="h-14 justify-between rounded-[18px] bg-[#101114] text-white"
                  >
                    <span>{starting === "ranked" ? "Entering ranked" : "Quick ranked"}</span>
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startRankedRematch}
                    disabled={Boolean(starting)}
                    className="h-14 justify-between rounded-[18px]"
                  >
                    <span>{starting === "rematch" ? "Finding rematch" : "Rematch ranked"}</span>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openUnrankedRoom}
                    disabled={Boolean(starting)}
                    className="h-14 justify-between rounded-[18px]"
                  >
                    <span>{starting === "room" ? "Opening room" : "Open unranked room"}</span>
                    <Swords className="h-4 w-4" />
                  </Button>
                </div>
              </section>

              {recentResult ? (
                <RecentResultStrip result={recentResult} onRematch={startRankedRematch} disabled={Boolean(starting)} />
              ) : null}

              <ConsoleStrip
                title={primaryRoom ? `Room ${primaryRoom.code}` : "No room open"}
                label={primaryRoom ? `${primaryRoom.playerCount}/2 seats` : "Open one"}
                action={primaryRoom ? "Join" : "Rooms"}
                onClick={() => (primaryRoom ? joinRoom(primaryRoom) : setActiveTab("rooms"))}
              />
              <ConsoleStrip
                title={liveWorld?.name ?? "Public worlds"}
                label={liveWorld ? `${liveWorld.instanceCount} live` : "Directory"}
                action="Open"
                onClick={() => (liveWorld ? navigate(`/worlds/${liveWorld.id}`) : navigate("/worlds"))}
              />
            </div>
          ) : null}

          {activeTab === "rooms" ? (
            <div className="space-y-3">
              <JoinCodePanel
                value={roomCode}
                busy={starting === "join"}
                onChange={updateRoomCode}
                onJoin={joinRoomByCode}
              />
              {rooms.length ? (
                rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onJoin={() => joinRoom(room)}
                    onShare={() => shareRoom(room)}
                    busy={starting === "join"}
                  />
                ))
              ) : (
                <EmptyPanel title="No public rooms" body="Open a room and share it from here." />
              )}
            </div>
          ) : null}

          {activeTab === "events" ? (
            <div className="space-y-3">
              {events.length ? (
                events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate(`/tournament/${event.id}`)}
                    className="world-console-row"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/44">
                          {event.competitive_mode ? "competitive" : "open event"}
                        </p>
                        <h3 className="mt-2 text-[1.55rem] font-black leading-none tracking-[-0.05em] text-[#101114]">
                          {event.name}
                        </h3>
                      </div>
                      <span className="world-console-chip">
                        {event.status}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyPanel title="No events live" body="Scheduled rooms will show here." />
              )}
            </div>
          ) : null}

          {activeTab === "profile" ? (
            <div className="space-y-4">
              <section className="world-console-card">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/44">
                  World profile
                </p>
                <h2 className="mt-2 text-[2rem] font-black leading-none tracking-[-0.07em] text-[#101114]">
                  {worldHandle}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[#101114]">
                  <StatusTile label="Wallet" value={isWalletBound ? "bound" : "needed"} active={isWalletBound} />
                  <StatusTile label="Human" value={isHumanVerified ? "verified" : "not yet"} active={isHumanVerified} />
                </div>
                {!isWalletBound ? (
                  <Button
                    type="button"
                    variant="hero"
                    onClick={() => worldAuth.connectWallet().then(() => loadConsoleData())}
                    disabled={worldAuth.status === "connecting" || worldAuth.status === "creating-session"}
                    className="mt-4 w-full justify-between rounded-[18px] bg-[#101114] text-white"
                  >
                    <span>
                      {worldAuth.status === "connecting" ? "Binding wallet" : "Bind World wallet"}
                    </span>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                ) : null}
                {worldAuth.error ? (
                  <p className="mt-3 text-sm leading-6 text-black/68">{worldAuth.error}</p>
                ) : null}
              </section>

              <WorldIDWidget />
            </div>
          ) : null}
        </section>

          <nav className="z-30 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <div className="grid grid-cols-4 gap-2">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn("world-console-tab", selected && "is-selected")}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </main>
    </SiteFrame>
  );
}

function StatusTile({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[20px] px-3 py-3",
        active ? "bg-[#090909] text-[#f6f4f0]" : "bg-white text-[#101114]",
      )}
    >
      <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", active ? "text-white/54" : "text-black/44")}>
        {label}
      </p>
      <p className={cn("mt-1 text-[1.2rem] font-black uppercase leading-none tracking-[-0.04em]", active ? "text-[#f6f4f0]" : "text-[#101114]")}>
        {value}
      </p>
    </div>
  );
}

function ConsoleStrip({
  title,
  label,
  action,
  onClick,
}: {
  title: string;
  label: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="world-console-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
    >
      <div className="min-w-0">
        <p className="truncate text-[1.35rem] font-black leading-none tracking-[-0.05em] text-[#101114]">{title}</p>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-black/44">{label}</p>
      </div>
      <span className="world-console-chip">
        {action}
      </span>
    </button>
  );
}

function RankedGameStats({ game }: { game: RankedGameState | null }) {
  const rank = game?.rank ? `#${game.rank}` : "new";
  const waiting = game?.queue.waiting ?? 0;
  const active = game?.queue.active ?? 0;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <MiniStat label="Rating" value={String(game?.rating ?? 1200)} />
      <MiniStat label="Rank" value={rank} />
      <MiniStat label="Queue" value={`${waiting}/${active}`} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#f3efe6] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/44">{label}</p>
      <p className="mt-1 font-mono text-[1.1rem] font-black leading-none tracking-[-0.04em] text-[#101114]">
        {value}
      </p>
    </div>
  );
}

function CompetitiveActionCard({
  eyebrow,
  title,
  body,
  meta,
  action,
  icon: Icon,
  disabled,
  onClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
  action: string;
  icon: typeof PlayCircle;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <section className="world-console-card world-console-card--inverse">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">{eyebrow}</p>
          <h2 className="mt-2 text-[2rem] font-black leading-none tracking-[-0.065em]">{title}</h2>
          <p className="mt-2 max-w-[18rem] text-sm leading-6 text-white/70">{body}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#090909]">
          {meta}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        disabled={disabled}
        className="mt-4 h-14 w-full justify-between rounded-[18px] border-transparent bg-white text-[#101114]"
      >
        <span>{action}</span>
        <Icon className="h-4 w-4" />
      </Button>
    </section>
  );
}

function RecentResultStrip({
  result,
  onRematch,
  disabled,
}: {
  result: RecentResultState;
  onRematch: () => void;
  disabled: boolean;
}) {
  const ratingChange = result.ratingChange > 0 ? `+${result.ratingChange}` : String(result.ratingChange);

  return (
    <button
      type="button"
      onClick={onRematch}
      disabled={disabled}
      className="world-console-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 disabled:opacity-60"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/44">
          Last ranked / {gameLabel(result.gameKey)}
        </p>
        <p className="mt-2 text-[1.35rem] font-black capitalize leading-none tracking-[-0.05em] text-[#101114]">
          {result.outcome} {ratingChange}
        </p>
      </div>
      <span className="world-console-chip">
        Rematch
      </span>
    </button>
  );
}

function JoinCodePanel({
  value,
  busy,
  onChange,
  onJoin,
}: {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onJoin: () => void;
}) {
  return (
    <section className="world-console-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/44">Room code</p>
          <h2 className="mt-2 text-[1.8rem] font-black leading-none tracking-[-0.06em] text-[#101114]">
            Join direct
          </h2>
        </div>
        <span className="world-console-chip">
          Invite
        </span>
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onJoin();
          }}
          placeholder="ABCD"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="world-console-input font-mono text-[1.25rem] font-black uppercase tracking-[0.12em]"
          aria-label="Room code"
        />
        <Button
          type="button"
          variant="hero"
          onClick={onJoin}
          disabled={busy || value.length < 4}
          className="h-14 rounded-[18px] bg-[#101114] px-5 text-white"
        >
          {busy ? "Joining" : "Join"}
        </Button>
      </div>
    </section>
  );
}

function RoomCard({
  room,
  onJoin,
  onShare,
  busy,
}: {
  room: RoomRow;
  onJoin: () => void;
  onShare: () => void;
  busy: boolean;
}) {
  const gameMeta = getGameMeta(room.game_key ?? "hex");

  return (
    <article className="world-console-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/44">
            {gameLabel(gameMeta.key)} / {timeAgo(room.created_at)}
          </p>
          <h3 className="mt-2 text-[2rem] font-black leading-none tracking-[-0.07em] text-[#101114]">
            {room.code}
          </h3>
        </div>
        <span className="world-console-chip">
          {room.playerCount}/2
        </span>
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Button
          type="button"
          variant="hero"
          onClick={onJoin}
          disabled={busy || room.playerCount >= 2}
          className="rounded-[18px] bg-[#101114] text-white"
        >
          {busy ? "Joining" : room.playerCount >= 2 ? "Room full" : "Join room"}
        </Button>
        <Button type="button" variant="outline" onClick={onShare} className="rounded-[18px]">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="world-console-card">
      <p className="text-[1.8rem] font-black leading-none tracking-[-0.06em] text-[#101114]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-black/56">{body}</p>
    </div>
  );
}
