import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Loader2,
  Sparkles,
  Zap,
  Hexagon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { listGames } from '@/lib/engine/registry';
import { getGameMeta } from '@/lib/gameMetadata';

interface WelcomeOnboardingProps {
  onComplete: () => void;
  onCreateMatch: (difficulty: 'easy' | 'medium' | 'hard' | 'expert', size: number, gameKey?: string) => void;
  isCreating: boolean;
}

export function WelcomeOnboarding({ onComplete, onCreateMatch, isCreating }: WelcomeOnboardingProps) {
  const navigate = useNavigate();
  const { signInAnonymously } = useAuth();
  const [step, setStep] = useState<'welcome' | 'choice'>('welcome');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const games = listGames();

  // Auto-advance from welcome after a brief moment
  useEffect(() => {
    const timer = setTimeout(() => {
      setStep('choice');
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleGamePick = async (gameKey: string) => {
    setSelectedGame(gameKey);
    setIsSigningIn(true);
    try {
      await signInAnonymously();
      const gameDef = games.find((g) => g.key === gameKey);
      const size = gameDef?.defaultBoardSize ?? 7;
      onCreateMatch('easy', size, gameKey);
    } catch (error) {
      console.error('Failed to create guest session:', error);
      setIsSigningIn(false);
      setSelectedGame(null);
    }
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 animate-in fade-in duration-700">
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-game-hex to-game-hex/60 flex items-center justify-center shadow-xl">
              <Hexagon className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-game-connect4 flex items-center justify-center shadow-lg animate-bounce">
              <Zap className="w-4 h-4 text-background" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2">Hexology</h1>
            <p className="text-muted-foreground">Five strategy games. One platform.</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">Welcome to Hexology</h1>
          <p className="text-muted-foreground">Pick a game to start playing instantly</p>
        </div>

        {/* Game picker grid */}
        <div className="grid grid-cols-2 gap-3">
          {games.map((game) => {
            const meta = getGameMeta(game.key);
            const Icon = meta.icon;
            const isLoading = selectedGame === game.key && (isSigningIn || isCreating);

            return (
              <button
                key={game.key}
                onClick={() => handleGamePick(game.key)}
                disabled={!!selectedGame}
                className={`group flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${meta.bgClass} ${meta.borderClass} hover:border-opacity-60 disabled:opacity-50`}
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${meta.bgClass} group-hover:scale-110 transition-transform`}>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Icon className={`h-6 w-6 ${meta.accentClass}`} />
                  )}
                </div>
                <span className="font-semibold text-sm text-foreground">{game.displayName}</span>
                <span className="text-xs text-muted-foreground">{meta.tagline}</span>
              </button>
            );
          })}
        </div>

        {/* Sign In option */}
        <div className="text-center space-y-3 pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignIn} className="text-muted-foreground">
            I have an account
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          No account needed to start playing
        </p>
      </div>
    </div>
  );
}
