import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBoard from "@/assets/hero-board.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero background with subtle animation */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBoard} 
          alt="Hexology game board on a wooden desk with tea and notebook"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/40" />
      </div>

      {/* Floating dust motes */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="dust-mote absolute w-1 h-1 bg-graphite rounded-full opacity-30"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
          />
        ))}
      </div>

      {/* Hero content */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-ink tracking-tight">
          Hexology
        </h1>
        
        <p className="text-xl md:text-2xl text-ink/80 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
          The ancient game of perfect connection, reborn for modern minds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Button 
            variant="hero" 
            size="lg" 
            className="min-w-[200px]"
            onClick={() => navigate('/lobby')}
          >
            Play Online
          </Button>
          <Button 
            variant="quiet" 
            size="lg" 
            className="min-w-[200px]"
            onClick={() => navigate('/lobby')}
          >
            Play with Friends
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="min-w-[200px]"
            onClick={() => navigate('/lobby')}
          >
            Learn
          </Button>
        </div>

        <p className="text-sm text-muted-foreground font-mono">
          Built by players who love geometry, not ads.
        </p>
      </div>
    </section>
  );
};

export default Hero;
