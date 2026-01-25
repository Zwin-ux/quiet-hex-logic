import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCircle, Sparkles, Lock, ChevronRight, Zap } from 'lucide-react';

interface GuestModeBannerProps {
  guestUsername: string;
}

export function GuestModeBanner({ guestUsername }: GuestModeBannerProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-r from-muted/80 via-muted/50 to-background border border-border/80 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted-foreground/10 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-medium text-foreground text-sm sm:text-base truncate">
                {guestUsername}
              </p>
              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded">
                Guest
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-green-500" />
                AI Practice
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Multiplayer
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Ranked
              </span>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/auth')} 
          size="sm"
          className="w-full sm:w-auto gap-1.5 bg-indigo hover:bg-indigo/90 text-white shadow-sm"
        >
          <Zap className="h-3.5 w-3.5" />
          Unlock Full Access
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
