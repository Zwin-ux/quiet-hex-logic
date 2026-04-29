import { useEffect, useMemo, useState } from "react";
import { BoardScene, type BoardSceneKey } from "@/components/board/BoardScene";
import { DecisionEntry, DecisionLane, UtilityPill, UtilityStrip } from "@/components/board/SystemSurface";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { OpenOnWebButton, WebHandoffNotice } from "@/components/surfaces/WebSurfaceGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLobby } from "@/hooks/useLobby";
import { useWorkshopMods } from "@/hooks/useWorkshopMods";
import { supabase } from "@/integrations/supabase/client";
import { getGameMeta } from "@/lib/gameMetadata";
import { useSurfaceCapabilities } from "@/lib/surfaces";
import { groupVariantsForGame, supportsBoardSize, variantLabel } from "@/lib/variants";
import { Check, Copy, Crown, LogOut, Play, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type LobbyPanelProps = {
  lobbyId: string;
  userId: string;
};

export function LobbyPanel({ lobbyId, userId }: LobbyPanelProps) {
  const { lobby, players, loading, error } = useLobby(lobbyId, userId);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const navigate = useNavigate();
  const { isAuthoringSurface } = useSurfaceCapabilities();

  const isHost = lobby?.host_id === userId;
  const currentPlayer = players.find((player) => player.player_id === userId);
  const allReady = players.length === 2 && players.every((player) => player.is_ready);
  const canStart = isHost && allReady;
  const gameKey = (lobby as any)?.game_key ?? "hex";
  const currentModVersionId = (lobby as any)?.mod_version_id ?? null;
  const { mods: workshopMods, loading: workshopModsLoading } = useWorkshopMods({ gameKey });
  const variantGroups = groupVariantsForGame(workshopMods, gameKey, (lobby as any)?.world_id ?? undefined);
  const currentVariant = useMemo(
    () => workshopMods.find((mod) => mod.latest_version_id === currentModVersionId) ?? null,
    [currentModVersionId, workshopMods],
  );

  const gameMeta = getGameMeta(gameKey);
  const gameLabel = gameKey === "connect4" ? "Connect 4" : gameKey === "ttt" ? "Tic-tac-toe" : gameKey.charAt(0).toUpperCase() + gameKey.slice(1);
  const boardLabel = supportsBoardSize(gameKey)
    ? `${lobby?.board_size ?? 11}x${lobby?.board_size ?? 11}`
    : gameKey === "ttt"
      ? "3x3"
      : "standard";
  const turnTimerLabel = lobby?.turn_timer_seconds ? `${lobby.turn_timer_seconds}s clock` : "untimed";

  useEffect(() => {
    if (!lobby || hasNavigated) return;

    if (lobby.status === "starting") {
      setHasNavigated(true);

      const fetchMatchAndNavigate = async () => {
        const maxAttempts = 5;
        const delayMs = 500;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          try {
            const { data: match, error: matchError } = await supabase
              .from("matches")
              .select("id")
              .eq("lobby_id", lobbyId)
              .maybeSingle();

            if (match?.id) {
              toast.success("Match starting");
              navigate(`/match/${match.id}`);
              return;
            }

            if (matchError) {
              console.error("[LobbyPanel] Error fetching match:", matchError);
            }

            if (attempt < maxAttempts - 1) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          } catch (matchException) {
            console.error("[LobbyPanel] Exception fetching match:", matchException);
          }
        }

        toast.error("Failed to join match", {
          description: "Refresh the room and try again.",
        });
        setHasNavigated(false);
      };

      void fetchMatchAndNavigate();
    }
  }, [hasNavigated, lobby, lobbyId, navigate]);

  const copyCode = async () => {
    if (!lobby?.code) return;
    await navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied");
  };

  const toggleReady = async () => {
    try {
      const { error: readyError } = await supabase.functions.invoke("toggle-lobby-ready", {
        body: {
          lobbyId,
          isReady: !currentPlayer?.is_ready,
        },
      });

      if (readyError) throw readyError;
    } catch (readyException: any) {
      toast.error("Failed to update ready state", {
        description: readyException.message,
      });
    }
  };

  const updateSettings = async (field: string, value: unknown) => {
    if (!isHost) return;

    setUpdating(true);
    try {
      const { error: settingsError } = await supabase.functions.invoke("update-lobby-settings", {
        body: {
          lobbyId,
          [field]: value,
        },
      });

      if (settingsError) throw settingsError;
      toast.success("Room updated");
    } catch (settingsException: any) {
      toast.error("Failed to update room", {
        description: settingsException.message,
      });
    } finally {
      setUpdating(false);
    }
  };

  const startMatch = async () => {
    setStarting(true);
    try {
      const { data, error: startError } = await supabase.functions.invoke("start-lobby-match", {
        body: { lobbyId },
      });

      if (startError) throw startError;
      if (data?.error) throw new Error(data.error);

      if (data?.matchId) {
        toast.success("Match starting");
        setHasNavigated(true);
        navigate(`/match/${data.matchId}`);
        return;
      }

      throw new Error("No matchId returned");
    } catch (startException: any) {
      toast.error("Failed to start match", {
        description: startException.message,
      });
      setStarting(false);
    }
  };

  const leaveLobby = async () => {
    try {
      const { error: leaveError } = await supabase.functions.invoke("leave-lobby", {
        body: { lobbyId },
      });

      if (leaveError) throw leaveError;
      toast.success("Left room");
      navigate("/play");
    } catch (leaveException: any) {
      toast.error("Failed to leave room", {
        description: leaveException.message,
      });
    }
  };

  const closeLobby = async () => {
    if (!confirm("Close this room and remove both seats?")) return;

    try {
      const { error: closeError } = await supabase.functions.invoke("close-lobby", {
        body: { lobbyId },
      });

      if (closeError) throw closeError;
      toast.success("Room closed");
      navigate("/play");
    } catch (closeException: any) {
      toast.error("Failed to close room", {
        description: closeException.message,
      });
    }
  };

  if (loading) {
    return <p className="system-empty">Loading room state...</p>;
  }

  if (error || !lobby) {
    return (
      <div className="grid gap-3">
        <p className="system-empty text-destructive">{error || "Room not found."}</p>
        <div>
          <Button variant="hero" className="border-0" onClick={() => navigate("/play")}>
            Back to play
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-panel-system">
      <DecisionEntry as="div" className="lobby-panel-system__summary">
        <div className="flex items-start gap-3">
          <div className="system-onboarding-choice__glyph h-11 w-11">
            <BoardScene
              game={gameKey as BoardSceneKey}
              state={lobby.status === "starting" ? "loading" : "idle"}
              decorative
              className="h-5 w-5 text-[#090909]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="ops-directory-row__title">{lobby.code}</h3>
              <UtilityPill strong>{lobby.status === "starting" ? "starting" : currentPlayer?.is_ready ? "ready" : "waiting"}</UtilityPill>
            </div>
            <p className="ops-directory-row__meta">
              {gameLabel}. {gameMeta.tagline}. Fill both seats, then commit to the match.
            </p>
          </div>

          <Button type="button" variant="ghost" size="icon" className="border-0" onClick={copyCode}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <UtilityStrip className="lobby-panel-system__meta">
          <UtilityPill strong>{boardLabel}</UtilityPill>
          <UtilityPill>{turnTimerLabel}</UtilityPill>
          {gameKey === "hex" ? <UtilityPill>{lobby.pie_rule ? "swap allowed" : "no swap"}</UtilityPill> : null}
          <UtilityPill>{variantLabel(currentVariant)}</UtilityPill>
        </UtilityStrip>
      </DecisionEntry>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <div className="grid gap-4">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="system-section__label">Seats</p>
                <h3 className="system-section__title">Ready the room</h3>
              </div>
              <UtilityStrip>
                <UtilityPill strong>{players.length}/2 seats</UtilityPill>
                <UtilityPill>{allReady ? "locked" : "waiting"}</UtilityPill>
              </UtilityStrip>
            </div>

            <DecisionLane>
              {players.map((player) => {
                const username = player.profiles?.username || "Unknown";
                const avatarLetter = username[0]?.toUpperCase() || "?";
                const isVerifiedHuman = player.profiles?.is_verified_human || false;
                const lastSeen = new Date(player.last_seen);
                const secondsSinceLastSeen = (Date.now() - lastSeen.getTime()) / 1000;
                const isConnected = secondsSinceLastSeen < 30;

                return (
                  <DecisionEntry as="div" key={player.player_id}>
                    <div className="flex items-center gap-3">
                      <div className="lobby-panel-system__avatar">
                        <span>{avatarLetter}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="ops-directory-row__title">{username}</p>
                          {isVerifiedHuman ? <VerifiedBadge size="sm" /> : null}
                          {player.role === "host" ? <Crown className="h-4 w-4 text-black" /> : null}
                          {player.player_id === userId ? <UtilityPill>You</UtilityPill> : null}
                        </div>
                        <p className="ops-directory-row__meta">
                          {isConnected ? "Connected now." : "Away from the room."}
                        </p>
                      </div>

                      <UtilityStrip>
                        <UtilityPill strong={player.is_ready}>
                          {player.is_ready ? "ready" : "waiting"}
                        </UtilityPill>
                      </UtilityStrip>
                    </div>
                  </DecisionEntry>
                );
              })}

              {players.length < 2 ? (
                <DecisionEntry as="div">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="ops-directory-row__title">Seat open</h3>
                      <UtilityPill>pending</UtilityPill>
                    </div>
                    <p className="ops-directory-row__meta">
                      Share the room code and wait for the second player to enter.
                    </p>
                  </div>
                </DecisionEntry>
              ) : null}
            </DecisionLane>
          </div>

          {!allReady && players.length === 2 ? (
            <p className="system-inline-note">Both seats need to lock ready before the room can start.</p>
          ) : null}
        </div>

        <DecisionEntry as="div" className="lobby-panel-system__rules">
          <div className="grid gap-2">
            <p className="system-section__label">Rules</p>
            <h3 className="system-section__title">Room setup</h3>
            <p className="system-inline-note">
              Web owns the deeper rule editing flow. Mobile and Discord can still run the room.
            </p>
          </div>

          <div className="lobby-panel-system__control-grid">
            <div className="grid gap-2">
              <label className="system-nav-context">Variant</label>
              <Select
                value={typeof currentModVersionId === "string" && currentModVersionId ? currentModVersionId : "__none__"}
                onValueChange={(value) => updateSettings("modVersionId", value === "__none__" ? null : value)}
                disabled={!isHost || !isAuthoringSurface || updating || workshopModsLoading}
              >
                <SelectTrigger className="lobby-panel-system__select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Standard</SelectItem>
                  {variantGroups.official.map((variant) => (
                    <SelectItem
                      key={variant.id}
                      value={variant.latest_version_id ?? `__missing__${variant.id}`}
                      disabled={!variant.latest_version_id}
                    >
                      {`Official / ${variant.name}`}
                    </SelectItem>
                  ))}
                  {variantGroups.club.map((variant) => (
                    <SelectItem
                      key={variant.id}
                      value={variant.latest_version_id ?? `__missing__${variant.id}`}
                      disabled={!variant.latest_version_id}
                    >
                      {`Club / ${variant.name}`}
                    </SelectItem>
                  ))}
                  {variantGroups.workshop.map((variant) => (
                    <SelectItem
                      key={variant.id}
                      value={variant.latest_version_id ?? `__missing__${variant.id}`}
                      disabled={!variant.latest_version_id}
                    >
                      {`Workshop / ${variant.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="system-nav-context">Board</label>
              {supportsBoardSize(gameKey) ? (
                <Select
                  value={lobby.board_size.toString()}
                  onValueChange={(value) => updateSettings("boardSize", parseInt(value, 10))}
                  disabled={!isHost || !isAuthoringSurface || updating}
                >
                  <SelectTrigger className="lobby-panel-system__select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7x7 quick</SelectItem>
                    <SelectItem value="9">9x9 standard</SelectItem>
                    <SelectItem value="11">11x11 classic</SelectItem>
                    <SelectItem value="13">13x13 long</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input className="lobby-panel-system__select" value={boardLabel} readOnly />
              )}
            </div>
          </div>

          <UtilityStrip className="lobby-panel-system__rule-pills">
            <UtilityPill strong={!!currentVariant}>{variantLabel(currentVariant)}</UtilityPill>
            <UtilityPill>{turnTimerLabel}</UtilityPill>
            <UtilityPill>{supportsBoardSize(gameKey) ? boardLabel : "fixed board"}</UtilityPill>
          </UtilityStrip>

          {gameKey === "hex" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="system-nav-context">Swap rule</p>
                <p className="system-inline-note">Turn the opening into a fair commit.</p>
              </div>
              <Button
                variant={lobby.pie_rule ? "hero" : "outline"}
                className="border-0"
                onClick={() => updateSettings("pieRule", !lobby.pie_rule)}
                disabled={!isHost || !isAuthoringSurface || updating}
              >
                {lobby.pie_rule ? "Swap on" : "Swap off"}
              </Button>
            </div>
          ) : null}

          {!isHost ? <p className="system-inline-note">Only the host can change room rules.</p> : null}
          {isHost && !isAuthoringSurface && (lobby as any)?.world_id ? (
            <div className="grid gap-3">
              <OpenOnWebButton to={`/worlds/${(lobby as any).world_id}/variants`} label="Edit variants on web" />
              <WebHandoffNotice
                title="Rules editing stays on web."
                detail="Board setup, variant publishing, and deeper mod control stay on the browser surface."
                to={`/worlds/${(lobby as any).world_id}/variants`}
              />
            </div>
          ) : null}
        </DecisionEntry>
      </div>

      <div className="lobby-panel-system__actions">
        {isHost ? (
          <Button variant="ghost" className="border-0" onClick={closeLobby}>
            <X className="h-4 w-4" />
            Close room
          </Button>
        ) : (
          <Button variant="ghost" className="border-0" onClick={leaveLobby}>
            <LogOut className="h-4 w-4" />
            Leave room
          </Button>
        )}

        <Button
          onClick={toggleReady}
          variant={currentPlayer?.is_ready ? "outline" : "hero"}
          className="border-0"
        >
          {currentPlayer?.is_ready ? "Hold ready" : "Ready up"}
        </Button>

        {isHost ? (
          <Button onClick={startMatch} disabled={!canStart || starting} variant="hero" className="border-0">
            <Play className="h-4 w-4" />
            {starting ? "Starting..." : "Start match"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
