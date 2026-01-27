import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { PremiumBadge } from '@/components/PremiumBadge';
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

const PlayerPanelComponent = ({
  username,
  color,
  isCurrentTurn,
  timeRemaining,
  isAI = false,
  avatarColor = 'indigo',
  isPremium = false,
  isVerifiedHuman = false,
  discordAvatarUrl,
  elo,
  compact = false
}: PlayerPanelProps) => {
  const colorName = color === 1 ? 'Indigo' : 'Ochre';
  const colorClass = color === 1 ? 'bg-indigo text-primary-foreground' : 'bg-ochre text-secondary-foreground';
  const borderClass = isCurrentTurn
    ? color === 1 ? 'border-indigo' : 'border-ochre'
    : 'border-border';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Compact mode for mobile - horizontal layout with essential info only
  if (compact) {
    return (
      <div
        className={cn(
          "flex-1 p-3 rounded-xl border-2 transition-all duration-300 bg-card min-w-0",
          borderClass,
          isCurrentTurn ? 'shadow-md ring-2 ring-offset-1' : 'shadow-sm',
          isCurrentTurn && color === 1 && 'ring-indigo/30',
          isCurrentTurn && color === 2 && 'ring-ochre/30'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Turn indicator dot */}
          {isCurrentTurn && (
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0 animate-pulse",
              color === 1 ? 'bg-indigo' : 'bg-ochre'
            )} />
          )}
          
          {/* Avatar - smaller on mobile */}
          {discordAvatarUrl ? (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={discordAvatarUrl} alt={username} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserAvatar
              username={username}
              color={avatarColor}
              size="sm"
            />
          )}

          {/* Name and info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "font-semibold text-sm truncate",
                isPremium && "text-transparent bg-clip-text bg-gradient-to-r from-secondary to-secondary/80"
              )}>
                {username}
              </span>
              {isVerifiedHuman && <VerifiedBadge size="xs" />}
              {isAI && (
                <Badge variant="outline" className="font-mono text-[10px] px-1 py-0 h-4">
                  AI
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                color === 1 ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
              )}>
                {colorName}
              </span>
              {elo !== undefined && (
                <span className="text-[10px] text-muted-foreground font-mono">{elo}</span>
              )}
            </div>
          </div>

          {/* Timer */}
          {timeRemaining !== undefined && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-sm font-medium shrink-0",
              timeRemaining <= 10 ? 'bg-destructive/20 text-destructive animate-pulse' :
              timeRemaining <= 30 ? 'bg-secondary/20 text-secondary' :
              'bg-muted text-muted-foreground'
            )}>
              <Clock className="h-3 w-3" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full desktop layout
  return (
    <div
      className={cn(
        "relative p-5 rounded-xl border-2 transition-all duration-300 bg-card",
        borderClass,
        isCurrentTurn ? 'shadow-medium scale-[1.02]' : 'shadow-soft'
      )}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <div className="absolute -top-2 -right-2">
          <div className={cn(
            "w-4 h-4 rounded-full animate-gentle-pulse",
            color === 1 ? 'bg-indigo' : 'bg-ochre'
          )} />
        </div>
      )}

      <div className="flex items-center gap-4">
        {discordAvatarUrl ? (
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage src={discordAvatarUrl} alt={username} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <UserAvatar
            username={username}
            color={avatarColor}
            size="lg"
          />
        )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-body font-semibold text-lg truncate",
                isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-secondary via-secondary/80 to-secondary" : "text-foreground"
              )}>
                {username}
              </h3>
              {isVerifiedHuman && <VerifiedBadge size="sm" />}
              {isPremium && <PremiumBadge size="sm" />}
              {isAI && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  AI
                </Badge>
              )}
            </div>

          {elo !== undefined && (
            <div className="mb-1">
              <Badge variant="outline" className="border-secondary/50 bg-secondary/10 text-secondary font-mono text-xs">
                ELO {elo}
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Badge className={`${colorClass} font-mono text-xs`}>
              {colorName} • {color === 1 ? 'W↔E' : 'N↕S'}
            </Badge>
          </div>
        </div>

        {timeRemaining !== undefined && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg font-mono",
            timeRemaining <= 10 ? 'bg-destructive/20 text-destructive animate-pulse' :
            timeRemaining <= 30 ? 'bg-secondary/20 text-secondary' :
            'text-muted-foreground'
          )}>
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const PlayerPanel = memo(PlayerPanelComponent);
