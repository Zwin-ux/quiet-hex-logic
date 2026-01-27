import { memo } from 'react';
import { CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

function VerifiedBadgeComponent({ 
  size = 'sm', 
  showTooltip = true,
  className 
}: VerifiedBadgeProps) {
  const badge = (
    <CheckCircle 
      className={cn(
        sizeClasses[size],
        'text-emerald-500 shrink-0',
        className
      )}
      aria-label="Verified Human"
    />
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">{badge}</span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-emerald-950 border-emerald-800 text-emerald-100"
        >
          <p className="text-xs font-medium">Verified Human</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const VerifiedBadge = memo(VerifiedBadgeComponent);
