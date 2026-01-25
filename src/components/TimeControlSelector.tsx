import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Timer, Coffee, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimeControlType = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';

export interface TimeControl {
  type: TimeControlType;
  label: string;
  baseTime: number; // in seconds
  increment: number; // in seconds (Fischer increment)
  icon: React.ElementType;
  description: string;
  color: string;
}

export const TIME_CONTROLS: TimeControl[] = [
  {
    type: 'bullet',
    label: 'Bullet',
    baseTime: 60,
    increment: 0,
    icon: Zap,
    description: '1+0',
    color: 'text-red-500',
  },
  {
    type: 'bullet',
    label: 'Bullet',
    baseTime: 120,
    increment: 1,
    icon: Zap,
    description: '2+1',
    color: 'text-red-500',
  },
  {
    type: 'blitz',
    label: 'Blitz',
    baseTime: 180,
    increment: 0,
    icon: Timer,
    description: '3+0',
    color: 'text-amber-500',
  },
  {
    type: 'blitz',
    label: 'Blitz',
    baseTime: 300,
    increment: 3,
    icon: Timer,
    description: '5+3',
    color: 'text-amber-500',
  },
  {
    type: 'rapid',
    label: 'Rapid',
    baseTime: 600,
    increment: 5,
    icon: Clock,
    description: '10+5',
    color: 'text-green-500',
  },
  {
    type: 'rapid',
    label: 'Rapid',
    baseTime: 900,
    increment: 10,
    icon: Clock,
    description: '15+10',
    color: 'text-green-500',
  },
  {
    type: 'classical',
    label: 'Classical',
    baseTime: 1800,
    increment: 0,
    icon: Coffee,
    description: '30+0',
    color: 'text-blue-500',
  },
  {
    type: 'correspondence',
    label: 'Daily',
    baseTime: 86400, // 1 day in seconds
    increment: 0,
    icon: Calendar,
    description: '1 day/move',
    color: 'text-violet-500',
  },
];

interface TimeControlSelectorProps {
  value: TimeControl;
  onChange: (control: TimeControl) => void;
  compact?: boolean;
}

export function TimeControlSelector({ value, onChange, compact = false }: TimeControlSelectorProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Show popular presets by default
  const popularControls = TIME_CONTROLS.filter(tc => 
    ['5+3', '10+5', '15+10', '3+0'].includes(tc.description)
  );
  
  const controlsToShow = showAll ? TIME_CONTROLS : popularControls;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {controlsToShow.map((control, idx) => {
          const Icon = control.icon;
          const isSelected = value.description === control.description;
          
          return (
            <Button
              key={`${control.type}-${control.description}-${idx}`}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(control)}
              className={cn(
                'gap-1.5 h-8 transition-all',
                isSelected && 'ring-2 ring-primary/30'
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', control.color)} />
              <span className="font-mono text-xs">{control.description}</span>
            </Button>
          );
        })}
        {!showAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(true)}
            className="h-8 text-xs text-muted-foreground"
          >
            More...
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Time Control</label>
        <Badge variant="outline" className={cn('font-mono', value.color)}>
          {value.label} • {value.description}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {controlsToShow.map((control, idx) => {
          const Icon = control.icon;
          const isSelected = value.description === control.description;
          
          return (
            <button
              key={`${control.type}-${control.description}-${idx}`}
              onClick={() => onChange(control)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-border hover:border-border/80 hover:bg-muted/50'
              )}
            >
              <Icon className={cn('h-5 w-5', control.color)} />
              <span className="font-mono text-sm font-medium">{control.description}</span>
              <span className="text-xs text-muted-foreground">{control.label}</span>
            </button>
          );
        })}
      </div>
      
      {!showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full text-xs text-muted-foreground"
        >
          Show all time controls
        </Button>
      )}
    </div>
  );
}

// Utility to format time for display
export function formatTime(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days}d`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h${remainingMins}m` : `${hours}h`;
  }
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}:00`;
}

// Utility to get time control type color
export function getTimeControlColor(type: TimeControlType): string {
  switch (type) {
    case 'bullet': return 'text-red-500';
    case 'blitz': return 'text-amber-500';
    case 'rapid': return 'text-green-500';
    case 'classical': return 'text-blue-500';
    case 'correspondence': return 'text-violet-500';
    default: return 'text-muted-foreground';
  }
}
