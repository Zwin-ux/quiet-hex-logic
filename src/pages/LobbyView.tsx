import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LobbyPanel } from '@/components/LobbyPanel';
import { usePresence } from '@/hooks/usePresence';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const { user } = useAuth();

  usePresence(user?.id);

  useEffect(() => {
    // Log navigation success for debugging
    console.log(`[LobbyView] Successfully loaded lobby ${lobbyId} for user ${user?.id}`);
  }, [lobbyId, user?.id]);

  if (!user || !lobbyId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-gentle-pulse text-4xl mb-4">⬡</div>
          <p className="text-muted-foreground">Loading lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="font-body text-4xl md:text-5xl font-semibold text-foreground">
              Game Lobby
            </h1>
            <Badge className="gap-2 bg-emerald-500 text-white px-3 py-1">
              <CheckCircle className="h-4 w-4" />
              You're in!
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg font-body">
            Get ready to play — waiting for all players to be ready
          </p>
        </div>

        <LobbyPanel lobbyId={lobbyId} userId={user.id} />
      </div>
    </div>
  );
}
