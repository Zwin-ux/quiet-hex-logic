/**
 * Animated Rating Change Component
 * Displays ELO rating changes with counting animation
 */

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnimatedRatingChangeProps {
  oldRating: number;
  newRating: number;
  change: number;
  playerName: string;
  isWinner: boolean;
  delay?: number;
}

export function AnimatedRatingChange({
  oldRating,
  newRating,
  change,
  playerName,
  isWinner,
  delay = 0
}: AnimatedRatingChangeProps) {
  const [displayedRating, setDisplayedRating] = useState(oldRating);
  const [displayedChange, setDisplayedChange] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showChange, setShowChange] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
      setShowChange(true);

      // Animate rating counting
      const duration = 1200;
      const steps = 30;
      const stepDuration = duration / steps;
      const ratingStep = (newRating - oldRating) / steps;
      const changeStep = change / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayedRating(newRating);
          setDisplayedChange(change);
          clearInterval(interval);
        } else {
          setDisplayedRating(Math.round(oldRating + ratingStep * currentStep));
          setDisplayedChange(Math.round(changeStep * currentStep));
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [oldRating, newRating, change, delay]);

  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const changeColor = change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground';
  const bgColor = isWinner ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20';

  return (
    <div 
      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-500 ${bgColor} ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${isWinner ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          <Icon className={`h-4 w-4 ${changeColor}`} />
        </div>
        <div>
          <p className="font-medium text-sm">{playerName}</p>
          <p className="text-xs text-muted-foreground">
            {isWinner ? 'Winner' : 'Defeated'}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums">{displayedRating}</span>
          {showChange && (
            <span className={`text-sm font-bold tabular-nums ${changeColor} transition-opacity duration-300`}>
              {displayedChange > 0 ? '+' : ''}{displayedChange}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">ELO Rating</p>
      </div>
    </div>
  );
}
