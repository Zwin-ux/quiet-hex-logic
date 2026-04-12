import { useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StateTag } from "@/components/board/StateTag";
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
        }
        if (errorMsg.includes("full")) {
          throw new Error("This lobby already has 2 players");
        }
        throw new Error(data.error);
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
        const delay = 500 * 2 ** retryCount;
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
    <section className="retro-window">
      <div className="retro-window__titlebar">
        <div>
          <p className="retro-window__eyebrow">Direct access</p>
          <h2 className="retro-window__title mt-1">Enter room by code</h2>
        </div>
        <StateTag tone={code.length >= 4 ? "success" : "warning"}>
          {code.length >= 4 ? "ready" : "await code"}
        </StateTag>
      </div>

      <div className="retro-window__body">
        <div className="space-y-4">
          <div>
            <p className="mb-2 board-rail-label">Room code</p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="h-12 text-center font-mono text-base tracking-[0.32em] uppercase"
            />
          </div>

          <div className="retro-status-strip justify-between bg-[#ffffcc]">
            <div className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              <span>Identity</span>
            </div>
            <span>{userId ? "operator ready" : "sign in required"}</span>
          </div>

          <Button onClick={() => joinLobby()} disabled={joining || code.length < 4} variant="hero" className="h-12 w-full">
            {joining ? "Joining..." : "Join room"}
          </Button>
        </div>
      </div>
    </section>
  );
}
