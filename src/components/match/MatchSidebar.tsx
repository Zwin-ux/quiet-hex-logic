import { PlayerPanel } from '@/components/PlayerPanel';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { VenuePanel } from '@/components/board/VenuePanel';
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
  match,
  player1,
  player2,
  currentColor,
  isAIMatch,
  aiThinking,
  timeRemaining,
  discordAvatarUrl,
  spectators,
}: MatchSidebarProps) {
  return (
    <>
      <div className="order-1 space-y-4 lg:block">
        {player1 ? (
          <VenuePanel eyebrow="Seat A" title="Player">
            <PlayerPanel
              username={player1.username}
              color={1}
              isCurrentTurn={currentColor === 1 && match.status === 'active'}
              timeRemaining={currentColor === 1 && match.status === 'active' ? timeRemaining ?? undefined : undefined}
              isAI={player1.is_bot}
              avatarColor={player1.avatar_color}
              discordAvatarUrl={player1.profile_id === 'discord-player' ? discordAvatarUrl : undefined}
              elo={player1.elo}
              compact={false}
            />
          </VenuePanel>
        ) : null}

        <div className="lg:hidden">
          {player2 ? (
            <VenuePanel eyebrow="Seat B" title="Opponent">
              <PlayerPanel
                username={player2.username}
                color={2}
                isCurrentTurn={currentColor === 2 && match.status === 'active'}
                timeRemaining={currentColor === 2 && match.status === 'active' ? timeRemaining ?? undefined : undefined}
                isAI={player2.is_bot}
                avatarColor={player2.avatar_color}
                discordAvatarUrl={player2.profile_id === 'discord-player' ? discordAvatarUrl : undefined}
                elo={player2.elo}
                compact={false}
              />
              {isAIMatch && currentColor === 2 && match.status === 'active' ? (
                <div className="mt-4">
                  <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
                </div>
              ) : null}
            </VenuePanel>
          ) : null}
        </div>
      </div>

      <div className="hidden lg:block order-3 space-y-4">
        {player2 ? (
          <VenuePanel eyebrow="Seat B" title="Opponent">
            <PlayerPanel
              username={player2.username}
              color={2}
              isCurrentTurn={currentColor === 2 && match.status === 'active'}
              timeRemaining={currentColor === 2 && match.status === 'active' ? timeRemaining ?? undefined : undefined}
              isAI={player2.is_bot}
              avatarColor={player2.avatar_color}
              discordAvatarUrl={player2.profile_id === 'discord-player' ? discordAvatarUrl : undefined}
              elo={player2.elo}
              compact={false}
            />
            {isAIMatch && currentColor === 2 && match.status === 'active' ? (
              <div className="mt-4">
                <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
              </div>
            ) : null}
          </VenuePanel>
        ) : null}

        {!isAIMatch && spectators.length > 0 ? (
          <VenuePanel eyebrow="Presence" title={`${spectators.length} watching`}>
            <div className="flex items-center gap-2 border-t border-black/10 pt-4">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Spectators attached to this room</span>
            </div>
            <div className="mt-4 space-y-2 border-t border-black/10 pt-4">
              {spectators.slice(0, 5).map((spectator) => (
                <div key={spectator.profile_id} className="board-rail-label flex items-center justify-between text-[10px] text-black/45">
                  <span>{spectator.profiles?.username || 'Anonymous'}</span>
                  <span>watching</span>
                </div>
              ))}
              {spectators.length > 5 ? (
                <div className="text-xs text-muted-foreground">+{spectators.length - 5} more</div>
              ) : null}
            </div>
          </VenuePanel>
        ) : null}
      </div>
    </>
  );
}
