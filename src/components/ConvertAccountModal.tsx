import { useState } from 'react';
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
import { VenuePanel } from '@/components/board/VenuePanel';
import { MetricLine } from '@/components/board/MetricLine';
import { UserAvatar } from '@/components/UserAvatar';
import { ArrowUpRight, CheckCircle2, KeyRound, RadioTower, UserCircle } from 'lucide-react';
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
  'emerald', 'teal', 'cyan', 'sky', 'blue',
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
  guestId: _guestId,
  onConversionComplete,
  matchesCompleted,
}: ConvertAccountModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>('indigo');
  const [converting, setConverting] = useState(false);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setConverting(true);

    try {
      convertSchema.parse({ email, password, username });

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email,
        data: {
          username,
          avatar_color: avatarColor,
        },
      });

      if (updateError) throw updateError;

      const currentUserId = updateData.user?.id;
      if (!currentUserId) {
        throw new Error('Missing current user session');
      }

      const profilePatch: Record<string, unknown> = {
        username,
        avatar_color: avatarColor,
      };

      if (!updateData.user?.is_anonymous) {
        profilePatch.is_guest = false;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profilePatch as any)
        .eq('id', currentUserId);

      if (profileError) throw profileError;

      if (!updateData.user?.is_anonymous) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) {
          console.warn('[ConvertAccountModal] Password update skipped:', passwordError);
        }
      }

      toast.success(
        updateData.user?.is_anonymous
          ? 'Check your email to finish setup'
          : 'Account ready',
        {
          description: updateData.user?.is_anonymous
            ? 'Your progress stays on this same profile. Confirm the email link, then finish password setup.'
            : 'Your progress stayed attached to this BOARD account.',
        },
      );

      onConversionComplete();
      onOpenChange(false);

      if (!updateData.user?.is_anonymous) {
        window.location.reload();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error('Validation error', {
          description: error.issues[0].message,
        });
      } else {
        toast.error('Failed to create account', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
      }
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl overflow-hidden border-black/10 bg-[#fbfaf6] p-0">
        <DialogHeader className="border-b border-black/10 px-6 py-6">
          <p className="board-rail-label">Identity upgrade</p>
          <DialogTitle className="mt-3 text-3xl tracking-[-0.08em]">
            Turn this local seat into a real BOARD account.
          </DialogTitle>
          <DialogDescription className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Keep the progress from {matchesCompleted} completed match{matchesCompleted !== 1 ? 'es' : ''},
            attach it to an account, and unlock worlds, live rooms, and recurring events.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-black/10 bg-[#f3f1ea] px-6 py-6 lg:border-b-0 lg:border-r">
            <VenuePanel
              eyebrow="What changes"
              title="Your progress stays put."
              description="This is not a new identity. It upgrades the seat you already used for local practice."
              className="border-none bg-transparent p-0 shadow-none before:hidden"
            >
              <div className="space-y-1 border-t border-black/10 pt-4">
                <MetricLine icon={CheckCircle2} label="Matches kept" value={matchesCompleted} />
                <MetricLine icon={RadioTower} label="Live rooms" value="enabled" />
                <MetricLine icon={UserCircle} label="World membership" value="enabled" />
                <MetricLine icon={KeyRound} label="Recovery" value="account based" />
              </div>
            </VenuePanel>
          </aside>

          <div className="px-6 py-6">
            <form onSubmit={handleConvert} className="space-y-5">
              <div>
                <Label htmlFor="convert-username">Username</Label>
                <Input
                  id="convert-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="mt-2 border-black/10 bg-white"
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
                  className="mt-2 border-black/10 bg-white"
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
                  className="mt-2 border-black/10 bg-white"
                  required
                  disabled={converting}
                />
              </div>

              <div>
                <Label className="mb-3 block">Choose avatar color</Label>
                <div className="grid grid-cols-9 gap-2">
                  {avatarColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-white transition-all hover:-translate-y-0.5 ${
                        avatarColor === color ? 'border-black bg-black text-white' : ''
                      }`}
                      disabled={converting}
                    >
                      <UserAvatar username="A" color={color} size="sm" className="grayscale" />
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 border-t border-black/10 pt-5 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={converting}
                  className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
                >
                  Not now
                </Button>
                <Button type="submit" disabled={converting} className="w-full justify-between sm:w-auto">
                  {converting ? 'Saving...' : 'Create account'}
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
