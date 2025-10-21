import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock } from 'lucide-react';
import { memo } from 'react';

interface PlayerPanelProps {
  username: string;
  color: 1 | 2;
  isCurrentTurn: boolean;
  timeRemaining?: number;
  isAI?: boolean;
}

const PlayerPanelComponent = ({ 
  username, 
  color, 
  isCurrentTurn,
  timeRemaining,
  isAI = false
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

  return (
    <div 
      className={`
        relative p-6 rounded-lg border-2 transition-all duration-300
        ${borderClass}
        ${isCurrentTurn ? 'shadow-medium scale-105' : 'shadow-soft scale-100'}
        bg-card
      `}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <div className="absolute -top-2 -right-2">
          <div className={`w-4 h-4 rounded-full ${color === 1 ? 'bg-indigo' : 'bg-ochre'} animate-gentle-pulse`} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border-2 border-border">
          <AvatarFallback className={colorClass}>
            {username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-body font-semibold text-lg text-foreground">
              {username}
            </h3>
            {isAI && (
              <Badge variant="outline" className="font-mono text-xs">
                AI
              </Badge>
            )}
          </div>
          
          <Badge className={`${colorClass} font-mono text-xs`}>
            {colorName} • {color === 1 ? 'W↔E' : 'N↕S'}
          </Badge>
        </div>

        {timeRemaining !== undefined && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-sm">
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const PlayerPanel = memo(PlayerPanelComponent);