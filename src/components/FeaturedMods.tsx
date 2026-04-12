import { memo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Hash, Grid2x2, Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGameMeta } from '@/lib/gameMetadata';
import { useAuth } from '@/hooks/useAuth';
import { buildAuthRoute } from '@/lib/authRedirect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FEATURED_MODS = [
  {
    id: 'misere-ttt',
    name: 'Misere Tic Tac Toe',
    description: 'A tactical inversion: the first player to complete three in a row loses the match.',
    game_key: 'ttt',
    icon: Hash,
    rules: { misere: true },
  },
  {
    id: 'connect-3',
    name: 'Connect 3 Blitz',
    description: 'High-speed variant where the objective is reduced to three connections for rapid tactical play.',
    game_key: 'connect4',
    icon: Grid2x2,
    rules: { connect: 3 },
  },
  {
    id: 'no-pie-hex',
    name: 'Direct Hex',
    description: 'Pure confrontation with the pie rule disabled, forcing immediate strategic commitment.',
    game_key: 'hex',
    icon: Hexagon,
    rules: { pieRule: false },
  },
];

export const FeaturedMods = memo(forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleTryIt = async (mod: typeof FEATURED_MODS[0]) => {
    if (!user) {
      toast.error('Sign in required', { description: 'Use an account to launch hosted variants.' });
      navigate(buildAuthRoute('/mods'));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          game_key: mod.game_key,
          status: 'active',
          turn: 1,
          owner: user.id,
          // rules: mod.rules as any, // Only add if the schema supports it, otherwise use game_key/options
          is_ranked: false,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data) {
        navigate(`/match/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating match:', error);
      const isNetwork = error instanceof TypeError && /fetch/i.test(error.message);
      toast.error(isNetwork ? 'Network error — server may be offline' : 'Failed to launch variant');
    }
  };

  return (
    <section
      ref={ref}
      className={cn("py-32 px-6 relative bg-white/[0.01]", className)}
      {...props}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary animate-gentle-pulse">Boutique Workshop</p>
            <h2 className="text-5xl md:text-6xl font-display-text font-bold text-white tracking-tight">Featured Variants</h2>
            <p className="text-muted-foreground text-lg max-w-xl">
              Curated modifications that push the boundaries of classic strategy.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/mods')}
            className="group h-12 px-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-primary transition-all font-mono text-xs uppercase tracking-widest"
          >
            Explore Library <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURED_MODS.map((mod) => {
            const meta = getGameMeta(mod.game_key);
            const Icon = mod.icon;

            return (
              <div
                key={mod.id}
                className={cn(
                  "group relative flex flex-col p-10 rounded-3xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 overflow-hidden glass",
                  `hover:${meta.borderClass}`
                )}
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <Icon className={cn("h-20 w-20", meta.accentClass)} />
                </div>

                <div className="flex items-center gap-4 mb-8 relative z-10">
                  <div className={cn(
                    "h-14 w-14 rounded-xl glass flex items-center justify-center border-white/10 transition-colors",
                    `group-hover:${meta.borderClass}`,
                    `group-hover:${meta.bgClass}`
                  )}>
                    <Icon className={cn('h-7 w-7', meta.accentClass)} />
                  </div>
                  <div>
                    <h3 className={cn("font-display-text text-2xl font-bold text-white transition-colors", `group-hover:${meta.accentClass}`)}>{mod.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{mod.game_key}</p>
                  </div>
                </div>

                <p className="text-base text-muted-foreground mb-10 flex-1 leading-relaxed">
                  {mod.description}
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTryIt(mod)}
                  className={cn(
                    "w-full h-12 rounded-xl glass border-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-sm",
                    "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  )}
                >
                  Quick Launch
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}));

FeaturedMods.displayName = 'FeaturedMods';
