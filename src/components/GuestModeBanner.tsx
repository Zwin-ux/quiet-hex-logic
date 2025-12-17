import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCircle, Sparkles, Lock } from 'lucide-react';

interface GuestModeBannerProps {
  guestUsername: string;
}

export function GuestModeBanner({ guestUsername }: GuestModeBannerProps) {
  const navigate = useNavigate();

  return (
    <Card className="mb-8 p-4 sm:p-6 bg-gradient-to-r from-violet/10 via-violet/5 to-indigo/5 border-2 border-violet/30 shadow-medium animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 flex-1">
          <div className="h-12 w-12 shrink-0 rounded-full bg-violet/20 flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-violet" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-body font-bold text-foreground text-base sm:text-lg">
                Playing as {guestUsername}
              </p>
              <div className="px-2 py-0.5 bg-violet/20 rounded-full">
                <span className="text-xs font-medium text-violet">Guest</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Practice with AI freely. Create an account to unlock multiplayer, tournaments, and save your progress.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-green-500" />
                <span>AI Practice Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>Multiplayer Locked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>Tournaments Locked</span>
              </div>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/auth')} 
          size="lg"
          className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all hover:scale-105 h-12 bg-gradient-to-r from-violet to-indigo hover:from-violet/90 hover:to-indigo/90 animate-pulse hover:animate-none ring-2 ring-violet/50 ring-offset-2 ring-offset-background"
        >
          <span className="relative flex items-center gap-2">
            <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-green-400 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-green-400" />
            Create Account
          </span>
        </Button>
      </div>
    </Card>
  );
}
