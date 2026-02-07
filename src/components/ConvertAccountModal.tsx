import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/UserAvatar';
import { Sparkles, CheckCircle2, Trophy, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const convertSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(24, 'Username must be less than 24 characters'),
});

const avatarColors = [
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue'
] as const;

interface ConvertAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestId: string;
  onConversionComplete: () => void;
  matchesCompleted: number;
}

export function ConvertAccountModal({ 
  open, 
  onOpenChange, 
  guestId,
  onConversionComplete,
  matchesCompleted 
}: ConvertAccountModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>('indigo');
  const [converting, setConverting] = useState(false);
  const navigate = useNavigate();

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setConverting(true);

    try {
      // Validate input
      convertSchema.parse({ email, password, username });

      // Call conversion edge function
      const { data, error } = await supabase.functions.invoke('convert-guest-account', {
        body: {
          email,
          password,
          username,
          avatarColor,
          guestId
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Account created successfully!', {
        description: 'Welcome to The Open Board! All your progress has been saved.'
      });

      onConversionComplete();
      onOpenChange(false);
      
      // Refresh the page to update auth state
      window.location.reload();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error('Validation error', {
          description: error.issues[0].message
        });
      } else {
        toast.error('Failed to create account', {
          description: error instanceof Error ? error.message : 'Please try again'
        });
      }
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet to-indigo flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {matchesCompleted === 1 ? 'Great First Match!' : `${matchesCompleted} Matches Completed!`}
          </DialogTitle>
          <DialogDescription className="text-center">
            Create a free account to save your progress and unlock all features.
          </DialogDescription>
        </DialogHeader>
        
        {/* Guest Progress Stats */}
        <div className="flex justify-center gap-6 py-3 px-4 bg-muted/50 rounded-lg border border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{matchesCompleted}</div>
            <div className="text-xs text-muted-foreground">Match{matchesCompleted !== 1 ? 'es' : ''} Played</div>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-500">5</div>
            <div className="text-xs text-muted-foreground">Features Locked</div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg border border-border/50">
            <div className="h-10 w-10 shrink-0 rounded-full bg-violet/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-violet" />
            </div>
            <p className="text-xs font-medium text-center">Progress Saved</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg border border-border/50">
            <div className="h-10 w-10 shrink-0 rounded-full bg-indigo/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo" />
            </div>
            <p className="text-xs font-medium text-center">Multiplayer</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg border border-border/50">
            <div className="h-10 w-10 shrink-0 rounded-full bg-ochre/20 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-ochre" />
            </div>
            <p className="text-xs font-medium text-center">Tournaments</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg border border-border/50">
            <div className="h-10 w-10 shrink-0 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs font-medium text-center">Statistics</p>
          </div>
        </div>

        <form onSubmit={handleConvert} className="space-y-4">
          <div>
            <Label htmlFor="convert-username">Username</Label>
            <Input
              id="convert-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="mt-1"
              required
              disabled={converting}
            />
          </div>

          <div>
            <Label htmlFor="convert-email">Email</Label>
            <Input
              id="convert-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mt-1"
              required
              disabled={converting}
            />
          </div>

          <div>
            <Label htmlFor="convert-password">Password</Label>
            <Input
              id="convert-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="mt-1"
              required
              disabled={converting}
            />
          </div>

          <div>
            <Label className="mb-3 block">Choose Avatar Color</Label>
            <div className="grid grid-cols-9 gap-2">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`h-10 w-10 rounded-full transition-all hover:scale-110 ${
                    avatarColor === color
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                      : ''
                  }`}
                  disabled={converting}
                >
                  <UserAvatar username="A" color={color} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              disabled={converting}
              className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <span>Continue as Guest</span>
                <span className="text-xs opacity-60">({5 - Math.min(matchesCompleted, 5)} features locked)</span>
              </div>
            </Button>
            <Button 
              type="submit" 
              disabled={converting}
              className="w-full sm:w-auto bg-gradient-to-r from-violet to-indigo hover:from-violet/90 hover:to-indigo/90"
            >
              {converting ? 'Creating Account...' : 'Create Free Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
