import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Users as UsersIcon, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type LobbyCardProps = {
  lobby: {
    id: string;
    code: string;
    host_id: string;
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
  const hostUsername = lobby.profiles?.username || 'Unknown';

  // Calculate time elapsed
  const createdTime = new Date(lobby.created_at);
  const elapsed = Math.floor((Date.now() - createdTime.getTime()) / 60000);
  const timeText = elapsed < 1 ? 'Just created' : `${elapsed} min ago`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(lobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied!');
  };

  const joinLobby = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to join lobbies');
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-lobby', {
        body: { code: lobby.code }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Joining lobby...');
      navigate(`/lobby/${lobby.id}`);
    } catch (err: any) {
      toast.error('Failed to join lobby', {
        description: err.message
      });
      setJoining(false);
    }
  };

  const enterLobby = () => {
    navigate(`/lobby/${lobby.id}`);
  };

  return (
    <Card
      className={`p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-soft hover:shadow-medium transition-all duration-300 border-2 ${
        isHost ? 'border-indigo/40 bg-indigo/5' : 'hover:border-ochre/30'
      }`}
    >
      <div className="flex items-start md:items-center gap-4 sm:gap-6 flex-1">
        {/* Hex icon */}
        <div className="text-4xl sm:text-5xl text-muted-foreground/30 shrink-0">⬡</div>

        <div className="flex-1 min-w-0">
          {/* Lobby Code - Large and prominent */}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
            <h3 className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-foreground">
              {lobby.code}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyCode}
              className="h-8 w-8 p-0 touch-manipulation"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {isHost && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Crown className="h-3 w-3" />
                <span className="hidden sm:inline">Your Lobby</span>
                <span className="sm:hidden">You</span>
              </Badge>
            )}
          </div>

          {/* Host and player info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
            <span className="text-xs sm:text-sm text-muted-foreground truncate">
              Host: <span className="font-semibold text-foreground">{hostUsername}</span>
            </span>

            {/* Player count indicator */}
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">
                {playerCount}/2 players
              </span>
              {/* Visual indicator */}
              <div className="flex gap-1">
                <div className={`h-2 w-2 rounded-full ${playerCount >= 1 ? 'bg-indigo' : 'bg-border'}`} />
                <div className={`h-2 w-2 rounded-full ${playerCount >= 2 ? 'bg-indigo' : 'bg-border'}`} />
              </div>
            </div>
          </div>

          {/* Settings badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="font-mono bg-indigo text-primary-foreground text-xs">
              {lobby.board_size}×{lobby.board_size}
            </Badge>
            {lobby.pie_rule && (
              <Badge variant="outline" className="font-mono text-xs">
                Pie Rule
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-mono">
              {timeText}
            </span>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        {isHost ? (
          <Button onClick={enterLobby} className="w-full md:w-auto gap-2 h-11 touch-manipulation">
            Enter Lobby
          </Button>
        ) : (
          <Button
            onClick={joinLobby}
            disabled={joining || playerCount >= 2}
            className="w-full md:w-auto gap-2 h-11 touch-manipulation"
            variant={playerCount >= 2 ? 'secondary' : 'default'}
          >
            {playerCount >= 2 ? 'Full' : joining ? 'Joining...' : 'Join Lobby'}
          </Button>
        )}
      </div>
    </Card>
  );
}
