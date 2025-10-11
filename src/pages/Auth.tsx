import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(24, 'Username must be less than 24 characters').optional(),
});

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = isSignUp
        ? { email, password, username }
        : { email, password };
      
      authSchema.parse(data);

      const { error } = isSignUp
        ? await signUp(email, password, username)
        : await signIn(email, password);

      if (error) {
        toast({
          title: 'Authentication failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: isSignUp ? 'Account created' : 'Welcome back',
          description: isSignUp 
            ? 'You can now sign in and start playing.' 
            : 'Ready to play some Hex?',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation error',
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
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="username" className="text-ink">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="player_name"
                  className="mt-1 bg-paper border-graphite/30"
                  required
                />
              </div>
            )}

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
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-ink">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 bg-paper border-graphite/30"
                required
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-ink/60 hover:text-ink transition-gentle"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
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
