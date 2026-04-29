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
import { buildAuthRoute } from "@/lib/authRedirect";

export default function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
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

  if (!lobbyId) {
    return (
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
          Loading room...
        </div>
      </SiteFrame>
    );
  }

  if (loading) {
    return (
      <SiteFrame visualMode="mono">
        <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
          Loading room...
        </div>
      </SiteFrame>
    );
  }

  if (!user) {
    return (
      <SiteFrame visualMode="mono" contentClassName="pb-16 pt-32 md:pt-28">
        <SystemScreen
          label="Room"
          title="Sign in to enter"
          description="Live rooms need an account so readiness, presence, and match routing stay attached to you."
        >
          <SystemSection label="Access" title="Room access is account-bound">
            <div className="grid gap-4">
              <p className="system-inline-note">
                The room exists. Sign in, then BOARD will drop you back into this exact room.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="hero"
                  className="border-0"
                  onClick={() => navigate(buildAuthRoute(`/lobby/${lobbyId}`))}
                >
                  Sign in
                </Button>
                <Button variant="ghost" className="border-0" onClick={() => navigate("/play")}>
                  Back to play
                </Button>
              </div>
            </div>
          </SystemSection>
        </SystemScreen>
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
