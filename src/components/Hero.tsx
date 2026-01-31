import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, Zap, Loader2, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import heroBoard from "@/assets/hero-board.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { isGuest } = useGuestMode();

  const handleQuickPlay = async () => {
    setIsLoading(true);
    try {
      // Get or create user session
      let currentUser = user;
      if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        currentUser = data.user;
      }
      
      if (!currentUser) throw new Error('Failed to create session');

      // Create match row directly (minimal fields for speed)
      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({
          size: 7,
          pie_rule: true,
          status: 'active',
          turn: 1,
          owner: currentUser.id,
          ai_difficulty: 'easy',
          allow_spectators: false
        })
        .select('id')
        .single();

      if (matchError) throw matchError;

      // Navigate immediately with optimistic flag
      navigate(`/match/${newMatch.id}`, { 
        state: { optimistic: true, userId: currentUser.id } 
      });

      // Insert player record in background (non-blocking)
      supabase.from('match_players').insert({
        match_id: newMatch.id,
        profile_id: currentUser.id,
        color: 1,
        is_bot: false
      }).then(({ error }) => {
        if (error) console.error('Background player insert failed:', error);
      });

    } catch (error) {
      console.error('Quick play error:', error);
      toast.error('Failed to start game. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCompetitive = () => {
    if (!user || isGuest) {
      toast.error('Please create an account to play Competitive mode');
      navigate('/auth');
      return;
    }
    navigate('/lobby', { state: { competitive: true } });
  };

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

      {/* Subtle geometric background pattern */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.05]">
        <div className="absolute top-1/4 left-1/4 h-32 w-32 border-2 border-current rotate-12 rounded-2xl" />
        <div className="absolute top-1/3 right-1/4 h-24 w-24 border-2 border-current -rotate-6 rounded-2xl" />
        <div className="absolute bottom-1/3 left-1/3 h-28 w-28 border-2 border-current rotate-45 rounded-2xl" />
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

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-stretch sm:items-center w-full max-w-md sm:max-w-none px-4 sm:px-0 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <Button
            size="lg"
            className="w-full sm:w-auto sm:min-w-[220px] h-14 rounded-2xl group hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 shadow-medium hover:shadow-lg text-base font-semibold bg-gradient-to-br from-indigo to-indigo/80 text-primary-foreground border-2 border-indigo/20"
            onClick={handleQuickPlay}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Zap className="h-5 w-5 mr-2 group-hover:animate-pulse drop-shadow-sm" />
            )}
            {isLoading ? 'Starting...' : 'Quick Play'}
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto sm:min-w-[220px] h-14 rounded-2xl group hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 shadow-medium hover:shadow-lg text-base font-semibold bg-gradient-to-br from-ochre to-ochre/80 text-background border-2 border-ochre/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={handleCompetitive}
            disabled={!user || isGuest}
          >
            <Trophy className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
            Competitive
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto sm:min-w-[220px] h-14 rounded-2xl group hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 shadow-soft hover:shadow-medium text-base font-semibold bg-card/80 backdrop-blur-sm border-2 border-graphite/30 text-foreground hover:bg-card hover:border-ochre/40"
            onClick={() => navigate('/lobby')}
          >
            <Users className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform text-ochre" />
            Multiplayer
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto sm:min-w-[220px] h-14 rounded-2xl group hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 text-base font-medium bg-paper/60 backdrop-blur-sm border-2 border-graphite/20 text-ink/80 hover:bg-paper/80 hover:text-ink hover:border-graphite/40"
            onClick={() => navigate('/tutorial')}
          >
            <BookOpen className="h-5 w-5 mr-2 text-indigo/70 group-hover:text-indigo transition-colors" />
            Learn to Play
          </Button>
        </div>

      </div>
    </section>
  );
};

export default Hero;
