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
import { Lock, Sparkles, Users, Trophy } from 'lucide-react';

interface FeatureLockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

export function FeatureLockedModal({ open, onOpenChange, featureName }: FeatureLockedModalProps) {
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-violet/20 flex items-center justify-center">
            <Lock className="h-6 w-6 text-violet" />
          </div>
          <DialogTitle className="text-center">Create Account to Unlock {featureName}</DialogTitle>
          <DialogDescription className="text-center">
            You're currently playing as a guest. Create a free account to access all features!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border/50">
            <div className="h-8 w-8 shrink-0 rounded-full bg-violet/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet" />
            </div>
            <div>
              <p className="font-medium text-sm">Multiplayer Matches</p>
              <p className="text-xs text-muted-foreground">Challenge friends and join lobbies</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border/50">
            <div className="h-8 w-8 shrink-0 rounded-full bg-indigo/20 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-indigo" />
            </div>
            <div>
              <p className="font-medium text-sm">Tournaments</p>
              <p className="text-xs text-muted-foreground">Compete in organized tournaments</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border/50">
            <div className="h-8 w-8 shrink-0 rounded-full bg-ochre/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-ochre" />
            </div>
            <div>
              <p className="font-medium text-sm">Save Progress</p>
              <p className="text-xs text-muted-foreground">Track stats, history, and achievements</p>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleCreateAccount} className="bg-gradient-to-r from-violet to-indigo hover:from-violet/90 hover:to-indigo/90">
            Create Free Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
