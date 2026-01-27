import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BaseBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

function BaseBadgeComponent({ 
  size = 'sm', 
  showTooltip = true,
  className 
}: BaseBadgeProps) {
  // Base logo SVG
  const badge = (
    <svg
      viewBox="0 0 111 111"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], 'shrink-0', className)}
      aria-label="Base Network"
    >
      <circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF" />
      <path
        d="M55.5 97C78.4198 97 97 78.4198 97 55.5C97 32.5802 78.4198 14 55.5 14C33.7057 14 15.8278 30.6849 14.1184 52.0263H67.1579V58.9737H14.1184C15.8278 80.3151 33.7057 97 55.5 97Z"
        fill="white"
      />
    </svg>
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
          className="bg-[#0052FF] border-[#0052FF]/50 text-white"
        >
          <p className="text-xs font-medium">Base Wallet Connected</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const BaseBadge = memo(BaseBadgeComponent);
