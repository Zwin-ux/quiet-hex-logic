import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');

export default function Auth() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { user, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated (but allow anonymous/guest users to stay)
  useEffect(() => {
    if (user && !user.is_anonymous) {
      navigate('/lobby');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);

      const { error } = await signInWithMagicLink(email);

      if (error) {
        toast({
          title: 'Failed to send link',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Check your email!',
          description: 'We sent you a magic link to sign in.',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Invalid email',
          description: error.issues[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md">
        <div className="bg-paper border-2 border-graphite/30 rounded-xl p-8 shadow-paper">
          <div className="text-center mb-8">
            <h1 className="font-body text-4xl text-ink mb-2">Hexology</h1>
            <p className="text-ink/60 text-sm">
              {emailSent ? 'Check your inbox' : 'Sign in with your email'}
            </p>
          </div>

          {emailSent ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-ink mb-2">We sent a magic link to</p>
                <p className="font-semibold text-ink">{email}</p>
              </div>
              <p className="text-ink/60 text-sm">
                Click the link in your email to sign in instantly.
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="text-ink/60"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-ink">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 bg-paper border-graphite/30"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Magic Link
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/lobby')}
              className="text-sm text-ink/60 hover:text-ink transition-gentle"
            >
              Continue as guest instead
            </button>
          </div>
        </div>

        <p className="text-center text-ink/40 text-xs mt-8">
          "Every move is a question. The board will answer."
        </p>
      </div>
    </div>
  );
}
