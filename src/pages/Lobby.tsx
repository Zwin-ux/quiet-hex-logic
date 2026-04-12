import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Cpu, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { CounterBlock } from "@/components/board/CounterBlock";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
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

function NetworkFeedCard({
  title,
  body,
  mode,
  metric,
  inverse = false,
}: {
  title: string;
  body: string;
  mode: string;
  metric: number | string;
  inverse?: boolean;
}) {
  return (
    <div
      className={`border px-4 py-4 ${
        inverse ? "border-black bg-black text-[#f6f4f0]" : "border-black bg-[#fbfaf8] text-black"
      }`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <h3
            className={`font-display text-[1.8rem] font-bold leading-none tracking-[-0.04em] ${
              inverse ? "text-[#f6f4f0]" : "text-black"
            }`}
          >
            {title}
          </h3>
          <p
            className={`max-w-[180px] text-[14px] leading-6 ${
              inverse ? "text-[#c7c7cc]" : "text-black/68"
            }`}
          >
            {body}
          </p>
        </div>
        <div className="space-y-2 text-right">
          <p
            className={`text-[12px] font-medium uppercase tracking-[0.16em] ${
              inverse ? "text-[#c7c7cc]" : "text-black/55"
            }`}
          >
            {mode}
          </p>
          <p
            className={`font-display text-[2rem] font-bold leading-none tracking-[-0.04em] ${
              inverse ? "text-[#f6f4f0]" : "text-black"
            }`}
          >
            {metric}
          </p>
        </div>
      </div>
    </div>
  );
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

  const publicRoom = useMemo(
    () => standaloneLobbies.find((lobby) => (lobby.player_count ?? 0) < 2) ?? standaloneLobbies[0] ?? null,
    [standaloneLobbies],
  );

  const featuredLiveMatch = activeMatches[0] ?? null;
  const directoryStatusTone =
    networkIssue ? "critical" : lobbies.length || activeMatches.length ? "success" : "warning";

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
      | { createAI?: boolean; difficulty?: string; boardSize?: number; competitive?: boolean }
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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_356px] xl:items-start">
            <div className="space-y-6">
              <BoardWordmark className="text-[52px] md:text-[72px]" />

              <div className="retro-status-strip w-fit flex-wrap gap-3 bg-white px-4 py-4">
                <StateTag>play</StateTag>
                <StateTag tone={lobbies.length ? "success" : "warning"}>{lobbies.length} rooms live</StateTag>
                <StateTag tone="normal">local practice ready</StateTag>
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="board-display-title max-w-[620px] text-[3.25rem] leading-[0.94] md:text-[4.5rem]">
                  Join a room or start immediately.
                </h1>
                <p className="board-copy max-w-[540px] text-[18px] leading-8 text-black/68">
                  The play route is a room desk. Public rooms, hosted rooms, and local practice all have clear entry paths.
                </p>
              </div>

              <div className="grid max-w-[760px] gap-4 md:grid-cols-2">
                <div className="board-panel px-5 py-5">
                  <h2 className="board-section-title text-[2rem] tracking-[-0.04em]">Local Practice</h2>
                  <p className="board-copy mt-3 max-w-[300px] text-[16px] leading-7 text-black/68">
                    No account required. Open a board and start playing immediately.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-8"
                    onClick={() =>
                      createAIMatch(aiDifficulty, getGame(selectedAIGame).defaultBoardSize, selectedAIGame)
                    }
                    disabled={creatingMatch}
                  >
                    {creatingMatch ? "Opening..." : "Open"}
                  </Button>
                </div>

                <div className="board-panel px-5 py-5">
                  <h2 className="board-section-title text-[2rem] tracking-[-0.04em]">Join Public Room</h2>
                  <p className="board-copy mt-3 max-w-[300px] text-[16px] leading-7 text-black/68">
                    Enter a room with active players and live watchers.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-8"
                    onClick={() => {
                      if (publicRoom) {
                        navigate(`/lobby/${publicRoom.id}`);
                        return;
                      }
                      navigate("/worlds");
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </div>

            <aside className="border border-black bg-black px-5 py-5 text-[#f6f4f0]">
              <p className="board-rail-label text-[#c7c7cc]">Live Room Feed</p>
              <div className="mt-6 space-y-4">
                {featuredLiveMatch ? (
                  <NetworkFeedCard
                    title={`Room ${featuredLiveMatch.id.slice(0, 4).toUpperCase()}`}
                    body={`${featuredLiveMatch.world_id ? worldNameById.get(featuredLiveMatch.world_id) ?? "World room" : "Public room"} — spectators open`}
                    mode="live"
                    metric={featuredLiveMatch.size}
                    inverse
                  />
                ) : null}

                {publicRoom ? (
                  <NetworkFeedCard
                    title={`Room ${publicRoom.code}`}
                    body="Open table — joinable"
                    mode="join"
                    metric={publicRoom.player_count ?? 0}
                    inverse
                  />
                ) : null}

                <NetworkFeedCard
                  title="Practice Desk"
                  body="Solo board — local play only"
                  mode="local"
                  metric="—"
                  inverse
                />
              </div>

              <div className="retro-status-strip mt-6 flex-wrap gap-3 border-white bg-transparent px-0 py-0 text-[#f6f4f0]">
                <span className="border border-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em]">
                  Host online
                </span>
                <span className="border border-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em]">
                  Chat moderated
                </span>
              </div>

              <p className="mt-6 max-w-[290px] text-[16px] leading-8 text-[#c7c7cc]">
                This side rail carries the live network read. It should feel immediate, not decorative.
              </p>
            </aside>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <VenuePanel
              eyebrow="Practice desk"
              title={getGame(selectedAIGame).displayName}
              description="Pick the board system and pressure level, then open a local board or queue into ranked play."
              titleBarEnd={<StateTag tone={creatingMatch ? "warning" : "success"}>{creatingMatch ? "starting" : "ready"}</StateTag>}
            >
              {networkIssue ? <div className="retro-critical-strip mb-4">{networkIssue}</div> : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {listGames().map((game) => (
                  <Button
                    key={game.key}
                    variant={selectedAIGame === game.key ? "hero" : "outline"}
                    className="justify-between"
                    onClick={() => setSelectedAIGame(game.key)}
                  >
                    <span>{game.displayName}</span>
                    <span className="text-[11px] uppercase tracking-[0.16em]">{game.defaultBoardSize}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { diff: "easy" as const, label: "Starter" },
                  { diff: "medium" as const, label: "Club" },
                  { diff: "hard" as const, label: "Serious" },
                  { diff: "expert" as const, label: "Relentless" },
                ].map(({ diff, label }) => (
                  <Button
                    key={diff}
                    variant={aiDifficulty === diff ? "secondary" : "quiet"}
                    className="justify-between"
                    onClick={() => setAiDifficulty(diff)}
                  >
                    <span>{label}</span>
                    <span className="text-[11px] uppercase tracking-[0.16em]">{diff}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <CounterBlock label="user" value={profile?.username || guestUsername || "local"} />
                <CounterBlock label="rooms" value={lobbies.length} />
                <CounterBlock label="boards" value={activeMatches.length} />
                <CounterBlock label="worlds" value={worlds.length} />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="hero"
                  onClick={() =>
                    createAIMatch(aiDifficulty, getGame(selectedAIGame).defaultBoardSize, selectedAIGame)
                  }
                  disabled={creatingMatch}
                >
                  <Cpu className="h-4 w-4" />
                  {creatingMatch ? "Starting" : "Start practice"}
                </Button>
                {user && !isGuest ? (
                  <Button
                    variant="outline"
                    onClick={() => findOrCreateCompetitiveMatch(selectedAIGame)}
                    disabled={creatingMatch}
                  >
                    <Trophy className="h-4 w-4" />
                    Competitive queue
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => navigate(buildAuthRoute("/events"))}>
                    Create account
                  </Button>
                )}
              </div>
            </VenuePanel>

            <VenuePanel
              eyebrow="Hosted access"
              title="World-owned rooms still sit behind identity."
              description={
                user && !isGuest
                  ? "Open your world, create a room, or jump to events. Hosted access stays attached to real account state."
                  : `Create an account for world rooms, recurring events, and hosted access${isGuest ? ` — current guest: ${guestUsername}` : ""}.`
              }
              state={user && !isGuest ? "normal" : "warning"}
              titleBarEnd={
                <StateTag tone={user && !isGuest ? "success" : "warning"}>
                  {user && !isGuest ? "host ready" : "account required"}
                </StateTag>
              }
            >
              <div className="space-y-3">
                <Button variant="hero" className="w-full justify-between" onClick={() => navigate("/worlds")}>
                  <span>Open worlds</span>
                  <span className="text-[11px] uppercase tracking-[0.16em]">{worldHostedLobbies.length}</span>
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/events")}>
                  <span>Browse events</span>
                  <span className="text-[11px] uppercase tracking-[0.16em]">{worlds.length}</span>
                </Button>
                {!user || isGuest ? (
                  <Button variant="outline" className="w-full" onClick={() => navigate(buildAuthRoute("/worlds"))}>
                    Enter BOARD
                  </Button>
                ) : null}
              </div>
            </VenuePanel>
          </div>

          {user && !isGuest ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <CreateLobby userId={user.id} />
              <JoinLobby userId={user.id} />
            </div>
          ) : null}

          <VenuePanel
            eyebrow="Open room directory"
            title={lobbies.length ? `${lobbies.length} waiting rooms` : "No waiting rooms"}
            description="World-owned rooms and standalone public rooms stay visible together, but they do not collapse into the same product object."
            titleBarEnd={<StateTag tone={directoryStatusTone}>{lobbies.length || "none"}</StateTag>}
            state={directoryStatusTone === "critical" ? "critical" : lobbies.length ? "normal" : "warning"}
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
                    <div className="retro-status-strip justify-between bg-white">
                      <span>World-hosted rooms</span>
                      <span>{worldHostedLobbies.length}</span>
                    </div>
                    <div className="space-y-3">
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
                    <div className="retro-status-strip justify-between bg-white">
                      <span>Standalone rooms</span>
                      <span>{standaloneLobbies.length}</span>
                    </div>
                    <div className="space-y-3">
                      {standaloneLobbies.map((lobby) => (
                        <LobbyCard
                          key={lobby.id}
                          lobby={{ ...lobby, world_name: null }}
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
            description="Live boards remain one click away from the play desk."
            titleBarEnd={<StateTag tone={activeMatches.length ? "success" : "warning"}>{activeMatches.length || "none"}</StateTag>}
            state={activeMatches.length ? "normal" : "warning"}
          >
            {activeMatches.length === 0 ? (
              <div className="retro-warning-strip">No spectator boards are live right now.</div>
            ) : (
              <div className="space-y-3">
                {activeMatches.map((match, index) => (
                  <div
                    key={match.id}
                    className="border border-black bg-[#fbfaf8] px-4 py-4 md:grid md:grid-cols-[72px_minmax(0,1fr)_150px] md:items-center"
                  >
                    <div className="board-rail-label mb-4 text-black/45 md:mb-0">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="board-section-title">{match.size}x{match.size} live board</h3>
                        <StateTag tone="success">spectators open</StateTag>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-black/68">
                        {match.world_id && worldNameById.get(match.world_id)
                          ? `${worldNameById.get(match.world_id)}`
                          : "Standalone room"}{" "}
                        — active now.
                      </p>
                    </div>
                    <div className="mt-4 flex justify-start md:mt-0 md:justify-end">
                      <SpectateButton matchId={match.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </VenuePanel>

          <div className="retro-status-strip justify-between gap-3 bg-white">
            <div className="flex flex-wrap items-center gap-3">
              <StateTag tone={isGuest ? "warning" : "success"}>
                {isGuest ? `guest ${guestUsername}` : profile?.username || "account"}
              </StateTag>
              <span>rooms {lobbies.length}</span>
              <span>boards {activeMatches.length}</span>
              <span>worlds {worlds.length}</span>
            </div>
            <span>{networkIssue ? "retry" : "desk synced"}</span>
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
