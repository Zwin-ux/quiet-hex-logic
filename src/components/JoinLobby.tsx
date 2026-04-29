import { useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SystemSection, UtilityPill, UtilityStrip } from "@/components/board/SystemSurface";
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
    <SystemSection
      label="Direct access"
      title="Enter room by code"
      actions={<UtilityPill strong={code.length >= 4}>{code.length >= 4 ? "ready" : "await code"}</UtilityPill>}
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 board-rail-label">Room code</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="h-12 border-black/10 bg-white text-center font-mono text-base tracking-[0.32em] uppercase"
          />
        </div>

        <UtilityStrip className="justify-between">
          <UtilityPill>
            <LogIn className="h-3.5 w-3.5" />
            identity
          </UtilityPill>
          <UtilityPill strong={Boolean(userId)}>{userId ? "operator ready" : "sign in required"}</UtilityPill>
        </UtilityStrip>

        <Button onClick={() => joinLobby()} disabled={joining || code.length < 4} variant="hero" className="h-12 w-full">
          {joining ? "Joining..." : "Join room"}
        </Button>
      </div>
    </SystemSection>
  );
}
