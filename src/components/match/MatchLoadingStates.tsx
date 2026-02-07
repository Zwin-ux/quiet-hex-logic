import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MatchLoadingProps {
  onCancel: () => void;
}

export function MatchLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-indigo relative z-10 mx-auto" />
        </div>
        <p className="font-mono text-muted-foreground">Loading match...</p>
      </div>
    </div>
  );
}

export function MatchWaiting({ onCancel }: MatchLoadingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-ochre/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="h-16 w-16 animate-spin text-ochre relative z-10" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold font-display">Searching for opponent...</h2>
        <p className="text-muted-foreground font-mono">Competitive &bull; ELO Rated</p>
      </div>
      <Button variant="outline" onClick={onCancel} className="mt-8">
        Cancel
      </Button>
    </div>
  );
}
