import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StateTag } from "@/components/board/StateTag";
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
    <div
      className={`board-ledger-row md:grid-cols-[92px_minmax(0,1fr)_220px] ${
        isFull ? "bg-[#fff0f0]" : ""
      }`}
    >
      <div className="space-y-3">
        <div className="retro-counter justify-center text-[0.68rem]">
          {lobby.code}
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="flex h-9 w-full items-center justify-center border-2 border-black bg-[#c0c0c0] text-black transition-none [border-color:#ffffff_#808080_#808080_#ffffff] [box-shadow:inset_-1px_-1px_0_#404040,inset_1px_1px_0_#dfdfdf] hover:bg-[#d0d0d0] active:translate-x-px active:translate-y-px active:[border-color:#808080_#ffffff_#ffffff_#808080] active:[box-shadow:inset_1px_1px_0_#404040,inset_-1px_-1px_0_#dfdfdf]"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="min-w-0">
        <div className="board-meta-stack mb-3">
          <StateTag tone={isFull ? "warning" : "success"}>
            {isFull ? "Full" : "Open"}
          </StateTag>
          {isHost ? <StateTag>Host</StateTag> : null}
          {lobby.world_name ? <StateTag>{lobby.world_name}</StateTag> : null}
          <StateTag>{gameKey}</StateTag>
        </div>

        <h3 className="board-section-title text-foreground">
          {lobby.code} room
        </h3>
        <p className="mt-3 text-sm leading-6 text-black">
          Hosted by <span className="font-bold">{hostUsername}</span>. {playerCount}/2 seats taken.{" "}
          {timeText}.
        </p>

        <div className="mt-3 board-meta-stack">
          <span className="board-meta-chip">{lobby.board_size}x{lobby.board_size}</span>
          {gameKey !== "chess" && gameKey !== "checkers" && gameKey !== "ttt" && lobby.pie_rule ? (
            <span className="board-meta-chip">swap allowed</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 border-l border-black pl-4">
        <div className="retro-status-strip justify-between gap-3 bg-[#e8e8e8] px-3 py-2">
          <span>Join state</span>
          <span>{isFull ? "hold" : "ready"}</span>
        </div>
        {isHost ? (
          <Button onClick={enterLobby}>Enter room</Button>
        ) : (
          <Button
            onClick={joinLobby}
            disabled={joining || isFull}
            variant={isFull ? "destructive" : "hero"}
          >
            {isFull ? "Room full" : joining ? "Joining..." : "Join room"}
          </Button>
        )}
      </div>
    </div>
  );
}
