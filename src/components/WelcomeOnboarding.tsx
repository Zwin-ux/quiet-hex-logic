import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BoardLogo } from '@/components/BoardLogo';
import { BoardWordmark } from '@/components/board/BoardWordmark';
import { SiteFrame } from '@/components/board/SiteFrame';
import { SectionRail } from '@/components/board/SectionRail';
import { VenuePanel } from '@/components/board/VenuePanel';
import { SkeletalBoardScene } from '@/components/board/SkeletalBoardScene';
import { Loader2, ArrowUpRight } from 'lucide-react';
import { listGames } from '@/lib/engine/registry';
import { getGameMeta } from '@/lib/gameMetadata';

interface WelcomeOnboardingProps {
  onComplete: () => void;
  onCreateMatch: (difficulty: 'easy' | 'medium' | 'hard' | 'expert', size: number, gameKey?: string) => void;
  isCreating: boolean;
}

export function WelcomeOnboarding({ onComplete, onCreateMatch, isCreating }: WelcomeOnboardingProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'welcome' | 'choice'>('welcome');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const games = listGames();

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
      const gameDef = games.find((g) => g.key === gameKey);
      const size = gameDef?.defaultBoardSize ?? 7;
      onCreateMatch('easy', size, gameKey);
      onComplete();
    } catch (error) {
      console.error('Failed to create guest session:', error);
      setIsSigningIn(false);
      setSelectedGame(null);
    }
  };

  const handleSignIn = () => {
    onComplete();
    navigate('/auth');
  };

  if (step === 'welcome') {
    return (
      <SiteFrame showNav={false} contentClassName="flex min-h-screen items-center justify-center py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center animate-in fade-in duration-700">
          <BoardLogo />
          <div className="w-full max-w-2xl">
            <SkeletalBoardScene className="min-h-[300px]" variant="compact" />
          </div>
          <div>
            <p className="board-rail-label">Entry gate</p>
            <BoardWordmark size="hero" className="mt-3 justify-center" />
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Worlds, rooms, local tables, and recurring competition in one live board system.
            </p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-black/45" />
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame showNav={false} contentClassName="py-10 md:py-14">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <SectionRail
          eyebrow="Instant practice"
          title="Choose a board and start locally."
          description="BOARD lets you step straight into play before you commit to an account. Worlds, rooms, and recurring events come later."
          actions={
            <Button variant="outline" onClick={handleSignIn}>
              Enter with account
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          }
        />

        <div className="mt-10 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <VenuePanel
            eyebrow="Practice desk"
            title="Pick a ruleset"
            description="This is local practice only. Choose a system, seat yourself instantly, and let the board teach itself through play."
            className="bg-white/94"
          >
            <div className="divide-y divide-black/10 border-t border-black/10">
              {games.map((game, index) => {
                const meta = getGameMeta(game.key);
                const Icon = meta.icon;
                const isLoading = selectedGame === game.key && (isSigningIn || isCreating);

                return (
                  <button
                    key={game.key}
                    onClick={() => handleGamePick(game.key)}
                    disabled={!!selectedGame}
                    className="grid w-full gap-4 py-4 text-left transition-colors hover:bg-black/[0.025] md:grid-cols-[48px_minmax(0,1fr)_180px]"
                  >
                    <div className="board-rail-label pt-1 text-[10px] text-black/45">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-black/10 bg-[#f1efe8]">
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-black/45" />
                          ) : (
                            <Icon className={`h-5 w-5 ${meta.accentClass}`} />
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold tracking-[-0.05em] text-foreground">
                            {game.displayName}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-l border-black/10 pl-4">
                      <span className="board-rail-label text-[10px] text-black/45">
                        Local seat
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-black/45" />
                    </div>
                  </button>
                );
              })}
            </div>
          </VenuePanel>

          <VenuePanel
            eyebrow="Why this exists"
            title="Start fast, commit later."
            description="The first touch should feel physical and immediate. Accounts matter when you want worlds, recurring identity, room history, and host-run competition."
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="border-t border-black/10 pt-4 text-sm leading-7 text-muted-foreground">
                No account is needed to test the systems. The product proves itself through board feel first, then asks you to step into a venue.
              </div>
              <div className="border-t border-black/10 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <SkeletalBoardScene variant="compact" className="min-h-[220px]" />
              </div>
            </div>
          </VenuePanel>
        </div>
      </div>
    </SiteFrame>
  );
}
