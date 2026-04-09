import { useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type JoinLobbyProps = {
  userId: string;
};

export function JoinLobby({ userId }: JoinLobbyProps) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const joinLobby = async (retryCount = 0) => {
    if (!code || code.length < 4) {
      toast.error("Please enter a valid lobby code");
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-lobby", {
        body: { code: code.toUpperCase() },
      });

      if (error) throw error;
      if (data?.error) {
        const errorMsg = data.error.toLowerCase();
        if (errorMsg.includes("not found") || errorMsg.includes("already started")) {
          throw new Error("Invalid code or lobby already started");
        } else if (errorMsg.includes("full")) {
          throw new Error("This lobby already has 2 players");
        } else {
          throw new Error(data.error);
        }
      }

      if (!data?.lobby?.id) {
        throw new Error("Invalid response from server");
      }

      toast.success("Joined room");
      navigate(`/lobby/${data.lobby.id}`);
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error occurred";

      if (
        retryCount < 2 &&
        (errorMessage.includes("network") ||
          errorMessage.includes("fetch") ||
          errorMessage.includes("timeout"))
      ) {
        const delay = 500 * Math.pow(2, retryCount);
        toast.info(`Connection issue, retrying in ${delay}ms...`);

        setTimeout(() => {
          joinLobby(retryCount + 1);
        }, delay);
        return;
      }

      toast.error("Failed to join room", {
        description: errorMessage,
      });
      setJoining(false);
    }
  };

  return (
    <section className="board-panel board-panel-cut rounded-[1.6rem] bg-white/92 p-5 md:p-6">
      <div className="flex items-center gap-3 border-b border-black/10 pb-4">
        <LogIn className="h-4 w-4 text-foreground" />
        <div>
          <p className="board-rail-label text-[10px]">Direct access</p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.05em] text-foreground">
            Enter a room by code
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Room code</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="h-12 border-black/10 bg-[#faf9f4] text-center font-mono text-base tracking-[0.3em] uppercase"
          />
        </div>

        <Button onClick={() => joinLobby()} disabled={joining || code.length < 4} className="clip-stage h-12 w-full">
          {joining ? "Joining..." : "Join room"}
        </Button>
      </div>
    </section>
  );
}
