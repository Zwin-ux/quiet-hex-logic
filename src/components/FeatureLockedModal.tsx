import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StateTag } from '@/components/board/StateTag';
import { Lock, Sparkles, Users, Trophy } from 'lucide-react';
import { buildAuthRoute } from '@/lib/authRedirect';

interface FeatureLockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

export function FeatureLockedModal({ open, onOpenChange, featureName }: FeatureLockedModalProps) {
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    onOpenChange(false);
    navigate(buildAuthRoute());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="retro-inset flex h-12 w-12 items-center justify-center bg-[#ffffcc]">
              <Lock className="h-5 w-5 text-black" />
            </div>
            <StateTag tone="warning">account required</StateTag>
          </div>
          <DialogTitle className="font-display text-left text-xl uppercase tracking-[0.06em]">
            Create an account to unlock {featureName}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-6 text-black/70">
            Guest mode is for immediate local play. Live rooms, events, and saved identity stay attached to a real account.
          </DialogDescription>
        </DialogHeader>

        <div className="board-ledger py-1">
          <div className="board-ledger-row md:grid-cols-[44px_minmax(0,1fr)]">
            <div className="retro-inset flex h-10 w-10 items-center justify-center bg-white">
              <Users className="h-4 w-4 text-black" />
            </div>
            <div>
              <p className="board-section-title text-base text-foreground">Live rooms</p>
              <p className="board-copy mt-2 text-sm">Challenge friends, join hosted lobbies, and keep your seat across venues.</p>
            </div>
          </div>

          <div className="board-ledger-row md:grid-cols-[44px_minmax(0,1fr)]">
            <div className="retro-inset flex h-10 w-10 items-center justify-center bg-white">
              <Trophy className="h-4 w-4 text-black" />
            </div>
            <div>
              <p className="board-section-title text-base text-foreground">Events</p>
              <p className="board-copy mt-2 text-sm">Compete in organized brackets that belong to actual worlds instead of disposable one-offs.</p>
            </div>
          </div>

          <div className="board-ledger-row md:grid-cols-[44px_minmax(0,1fr)]">
            <div className="retro-inset flex h-10 w-10 items-center justify-center bg-white">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <div>
              <p className="board-section-title text-base text-foreground">Saved identity</p>
              <p className="board-copy mt-2 text-sm">Track history, stats, and returning roles without losing your place.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Stay guest
          </Button>
          <Button onClick={handleCreateAccount} variant="hero">
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
