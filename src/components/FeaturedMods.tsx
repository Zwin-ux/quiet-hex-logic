import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGameMeta } from '@/lib/gameMetadata';
import { createLocalMatch, type LocalGameKey } from '@/lib/localMatches/storage';

type FeaturedMod = {
  name: string;
  description: string;
  gameKey: LocalGameKey;
  rules: Record<string, unknown> | null;
};

const FEATURED_MODS: FeaturedMod[] = [
  {
    name: 'Misere Tic Tac Toe',
    description: 'Make three in a row and you lose.',
    gameKey: 'ttt',
    rules: { misere: true },
  },
  {
    name: 'Connect 3 Blitz',
    description: 'First to connect 3 wins.',
    gameKey: 'connect4',
    rules: { connect: 3 },
  },
  {
    name: 'No Pie Rule (Hex)',
    description: 'Disables the pie swap.',
    gameKey: 'hex',
    rules: { pieRule: false },
  },
];

export function FeaturedMods() {
  const navigate = useNavigate();

  const handleTryIt = (mod: FeaturedMod) => {
    const pieRule = mod.gameKey === 'hex' && typeof (mod.rules as any)?.pieRule === 'boolean' ? (mod.rules as any).pieRule : undefined;
    const match = createLocalMatch({ gameKey: mod.gameKey, rules: mod.rules, pieRule });
    navigate(`/match/${match.id}`);
  };

  return (
    <section className="py-16 px-6 border-t border-border/30">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 justify-center mb-2">
          <Sparkles className="h-5 w-5 text-game-hex" />
          <h2 className="text-3xl font-display font-bold text-center">
            Featured Mods
          </h2>
        </div>
        <p className="text-muted-foreground text-center mb-10">
          Try unique game variants with one click
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {FEATURED_MODS.map((mod) => {
            const meta = getGameMeta(mod.gameKey);
            const Icon = meta.icon;

            return (
              <div
                key={mod.name}
                className={`flex flex-col p-5 rounded-2xl border ${meta.borderClass} ${meta.bgClass} transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${meta.bgClass}`}>
                    <Icon className={`h-5 w-5 ${meta.accentClass}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{mod.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{mod.gameKey}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {mod.description}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTryIt(mod)}
                  className="w-full"
                >
                  Try It
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/mods')} className="text-muted-foreground">
            Browse all mods
          </Button>
        </div>
      </div>
    </section>
  );
}
