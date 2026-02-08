import { memo, useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, ShieldCheck, Zap } from 'lucide-react';
import { listGames } from '@/lib/engine/registry';
import { getGameMeta } from '@/lib/gameMetadata';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const DIFFICULTIES = [
  { id: 'easy', label: 'Apprentice', icon: Zap },
  { id: 'medium', label: 'Tactician', icon: Target },
  { id: 'hard', label: 'Grandmaster', icon: Trophy },
  { id: 'expert', label: 'Architect', icon: ShieldCheck },
] as const;

export const GameGrid = memo(forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingDifficulty, setLoadingDifficulty] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const games = listGames();

  const handleStart = async (gameKey: string, difficulty: string) => {
    setLoadingDifficulty(difficulty);
    try {
      let currentUser = user;
      if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        currentUser = data.user;
      }

      if (!currentUser) throw new Error('Failed to create session');

      const gameDef = games.find((g) => g.key === gameKey);
      const size = gameDef?.defaultBoardSize ?? 11;
      const pieRule = gameDef?.supportsPieRule ?? false;

      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({
          game_key: gameKey,
          size,
          pie_rule: pieRule,
          status: 'active',
          turn: 1,
          owner: currentUser.id,
          ai_difficulty: difficulty as any,
          allow_spectators: false,
        })
        .select('id')
        .single();

      if (matchError) throw matchError;

      // Add the player
      const { error: playerError } = await supabase
        .from('match_players')
        .insert({
          match_id: newMatch.id,
          profile_id: currentUser.id,
          color: 1,
          is_bot: false,
        });

      if (playerError) throw playerError;

      navigate(`/match/${newMatch.id}`, {
        state: { optimistic: true, userId: currentUser.id },
      });
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match. Please try again.');
    } finally {
      setLoadingDifficulty(null);
    }
  };

  return (
    <section 
      id="games" 
      ref={ref}
      className={cn("py-32 px-6 relative", className)}
      {...props}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20 space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary animate-gentle-pulse">Game Library</p>
          <h2 className="text-5xl md:text-6xl font-display-text font-bold text-white">Select Your Arena</h2>
        </div>

        {selectedGame && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedGame(null)} />
            <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
              <div className="rounded-[calc(1.5rem-1px)] p-8 glass-dark shadow-2xl border border-primary/20">
                <h3 className="text-2xl font-display-text font-bold text-center mb-8">
                  Choose Difficulty
                </h3>
                <div className="grid gap-4">
                  {DIFFICULTIES.map((diff) => (
                    <Button
                      key={diff.id}
                      variant="ghost"
                      className="h-16 justify-between px-6 rounded-2xl glass border-white/5 hover:bg-primary/20 hover:border-primary/40 group overflow-hidden"
                      onClick={() => handleStart(selectedGame, diff.id)}
                      disabled={loadingDifficulty === diff.id}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl glass border-white/10 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                          <diff.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-display-text font-bold text-lg">{diff.label}</span>
                      </div>
                      {loadingDifficulty === diff.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <div className="text-xs font-mono text-muted-foreground uppercase opacity-0 group-hover:opacity-100 transition-opacity">{diff.id}</div>
                      )}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="quiet"
                  className="w-full mt-6 h-12 rounded-xl text-muted-foreground hover:text-white"
                  onClick={() => setSelectedGame(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {games.map((game) => {
            const meta = getGameMeta(game.key);
            const Icon = meta.icon;
            const isSelected = selectedGame === game.key;

            return (
              <button
                key={game.key}
                onClick={() => setSelectedGame(game.key)}
                disabled={!!loadingDifficulty}
                className={cn(
                  'group relative flex flex-col items-center gap-5 p-10 rounded-3xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 overflow-hidden glass',
                  isSelected ? 'ring-2 ring-primary border-primary/40 bg-primary/5' : 'hover:bg-white/[0.05] border-white/5',
                )}
              >
                {/* Decorative glow */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
                
                <div className={cn(
                  "h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-500 glass border-white/10",
                  isSelected ? "bg-primary/20 border-primary/30 shadow-glow" : "group-hover:bg-white/10 group-hover:border-primary/20"
                )}>
                  <Icon className={cn('h-10 w-10 transition-transform duration-500 group-hover:scale-110', isSelected ? 'text-primary' : 'text-primary/70')} />
                </div>
                <div className="text-center relative z-10">
                  <h3 className="font-display-text text-2xl font-bold text-white mb-2">
                    {game.displayName}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-all duration-500">
                    {meta.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}));

GameGrid.displayName = 'GameGrid';
