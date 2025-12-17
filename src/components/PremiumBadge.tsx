import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PremiumBadge({ className, size = 'sm' }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 text-xs px-1.5 py-0.5',
    md: 'h-5 w-5 text-sm px-2 py-1',
    lg: 'h-6 w-6 text-base px-2.5 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 font-semibold shadow-sm animate-gentle-pulse',
        sizeClasses[size],
        className
      )}
    >
      <Crown className={cn(size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5')} />
      <span className={size === 'sm' ? 'sr-only' : ''}>PRO</span>
    </span>
  );
}
