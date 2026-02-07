import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const Hero = () => {
  const scrollToGames = () => {
    document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-game-hex/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-game-connect4/10 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-game-ttt/8 rounded-full blur-[80px]" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-game-hex/10 border border-game-hex/20 text-game-hex text-xs font-mono mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-game-hex opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-game-hex"></span>
            </span>
            Open Source Platform
          </div>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
            Hexology
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 max-w-xl mx-auto">
            Five strategy games. One platform. Play Hex, Chess, Checkers, Tic Tac Toe, and Connect 4 — all free, all open source.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Button
            size="lg"
            className="h-14 px-8 rounded-2xl text-base font-semibold bg-game-hex hover:bg-game-hex/90 text-white shadow-lg hover:shadow-game-hex/20 hover:scale-[1.03] active:scale-[0.98] transition-all"
            onClick={scrollToGames}
          >
            Pick a Game
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-8 rounded-2xl text-base font-semibold border-2 border-border hover:border-foreground/20 hover:scale-[1.03] active:scale-[0.98] transition-all"
            onClick={() => window.location.href = '/lobby'}
          >
            Multiplayer Lobby
          </Button>
        </div>

        {/* Scroll hint */}
        <div className="mt-12 animate-in fade-in duration-1000 delay-700">
          <button onClick={scrollToGames} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <ChevronDown className="h-6 w-6 mx-auto animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
