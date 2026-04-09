import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";
import { LobbyPanel } from "@/components/LobbyPanel";
import { EnhancedChat } from "@/components/EnhancedChat";

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
      <SiteFrame>
        <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
          Loading room...
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <div className="mb-5 flex flex-wrap items-center gap-4 text-sm font-semibold text-muted-foreground">
        {worldContext ? (
          <button onClick={() => navigate(`/worlds/${worldContext.id}`)} className="transition-colors hover:text-foreground">
            Back to {worldContext.name}
          </button>
        ) : null}
        <button onClick={() => navigate("/play")} className="transition-colors hover:text-foreground">
          Back to play
        </button>
      </div>

      <SectionRail
        eyebrow="Room"
        title={
          <div className="flex items-center gap-3">
            <span>Live lobby</span>
            <span className="inline-flex items-center gap-2 rounded-md border border-black bg-black px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white">
              <CheckCircle className="h-3 w-3" />
              active
            </span>
          </div>
        }
        description="Players, readiness, and chat stay attached to the room before the match turns live."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <VenuePanel eyebrow="Room state" title="Seats and readiness">
          <LobbyPanel lobbyId={lobbyId} userId={user.id} />
        </VenuePanel>

        <VenuePanel eyebrow="Room chat" title="Live conversation">
          <div className="flex items-center gap-2 border-b border-black/10 pb-4">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Lobby channel</span>
          </div>
          <div className="mt-4 h-[420px] overflow-hidden">
            <EnhancedChat channelType="lobby" channelId={lobbyId} maxHeight="100%" showHeader={false} />
          </div>
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}
