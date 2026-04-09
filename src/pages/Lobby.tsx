import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Cpu,
  Loader2,
  Play,
  RadioTower,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useGuestConversion } from "@/hooks/useGuestConversion";
import { useDiscord } from "@/lib/discord/DiscordContext";
import { usePresence } from "@/hooks/usePresence";
import { listGames, getGame } from "@/lib/engine/registry";
import { createLocalAIMatch } from "@/lib/localAiMatch";
import { listWorlds, type WorldSummary } from "@/lib/worlds";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";
import { MetricLine } from "@/components/board/MetricLine";
import { Button } from "@/components/ui/button";
import { SpectateButton } from "@/components/SpectateButton";
import { CreateLobby } from "@/components/CreateLobby";
import { JoinLobby } from "@/components/JoinLobby";
import { LobbyCard } from "@/components/LobbyCard";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { ConvertAccountModal } from "@/components/ConvertAccountModal";
import { WelcomeOnboarding } from "@/components/WelcomeOnboarding";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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

  const { user, loading, signInAnonymously } = useAuth();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [lobbies, setLobbies] = useState<LobbyWithDetails[]>([]);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [profile, setProfile] = useState<{ username: string; elo_rating: number } | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("medium");
  const [selectedAIGame, setSelectedAIGame] = useState<string>("hex");
  const [loadingLobbies, setLoadingLobbies] = useState(true);
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

  const featuredWorlds = useMemo(() => {
    if (!worlds.length) return [];
    const joined = worlds.filter((world) => Boolean(world.userRole));
    const publicOnly = worlds.filter((world) => !world.userRole);
    return [...joined, ...publicOnly].slice(0, 4);
  }, [worlds]);

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
      } else {
        signInAnonymously();
      }
    }
  }, [loading, user, signInAnonymously, isDiscordEnvironment]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("board_onboarded", "true");
    localStorage.removeItem("openboard_onboarded");
    setShowOnboarding(false);
  };

  usePresence(user?.id);

  const isReadyToPlay = isDiscordEnvironment ? isDiscordAuth : !!user;
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
          const gameDef = listGames().find((g) => g.key === gameKey);
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
    [isDiscordEnvironment, discordUser, navigate, profile?.username],
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
    [user, isGuest, navigate],
  );

  const fetchActiveMatches = useCallback(async () => {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "active")
      .eq("allow_spectators", true)
      .order("created_at", { ascending: false })
      .limit(5);
    setActiveMatches(data || []);
  }, []);

  const fetchWaitingLobbies = useCallback(async () => {
    setLoadingLobbies(true);
    const { data: lobbyData } = await supabase
      .from("lobbies")
      .select("id, code, host_id, world_id, game_key, board_size, pie_rule, status, created_at, profiles!lobbies_host_id_fkey(username)")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(10);

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
    setLoadingLobbies(false);
  }, []);

  const fetchWorldDirectory = useCallback(async () => {
    try {
      const nextWorlds = await listWorlds(user?.id);
      setWorlds(nextWorlds);
    } catch (error) {
      console.error("Failed to load worlds:", error);
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
    if (isLoading || !isReadyToPlay) return;

    const state = location.state as
      | {
          createAI?: boolean;
          difficulty?: string;
          boardSize?: number;
          competitive?: boolean;
        }
      | null;

    if (state?.createAI && state?.difficulty && !handledAutoCreate) {
      setHandledAutoCreate(true);
      const difficulty = state.difficulty as "easy" | "medium" | "hard" | "expert";
      const boardSize = state.boardSize || 7;
      navigate(location.pathname, { replace: true, state: {} });
      createAIMatch(difficulty, boardSize);
      return;
    }

    if (state?.competitive && !handledAutoCreate && !isGuest) {
      setHandledAutoCreate(true);
      navigate(location.pathname, { replace: true, state: {} });
      findOrCreateCompetitiveMatch();
    }
  }, [
    isLoading,
    isReadyToPlay,
    location.state,
    location.pathname,
    handledAutoCreate,
    isGuest,
    navigate,
    createAIMatch,
    findOrCreateCompetitiveMatch,
  ]);

  useEffect(() => {
    if (!user) return;

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
  }, [user, fetchActiveMatches, fetchWaitingLobbies]);

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
            title="Practice, rooms, and live boards across BOARD."
            description={
              <>
                Use this surface for quick play and live room discovery. If you are
                running a recurring club, creator league, or local tournament, start
                from worlds.
              </>
            }
            actions={
              <>
                <Button variant="outline" onClick={() => navigate("/worlds")}>
                  Open worlds
                </Button>
                <Button onClick={() => navigate("/events")}>Browse events</Button>
              </>
            }
          />

          {user && !isGuest ? (
            <VenuePanel eyebrow="Identity" title={profile?.username || user.email?.split("@")[0] || "Player"}>
              <MetricLine label="ELO" value={profile?.elo_rating ?? 1200} />
            </VenuePanel>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <VenuePanel
              eyebrow="Practice rail"
              title="Choose a game, then choose the pressure."
              description="Solo practice stays fast. Competitive search stays available when your identity is active."
              className="bg-white/92"
            >
              <div className="divide-y divide-black/10 border-t border-black/10">
                {listGames().map((game, index) => (
                  <button
                    key={game.key}
                    onClick={() => setSelectedAIGame(game.key)}
                    className={`grid w-full gap-3 py-4 text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[52px_minmax(0,1fr)_170px] ${
                      selectedAIGame === game.key ? "bg-black text-white hover:bg-black" : ""
                    }`}
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-current/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-bold tracking-[-0.05em]">{game.displayName}</h3>
                      <p className={`mt-2 text-sm leading-7 ${selectedAIGame === game.key ? "text-white/65" : "text-muted-foreground"}`}>
                        {getGame(game.key).supportsRanked ? "Supports ranked and local repetition." : "Fast local repetition path."}
                      </p>
                    </div>
                    <div className="flex items-center justify-start gap-2 md:justify-end">
                      <span className="board-rail-label text-[10px] text-current/45">
                        {game.defaultBoardSize}x{game.defaultBoardSize}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {[
                  { diff: "easy" as const, label: "Starter" },
                  { diff: "medium" as const, label: "Club" },
                  { diff: "hard" as const, label: "Serious" },
                  { diff: "expert" as const, label: "Relentless" },
                ].map(({ diff, label }) => (
                  <Button
                    key={diff}
                    variant={aiDifficulty === diff ? "default" : "outline"}
                    className="justify-between"
                    onClick={() => setAiDifficulty(diff)}
                  >
                    <span>{label}</span>
                    <span className="board-rail-label text-[10px] text-current/55">{diff}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row">
                <Button
                  className="clip-stage flex-1"
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
                  <Button variant="outline" className="flex-1" onClick={() => findOrCreateCompetitiveMatch(selectedAIGame)}>
                    <Trophy className="h-4 w-4" />
                    Competitive queue
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/tutorial")}>
                    <BookOpen className="h-4 w-4" />
                    Learn the rules
                  </Button>
                )}
              </div>
            </VenuePanel>

            {user && !isGuest ? (
              <div className="grid gap-6">
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
              >
                <Button onClick={() => navigate("/auth")}>Create account</Button>
              </VenuePanel>
            )}
          </div>

          {featuredWorlds.length > 0 ? (
            <VenuePanel
              eyebrow="World directory"
              title="Host-owned venues"
              description="Worlds are the recurring places behind the rooms and events you see here."
            >
              <div className="divide-y divide-black/10 border-t border-black/10">
                {featuredWorlds.map((world, index) => (
                  <button
                    key={world.id}
                    onClick={() => navigate(`/worlds/${world.id}`)}
                    className="grid w-full gap-3 py-4 text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[52px_minmax(0,1fr)_180px]"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold tracking-[-0.05em] text-foreground">{world.name}</h3>
                        {world.userRole ? (
                          <span className="board-rail-label rounded-md border border-black bg-black px-2 py-1 text-[10px] text-white">
                            {world.userRole}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {world.description || "No description yet."}
                      </p>
                    </div>
                    <div className="space-y-1 border-l border-black/10 pl-4">
                      <MetricLine label="Events" value={world.eventCount} />
                      <MetricLine label="Instances" value={world.instanceCount} />
                    </div>
                  </button>
                ))}
              </div>
            </VenuePanel>
          ) : null}

          {user && !isGuest && lobbies.length > 0 ? (
            <VenuePanel
              eyebrow="Open room directory"
              title={`${lobbies.length} waiting rooms`}
              description="Cross-world room discovery for quick joins and direct codes."
            >
              {loadingLobbies ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-5">
                  {worldHostedLobbies.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-black/10 pb-3">
                        <p className="board-rail-label">World-hosted rooms</p>
                        <span className="board-rail-label text-[10px] text-black/45">{worldHostedLobbies.length}</span>
                      </div>
                      {worldHostedLobbies.map((lobby) => (
                        <LobbyCard
                          key={lobby.id}
                          lobby={{
                            ...lobby,
                            world_name: lobby.world_id ? worldNameById.get(lobby.world_id) ?? null : null,
                          }}
                          playerCount={lobby.player_count || 0}
                          currentUserId={user.id}
                        />
                      ))}
                    </div>
                  ) : null}

                  {standaloneLobbies.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-black/10 pb-3">
                        <p className="board-rail-label">Standalone rooms</p>
                        <span className="board-rail-label text-[10px] text-black/45">{standaloneLobbies.length}</span>
                      </div>
                      {standaloneLobbies.map((lobby) => (
                        <LobbyCard
                          key={lobby.id}
                          lobby={{
                            ...lobby,
                            world_name: null,
                          }}
                          playerCount={lobby.player_count || 0}
                          currentUserId={user.id}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </VenuePanel>
          ) : null}

          {activeMatches.length > 0 ? (
            <VenuePanel
              eyebrow="Live board directory"
              title={`${activeMatches.length} active boards`}
              description="Spectate current boards across worlds and direct rooms."
            >
              <div className="divide-y divide-black/10 border-t border-black/10">
                {activeMatches.map((match, index) => (
                  <div
                    key={match.id}
                    className="grid gap-3 py-4 md:grid-cols-[52px_minmax(0,1fr)_150px] md:items-center"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <Play className="h-4 w-4 text-foreground" />
                        <p className="text-lg font-bold tracking-[-0.04em] text-foreground">
                          {match.size}x{match.size} live board
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
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
            </VenuePanel>
          ) : null}
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
