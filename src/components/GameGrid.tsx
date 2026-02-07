import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft } from 'lucide-react';
import { listGames } from '@/lib/engine/registry';
import { getGameMeta } from '@/lib/gameMetadata';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', description: 'Learn the basics' },
  { key: 'medium', label: 'Medium', description: 'A fair challenge' },
  { key: 'hard', label: 'Hard', description: 'Serious play' },
  { key: 'expert', label: 'Expert', description: 'Brutal AI' },
] as const;

export function GameGrid() {
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
          ai_difficulty: difficulty,
          allow_spectators: false,
        })
        .select('id')
        .single();

      if (matchError) throw matchError;

      navigate(`/match/${newMatch.id}`, {
        state: { optimistic: true, userId: currentUser.id },
      });

      supabase
        .from('match_players')
        .insert({
          match_id: newMatch.id,
          profile_id: currentUser.id,
          color: 1,
          is_bot: false,
        })
        .then(({ error }) => {
          if (error) console.error('Background player insert failed:', error);
        });
    } catch (error) {
      console.error('Game start error:', error);
      toast.error('Failed to start game. Please try again.');
    } finally {
      setLoadingDifficulty(null);
    }
  };

  const selectedMeta = selectedGame ? getGameMeta(selectedGame) : null;
  const selectedDef = selectedGame ? games.find((g) => g.key === selectedGame) : null;

  return (
    <section id="games" className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-display font-bold text-center mb-2">
          Choose Your Game
        </h2>
        <p className="text-muted-foreground text-center mb-10">
          Pick a game and start playing instantly against AI
        </p>

        {/* Difficulty picker */}
        {selectedGame && selectedMeta && selectedDef && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`max-w-md mx-auto rounded-2xl border-2 p-6 ${selectedMeta.bgClass} ${selectedMeta.borderClass}`}>
              <button
                onClick={() => setSelectedGame(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to games
              </button>
              <div className="flex items-center gap-3 mb-4">
                <selectedMeta.icon className={`h-6 w-6 ${selectedMeta.accentClass}`} />
                <h3 className="font-semibold text-lg text-foreground">{selectedDef.displayName}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Choose AI difficulty:</p>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map((d) => {
                  const isLoading = loadingDifficulty === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => handleStart(selectedGame, d.key)}
                      disabled={!!loadingDifficulty}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-background hover:border-border transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="font-medium text-sm text-foreground">{d.label}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{d.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {games.map((game) => {
            const meta = getGameMeta(game.key);
            const Icon = meta.icon;
            const isSelected = selectedGame === game.key;

            return (
              <button
                key={game.key}
                onClick={() => setSelectedGame(game.key)}
                disabled={!!loadingDifficulty}
                className={`group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ${meta.bgClass} ${meta.borderClass} hover:border-opacity-60 hover:shadow-lg hover:shadow-[hsl(var(${meta.accentVar})/0.15)] disabled:opacity-50 ${isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-[hsl(var(' + meta.accentVar + '))]' : ''}`}
              >
                <div
                  className={`h-14 w-14 rounded-xl flex items-center justify-center ${meta.bgClass} group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`h-7 w-7 ${meta.accentClass}`} />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-foreground">
                    {game.displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
}
