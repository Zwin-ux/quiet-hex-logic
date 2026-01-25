/**
 * AI Thinking Indicator Component
 * Shows animated thinking state with difficulty-based timing hints
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AIDifficulty } from '@/lib/hex/simpleAI';

interface AIThinkingIndicatorProps {
  isThinking: boolean;
  difficulty?: AIDifficulty | null;
}

const DIFFICULTY_TIMES: Record<string, { min: number; max: number; label: string }> = {
  easy: { min: 0.3, max: 0.8, label: 'Quick calculation' },
  medium: { min: 0.5, max: 1.5, label: 'Evaluating moves' },
  hard: { min: 1, max: 3, label: 'Deep analysis' },
  expert: { min: 2, max: 5, label: 'Strategic planning' },
};

export function AIThinkingIndicator({ isThinking, difficulty }: AIThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isThinking) {
      setElapsed(0);
      setDots('');
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 300);

    return () => clearInterval(interval);
  }, [isThinking]);

  if (!isThinking) return null;

  const config = DIFFICULTY_TIMES[difficulty || 'medium'] || DIFFICULTY_TIMES.medium;
  const progress = Math.min(1, elapsed / config.max);

  return (
    <div className="p-4 rounded-xl bg-card/80 backdrop-blur border border-ochre/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        {/* Animated spinner with pulse */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-ochre/20 animate-ping" />
          <Loader2 className="h-5 w-5 text-ochre animate-spin relative z-10" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-ochre">
              Thinking{dots}
            </span>
            {elapsed > 0.5 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {elapsed.toFixed(1)}s
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {config.label}
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-1 bg-ochre/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-ochre/50 to-ochre rounded-full transition-all duration-300"
          style={{ width: `${Math.max(10, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
