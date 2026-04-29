import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import {
  SystemScreen,
  SystemSection,
  UtilityPill,
  UtilityStrip,
} from "@/components/board/SystemSurface";
import { SiteFrame } from "@/components/board/SiteFrame";
import { LobbyPanel } from "@/components/LobbyPanel";
import { EnhancedChat } from "@/components/EnhancedChat";
import { Button } from "@/components/ui/button";

export default function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [worldContext, setWorldContext] = useState<{ id: string; name: string } | null>(null);

  usePresence(user?.id);

  useEffect(() => {
    const loadWorldContext = async () => {
      if (!lobbyId) return;

      const { data: lobby } = await (supabase as any)
        .from("lobbies")
        .select("world_id")
        .eq("id", lobbyId)
        .maybeSingle();

      const worldId = lobby?.world_id;
      if (!worldId) {
        setWorldContext(null);
        return;
      }

      const { data: world } = await (supabase as any)
        .from("worlds")
        .select("id, name")
        .eq("id", worldId)
        .maybeSingle();

      if (world?.id) {
        setWorldContext({ id: world.id, name: world.name });
      }
    };

    loadWorldContext();
  }, [lobbyId]);

  if (!user || !lobbyId) {
    return (
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
          Loading room...
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame visualMode="mono" contentClassName="pb-16 pt-32 md:pt-28">
      <SystemScreen
        label="Room"
        title="Live lobby"
        description="Ready, chat, then commit to the match."
        actions={
          <>
            {worldContext ? (
              <Button
                variant="ghost"
                className="border-0"
                onClick={() => navigate(`/worlds/${worldContext.id}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {worldContext.name}
              </Button>
            ) : null}
            <Button variant="ghost" className="border-0" onClick={() => navigate("/play")}>
              <ArrowLeft className="h-4 w-4" />
              Back to play
            </Button>
          </>
        }
      >
        <UtilityStrip>
          <UtilityPill strong>active</UtilityPill>
          <UtilityPill>two seats</UtilityPill>
          <UtilityPill>room chat attached</UtilityPill>
        </UtilityStrip>

        <SystemSection label="Room state" title="Seats and readiness">
          <LobbyPanel lobbyId={lobbyId} userId={user.id} />
        </SystemSection>

        <SystemSection label="Chat" title="Lobby conversation">
          <div className="flex items-center gap-2 pb-4">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Room channel</span>
          </div>
          <div className="h-[420px] overflow-hidden">
            <EnhancedChat channelType="lobby" channelId={lobbyId} maxHeight="100%" showHeader={false} />
          </div>
        </SystemSection>
      </SystemScreen>
    </SiteFrame>
  );
}
