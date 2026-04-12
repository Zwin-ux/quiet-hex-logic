import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Cpu, Loader2, Play, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CounterBlock } from "@/components/board/CounterBlock";
import { SectionRail } from "@/components/board/SectionRail";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { ConvertAccountModal } from "@/components/ConvertAccountModal";
import { CreateLobby } from "@/components/CreateLobby";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { JoinLobby } from "@/components/JoinLobby";
import { LobbyCard } from "@/components/LobbyCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SpectateButton } from "@/components/SpectateButton";
import { WelcomeOnboarding } from "@/components/WelcomeOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGuestConversion } from "@/hooks/useGuestConversion";
import { useGuestMode } from "@/hooks/useGuestMode";
import { usePresence } from "@/hooks/usePresence";
import { buildAuthRoute } from "@/lib/authRedirect";
import { listGames, getGame } from "@/lib/engine/registry";
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
  const { isGuest, guestUsername, loading: guestLoading } = useGuestMode();
  const { showConversionModal, setShowConversionModal, matchesCompleted } = useGuestConversion();
  const { isDiscordEnvironment, isAuthenticated: isDiscordAuth, discordUser } = useDiscord();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [handledAutoCreate, setHandledAutoCreate] = useState(false);

  const worldNameById = useMemo(
    () => new Map(worlds.map((world) => [world.id, world.name])),
    [worlds],
  );

  const worldHostedLobbies = useMemo(
    () => lobbies.filter((lobby) => Boolean(lobby.world_id)),
    [lobbies],
  );

  const standaloneLobbies = useMemo(
    () => lobbies.filter((lobby) => !lobby.world_id),
    [lobbies],
  );

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
      const hasSeenOnboarding =
        localStorage.getItem("board_onboarded") || localStorage.getItem("openboard_onboarded");
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [isDiscordEnvironment, loading, user]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("board_onboarded", "true");
    localStorage.removeItem("openboard_onboarded");
    setShowOnboarding(false);
  };

  usePresence(user?.id);

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
          } catch {}

          toast.success(`Starting ${difficulty} AI match`);
          navigate(`/match/${localMatchId}`, {
            state: initPayload,
          });
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
        } catch {}

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

        if (joined) {
          toast.success("Opponent found. Starting match.");
        } else if (waiting) {
          toast.success("Searching for opponent...");
        }

        navigate(`/match/${matchId}`);
      } catch (error: any) {
        console.error("Competitive matchmaking error:", error);
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

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchActiveMatches(), fetchWaitingLobbies(), fetchWorldDirectory()]);
    toast.success("Refreshed");
  }, [fetchActiveMatches, fetchWaitingLobbies, fetchWorldDirectory]);

  useEffect(() => {
    fetchWorldDirectory();
  }, [fetchWorldDirectory]);

  useEffect(() => {
    if (isLoading) return;

    const state = location.state as
      | {
          createAI?: boolean;
          difficulty?: string;
          boardSize?: number;
          competitive?: boolean;
        }
      | null;

    if (state?.createAI && state?.difficulty && !handledAutoCreate) {
      if (!isReadyForLocalPlay) return;
      setHandledAutoCreate(true);
      const difficulty = state.difficulty as "easy" | "medium" | "hard" | "expert";
      const boardSize = state.boardSize || 7;
      navigate(location.pathname, { replace: true, state: {} });
      createAIMatch(difficulty, boardSize);
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
  }, [fetchActiveMatches, fetchWaitingLobbies, isReadyForLiveDirectory]);

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
      <SiteFrame>
        <div className="flex min-h-[420px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteFrame>
    );
  }

  if (isDiscordEnvironment && !isDiscordAuth) {
    return (
      <SiteFrame>
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
      <SiteFrame>
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
      <SiteFrame>
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <p className="text-lg font-medium text-foreground">Finding opponent...</p>
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="space-y-8">
          {isGuest && !guestLoading ? <GuestModeBanner guestUsername={guestUsername} /> : null}

          <SectionRail
            eyebrow="Play desk"
            title="Start, join, or watch without hunting."
            description={
              <>
                Practice starts here. Live room join and board watch stay visible. If you
                are running a recurring venue, move into worlds when the room needs memory.
              </>
            }
            status={
              <StateTag tone={networkIssue ? "critical" : isGuest ? "warning" : "success"}>
                {networkIssue ? "directory issue" : isGuest ? "guest mode" : "desk ready"}
              </StateTag>
            }
            actions={
              <>
                <Button variant="outline" onClick={() => navigate("/worlds")}>
                  Open worlds
                </Button>
                <Button variant="hero" onClick={() => navigate("/events")}>
                  Browse events
                </Button>
              </>
            }
          />

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <VenuePanel
              eyebrow="Game ledger"
              title="Select the board system"
              description="Choose one ruleset, then move to the command window. The list stays dense on purpose so you can scan and act fast."
              titleBarEnd={<StateTag>{selectedAIGame}</StateTag>}
            >
              <div className="board-ledger">
                {listGames().map((game, index) => (
                  <button
                    key={game.key}
                    onClick={() => setSelectedAIGame(game.key)}
                    className={`board-ledger-row w-full text-left md:grid-cols-[52px_minmax(0,1fr)_160px] ${
                      selectedAIGame === game.key ? "bg-[#000080] text-white" : ""
                    }`}
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-current/60">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="board-section-title">{game.displayName}</h3>
                        {getGame(game.key).supportsRanked ? (
                          <StateTag tone={selectedAIGame === game.key ? "warning" : "normal"}>
                            ranked ready
                          </StateTag>
                        ) : null}
                      </div>
                      <p className={`mt-3 text-sm leading-6 ${selectedAIGame === game.key ? "text-white" : "text-black"}`}>
                        {getGame(game.key).supportsRanked
                          ? "Supports ranked queue and local repetition."
                          : "Local repetition path only."}
                      </p>
                    </div>
                    <div className="flex items-center justify-start gap-2 md:justify-end">
                      <span className="board-meta-chip text-current">
                        {game.defaultBoardSize}x{game.defaultBoardSize}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </VenuePanel>

            <VenuePanel
              eyebrow="Command window"
              title={getGame(selectedAIGame).displayName}
              description="Pick the pressure and start. Queue stays secondary so the first action remains obvious."
              state={networkIssue ? "critical" : isGuest ? "warning" : "normal"}
              titleBarEnd={
                <StateTag tone={creatingMatch ? "warning" : "success"}>
                  {creatingMatch ? "starting" : "ready"}
                </StateTag>
              }
            >
              {networkIssue ? <div className="retro-critical-strip mb-4">{networkIssue}</div> : null}
              {isGuest ? (
                <div className="retro-warning-strip mb-4">
                  Guest mode allows practice but blocks live queue and room hosting.
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <CounterBlock label="User" value={profile?.username || guestUsername || "local"} />
                <CounterBlock label="Room index" value={lobbies.length} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  { diff: "easy" as const, label: "Starter" },
                  { diff: "medium" as const, label: "Club" },
                  { diff: "hard" as const, label: "Serious" },
                  { diff: "expert" as const, label: "Relentless" },
                ].map(({ diff, label }) => (
                  <Button
                    key={diff}
                    variant={aiDifficulty === diff ? "hero" : "outline"}
                    className="justify-between"
                    onClick={() => setAiDifficulty(diff)}
                  >
                    <span>{label}</span>
                    <span className="board-meta-chip text-current">{diff}</span>
                  </Button>
                ))}
              </div>

              <div className="retro-command-rail mt-5">
                <Button
                  className="h-12 flex-1"
                  variant="hero"
                  onClick={() =>
                    createAIMatch(aiDifficulty, getGame(selectedAIGame).defaultBoardSize, selectedAIGame)
                  }
                  disabled={creatingMatch}
                >
                  {creatingMatch ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting
                    </>
                  ) : (
                    <>
                      <Cpu className="h-4 w-4" />
                      Start AI match
                    </>
                  )}
                </Button>
                {user && !isGuest ? (
                  <Button
                    variant="outline"
                    className="h-12 flex-1"
                    onClick={() => findOrCreateCompetitiveMatch(selectedAIGame)}
                  >
                    <Trophy className="h-4 w-4" />
                    Competitive queue
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-12 flex-1"
                    onClick={() => navigate("/tutorial")}
                  >
                    <BookOpen className="h-4 w-4" />
                    Learn the rules
                  </Button>
                )}
              </div>
            </VenuePanel>
          </div>

          {user && !isGuest ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <CreateLobby userId={user.id} />
              <JoinLobby userId={user.id} />
            </div>
          ) : (
            <VenuePanel
              eyebrow="Identity gate"
              title="Live rooms and events need an account."
              description={`${
                isGuest ? `Playing as ${guestUsername}. ` : ""
              }Create an account to join worlds, return to rooms, and take seats inside host-run competition.`}
              titleBarEnd={<StateTag tone="warning">account required</StateTag>}
              state="warning"
            >
              <div className="retro-command-rail">
                <Button variant="hero" onClick={() => navigate(buildAuthRoute())}>
                  Create account
                </Button>
              </div>
            </VenuePanel>
          )}

          <VenuePanel
            eyebrow="Open room directory"
            title={lobbies.length ? `${lobbies.length} waiting rooms` : "No waiting rooms"}
            description="Room join stays separate from venue browsing. Full rooms are flagged before you waste a click."
            titleBarEnd={<StateTag tone={lobbies.length ? "success" : "warning"}>{lobbies.length || "none"}</StateTag>}
            state={lobbies.length ? "normal" : "warning"}
          >
            {loadingLobbies ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : lobbies.length === 0 ? (
              <div className="retro-warning-strip">No rooms waiting right now.</div>
            ) : (
              <div className="space-y-5">
                {worldHostedLobbies.length > 0 ? (
                  <div className="space-y-3">
                    <div className="retro-status-strip justify-between bg-[#e8e8e8]">
                      <span>World-hosted rooms</span>
                      <span>{worldHostedLobbies.length}</span>
                    </div>
                    <div className="board-ledger">
                      {worldHostedLobbies.map((lobby) => (
                        <LobbyCard
                          key={lobby.id}
                          lobby={{
                            ...lobby,
                            world_name: lobby.world_id ? worldNameById.get(lobby.world_id) ?? null : null,
                          }}
                          playerCount={lobby.player_count || 0}
                          currentUserId={user?.id}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {standaloneLobbies.length > 0 ? (
                  <div className="space-y-3">
                    <div className="retro-status-strip justify-between bg-[#e8e8e8]">
                      <span>Standalone rooms</span>
                      <span>{standaloneLobbies.length}</span>
                    </div>
                    <div className="board-ledger">
                      {standaloneLobbies.map((lobby) => (
                        <LobbyCard
                          key={lobby.id}
                          lobby={{
                            ...lobby,
                            world_name: null,
                          }}
                          playerCount={lobby.player_count || 0}
                          currentUserId={user?.id}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </VenuePanel>

          <VenuePanel
            eyebrow="Live board directory"
            title={activeMatches.length ? `${activeMatches.length} active boards` : "No boards live"}
            description="Watch lanes stay visible so you can drop into the right room without opening a world first."
            titleBarEnd={<StateTag tone={activeMatches.length ? "success" : "warning"}>{activeMatches.length || "none"}</StateTag>}
            state={activeMatches.length ? "normal" : "warning"}
          >
            {activeMatches.length === 0 ? (
              <div className="retro-warning-strip">No spectator boards are live right now.</div>
            ) : (
              <div className="board-ledger">
                {activeMatches.map((match, index) => (
                  <div
                    key={match.id}
                    className="board-ledger-row md:grid-cols-[52px_minmax(0,1fr)_160px] md:items-center"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <Play className="h-4 w-4 text-foreground" />
                        <p className="board-section-title">
                          {match.size}x{match.size} live board
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-black">
                        {match.world_id && worldNameById.get(match.world_id)
                          ? `${worldNameById.get(match.world_id)}`
                          : "Standalone room"}{" "}
                        • spectators welcome
                      </p>
                    </div>
                    <div className="flex justify-start md:justify-end">
                      <SpectateButton matchId={match.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </VenuePanel>

          <div className="retro-status-strip justify-between gap-3 bg-[#e8e8e8]">
            <div className="flex flex-wrap items-center gap-3">
              <StateTag tone={isGuest ? "warning" : "success"}>
                {isGuest ? `guest ${guestUsername}` : profile?.username || "local account"}
              </StateTag>
              <span>rooms {lobbies.length}</span>
              <span>boards {activeMatches.length}</span>
              <span>worlds {worlds.length}</span>
            </div>
            <span>{networkIssue ? "retry suggested" : "desk synced"}</span>
          </div>
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
