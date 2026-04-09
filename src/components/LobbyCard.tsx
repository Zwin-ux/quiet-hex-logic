import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const hostUsername = lobby.profiles?.username || "Unknown";
  const gameKey = lobby.game_key ?? "hex";

  const createdTime = new Date(lobby.created_at);
  const elapsed = Math.floor((Date.now() - createdTime.getTime()) / 60000);
  const timeText = elapsed < 1 ? "Just created" : `${elapsed} min ago`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied");
  };

  const joinLobby = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to join rooms");
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
    <div className="board-panel rounded-[1.35rem] bg-white/90 px-4 py-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-2xl tracking-[0.28em] text-foreground">
              {lobby.code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-black/10 bg-[#f5f4ef] text-foreground transition-colors hover:bg-black hover:text-white"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            {isHost ? (
              <span className="board-rail-label rounded-md border border-black bg-black px-2 py-1 text-[10px] text-white">
                Host
              </span>
            ) : null}
            {lobby.world_name ? (
              <span className="board-rail-label rounded-md border border-black/10 px-2 py-1 text-[10px] text-black/55">
                {lobby.world_name}
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Hosted by <span className="font-semibold text-foreground">{hostUsername}</span>.{" "}
            {playerCount}/2 seats taken. {timeText}.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="board-rail-label text-[10px] text-black/45">{gameKey}</span>
            <span className="board-rail-label text-[10px] text-black/45">
              {lobby.board_size}x{lobby.board_size}
            </span>
            {gameKey !== "chess" && gameKey !== "checkers" && gameKey !== "ttt" && lobby.pie_rule ? (
              <span className="board-rail-label text-[10px] text-black/45">pie rule</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isHost ? (
            <Button onClick={enterLobby}>Enter room</Button>
          ) : (
            <Button onClick={joinLobby} disabled={joining || playerCount >= 2} variant={playerCount >= 2 ? "outline" : "default"}>
              {playerCount >= 2 ? "Full" : joining ? "Joining..." : "Join room"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
