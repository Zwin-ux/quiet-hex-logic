import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, ArrowLeft, Lock, User } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters');

type AuthMode = 'magic-link' | 'password';
type AuthTab = 'signin' | 'signup';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('magic-link');
  const [authTab, setAuthTab] = useState<AuthTab>('signup');
  
  const { user, signInWithMagicLink, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated (but allow anonymous/guest users to stay)
  useEffect(() => {
    if (user && !user.is_anonymous) {
      navigate('/lobby');
    }
  }, [user, navigate]);

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      
      if (authTab === 'signup') {
        usernameSchema.parse(username);
        const { error } = await signUp(email, password, username);
        
        if (error) {
          toast({
            title: 'Signup failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to Hexology!',
          });
          navigate('/lobby');
        }
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          navigate('/lobby');
        }
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
          <div className="text-center mb-6">
            <h1 className="font-body text-4xl text-ink mb-2">Hexology</h1>
            <p className="text-ink/60 text-sm">
              {emailSent ? 'Check your inbox' : authTab === 'signup' ? 'Create your account' : 'Welcome back'}
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
            <>
              {/* Auth Mode Toggle */}
              <div className="flex rounded-lg bg-muted p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setAuthMode('magic-link')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                    authMode === 'magic-link'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('password')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                    authMode === 'password'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Email & Password
                </button>
              </div>

              {authMode === 'magic-link' ? (
                <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
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
              ) : (
                <>
                  {/* Sign In / Sign Up Tabs */}
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setAuthTab('signup')}
                      className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-all ${
                        authTab === 'signup'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthTab('signin')}
                      className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-all ${
                        authTab === 'signin'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Sign In
                    </button>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    {authTab === 'signup' && (
                      <div>
                        <Label htmlFor="username" className="text-ink">Username</Label>
                        <div className="relative mt-1">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            className="pl-10 bg-paper border-graphite/30"
                            required
                            autoFocus
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="email-password" className="text-ink">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email-password"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="pl-10 bg-paper border-graphite/30"
                          required
                          autoFocus={authTab === 'signin'}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-ink">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 bg-paper border-graphite/30"
                          required
                        />
                      </div>
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
                          {authTab === 'signup' ? 'Creating account...' : 'Signing in...'}
                        </>
                      ) : (
                        authTab === 'signup' ? 'Create Account' : 'Sign In'
                      )}
                    </Button>
                  </form>
                </>
              )}
            </>
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