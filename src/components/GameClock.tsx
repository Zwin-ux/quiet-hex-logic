import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatTime } from './TimeControlSelector';

interface GameClockProps {
  timeRemaining: number; // in seconds
  isActive: boolean;
  playerColor: 1 | 2;
  onTimeout?: () => void;
  increment?: number; // Fischer increment in seconds
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function GameClock({ 
  timeRemaining, 
  isActive, 
  playerColor,
  onTimeout,
  increment = 0,
  showIcon = true,
  size = 'md'
}: GameClockProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const lastTickRef = useRef(Date.now());
  const timeoutCalledRef = useRef(false);

  // Sync with prop when not active
  useEffect(() => {
    if (!isActive) {
      setDisplayTime(timeRemaining);
      timeoutCalledRef.current = false;
    }
  }, [timeRemaining, isActive]);

  // Countdown timer
  useEffect(() => {
    if (!isActive || displayTime <= 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setDisplayTime(prev => {
        const newTime = Math.max(0, prev - elapsed);
        
        // Call timeout callback when time runs out
        if (newTime <= 0 && !timeoutCalledRef.current) {
          timeoutCalledRef.current = true;
          onTimeout?.();
        }
        
        return newTime;
      });
    }, 100); // Update every 100ms for smoother countdown

    lastTickRef.current = Date.now();

    return () => clearInterval(interval);
  }, [isActive, onTimeout]);

  // Determine urgency level
  const isLow = displayTime <= 30;
  const isCritical = displayTime <= 10;
  const isExpired = displayTime <= 0;

  // Size classes
  const sizeClasses = {
    sm: 'text-lg px-2 py-1',
    md: 'text-2xl px-3 py-2',
    lg: 'text-3xl px-4 py-3',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Color based on player
  const playerColorClass = playerColor === 1 ? 'text-indigo' : 'text-ochre';
  const bgColorClass = playerColor === 1 
    ? 'bg-indigo/10 border-indigo/30' 
    : 'bg-ochre/10 border-ochre/30';

  return (
    <div
      className={cn(
        'rounded-lg border-2 font-mono font-bold transition-all',
        sizeClasses[size],
        isActive && !isExpired && bgColorClass,
        !isActive && 'bg-muted/50 border-border text-muted-foreground',
        isLow && isActive && 'animate-pulse',
        isCritical && isActive && 'bg-destructive/10 border-destructive text-destructive',
        isExpired && 'bg-destructive/20 border-destructive text-destructive'
      )}
    >
      <div className="flex items-center gap-2">
        {showIcon && (
          <>
            {isCritical && isActive ? (
              <AlertTriangle className={cn(iconSizes[size], 'animate-pulse')} />
            ) : (
              <Clock className={cn(iconSizes[size], isActive ? playerColorClass : '')} />
            )}
          </>
        )}
        
        <span className={cn(
          isActive && !isCritical && playerColorClass
        )}>
          {formatTime(Math.ceil(displayTime))}
        </span>
        
        {increment > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            +{increment}s
          </span>
        )}
      </div>
    </div>
  );
}

// Dual clock display for both players
interface DualClockProps {
  player1Time: number;
  player2Time: number;
  activePlayer: 1 | 2 | null;
  onTimeout?: (player: 1 | 2) => void;
  increment?: number;
  player1Name?: string;
  player2Name?: string;
}

export function DualClock({
  player1Time,
  player2Time,
  activePlayer,
  onTimeout,
  increment = 0,
  player1Name = 'Indigo',
  player2Name = 'Ochre',
}: DualClockProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-xl border border-border">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground font-medium">{player1Name}</span>
        <GameClock
          timeRemaining={player1Time}
          isActive={activePlayer === 1}
          playerColor={1}
          onTimeout={() => onTimeout?.(1)}
          increment={increment}
          size="md"
        />
      </div>
      
      <div className="text-xs text-muted-foreground font-mono">VS</div>
      
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground font-medium">{player2Name}</span>
        <GameClock
          timeRemaining={player2Time}
          isActive={activePlayer === 2}
          playerColor={2}
          onTimeout={() => onTimeout?.(2)}
          increment={increment}
          size="md"
        />
      </div>
    </div>
  );
}
