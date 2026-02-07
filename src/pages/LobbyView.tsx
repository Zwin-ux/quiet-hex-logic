import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LobbyPanel } from '@/components/LobbyPanel';
import { EnhancedChat } from '@/components/EnhancedChat';
import { usePresence } from '@/hooks/usePresence';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LobbyView() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const { user } = useAuth();

  usePresence(user?.id);

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

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <LobbyPanel lobbyId={lobbyId} userId={user.id} />
          <Card className="h-[400px] lg:h-[500px] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 p-3 border-b">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Lobby Chat</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <EnhancedChat channelType="lobby" channelId={lobbyId} maxHeight="100%" showHeader={false} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
