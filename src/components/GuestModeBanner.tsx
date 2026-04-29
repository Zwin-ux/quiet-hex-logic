import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SystemSection, UtilityPill, UtilityStrip } from '@/components/board/SystemSurface';
import { ArrowUpRight, Lock, RadioTower, UserCircle } from 'lucide-react';
import { buildAuthRoute } from '@/lib/authRedirect';

interface GuestModeBannerProps {
  guestUsername: string;
}

export function GuestModeBanner({ guestUsername }: GuestModeBannerProps) {
  const navigate = useNavigate();

  return (
    <SystemSection
      label="Guest seat"
      title={
        <div className="flex items-center gap-3">
          <UserCircle className="h-5 w-5 text-black" />
          <span>{guestUsername}</span>
        </div>
      }
      description="Practice is open locally. Worlds, recurring events, and live multiplayer stay attached to an account."
      actions={<UtilityPill strong>guest mode</UtilityPill>}
      className="animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] bg-[#f3efe6] px-4 py-4">
            <p className="board-rail-label text-[10px] text-black/48">practice</p>
            <p className="mt-2 text-[1.95rem] font-black leading-none tracking-[-0.06em] text-[#090909]">open</p>
          </div>
          <div className="rounded-[1.25rem] bg-[#f3efe6] px-4 py-4">
            <p className="board-rail-label text-[10px] text-black/48">worlds</p>
            <p className="mt-2 text-[1.95rem] font-black leading-none tracking-[-0.06em] text-[#090909]">locked</p>
          </div>
          <div className="rounded-[1.25rem] bg-[#f3efe6] px-4 py-4">
            <p className="board-rail-label text-[10px] text-black/48">live rooms</p>
            <p className="mt-2 text-[1.95rem] font-black leading-none tracking-[-0.06em] text-[#090909]">sign in</p>
          </div>
        </div>

        <div className="rounded-[1.4rem] bg-[#f3efe6] p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.95rem] bg-[#090909] text-[#f6f4f0]">
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="board-section-title text-base text-foreground">Enter with an account</p>
              <p className="board-copy mt-2 text-sm">
                Keep your identity, join host-run rooms, and attach your progress to a real venue.
              </p>
            </div>
          </div>

          <UtilityStrip className="mt-4">
            <UtilityPill strong>
              <RadioTower className="h-3.5 w-3.5" />
              entry required
            </UtilityPill>
            <UtilityPill>worlds + events</UtilityPill>
          </UtilityStrip>

          <Button onClick={() => navigate(buildAuthRoute())} className="mt-4 w-full justify-between" variant="hero">
            Enter BOARD
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </SystemSection>
  );
}
