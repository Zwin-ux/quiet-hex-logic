import { memo, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Hero = memo(forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  const scrollToGames = () => {
    document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={ref}
      className={cn("relative min-h-[75vh] flex items-center justify-center overflow-hidden", className)}
      {...props}
    >
      {/* Background decoration - per-game accent color blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] animate-float bg-game-hex/15" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] animate-float bg-game-chess/10" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[15%] w-[25%] h-[25%] rounded-full blur-[100px] animate-float bg-game-ttt/8" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-[10%] left-[20%] w-[20%] h-[20%] rounded-full blur-[80px] animate-float bg-game-checkers/8" style={{ animationDelay: '3s' }} />
      </div>

      {/* Subtle hex grid pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hex-grid" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
              <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              <path d="M28 0L28 -34L0 -50L0 -16L28 0" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-grid)" className="text-white" />
        </svg>
      </div>

      {/* Hero content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-primary/20 text-primary text-xs font-mono mb-8 tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Five Games, One Platform
          </div>
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-display-text font-extrabold tracking-tighter mb-6 bg-gradient-to-b from-primary via-primary/90 to-primary/40 bg-clip-text text-transparent drop-shadow-2xl">
            Hexology
          </h1>
          <p className="text-muted-foreground text-lg md:text-2xl mt-4 max-w-2xl mx-auto leading-relaxed font-body">
            Hex, Chess, Checkers, and more — play against AI, <br className="hidden md:block" />
            challenge friends, or climb the ranked ladder.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Button
            size="lg"
            className="h-16 px-10 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.5)] hover:scale-[1.05] active:scale-[0.98] transition-all duration-300"
            onClick={scrollToGames}
          >
            Start Playing
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-16 px-10 rounded-2xl text-lg font-semibold glass hover:bg-white/5 border-white/5 hover:border-white/10 hover:scale-[1.05] active:scale-[0.98] transition-all duration-300"
            onClick={() => window.location.href = '/lobby'}
          >
            Multiplayer Lobby
          </Button>
        </div>
      </div>
    </section>
  );
}));

Hero.displayName = "Hero";
export default Hero;
