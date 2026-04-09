import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VenuePanel } from '@/components/board/VenuePanel';
import { MetricLine } from '@/components/board/MetricLine';
import { ArrowUpRight, Lock, RadioTower, UserCircle } from 'lucide-react';

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
          <UserCircle className="h-5 w-5 text-black/45" />
          <span>{guestUsername}</span>
        </div>
      }
      description="Practice is open locally. Worlds, recurring events, and live multiplayer stay attached to an account."
      className="animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-1 border-t border-black/10 pt-4">
          <MetricLine label="Local practice" value="open" />
          <MetricLine icon={Lock} label="Worlds + events" value="account required" />
          <MetricLine icon={RadioTower} label="Live rooms" value="sign in to join" />
        </div>
        <div className="border-t border-black/10 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <Button onClick={() => navigate('/auth')} className="w-full justify-between">
            Enter BOARD
            <ArrowUpRight className="h-4 w-4" />
          </Button>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Keep your identity, join host-run rooms, and attach your progress to a real venue.
          </p>
        </div>
      </div>
    </VenuePanel>
  );
}
