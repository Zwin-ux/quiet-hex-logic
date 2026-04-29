import { Button } from '@/components/ui/button';
import { SiteFrame } from '@/components/board/SiteFrame';
import { BoardScene } from '@/components/board/BoardScene';
import { Loader2 } from 'lucide-react';

interface MatchLoadingProps {
  onCancel: () => void;
}

export function MatchLoading() {
  return (
    <SiteFrame showNav={false} visualMode="mono" contentClassName="flex min-h-screen items-center justify-center py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white">
          <BoardScene game="hex" state="loading" decorative className="h-10 w-10 text-[#090909]" />
        </div>
        <div>
          <p className="board-rail-label">Instance loading</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.08em] text-foreground">Preparing board</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Pulling the room state, seats, and board engine into place.
          </p>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-black/45" />
      </div>
    </SiteFrame>
  );
}

export function MatchWaiting({ onCancel }: MatchLoadingProps) {
  return (
    <SiteFrame showNav={false} visualMode="mono" contentClassName="flex min-h-screen items-center justify-center py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white">
          <BoardScene game="hex" state="loading" decorative className="h-10 w-10 text-[#090909]" />
        </div>
        <div>
          <p className="board-rail-label">Queue state</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.08em] text-foreground">Searching for an opponent</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            The queue is active. BOARD will open the instance as soon as another seat locks in.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </SiteFrame>
  );
}
