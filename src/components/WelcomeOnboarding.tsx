import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  BookOpen, 
  Zap, 
  ChevronRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface WelcomeOnboardingProps {
  onComplete: () => void;
  onCreateMatch: (difficulty: 'easy' | 'medium' | 'hard' | 'expert', size: number) => void;
  isCreating: boolean;
}

export function WelcomeOnboarding({ onComplete, onCreateMatch, isCreating }: WelcomeOnboardingProps) {
  const navigate = useNavigate();
  const { signInAnonymously } = useAuth();
  const [step, setStep] = useState<'welcome' | 'choice'>('welcome');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Auto-advance from welcome after a brief moment
  useEffect(() => {
    const timer = setTimeout(() => {
      setStep('choice');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleQuickPlay = async () => {
    setIsSigningIn(true);
    try {
      await signInAnonymously();
      // Small delay for auth to propagate
      setTimeout(() => {
        onCreateMatch('easy', 7);
      }, 500);
    } catch (error) {
      console.error('Failed to create guest session:', error);
      setIsSigningIn(false);
    }
  };

  const handleTutorial = () => {
    navigate('/tutorial');
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 animate-in fade-in duration-700">
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-indigo to-violet flex items-center justify-center shadow-xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-ochre flex items-center justify-center shadow-lg animate-bounce">
              <Zap className="w-4 h-4 text-background" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2">Hexology</h1>
            <p className="text-muted-foreground">Strategic Connection Game</p>
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
          <p className="text-muted-foreground">Choose how you'd like to start</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Quick Play - Primary CTA */}
          <Card 
            className="p-0 overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-indigo/30 hover:border-indigo/60 shadow-lg group"
            onClick={handleQuickPlay}
          >
            <div className="p-5 bg-gradient-to-r from-indigo/10 via-indigo/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo to-violet flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Play className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                    Quick Play
                    {(isSigningIn || isCreating) && <Loader2 className="h-4 w-4 animate-spin" />}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Jump right in with an Easy AI opponent
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>

          {/* Tutorial */}
          <Card 
            className="p-0 overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all border border-border hover:border-ochre/50 group"
            onClick={handleTutorial}
          >
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-ochre/10 flex items-center justify-center group-hover:bg-ochre/20 transition-colors">
                  <BookOpen className="h-7 w-7 text-ochre" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">Learn the Rules</h3>
                  <p className="text-sm text-muted-foreground">
                    Interactive tutorial with hands-on practice
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>

          {/* Sign In */}
          <Card 
            className="p-0 overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all border border-border/50 hover:border-border group"
            onClick={handleSignIn}
          >
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                  <Zap className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">I Have an Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign in to access ranked matches and more
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground">
          No account needed to start playing
        </p>
      </div>
    </div>
  );
}
