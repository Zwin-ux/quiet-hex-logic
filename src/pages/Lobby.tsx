import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Cpu, Loader2, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { BoardScene, type BoardSceneKey } from "@/components/board/BoardScene";
import {
  DecisionEntry,
  DecisionEntryFocus,
  DecisionLane,
  SystemScreen,
  SystemSection,
  UtilityPill,
  UtilityStrip,
} from "@/components/board/SystemSurface";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { ConvertAccountModal } from "@/components/ConvertAccountModal";
import { CreateLobby } from "@/components/CreateLobby";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { JoinLobby } from "@/components/JoinLobby";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SpectateButton } from "@/components/SpectateButton";
import { Button } from "@/components/ui/button";
import { WelcomeOnboarding } from "@/components/WelcomeOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGuestConversion } from "@/hooks/useGuestConversion";
import { useGuestMode } from "@/hooks/useGuestMode";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { buildAuthRoute } from "@/lib/authRedirect";
import { getGame, listGames } from "@/lib/engine/registry";
import { createLocalAIMatch } from "@/lib/localAiMatch";
import { listWorlds, type WorldSummary } from "@/lib/worlds";
import { useDiscord } from "@/lib/discord/DiscordContext";
import { toast } from "sonner";

type Match = {
  id: string;
  world_id?: string | null;
  size: number;
  pie_rule: boolean;
  status: string;
  created_at: string;
  owner: string;
  allow_spectators: boolean;
  game_key?: string | null;
  updated_at?: string | null;
};

type LobbyWithDetails = {
  id: string;
  code: string;
  host_id: string;
  world_id?: string | null;
  game_key?: string | null;
  board_size: number;
  pie_rule: boolean;
  status: string;
  created_at: string;
  profiles?: { username: string } | null;
  player_count?: number;
};

type PlayMode = "quickplay" | "live" | "worlds";

type ResumeMatch = {
  id: string;
  world_id?: string | null;
  size: number;
  game_key?: string | null;
  updated_at?: string | null;
};

function minutesSince(dateValue: string) {
  const date = new Date(dateValue);
  const elapsed = Math.floor((Date.now() - date.getTime()) / 60000);
  return elapsed < 1 ? "just opened" : `${elapsed} min live`;
}

function formatMatchUpdate(dateValue?: string | null) {
  if (!dateValue) return "active now";
  const date = new Date(dateValue);
  const elapsed = Math.floor((Date.now() - date.getTime()) / 60000);
  return elapsed < 1 ? "active now" : `updated ${elapsed} min ago`;
}

export default function Lobby() {
  useDocumentTitle("Play");

  const { user, loading } = useAuth();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [lobbies, setLobbies] = useState<LobbyWithDetails[]>([]);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [profile, setProfile] = useState<{ username: string; elo_rating: number } | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("medium");
  const [selectedAIGame, setSelectedAIGame] = useState<string>("hex");
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [networkIssue, setNetworkIssue] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [handledAutoCreate, setHandledAutoCreate] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("quickplay");
  const [selectedLiveLobbyId, setSelectedLiveLobbyId] = useState<string | null>(null);
  const [selectedWorldLobbyId, setSelectedWorldLobbyId] = useState<string | null>(null);
  const [resumeMatch, setResumeMatch] = useState<ResumeMatch | null>(null);
  const [joiningLobbyId, setJoiningLobbyId] = useState<string | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const { isGuest, guestUsername, loading: guestLoading } = useGuestMode();
  const { showConversionModal, setShowConversionModal, matchesCompleted } = useGuestConversion();
  const { isDiscordEnvironment, isAuthenticated: isDiscordAuth, discordUser } = useDiscord();
  const navigate = useNavigate();
  const location = useLocation();

  const games = useMemo(() => listGames(), []);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("username, elo_rating")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!isDiscordEnvironment && !loading && !user) {
      const routeState = location.state as { createAI?: boolean; competitive?: boolean } | null;
      if (routeState?.createAI || routeState?.competitive) return;
      const hasSeenOnboarding =
        localStorage.getItem("board_onboarded") || localStorage.getItem("openboard_onboarded");
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [isDiscordEnvironment, loading, location.state, user]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("board_onboarded", "true");
    localStorage.removeItem("openboard_onboarded");
    setShowOnboarding(false);
  };

  usePresence(user?.id);

  const worldNameById = useMemo(
    () => new Map(worlds.map((world) => [world.id, world.name])),
    [worlds],
  );

  const standaloneLobbies = useMemo(
    () => lobbies.filter((lobby) => !lobby.world_id),
    [lobbies],
  );

  const worldHostedLobbies = useMemo(
    () => lobbies.filter((lobby) => Boolean(lobby.world_id)),
    [lobbies],
  );

  const selectedLiveLobby =
    standaloneLobbies.find((lobby) => lobby.id === selectedLiveLobbyId) ?? standaloneLobbies[0] ?? null;
  const selectedWorldLobby =
    worldHostedLobbies.find((lobby) => lobby.id === selectedWorldLobbyId) ?? worldHostedLobbies[0] ?? null;
  const featuredLiveMatch = activeMatches[0] ?? null;
  const hostedRoom = useMemo(
    () =>
      lobbies.find((lobby) => lobby.host_id === user?.id) ??
      null,
    [lobbies, user?.id],
  );

  useEffect(() => {
    setSelectedLiveLobbyId((current) =>
      current && standaloneLobbies.some((lobby) => lobby.id === current)
        ? current
        : standaloneLobbies[0]?.id ?? null,
    );
  }, [standaloneLobbies]);

  useEffect(() => {
    setSelectedWorldLobbyId((current) =>
      current && worldHostedLobbies.some((lobby) => lobby.id === current)
        ? current
        : worldHostedLobbies[0]?.id ?? null,
    );
  }, [worldHostedLobbies]);

  useEffect(() => {
    if (playMode === "live" && standaloneLobbies.length === 0 && worldHostedLobbies.length > 0) {
      setPlayMode("worlds");
      return;
    }

    if (playMode === "worlds" && worldHostedLobbies.length === 0 && standaloneLobbies.length > 0) {
      setPlayMode("live");
    }
  }, [playMode, standaloneLobbies.length, worldHostedLobbies.length]);

  const isReadyForLocalPlay = isDiscordEnvironment ? isDiscordAuth : !loading;
  const isReadyForLiveDirectory = isDiscordEnvironment ? isDiscordAuth : !loading;
  const isLoading = isDiscordEnvironment ? !isDiscordAuth : loading;

  const createAIMatch = useCallback(
    async (
      difficulty: "easy" | "medium" | "hard" | "expert",
      size: number = 11,
      gameKey: string = "hex",
    ) => {
      setCreatingMatch(true);
      try {
        if (isDiscordEnvironment && discordUser) {
          const localMatchId = `discord-${discordUser.id}-${Date.now()}`;
          const initPayload = {
            isDiscordLocal: true,
            aiDifficulty: difficulty,
            boardSize: size,
            gameKey,
            discordUser: { id: discordUser.id, username: discordUser.username },
          };
          try {
            sessionStorage.setItem(`discord_local_match:${localMatchId}`, JSON.stringify(initPayload));
          } catch {
            // Embedded environments can block sessionStorage.
          }

          toast.success(`Starting ${difficulty} AI match`);
          navigate(`/match/${localMatchId}`, { state: initPayload });
          setCreatingMatch(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          const { id, payload } = createLocalAIMatch({
            difficulty,
            gameKey,
            boardSize: size,
            playerName: profile?.username ?? undefined,
          });
          toast.success(`Starting ${difficulty} practice match`);
          navigate(`/match/${id}`, { state: payload });
          setCreatingMatch(false);
          return;
        }

        const currentUserId = session.user.id;
        let pieRule = gameKey === "hex";
        try {
          const gameDef = listGames().find((game) => game.key === gameKey);
          if (gameDef) pieRule = gameDef.supportsPieRule;
        } catch {
          // Fall back to defaults if the registry is unavailable.
        }

        const { data: newMatch, error } = await supabase
          .from("matches")
          .insert({
            game_key: gameKey,
            size,
            pie_rule: pieRule,
            status: "active",
            turn: 1,
            owner: currentUserId,
            ai_difficulty: difficulty,
            allow_spectators: false,
          })
          .select()
          .single();

        if (error) throw error;

        const { error: playersError } = await supabase.from("match_players").insert({
          match_id: newMatch.id,
          profile_id: currentUserId,
          color: 1,
          is_bot: false,
        });

        if (playersError) throw new Error("Failed to add player to match");

        toast.success(`Starting ${difficulty} AI match`);
        navigate(`/match/${newMatch.id}`);
      } catch (error: any) {
        console.error("Error creating AI match:", error);
        toast.error(error.message || "Failed to create AI match");
      } finally {
        setCreatingMatch(false);
      }
    },
    [discordUser, isDiscordEnvironment, navigate, profile?.username],
  );

  const findOrCreateCompetitiveMatch = useCallback(
    async (gameKey: string = "hex") => {
      if (!user) {
        toast.error("You must be signed in to play competitive");
        return;
      }

      if (isGuest) {
        toast.error("Guests cannot play competitive mode. Create an account to access ranked matches.");
        return;
      }

      setCreatingMatch(true);
      try {
        const { data, error } = await supabase.functions.invoke("find-competitive-match", {
          body: { gameKey },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const { matchId, joined, waiting } = data;
        if (joined) toast.success("Opponent found. Starting match.");
        else if (waiting) toast.success("Searching for opponent...");

        navigate(`/match/${matchId}`);
      } catch (error: any) {
        console.error("Competitive matchmaking error:", error);
        if (/human verification/i.test(error.message || "")) {
          toast.error("Ranked play requires human verification", {
            description: "Open your profile and complete World ID before entering the competitive queue.",
          });
          navigate("/profile#identity");
          return;
        }

        toast.error(error.message || "Failed to find match");
      } finally {
        setCreatingMatch(false);
      }
    },
    [isGuest, navigate, user],
  );

  const fetchActiveMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "active")
        .eq("allow_spectators", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setActiveMatches(data || []);
      setNetworkIssue(null);
    } catch (error: any) {
      setNetworkIssue(error?.message ?? "Live boards unavailable");
      setActiveMatches([]);
    }
  }, []);

  const fetchWaitingLobbies = useCallback(async () => {
    setLoadingLobbies(true);
    try {
      const { data: lobbyData, error } = await supabase
        .from("lobbies")
        .select("id, code, host_id, world_id, game_key, board_size, pie_rule, status, created_at, profiles!lobbies_host_id_fkey(username)")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const lobbiesWithCounts = await Promise.all(
        (lobbyData || []).map(async (lobby) => {
          const { count } = await supabase
            .from("lobby_players")
            .select("*", { count: "exact", head: true })
            .eq("lobby_id", lobby.id);
          return { ...lobby, player_count: count || 0 } as LobbyWithDetails;
        }),
      );

      setLobbies(lobbiesWithCounts);
      setNetworkIssue(null);
    } catch (error: any) {
      setNetworkIssue(error?.message ?? "Room directory unavailable");
      setLobbies([]);
    } finally {
      setLoadingLobbies(false);
    }
  }, []);

  const fetchWorldDirectory = useCallback(async () => {
    try {
      const nextWorlds = await listWorlds(user?.id);
      setWorlds(nextWorlds);
      setNetworkIssue(null);
    } catch (error) {
      console.error("Failed to load worlds:", error);
      setNetworkIssue("World directory unavailable");
    }
  }, [user?.id]);

  const fetchResumeState = useCallback(async () => {
    if (!user?.id) {
      setResumeMatch(null);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("match_players")
        .select("match_id, matches!inner(id, game_key, size, status, world_id, updated_at)")
        .eq("profile_id", user.id)
        .eq("matches.status", "active")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const matchRow = Array.isArray((data as any)?.matches)
        ? (data as any).matches[0]
        : (data as any)?.matches;

      if (matchRow?.id) {
        setResumeMatch({
          id: matchRow.id,
          game_key: matchRow.game_key,
          size: matchRow.size,
          updated_at: matchRow.updated_at,
          world_id: matchRow.world_id,
        });
      } else {
        setResumeMatch(null);
      }
    } catch (error) {
      console.error("Failed to load resume state:", error);
      setResumeMatch(null);
    }
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchActiveMatches(),
      fetchWaitingLobbies(),
      fetchWorldDirectory(),
      fetchResumeState(),
    ]);
    toast.success("Refreshed");
  }, [fetchActiveMatches, fetchResumeState, fetchWaitingLobbies, fetchWorldDirectory]);

  useEffect(() => {
    fetchWorldDirectory();
  }, [fetchWorldDirectory]);

  useEffect(() => {
    void fetchResumeState();
  }, [fetchResumeState]);

  useEffect(() => {
    if (isLoading) return;

    const state = location.state as
      | {
          createAI?: boolean;
          difficulty?: string;
          boardSize?: number;
          competitive?: boolean;
          gameKey?: string;
        }
      | null;

    if (state?.createAI && state?.difficulty && !handledAutoCreate) {
      if (!isReadyForLocalPlay) return;
      setHandledAutoCreate(true);
      const difficulty = state.difficulty as "easy" | "medium" | "hard" | "expert";
      const gameKey = state.gameKey || "hex";
      const boardSize = state.boardSize || getGame(gameKey).defaultBoardSize;
      navigate(location.pathname, { replace: true, state: {} });
      createAIMatch(difficulty, boardSize, gameKey);
      return;
    }

    if (state?.competitive && !handledAutoCreate && !isGuest) {
      if (!user) return;
      setHandledAutoCreate(true);
      navigate(location.pathname, { replace: true, state: {} });
      findOrCreateCompetitiveMatch();
    }
  }, [
    createAIMatch,
    findOrCreateCompetitiveMatch,
    handledAutoCreate,
    isGuest,
    isLoading,
    isReadyForLocalPlay,
    location.pathname,
    location.state,
    navigate,
    user,
  ]);

  useEffect(() => {
    if (!isReadyForLiveDirectory) return;

    fetchActiveMatches();
    fetchWaitingLobbies();
    fetchResumeState();

    const channel = supabase
      .channel("lobby")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: "status=eq.active" },
        fetchActiveMatches,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobbies", filter: "status=eq.waiting" },
        fetchWaitingLobbies,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobby_players" },
        fetchWaitingLobbies,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveMatches, fetchResumeState, fetchWaitingLobbies, isReadyForLiveDirectory]);

  const joinLobby = useCallback(
    async (lobby: LobbyWithDetails) => {
      if (!user?.id) {
        toast.error("Sign in required", {
          description: "Joining a live room needs an account.",
        });
        navigate(buildAuthRoute());
        return;
      }

      setJoiningLobbyId(lobby.id);
      try {
        const { data, error } = await supabase.functions.invoke("join-lobby", {
          body: { code: lobby.code },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success("Joining room");
        navigate(`/lobby/${lobby.id}`);
      } catch (error: any) {
        toast.error("Failed to join room", {
          description: error?.message ?? "Please try again.",
        });
      } finally {
        setJoiningLobbyId(null);
      }
    },
    [navigate, user?.id],
  );

  const copyRoomCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Failed to copy code");
    }
  }, []);

  if (showOnboarding) {
    return (
      <WelcomeOnboarding
        onComplete={handleOnboardingComplete}
        onCreateMatch={(difficulty, size, gameKey) => {
          handleOnboardingComplete();
          createAIMatch(difficulty, size, gameKey || "hex");
        }}
        isCreating={creatingMatch}
      />
    );
  }

  if (!isDiscordEnvironment && loading) {
    return (
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  if (isDiscordEnvironment && !isDiscordAuth) {
    return (
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Connecting to Discord...</p>
        </div>
      </SiteFrame>
    );
  }

  const isAutoCreating = (location.state as { createAI?: boolean })?.createAI && !handledAutoCreate;
  if (isAutoCreating) {
    return (
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <p className="text-lg font-medium text-foreground">Preparing your match...</p>
        </div>
      </SiteFrame>
    );
  }

  const isCompetitive = (location.state as { competitive?: boolean })?.competitive && !handledAutoCreate;
  if (isCompetitive) {
    return (
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <p className="text-lg font-medium text-foreground">Finding opponent...</p>
        </div>
      </SiteFrame>
    );
  }

  const resumeTitle = resumeMatch
    ? `${getGame(resumeMatch.game_key ?? "hex").displayName} live`
    : hostedRoom
      ? `${hostedRoom.code} waiting room`
      : null;
  const resumeDescription = resumeMatch
    ? `${resumeMatch.size}x${resumeMatch.size}. ${resumeMatch.world_id ? worldNameById.get(resumeMatch.world_id) ?? "World room" : "Standalone room"}. ${formatMatchUpdate(resumeMatch.updated_at)}.`
    : hostedRoom
      ? `Hosted by you. ${hostedRoom.player_count ?? 0}/2 seats taken. ${minutesSince(hostedRoom.created_at)}.`
      : null;
  const resumeActionLabel = resumeMatch ? "Resume match" : hostedRoom ? "Open room" : null;

  return (
    <SiteFrame visualMode="mono" contentClassName="pb-16 pt-32 md:pt-28">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-5">
          {isGuest && !guestLoading ? <GuestModeBanner guestUsername={guestUsername} /> : null}

          <SystemScreen
            label="Play"
            title="Choose a lane"
            description="Start local. Join a room. Enter a world."
            actions={
              <UtilityStrip>
                <UtilityPill strong>{profile?.username || guestUsername || "local"}</UtilityPill>
                <UtilityPill>{standaloneLobbies.length} rooms</UtilityPill>
                <UtilityPill>{worldHostedLobbies.length} world rooms</UtilityPill>
                <UtilityPill>{activeMatches.length} live boards</UtilityPill>
              </UtilityStrip>
            }
          >
            {resumeTitle && resumeDescription && resumeActionLabel ? (
              <SystemSection
                label="Resume"
                title={resumeTitle}
                description={resumeDescription}
                actions={
                  <Button
                    variant="hero"
                    className="border-0"
                    onClick={() =>
                      resumeMatch
                        ? navigate(`/match/${resumeMatch.id}`)
                        : hostedRoom
                          ? navigate(`/lobby/${hostedRoom.id}`)
                          : undefined
                    }
                  >
                    {resumeActionLabel}
                  </Button>
                }
              >
                <UtilityStrip>
                  <UtilityPill strong>continue</UtilityPill>
                  {resumeMatch?.world_id ? (
                    <UtilityPill>{worldNameById.get(resumeMatch.world_id) ?? "world"}</UtilityPill>
                  ) : null}
                  {hostedRoom?.world_id ? (
                    <UtilityPill>{worldNameById.get(hostedRoom.world_id) ?? "world"}</UtilityPill>
                  ) : null}
                </UtilityStrip>
              </SystemSection>
            ) : null}

            <SystemSection
              label="Mode"
              title="Choose one decision"
              actions={
                <div className="ops-directory-segmented">
                  <button
                    type="button"
                    onClick={() => setPlayMode("quickplay")}
                    className={playMode === "quickplay" ? "ops-directory-segmented__item is-active" : "ops-directory-segmented__item"}
                  >
                    Quickplay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayMode("live")}
                    className={playMode === "live" ? "ops-directory-segmented__item is-active" : "ops-directory-segmented__item"}
                  >
                    Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayMode("worlds")}
                    className={playMode === "worlds" ? "ops-directory-segmented__item is-active" : "ops-directory-segmented__item"}
                  >
                    World rooms
                  </button>
                </div>
              }
            >
              {playMode === "quickplay" ? (
                <div className="space-y-4">
                  <DecisionLane>
                    {games.map((game) => {
                      const selected = selectedAIGame === game.key;

                      return (
                        <div key={game.key}>
                          <DecisionEntry selected={selected} onClick={() => setSelectedAIGame(game.key)}>
                            <div className="flex items-start gap-3">
                              <div className="system-onboarding-choice__glyph h-10 w-10">
                                <BoardScene
                                  game={game.key as BoardSceneKey}
                                  state={selected ? "selected" : "static"}
                                  decorative
                                  className="h-5 w-5 text-[#090909]"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="ops-directory-row__title">{game.displayName}</h3>
                                  <UtilityPill>{game.defaultBoardSize}x{game.defaultBoardSize}</UtilityPill>
                                </div>
                                <p className="ops-directory-row__meta">
                                  Local board. AI opponent. Start immediately.
                                </p>
                              </div>
                            </div>
                          </DecisionEntry>

                          {selected ? (
                            <DecisionEntryFocus>
                              <div className="ops-directory-segmented">
                                {[
                                  { diff: "easy" as const, label: "Starter" },
                                  { diff: "medium" as const, label: "Club" },
                                  { diff: "hard" as const, label: "Serious" },
                                  { diff: "expert" as const, label: "Relentless" },
                                ].map(({ diff, label }) => (
                                  <button
                                    key={diff}
                                    type="button"
                                    onClick={() => setAiDifficulty(diff)}
                                    className={
                                      aiDifficulty === diff
                                        ? "ops-directory-segmented__item is-active"
                                        : "ops-directory-segmented__item"
                                    }
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>

                              <p className="system-inline-note">
                                One click opens the board. Sign in only if you need rooms, worlds, or ranked play.
                              </p>

                              <div className="flex flex-wrap items-center gap-3">
                                <Button
                                  variant="hero"
                                  className="border-0"
                                  onClick={() =>
                                    createAIMatch(aiDifficulty, game.defaultBoardSize, game.key)
                                  }
                                  disabled={creatingMatch}
                                >
                                  <Cpu className="h-4 w-4" />
                                  {creatingMatch ? "Opening..." : `Start ${game.displayName}`}
                                </Button>
                                {user && !isGuest ? (
                                  <Button
                                    variant="ghost"
                                    className="border-0"
                                    onClick={() => findOrCreateCompetitiveMatch(game.key)}
                                    disabled={creatingMatch}
                                  >
                                    <Trophy className="h-4 w-4" />
                                    Competitive queue
                                  </Button>
                                ) : (
                                  <button
                                    type="button"
                                    className="system-link"
                                    onClick={() => navigate(buildAuthRoute("/events"))}
                                  >
                                    Sign in for rooms and ranked
                                  </button>
                                )}
                              </div>
                            </DecisionEntryFocus>
                          ) : null}
                        </div>
                      );
                    })}
                  </DecisionLane>
                </div>
              ) : null}

              {playMode === "live" ? (
                <div className="space-y-4">
                  {networkIssue ? <p className="system-empty">{networkIssue}</p> : null}
                  {loadingLobbies ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : standaloneLobbies.length === 0 ? (
                    <div className="space-y-3">
                      <p className="system-empty">No public rooms are waiting right now.</p>
                      {featuredLiveMatch ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <SpectateButton matchId={featuredLiveMatch.id} />
                          <button
                            type="button"
                            className="system-link"
                            onClick={() => navigate("/events")}
                          >
                            Open events
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="system-link"
                          onClick={() => navigate("/worlds")}
                        >
                          Browse worlds
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <DecisionLane>
                        {standaloneLobbies.map((lobby) => {
                          const selected = selectedLiveLobby?.id === lobby.id;
                          const isHost = lobby.host_id === user?.id;
                          const isFull = (lobby.player_count ?? 0) >= 2;
                          const gameKey = (lobby.game_key ?? "hex") as BoardSceneKey;

                          return (
                            <div key={lobby.id}>
                              <DecisionEntry
                                selected={selected}
                                onClick={() => setSelectedLiveLobbyId(lobby.id)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="system-onboarding-choice__glyph h-10 w-10">
                                    <BoardScene
                                      game={gameKey}
                                      state={selected ? "selected" : isFull ? "static" : "idle"}
                                      decorative
                                      className="h-5 w-5 text-[#090909]"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <StateTag tone={isFull ? "warning" : "success"}>{isFull ? "full" : "open"}</StateTag>
                                      {isHost ? <StateTag>host</StateTag> : null}
                                      <h3 className="ops-directory-row__title">{lobby.code} room</h3>
                                    </div>
                                    <p className="ops-directory-row__meta">
                                      {(lobby.profiles?.username ?? "Host")} / {lobby.board_size}x{lobby.board_size} / {minutesSince(lobby.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </DecisionEntry>

                              {selected ? (
                                <DecisionEntryFocus>
                                  <p className="system-inline-note">
                                    {isHost
                                      ? "This room is waiting on both seats before the board turns live."
                                      : isFull
                                        ? "This room is full. Copy the code or watch a live board."
                                        : "Commit to this room when you are ready."}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                      variant="hero"
                                      className="border-0"
                                      onClick={() => (isHost ? navigate(`/lobby/${lobby.id}`) : void joinLobby(lobby))}
                                      disabled={joiningLobbyId === lobby.id || (!isHost && isFull)}
                                    >
                                      {isHost ? "Enter room" : joiningLobbyId === lobby.id ? "Joining..." : isFull ? "Room full" : "Join room"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="border-0"
                                      onClick={() => copyRoomCode(lobby.code)}
                                    >
                                      <Copy className="h-4 w-4" />
                                      Copy code
                                    </Button>
                                    {featuredLiveMatch ? <SpectateButton matchId={featuredLiveMatch.id} /> : null}
                                  </div>
                                </DecisionEntryFocus>
                              ) : null}
                            </div>
                          );
                        })}
                      </DecisionLane>

                      <div className="flex flex-wrap items-center gap-3">
                        {user && !isGuest ? (
                          <>
                            <button
                              type="button"
                              className="system-link"
                              onClick={() => setShowJoinCode((current) => !current)}
                            >
                              {showJoinCode ? "Hide code entry" : "Join by code"}
                            </button>
                            <button
                              type="button"
                              className="system-link"
                              onClick={() => setShowCreateRoom((current) => !current)}
                            >
                              {showCreateRoom ? "Hide room setup" : "Host a room"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="system-link"
                            onClick={() => navigate(buildAuthRoute("/play"))}
                          >
                            Sign in to host or join by code
                          </button>
                        )}
                      </div>

                      {showJoinCode && user && !isGuest ? <JoinLobby userId={user.id} /> : null}
                      {showCreateRoom && user && !isGuest ? <CreateLobby userId={user.id} /> : null}
                    </>
                  )}
                </div>
              ) : null}

              {playMode === "worlds" ? (
                <div className="space-y-4">
                  {worldHostedLobbies.length === 0 ? (
                    <div className="space-y-3">
                      <p className="system-empty">No world-owned rooms are waiting right now.</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button variant="hero" className="border-0" onClick={() => navigate("/worlds")}>
                          Open worlds
                        </Button>
                        <button
                          type="button"
                          className="system-link"
                          onClick={() => navigate("/events")}
                        >
                          Browse events
                        </button>
                      </div>
                    </div>
                  ) : (
                    <DecisionLane>
                      {worldHostedLobbies.map((lobby) => {
                        const selected = selectedWorldLobby?.id === lobby.id;
                        const isHost = lobby.host_id === user?.id;
                        const isFull = (lobby.player_count ?? 0) >= 2;
                        const worldName = lobby.world_id ? worldNameById.get(lobby.world_id) ?? "World" : "World";
                        const gameKey = (lobby.game_key ?? "hex") as BoardSceneKey;

                        return (
                          <div key={lobby.id}>
                            <DecisionEntry
                              selected={selected}
                              onClick={() => setSelectedWorldLobbyId(lobby.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="system-onboarding-choice__glyph h-10 w-10">
                                  <BoardScene
                                    game={gameKey}
                                    state={selected ? "selected" : "static"}
                                    decorative
                                    className="h-5 w-5 text-[#090909]"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StateTag tone={isFull ? "warning" : "success"}>{isFull ? "full" : "open"}</StateTag>
                                    <StateTag>{worldName}</StateTag>
                                    <h3 className="ops-directory-row__title">{lobby.code} room</h3>
                                  </div>
                                  <p className="ops-directory-row__meta">
                                    {(lobby.profiles?.username ?? "Host")} / {lobby.board_size}x{lobby.board_size} / {minutesSince(lobby.created_at)}
                                  </p>
                                </div>
                              </div>
                            </DecisionEntry>

                            {selected ? (
                              <DecisionEntryFocus>
                                <p className="system-inline-note">
                                  {isHost
                                    ? "Open the waiting room or go to the world surface for host tools."
                                    : "Enter the room directly, or open the world if you need the full venue context."}
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                  <Button
                                    variant="hero"
                                    className="border-0"
                                    onClick={() => (isHost ? navigate(`/lobby/${lobby.id}`) : void joinLobby(lobby))}
                                    disabled={joiningLobbyId === lobby.id || (!isHost && isFull)}
                                  >
                                    {isHost ? "Enter room" : joiningLobbyId === lobby.id ? "Joining..." : isFull ? "Room full" : "Join room"}
                                  </Button>
                                  {lobby.world_id ? (
                                    <button
                                      type="button"
                                      className="system-link"
                                      onClick={() => navigate(`/worlds/${lobby.world_id}`)}
                                    >
                                      Open world
                                    </button>
                                  ) : null}
                                </div>
                              </DecisionEntryFocus>
                            ) : null}
                          </div>
                        );
                      })}
                    </DecisionLane>
                  )}
                </div>
              ) : null}
            </SystemSection>
          </SystemScreen>
        </div>
      </PullToRefresh>

      {user && isGuest ? (
        <ConvertAccountModal
          open={showConversionModal}
          onOpenChange={setShowConversionModal}
          guestId={user.id}
          matchesCompleted={matchesCompleted}
          onConversionComplete={() => toast.success("Welcome to BOARD")}
        />
      ) : null}
    </SiteFrame>
  );
}
