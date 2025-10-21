import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LobbyPanel } from '@/components/LobbyPanel';
import { usePresence } from '@/hooks/usePresence';

export default function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const { user } = useAuth();

  usePresence(user?.id);

  if (!user || !lobbyId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-body text-4xl md:text-5xl font-semibold text-foreground mb-3">
            Game Lobby
          </h1>
          <p className="text-muted-foreground text-lg font-body">
            Get ready to play
          </p>
        </div>

        <LobbyPanel lobbyId={lobbyId} userId={user.id} />
      </div>
    </div>
  );
}
