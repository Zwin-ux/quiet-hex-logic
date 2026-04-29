import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BoardScene, type BoardSceneKey } from "@/components/board/BoardScene";
import { UtilityPill } from "@/components/board/SystemSurface";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildAuthRoute } from "@/lib/authRedirect";

type LobbyCardProps = {
  lobby: {
    id: string;
    code: string;
    host_id: string;
    world_name?: string | null;
    game_key?: string | null;
    board_size: number;
    pie_rule: boolean;
    created_at: string;
    profiles?: { username: string } | null;
  };
  playerCount: number;
  currentUserId: string | undefined;
};

export function LobbyCard({ lobby, playerCount, currentUserId }: LobbyCardProps) {
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const isHost = lobby.host_id === currentUserId;
  const isFull = playerCount >= 2;
  const hostUsername = lobby.profiles?.username || "Unknown";
  const gameKey = lobby.game_key ?? "hex";

  const createdTime = new Date(lobby.created_at);
  const elapsed = Math.floor((Date.now() - createdTime.getTime()) / 60000);
  const timeText = elapsed < 1 ? "just opened" : `${elapsed} min live`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied");
  };

  const joinLobby = async () => {
    if (!currentUserId) {
      toast.error("Sign in required", {
        description: "Joining a live room needs an account.",
      });
      navigate(buildAuthRoute());
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-lobby", {
        body: { code: lobby.code },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Joining room");
      navigate(`/lobby/${lobby.id}`);
    } catch (err: any) {
      toast.error("Failed to join room", {
        description: err.message,
      });
      setJoining(false);
    }
  };

  const enterLobby = () => {
    navigate(`/lobby/${lobby.id}`);
  };

  return (
    <div className="decision-entry" role="group" aria-label={`${lobby.code} room`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <UtilityPill strong={!isFull}>{isFull ? "full" : "open"}</UtilityPill>
          {isHost ? <UtilityPill>host</UtilityPill> : null}
          {lobby.world_name ? <UtilityPill>{lobby.world_name}</UtilityPill> : null}
          <UtilityPill>{gameKey.replace("connect4", "connect 4")}</UtilityPill>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="system-onboarding-choice__glyph h-10 w-10">
            <BoardScene game={gameKey as BoardSceneKey} state={isFull ? "static" : "idle"} decorative className="h-5 w-5 text-[#090909]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="ops-directory-row__title">{lobby.code} room</h3>
              <span className="utility-pill">{timeText}</span>
            </div>
            <p className="mt-2 text-sm leading-7 text-black/68">
              Hosted by <span className="font-semibold text-black">{hostUsername}</span>. {playerCount}/2 seats taken.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="utility-pill">
            {lobby.board_size}x{lobby.board_size}
          </span>
          {gameKey !== "chess" && gameKey !== "checkers" && gameKey !== "ttt" && lobby.pie_rule ? (
            <span className="utility-pill">swap allowed</span>
          ) : null}
        </div>
      </div>

      <div className="decision-entry__focus">
        <p className="system-inline-note">
          {isHost ? "Open the waiting room and start when both seats lock in." : isFull ? "Watch the room or wait for a seat to open." : "Commit to this room when you are ready."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={copyCode} className="h-11 w-11 border-0">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          {isHost ? (
            <Button onClick={enterLobby} variant="hero" className="border-0">
              Enter room
            </Button>
          ) : (
            <Button onClick={joinLobby} disabled={joining || isFull} variant={isFull ? "outline" : "hero"} className="border-0">
              {isFull ? "Room full" : joining ? "Joining..." : "Join room"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
