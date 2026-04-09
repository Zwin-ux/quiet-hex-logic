import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Clock } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';

interface PlayerPanelProps {
  username: string;
  color: 1 | 2;
  isCurrentTurn: boolean;
  timeRemaining?: number;
  isAI?: boolean;
  avatarColor?: string;
  isPremium?: boolean;
  isVerifiedHuman?: boolean;
  discordAvatarUrl?: string;
  elo?: number;
  compact?: boolean;
}

const seatLabel = (color: 1 | 2) => (color === 1 ? 'Seat A' : 'Seat B');
const accentClass = (color: 1 | 2) => (color === 1 ? 'bg-[#2f3c82]' : 'bg-[#a06a1f]');

const PlayerPanelComponent = ({
  username,
  color,
  isCurrentTurn,
  timeRemaining,
  isAI = false,
  avatarColor = 'indigo',
  isVerifiedHuman = false,
  discordAvatarUrl,
  elo,
  compact = false,
}: PlayerPanelProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div
        className={cn(
          'relative overflow-hidden border border-black/10 bg-white px-3 py-3 transition-all duration-300',
          isCurrentTurn && 'border-black shadow-[0_18px_40px_-28px_rgba(0,0,0,0.4)]',
        )}
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-black/10">
          <div className={cn('h-full w-full', accentClass(color))} />
        </div>
        <div className="flex items-center gap-3 pl-2">
          {discordAvatarUrl ? (
            <Avatar className="h-8 w-8 shrink-0 border border-black/10">
              <AvatarImage src={discordAvatarUrl} alt={username} />
              <AvatarFallback className="bg-[#efede4] text-[11px] font-semibold text-black">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserAvatar username={username} color={avatarColor} size="sm" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{username}</span>
              {isVerifiedHuman ? <VerifiedBadge size="xs" /> : null}
              {isAI ? <Badge variant="outline">AI</Badge> : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="board-rail-label text-[10px] tracking-[0.18em]">{seatLabel(color)}</span>
              {elo !== undefined ? <span className="font-mono">ELO {elo}</span> : null}
            </div>
          </div>

          {timeRemaining !== undefined ? (
            <div
              className={cn(
                'flex items-center gap-1 border border-black/10 px-2 py-1 font-mono text-xs',
                timeRemaining <= 10 && 'border-destructive/30 text-destructive',
              )}
            >
              <Clock className="h-3 w-3" />
              {formatTime(timeRemaining)}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden border border-black/10 bg-white px-5 py-5 transition-all duration-300',
        isCurrentTurn && 'border-black shadow-[0_28px_60px_-36px_rgba(0,0,0,0.45)]',
      )}
    >
      <div className="absolute inset-y-0 left-0 w-[5px]">
        <div className={cn('h-full w-full', accentClass(color))} />
      </div>

      <div className="pl-3">
        <div className="flex items-start gap-4">
          {discordAvatarUrl ? (
            <Avatar className="h-12 w-12 shrink-0 border border-black/10">
              <AvatarImage src={discordAvatarUrl} alt={username} />
              <AvatarFallback className="bg-[#efede4] font-semibold text-black">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserAvatar username={username} color={avatarColor} size="lg" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-xl font-semibold tracking-[-0.04em] text-foreground">
                {username}
              </h3>
              {isVerifiedHuman ? <VerifiedBadge size="sm" /> : null}
              {isAI ? <Badge variant="outline">AI</Badge> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="board-rail-label rounded-md border border-black/10 px-2 py-1 text-[10px] text-black/55">
                {seatLabel(color)}
              </span>
              {elo !== undefined ? (
                <span className="board-rail-label rounded-md border border-black/10 px-2 py-1 text-[10px] text-black/55">
                  ELO {elo}
                </span>
              ) : null}
              {isCurrentTurn ? (
                <span className="board-rail-label rounded-md border border-black bg-black px-2 py-1 text-[10px] text-white">
                  to move
                </span>
              ) : null}
            </div>
          </div>

          {timeRemaining !== undefined ? (
            <div
              className={cn(
                'flex items-center gap-2 border border-black/10 px-3 py-2 font-mono text-sm',
                timeRemaining <= 10 && 'border-destructive/30 text-destructive',
              )}
            >
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const PlayerPanel = memo(PlayerPanelComponent);
