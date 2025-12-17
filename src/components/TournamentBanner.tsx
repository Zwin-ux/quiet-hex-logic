import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface TournamentBannerProps {
  className?: string;
}

export const TournamentBanner: React.FC<TournamentBannerProps> = ({ className }) => {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "relative w-full overflow-hidden bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 py-3 px-4 shadow-lg",
      "animate-gradient-x border-b border-amber-500/30",
      className
    )}>
      {/* Decorative Sparkles */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <Sparkles className="absolute top-1 left-10 h-4 w-4 text-white animate-pulse" />
        <Sparkles className="absolute bottom-2 right-20 h-3 w-3 text-white animate-bounce" />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3 group">
          <div className="bg-white/20 p-2 rounded-full shadow-inner group-hover:scale-110 transition-transform">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <p className="font-body font-bold text-white tracking-wide text-sm md:text-base drop-shadow-sm">
            JAN 1ST <span className="text-black/80">$500</span> TOURNAMENT FOR THE FIRST HEX CHAMPION
          </p>
        </div>
        
        <Button 
          onClick={() => navigate('/tournaments')}
          variant="secondary"
          size="sm"
          className="bg-white text-amber-600 hover:bg-amber-50 font-bold border-none shadow-md group whitespace-nowrap"
        >
          JOIN NOW
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};
