import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({ 
  children, 
  onRefresh, 
  className,
  threshold = 80 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerTap, trigger } = useHaptics();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only trigger if scrolled to top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance - the further you pull, the harder it gets
      const resistance = Math.min(diff * 0.4, threshold * 1.5);
      setPullDistance(resistance);
      
      // Haptic feedback when crossing threshold
      if (resistance >= threshold && pullDistance < threshold) {
        trigger('medium');
      }
    }
  }, [isPulling, isRefreshing, threshold, pullDistance, trigger]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      triggerTap();
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh, triggerTap]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center transition-all duration-200",
          (pullDistance > 0 || isRefreshing) ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          top: Math.max(8, pullDistance - 40),
          transform: `translateX(-50%) rotate(${rotation}deg)`
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full bg-card border-2 shadow-lg flex items-center justify-center",
          progress >= 1 ? "border-primary" : "border-border"
        )}>
          <RefreshCw 
            className={cn(
              "h-5 w-5 transition-colors",
              isRefreshing && "animate-spin",
              progress >= 1 ? "text-primary" : "text-muted-foreground"
            )} 
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ 
          transform: isRefreshing 
            ? `translateY(${threshold * 0.6}px)` 
            : `translateY(${pullDistance}px)` 
        }}
      >
        {children}
      </div>
    </div>
  );
}
