import { PlayerPanel } from '@/components/PlayerPanel';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { Eye } from 'lucide-react';
import type { MatchData, Player } from '@/hooks/useMatchState';

interface MatchSidebarProps {
  match: MatchData;
  player1: Player | undefined;
  player2: Player | undefined;
  currentColor: number;
  isAIMatch: boolean;
  aiThinking: boolean;
  timeRemaining: number | null;
  discordAvatarUrl: string | undefined;
  spectators: Array<{ profile_id: string; profiles?: { username?: string } }>;
}

export function MatchSidebar({
  match, player1, player2, currentColor, isAIMatch,
  aiThinking, timeRemaining, discordAvatarUrl, spectators,
}: MatchSidebarProps) {
  return (
    <>
      {/* Desktop: Player 1 Panel */}
      <div className="hidden lg:block order-1">
        {player1 && (
          <PlayerPanel
            username={player1.username}
            color={1}
            isCurrentTurn={currentColor === 1 && match.status === 'active'}
            timeRemaining={currentColor === 1 && match.status === 'active' ? timeRemaining ?? undefined : undefined}
            isAI={player1.is_bot}
            avatarColor={player1.avatar_color}
            discordAvatarUrl={player1.profile_id === 'discord-player' ? discordAvatarUrl : undefined}
            elo={player1.elo}
          />
        )}
      </div>

      {/* Desktop: Player 2 Panel */}
      <div className="hidden lg:block order-3">
        {player2 && (
          <div className="relative">
            <PlayerPanel
              username={player2.username}
              color={2}
              isCurrentTurn={currentColor === 2 && match.status === 'active'}
              timeRemaining={currentColor === 2 && match.status === 'active' ? timeRemaining ?? undefined : undefined}
              isAI={player2.is_bot}
              avatarColor={player2.avatar_color}
              discordAvatarUrl={player2.profile_id === 'discord-player' ? discordAvatarUrl : undefined}
              elo={player2.elo}
            />
            {isAIMatch && currentColor === 2 && match.status === 'active' && (
              <div className="mt-3">
                <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
              </div>
            )}
          </div>
        )}

        {!isAIMatch && spectators.length > 0 && (
          <div className="mt-6 p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm text-muted-foreground">
                {spectators.length} watching
              </span>
            </div>
            <div className="space-y-2">
              {spectators.slice(0, 5).map((spectator) => (
                <div key={spectator.profile_id} className="text-sm text-muted-foreground font-mono">
                  {spectator.profiles?.username || 'Anonymous'}
                </div>
              ))}
              {spectators.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  +{spectators.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
