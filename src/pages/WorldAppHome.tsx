import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Coins,
  PlayCircle,
  RotateCcw,
  Share2,
  ShieldCheck,
  Stamp,
  Swords,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";
import {
  hasIssuedSeasonPass,
  shortenWalletAddress,
  type MatchReceipt,
} from "@/lib/competitiveIdentity";
import WorldIDWidget from "@/components/WorldID";
import { BoardScene, type BoardSceneKey } from "@/components/board/BoardScene";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import {
  DecisionEntry,
  DecisionEntryFocus,
  DecisionLane,
  SystemMetaGrid,
  SystemMetaItem,
  SystemScreen,
  SystemSection,
  SystemSegmented,
  SystemSegmentedItem,
  UtilityPill,
  UtilityStrip,
} from "@/components/board/SystemSurface";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSolanaCompetitive } from "@/hooks/useSolanaCompetitive";
import { useWorldAppAuth } from "@/hooks/useWorldAppAuth";
import { useWorldShare } from "@/hooks/useWorldShare";
import { supabase } from "@/integrations/supabase/client";
import { getGameMeta, SHOWCASE_GAME_KEYS } from "@/lib/gameMetadata";
import { buildWebUrl } from "@/lib/surfaces";
import { loadWorldQuickplayState, runWorldQuickplay } from "@/lib/worldApp/quickplay";
import type { WorldQuickplayState } from "@/lib/worldApp/quickplay";
import type { WorldSummary } from "@/lib/worlds";
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
  const [competitiveIdentity, setCompetitiveIdentity] = useState<WorldQuickplayState["competitiveIdentity"]>(null);
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
  const solanaLane = competitiveIdentity?.solanaLane ?? competitive?.solanaLane ?? {
    walletLinked: false,
    hasSeasonPass: false,
    accessMode: "pass_required" as const,
    title: "Link Solana wallet",
    body: "World proves the human. Solana carries access and receipts.",
  };
  const linkedSolanaWallet = competitiveIdentity?.linkedWallet ?? null;
  const roomPasses = competitiveIdentity?.roomPasses ?? [];
  const recentReceipts = competitiveIdentity?.recentReceipts ?? [];
  const receiptMatchIds = useMemo(() => new Set(recentReceipts.map((receipt) => receipt.matchId)), [recentReceipts]);

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
      setCompetitiveIdentity(state.competitiveIdentity ?? null);
    } catch (error) {
      toast.error("World console data failed to load", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setLoadingData(false);
    }
  }, [worldAuth.supabaseSession]);

  useEffect(() => {
    void loadConsoleData();
  }, [loadConsoleData]);

  const handleCompetitiveState = useCallback(
    (result: { competitiveIdentity: WorldQuickplayState["competitiveIdentity"] }) => {
      setCompetitiveIdentity(result.competitiveIdentity ?? null);
      void loadConsoleData();
    },
    [loadConsoleData],
  );

  const solanaCompetitive = useSolanaCompetitive(worldAuth.supabaseSession, handleCompetitiveState);

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

  const linkSolanaWallet = useCallback(async () => {
    try {
      await ensureWorldSeat();
      await solanaCompetitive.connectWallet();
      await haptic("success");
      toast.success("Solana wallet linked");
    } catch (error) {
      toast.error("Could not link Solana wallet", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }, [ensureWorldSeat, haptic, solanaCompetitive]);

  const activateSeasonPass = useCallback(async () => {
    try {
      await ensureWorldSeat();
      await solanaCompetitive.activateSeasonPass(selectedGame);
      await haptic("success");
      toast.success("Season pass active");
    } catch (error) {
      toast.error("Could not activate pass", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }, [ensureWorldSeat, haptic, selectedGame, solanaCompetitive]);

  const startSolanaRanked = useCallback(async () => {
    setStarting("ranked");

    try {
      await ensureWorldSeat();

      if (!isHumanVerified) {
        setActiveTab("profile");
        await haptic("invalid");
        toast.error("Verify to enter ranked");
        return;
      }

      if (!linkedSolanaWallet) {
        setActiveTab("profile");
        await haptic("invalid");
        toast.error("Link Solana to enter the receipt-backed lane");
        return;
      }

      if (!hasIssuedSeasonPass(roomPasses, selectedGame)) {
        setActiveTab("profile");
        await haptic("invalid");
        toast.error("Activate a room pass first");
        return;
      }

      const session = await getQuickplaySession();
      const result = await runWorldQuickplay(session, {
        mode: "ranked",
        gameKey: selectedGame,
        competitiveAccessMode: "pass_required",
        walletProvider: "solana",
      });

      await haptic("selection");
      navigate(result.destination);
    } catch (error) {
      toast.error("Solana-ranked entry failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setStarting(null);
    }
  }, [
    ensureWorldSeat,
    getQuickplaySession,
    haptic,
    isHumanVerified,
    linkedSolanaWallet,
    navigate,
    roomPasses,
    selectedGame,
  ]);

  const sealRecentReceipt = useCallback(async () => {
    if (!recentResult?.matchId) return;

    try {
      await ensureWorldSeat();
      await solanaCompetitive.sealReceipt(recentResult.matchId);
      await haptic("success");
      toast.success("Match receipt issued");
    } catch (error) {
      toast.error("Could not issue receipt", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }, [ensureWorldSeat, haptic, recentResult?.matchId, solanaCompetitive]);

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
      visualMode="world"
      contentMode="full"
      className="ios-safe-area"
      contentClassName="pb-0 pt-0"
    >
      <main className="world-flow-shell">
        <div className="world-flow-app">
          <section className="world-flow-scroll">
            <SystemScreen
              variant="world"
              compact
              label={isWalletBound ? worldHandle : "Seat not bound"}
              title="Enter a verified room."
              description={
                isWalletBound
                  ? "World proves the human. Solana carries the pass and receipt."
                  : "Bind a World seat, then choose your lane."
              }
              actions={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 border-0"
                  onClick={loadConsoleData}
                  aria-label="Refresh World App console"
                >
                  <CircleDot className={loadingData ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
                </Button>
              }
              utility={
                <UtilityStrip>
                  <UtilityPill strong>world seat</UtilityPill>
                  <UtilityPill>{isWalletBound ? "wallet bound" : "bind wallet"}</UtilityPill>
                  <UtilityPill>{isHumanVerified ? "human verified" : "verification pending"}</UtilityPill>
                  <UtilityPill>{linkedSolanaWallet ? "solana linked" : "solana optional"}</UtilityPill>
                  {activeRankedMatch ? <UtilityPill>resume ready</UtilityPill> : null}
                </UtilityStrip>
              }
            >
              <div className="flex items-center justify-between gap-3">
                <BoardWordmark className="text-[#101114]" />
                <div className="system-onboarding-choice__glyph h-11 w-11">
                  <BoardScene game={selectedSceneKey} state="selected" decorative className="h-5 w-5 text-[#090909]" />
                </div>
              </div>

              {activeTab === "play" ? (
                <div className="world-flow-stack">
                  {activeRankedMatch ? (
                    <CompetitiveActionCard
                      eyebrow="Resume ranked"
                      title={`${gameLabel(activeRankedMatch.gameKey)} match`}
                      body={
                        activeRankedMatch.status === "waiting"
                          ? "Seat is waiting. Keep the queue alive."
                          : "Match is live. Continue from the board."
                      }
                      meta={activeRankedMatch.status}
                      action={starting === "resume" ? "Resuming" : "Resume"}
                      icon={PlayCircle}
                      disabled={Boolean(starting)}
                      onClick={resumeRanked}
                    />
                  ) : null}

                  <CompetitiveActionCard
                    eyebrow="Solana lane"
                    title={solanaLane.title}
                    body={solanaLane.body}
                    meta={
                      linkedSolanaWallet
                        ? hasIssuedSeasonPass(roomPasses, selectedGame)
                          ? "pass ready"
                          : "pass needed"
                        : "wallet needed"
                    }
                    action={
                      !linkedSolanaWallet
                        ? solanaCompetitive.action === "connect"
                          ? "Linking"
                          : "Link Solana"
                        : !hasIssuedSeasonPass(roomPasses, selectedGame)
                          ? solanaCompetitive.action === "pass"
                            ? "Activating"
                            : "Activate pass"
                          : starting === "ranked"
                            ? "Entering"
                            : "Receipt-backed ranked"
                    }
                    icon={!linkedSolanaWallet ? Coins : !hasIssuedSeasonPass(roomPasses, selectedGame) ? CheckCircle2 : ShieldCheck}
                    disabled={Boolean(starting) || solanaCompetitive.action !== null}
                    onClick={
                      !linkedSolanaWallet
                        ? linkSolanaWallet
                        : !hasIssuedSeasonPass(roomPasses, selectedGame)
                          ? activateSeasonPass
                          : startSolanaRanked
                    }
                  />

                  <SystemSection
                    variant="world"
                    label="World lane"
                    title={gameLabel(selectedGame)}
                    description={selectedGameMeta.tagline || "Pick one game. Commit once."}
                    utility={
                      <UtilityStrip>
                      <UtilityPill strong={isHumanVerified}>ranked</UtilityPill>
                      <UtilityPill>{isWalletBound ? "seat bound" : "seat needed"}</UtilityPill>
                      <UtilityPill>{selectedRankedGame?.queue.waiting ?? 0} waiting</UtilityPill>
                      </UtilityStrip>
                    }
                  >
                    <SystemSegmented>
                      {SHOWCASE_GAME_KEYS.map((gameKey) => {
                        const meta = getGameMeta(gameKey);
                        return (
                          <SystemSegmentedItem
                            key={gameKey}
                            selected={selectedGame === gameKey}
                            className="system-segmented__item--compact"
                            onClick={() => setSelectedGame(gameKey)}
                          >
                            {gameLabel(meta.key)}
                          </SystemSegmentedItem>
                        );
                      })}
                    </SystemSegmented>

                    <RankedGameStats game={selectedRankedGame} />

                    <div className="world-row-action">
                      <Button
                        type="button"
                        variant="hero"
                        onClick={startRanked}
                        disabled={Boolean(starting)}
                        className="min-h-[3.2rem] justify-between border-0"
                      >
                        <span>{starting === "ranked" ? "Entering ranked" : "Quick ranked"}</span>
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={startRankedRematch}
                        disabled={Boolean(starting)}
                        className="min-h-[3.2rem] justify-between border-0"
                      >
                        <span>{starting === "rematch" ? "Finding rematch" : "Rematch ranked"}</span>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openUnrankedRoom}
                        disabled={Boolean(starting)}
                        className="min-h-[3.2rem] justify-between border-0"
                      >
                        <span>{starting === "room" ? "Opening room" : "Open unranked room"}</span>
                        <Swords className="h-4 w-4" />
                      </Button>
                    </div>
                  </SystemSection>

                  {recentResult ? (
                    <RecentResultStrip
                      result={recentResult}
                      onRematch={startRankedRematch}
                      onSealReceipt={recentResult.matchId && !receiptMatchIds.has(recentResult.matchId) ? sealRecentReceipt : null}
                      receiptIssued={Boolean(recentResult.matchId && receiptMatchIds.has(recentResult.matchId))}
                      receiptBusy={solanaCompetitive.action === "receipt"}
                      disabled={Boolean(starting)}
                    />
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
                <div className="world-flow-stack">
                  <JoinCodePanel
                    value={roomCode}
                    busy={starting === "join"}
                    onChange={updateRoomCode}
                    onJoin={joinRoomByCode}
                  />
                  {rooms.length ? (
                    <DecisionLane>
                      {rooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          onJoin={() => joinRoom(room)}
                          onShare={() => shareRoom(room)}
                          busy={starting === "join"}
                        />
                      ))}
                    </DecisionLane>
                  ) : (
                    <EmptyPanel title="No public rooms" body="Open a room and share it from here." />
                  )}
                </div>
              ) : null}

              {activeTab === "events" ? (
                <div className="world-flow-stack">
                  {events.length ? (
                    <DecisionLane>
                      {events.map((event) => (
                        <DecisionEntry
                          key={event.id}
                          selected={event.status === "active"}
                          onClick={() => navigate(`/tournament/${event.id}`)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="system-screen__label">
                                {event.competitive_mode ? "competitive" : "open event"}
                              </p>
                              <h3 className="ops-directory-row__title">{event.name}</h3>
                              <p className="ops-directory-row__meta">
                                {event.start_time
                                  ? `Starts ${new Date(event.start_time).toLocaleDateString()}.`
                                  : "Open the bracket when the room matters."}
                              </p>
                            </div>
                            <UtilityPill strong={event.status === "active"}>{event.status}</UtilityPill>
                          </div>
                        </DecisionEntry>
                      ))}
                    </DecisionLane>
                  ) : (
                    <EmptyPanel title="No events live" body="Scheduled rooms will show here." />
                  )}
                </div>
              ) : null}

              {activeTab === "profile" ? (
                <div className="world-flow-stack">
                  <SystemSection
                    variant="world"
                    label="World profile"
                    title={worldHandle}
                    description="World keeps the human seat. Solana carries room access and receipts."
                  >
                    <SystemMetaGrid>
                      <SystemMetaItem
                        label="Wallet"
                        value={isWalletBound ? "bound" : "needed"}
                        note={isWalletBound ? "Seat attached." : "Bind before entry."}
                        strong={isWalletBound}
                      />
                      <SystemMetaItem
                        label="Human"
                        value={isHumanVerified ? "verified" : "not yet"}
                        note={isHumanVerified ? "Ranked ready." : "Ranked stays locked."}
                        strong={isHumanVerified}
                      />
                    </SystemMetaGrid>

                    {!isWalletBound ? (
                      <Button
                        type="button"
                        variant="hero"
                        onClick={() => worldAuth.connectWallet().then(() => loadConsoleData())}
                        disabled={worldAuth.status === "connecting" || worldAuth.status === "creating-session"}
                        className="min-h-[3.2rem] w-full justify-between border-0"
                      >
                        <span>{worldAuth.status === "connecting" ? "Binding wallet" : "Bind World wallet"}</span>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    ) : null}

                    {worldAuth.error ? <p className="system-inline-note">{worldAuth.error}</p> : null}
                  </SystemSection>

                  <SystemSection
                    variant="world"
                    label="Competitive identity"
                    title={linkedSolanaWallet ? shortenWalletAddress(linkedSolanaWallet.address) : "Solana not linked"}
                    description={
                      linkedSolanaWallet
                        ? "This wallet holds room passes and match receipts."
                        : "Link once, then carry pass-backed ranked access."
                    }
                  >
                    <SystemMetaGrid>
                      <SystemMetaItem
                        label="Wallet"
                        value={linkedSolanaWallet ? "linked" : "needed"}
                        note={linkedSolanaWallet ? shortenWalletAddress(linkedSolanaWallet.address) : solanaCompetitive.walletLabel}
                        strong={Boolean(linkedSolanaWallet)}
                      />
                      <SystemMetaItem
                        label="Passes"
                        value={String(competitiveIdentity?.profile.passCount ?? 0)}
                        note={hasIssuedSeasonPass(roomPasses, selectedGame) ? "Season pass live." : "Activate one for ranked."}
                        strong={hasIssuedSeasonPass(roomPasses, selectedGame)}
                      />
                      <SystemMetaItem
                        label="Receipts"
                        value={String(competitiveIdentity?.profile.receiptCount ?? 0)}
                        note={competitiveIdentity?.profile.latestReceiptAt ? `Last ${timeAgo(competitiveIdentity.profile.latestReceiptAt)}` : "Seal after matches."}
                        strong={Boolean(competitiveIdentity?.profile.receiptCount)}
                      />
                    </SystemMetaGrid>

                    <div className="world-row-action">
                      {!linkedSolanaWallet ? (
                        <Button
                          type="button"
                          variant="hero"
                          onClick={linkSolanaWallet}
                          disabled={solanaCompetitive.action !== null}
                          className="min-h-[3.2rem] justify-between border-0"
                        >
                          <span>{solanaCompetitive.action === "connect" ? "Linking Solana" : "Link Solana wallet"}</span>
                          <Coins className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="hero"
                          onClick={activateSeasonPass}
                          disabled={solanaCompetitive.action !== null || hasIssuedSeasonPass(roomPasses, selectedGame)}
                          className="min-h-[3.2rem] justify-between border-0"
                        >
                          <span>
                            {hasIssuedSeasonPass(roomPasses, selectedGame)
                              ? "Season pass active"
                              : solanaCompetitive.action === "pass"
                                ? "Activating pass"
                                : "Activate season pass"}
                          </span>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {!solanaCompetitive.walletAvailable ? (
                      <p className="system-inline-note">Install Phantom or Backpack to link a Solana wallet in browser.</p>
                    ) : null}

                    {solanaCompetitive.error ? <p className="system-inline-note">{solanaCompetitive.error}</p> : null}

                    {recentReceipts.length ? (
                      <DecisionLane>
                        {recentReceipts.map((receipt) => (
                          <ReceiptRow key={receipt.id} receipt={receipt} />
                        ))}
                      </DecisionLane>
                    ) : null}
                  </SystemSection>

                  <WorldIDWidget variant="world" />
                </div>
              ) : null}
            </SystemScreen>
          </section>

          <nav className="world-flow-footer">
            <SystemSegmented className="world-flow-tabs">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SystemSegmentedItem
                    key={tab.id}
                    selected={activeTab === tab.id}
                    className="system-segmented__item--stacked"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </SystemSegmentedItem>
                );
              })}
            </SystemSegmented>
          </nav>
        </div>
      </main>
    </SiteFrame>
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
    <DecisionEntry onClick={onClick}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="ops-directory-row__title">{title}</h3>
          <p className="ops-directory-row__meta">{label}</p>
        </div>
        <UtilityPill strong>{action}</UtilityPill>
      </div>
    </DecisionEntry>
  );
}

function RankedGameStats({ game }: { game: RankedGameState | null }) {
  const rank = game?.rank ? `#${game.rank}` : "new";
  const waiting = game?.queue.waiting ?? 0;
  const active = game?.queue.active ?? 0;

  return (
    <SystemMetaGrid>
      <SystemMetaItem label="Rating" value={String(game?.rating ?? 1200)} note="Current board rating." />
      <SystemMetaItem label="Rank" value={rank} note="Live ladder slot." />
      <SystemMetaItem label="Waiting" value={String(waiting)} note="Seats waiting now." />
      <SystemMetaItem label="Active" value={String(active)} note="Boards already live." />
    </SystemMetaGrid>
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
    <SystemSection
      variant="world"
      className="world-section--strong"
      label={eyebrow}
      title={title}
      description={body}
      utility={
        <UtilityStrip>
          <UtilityPill strong>{meta}</UtilityPill>
        </UtilityStrip>
      }
    >
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        className="min-h-[3.2rem] w-full justify-between border-0 bg-white text-[#101114] hover:bg-[#f2f0ea]"
      >
        <span>{action}</span>
        <Icon className="h-4 w-4" />
      </Button>
    </SystemSection>
  );
}

function RecentResultStrip({
  result,
  onRematch,
  onSealReceipt,
  receiptIssued,
  receiptBusy,
  disabled,
}: {
  result: RecentResultState;
  onRematch: () => void;
  onSealReceipt: (() => void) | null;
  receiptIssued: boolean;
  receiptBusy: boolean;
  disabled: boolean;
}) {
  const ratingChange = result.ratingChange > 0 ? `+${result.ratingChange}` : String(result.ratingChange);

  return (
    <DecisionEntry as="div" disabled={disabled}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="system-screen__label">Last ranked / {gameLabel(result.gameKey)}</p>
          <h3 className="ops-directory-row__title">{result.outcome} {ratingChange}</h3>
        </div>
        <UtilityPill>{receiptIssued ? "receipt sealed" : "receipt open"}</UtilityPill>
      </div>
      <DecisionEntryFocus>
        <div className="world-row-action">
          <Button type="button" variant="hero" onClick={onRematch} disabled={disabled} className="min-h-[3rem] border-0">
            Rematch
          </Button>
          {onSealReceipt ? (
            <Button
              type="button"
              variant="outline"
              onClick={onSealReceipt}
              disabled={receiptBusy}
              className="min-h-[3rem] border-0"
            >
              {receiptBusy ? "Sealing" : "Seal receipt"}
            </Button>
          ) : null}
        </div>
      </DecisionEntryFocus>
    </DecisionEntry>
  );
}

function ReceiptRow({ receipt }: { receipt: MatchReceipt }) {
  return (
    <DecisionEntry as="div" selected={receipt.status === "issued" || receipt.status === "finalized"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="system-screen__label">Receipt / {gameLabel(receipt.gameKey)}</p>
          <h3 className="ops-directory-row__title">{receipt.status}</h3>
          <p className="ops-directory-row__meta">
            {receipt.outcome ? `${receipt.outcome}. ` : ""}
            {typeof receipt.ratingChange === "number"
              ? `${receipt.ratingChange > 0 ? "+" : ""}${receipt.ratingChange} rating. `
              : ""}
            {timeAgo(receipt.issuedAt)}
          </p>
        </div>
        <UtilityPill strong>{receipt.status}</UtilityPill>
      </div>
      <DecisionEntryFocus>
        <p className="system-inline-note">Portable proof for match {receipt.matchId.slice(0, 8)}.</p>
      </DecisionEntryFocus>
    </DecisionEntry>
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
    <SystemSection
      variant="world"
      label="Room code"
      title="Join direct"
      description="Paste one code and enter the room."
      utility={
        <UtilityStrip>
          <UtilityPill>invite</UtilityPill>
        </UtilityStrip>
      }
    >
      <div className="world-inline-field">
        <Input
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
          className="world-input border-0 bg-[#f3efe6] font-mono text-[1.1rem] font-black uppercase tracking-[0.12em]"
          aria-label="Room code"
        />
        <Button
          type="button"
          variant="hero"
          onClick={onJoin}
          disabled={busy || value.length < 4}
          className="min-h-[3.25rem] border-0 px-5"
        >
          {busy ? "Joining" : "Join"}
        </Button>
      </div>
    </SystemSection>
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
  const isFull = room.playerCount >= 2;

  return (
    <DecisionEntry as="div" selected={!isFull && room.status === "waiting"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="system-screen__label">
            {gameLabel(gameMeta.key)} / {timeAgo(room.created_at)}
          </p>
          <h3 className="ops-directory-row__title">{room.code}</h3>
          <p className="ops-directory-row__meta">
            {room.board_size}x{room.board_size}. {isFull ? "Room full." : "Seat open."}
          </p>
        </div>
        <UtilityPill strong={!isFull}>{room.playerCount}/2</UtilityPill>
      </div>

      <DecisionEntryFocus>
        <p className="system-inline-note">
          {isFull ? "Watch the board or wait for a seat to open." : "Commit when the room is right."}
        </p>
        <div className="world-row-action">
          <Button
            type="button"
            variant={isFull ? "outline" : "hero"}
            onClick={onJoin}
            disabled={busy || isFull}
            className="min-h-[3rem] border-0"
          >
            {busy ? "Joining" : isFull ? "Room full" : "Join room"}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onShare} className="h-11 w-11 border-0">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </DecisionEntryFocus>
    </DecisionEntry>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <SystemSection variant="world" title={title} description={body} />
  );
}
