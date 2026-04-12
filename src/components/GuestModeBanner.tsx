import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CounterBlock } from '@/components/board/CounterBlock';
import { StateTag } from '@/components/board/StateTag';
import { VenuePanel } from '@/components/board/VenuePanel';
import { ArrowUpRight, Lock, RadioTower, UserCircle } from 'lucide-react';
import { buildAuthRoute } from '@/lib/authRedirect';

interface GuestModeBannerProps {
  guestUsername: string;
}

export function GuestModeBanner({ guestUsername }: GuestModeBannerProps) {
  const navigate = useNavigate();

  return (
    <VenuePanel
      eyebrow="Guest seat"
      title={
        <div className="flex items-center gap-3">
          <UserCircle className="h-5 w-5 text-black" />
          <span>{guestUsername}</span>
        </div>
      }
      description="Practice is open locally. Worlds, recurring events, and live multiplayer stay attached to an account."
      state="warning"
      titleBarEnd={<StateTag tone="warning">guest mode</StateTag>}
      className="animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="grid gap-3 sm:grid-cols-3">
          <CounterBlock label="practice" value="open" />
          <CounterBlock label="worlds" value="locked" />
          <CounterBlock label="live rooms" value="sign in" />
        </div>

        <div className="retro-inset bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="retro-inset flex h-10 w-10 shrink-0 items-center justify-center bg-[#ffffcc]">
              <Lock className="h-4 w-4 text-black" />
            </div>
            <div className="min-w-0">
              <p className="board-section-title text-base text-foreground">Enter with an account</p>
              <p className="board-copy mt-2 text-sm">
                Keep your identity, join host-run rooms, and attach your progress to a real venue.
              </p>
            </div>
          </div>

          <div className="retro-status-strip mt-4">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-black">
              <RadioTower className="h-4 w-4" />
              worlds + events require entry
            </span>
          </div>

          <Button onClick={() => navigate(buildAuthRoute())} className="mt-4 w-full justify-between" variant="hero">
            Enter BOARD
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </VenuePanel>
  );
}
