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
    <div className="border border-black bg-[#fbfaf8] px-4 py-4 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StateTag tone={isFull ? "warning" : "success"}>{isFull ? "full" : "open"}</StateTag>
          {isHost ? <StateTag>host</StateTag> : null}
          {lobby.world_name ? <StateTag>{lobby.world_name}</StateTag> : null}
          <StateTag>{gameKey}</StateTag>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <h3 className="board-section-title">{lobby.code} room</h3>
          <span className="text-[11px] uppercase tracking-[0.16em] text-black/55">{timeText}</span>
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-black/68">
          Hosted by <span className="font-semibold text-black">{hostUsername}</span>. {playerCount}/2 seats taken.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="board-meta-chip">
            {lobby.board_size}x{lobby.board_size}
          </span>
          {gameKey !== "chess" && gameKey !== "checkers" && gameKey !== "ttt" && lobby.pie_rule ? (
            <span className="board-meta-chip">swap allowed</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-0 md:justify-end">
        <Button type="button" variant="quiet" size="icon" onClick={copyCode} className="h-11 w-11">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        {isHost ? (
          <Button onClick={enterLobby}>Enter room</Button>
        ) : (
          <Button onClick={joinLobby} disabled={joining || isFull} variant={isFull ? "destructive" : "hero"}>
            {isFull ? "Room full" : joining ? "Joining..." : "Join room"}
          </Button>
        )}
      </div>
    </div>
  );
}
