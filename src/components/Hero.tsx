import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Play, Users, BookOpen, Trophy } from "lucide-react";
import heroBoard from "@/assets/hero-board.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero background with parallax effect */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBoard} 
          alt="Hexology game board"
          className="w-full h-full object-cover opacity-90 animate-in fade-in duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/60" />
      </div>

      {/* Animated hexagon pattern overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-10">
        <div className="absolute top-1/4 left-1/4 text-8xl animate-float" style={{ animationDelay: '0s' }}>
          ⬡
        </div>
        <div className="absolute top-1/3 right-1/4 text-6xl animate-float" style={{ animationDelay: '1s' }}>
          ⬡
        </div>
        <div className="absolute bottom-1/3 left-1/3 text-7xl animate-float" style={{ animationDelay: '2s' }}>
          ⬡
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-20 max-w-5xl mx-auto px-6 text-center">
        <div className="mb-12">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-ink tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Hexology
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            made by Bonelli Labs
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Button 
            size="lg" 
            className="min-w-[200px] group hover:scale-105 transition-all shadow-lg hover:shadow-xl"
            onClick={() => navigate('/lobby')}
          >
            <Play className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
            Play Now
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="min-w-[200px] group hover:scale-105 transition-all shadow-md hover:shadow-lg"
            onClick={() => navigate('/lobby')}
          >
            <Users className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
            Challenge Friends
          </Button>
          <Button 
            variant="ghost" 
            size="lg" 
            className="min-w-[200px] group"
            onClick={() => navigate('/tutorial')}
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Learn to Play
          </Button>
        </div>

      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <div className="h-12 w-8 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="h-2 w-1 rounded-full bg-muted-foreground/50 animate-scroll" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
