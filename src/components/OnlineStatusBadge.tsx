/**
 * Online Status Badge Component
 * Displays user's online status with visual indicator
 */

import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OnlineStatus = 'online' | 'in_match' | 'offline';

interface OnlineStatusBadgeProps {
  status: OnlineStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG = {
  online: {
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    label: 'Online',
    animate: false
  },
  in_match: {
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    label: 'In Match',
    animate: true
  },
  offline: {
    color: 'bg-muted',
    textColor: 'text-muted-foreground',
    label: 'Offline',
    animate: false
  }
};

const SIZE_CONFIG = {
  sm: { dot: 'h-2 w-2', text: 'text-xs' },
  md: { dot: 'h-2.5 w-2.5', text: 'text-sm' },
  lg: { dot: 'h-3 w-3', text: 'text-base' }
};

export function OnlineStatusBadge({ 
  status, 
  showLabel = true, 
  size = 'md',
  className 
}: OnlineStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  if (!showLabel) {
    return (
      <Circle 
        className={cn(
          sizeConfig.dot,
          config.color,
          config.animate && 'animate-pulse',
          'fill-current',
          className
        )} 
      />
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1.5 font-normal',
        config.textColor,
        className
      )}
    >
      <Circle 
        className={cn(
          sizeConfig.dot,
          config.color,
          config.animate && 'animate-pulse',
          'fill-current'
        )} 
      />
      <span className={sizeConfig.text}>{config.label}</span>
    </Badge>
  );
}
