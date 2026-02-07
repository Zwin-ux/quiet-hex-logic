import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, ArrowLeft, Lock, User, Trophy, Users, Swords, Crown, CheckCircle2, KeyRound } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters');

type AuthMode = 'magic-link' | 'password';
type AuthTab = 'signin' | 'signup';
type AuthView = 'main' | 'forgot-password' | 'reset-password';

const UNLOCK_FEATURES = [
  { icon: Swords, label: 'Multiplayer Matches', description: 'Challenge real players' },
  { icon: Trophy, label: 'Tournaments', description: 'Compete for rankings' },
  { icon: Users, label: 'Friends & Chat', description: 'Connect with players' },
  { icon: Crown, label: 'Leaderboards', description: 'Track your progress' },
];

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('magic-link');
  const [authTab, setAuthTab] = useState<AuthTab>('signup');
  const [authView, setAuthView] = useState<AuthView>('main');
  const [socialLoading, setSocialLoading] = useState<'google' | 'discord' | 'apple' | null>(null);
  
  const { user, signInWithMagicLink, signIn, signUp, signInWithGoogle, signInWithDiscord, signInWithApple, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if this is a password reset redirect
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setAuthView('reset-password');
    }
  }, [searchParams]);

  // Redirect if already authenticated (but allow anonymous/guest users to stay)
  useEffect(() => {
    if (user && !user.is_anonymous && authView !== 'reset-password') {
      navigate('/lobby');
    }
  }, [user, navigate, authView]);

  const handleSocialLogin = async (provider: 'google' | 'discord' | 'apple') => {
    setSocialLoading(provider);
    try {
      let signInFn;
      if (provider === 'google') signInFn = signInWithGoogle;
      else if (provider === 'discord') signInFn = signInWithDiscord;
      else signInFn = signInWithApple;

      const { error } = await signInFn();
      if (error) {
        toast({
          title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} login failed`,
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      const { error } = await resetPassword(email);

      if (error) {
        toast({
          title: 'Failed to send reset link',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Check your email!',
          description: 'We sent you a password reset link.',
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      passwordSchema.parse(newPassword);
      
      if (newPassword !== confirmPassword) {
        toast({
          title: 'Passwords do not match',
          description: 'Please make sure both passwords are the same.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await updatePassword(newPassword);

      if (error) {
        toast({
          title: 'Failed to reset password',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password updated!',
          description: 'You can now sign in with your new password.',
        });
        setAuthView('main');
        setAuthMode('password');
        setAuthTab('signin');
        navigate('/auth', { replace: true });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Invalid password',
          description: error.issues[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Forgot Password View
  if (authView === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border-2 border-border rounded-xl p-8 shadow-lg">
            <div className="text-center mb-6">
              <h1 className="font-display text-4xl text-foreground mb-2">Reset Password</h1>
              <p className="text-foreground/60 text-sm">
                {emailSent ? 'Check your inbox' : "Enter your email to receive a reset link"}
              </p>
            </div>

            {emailSent ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-foreground mb-2">We sent a reset link to</p>
                  <p className="font-semibold text-foreground">{email}</p>
                </div>
                <p className="text-foreground/60 text-sm">
                  Click the link in your email to reset your password.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEmailSent(false);
                    setAuthView('main');
                  }}
                  className="text-foreground/60"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1 bg-background border-border"
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
                      Send Reset Link
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-foreground/60"
                  onClick={() => setAuthView('main')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Reset Password View (after clicking email link)
  if (authView === 'reset-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border-2 border-border rounded-xl p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-4xl text-foreground mb-2">New Password</h1>
              <p className="text-foreground/60 text-sm">Enter your new password below</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-foreground">New Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-background border-border"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-foreground">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-background border-border"
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
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8">
        {/* Features Unlock Preview - Desktop */}
        <div className="hidden lg:flex flex-col justify-center flex-1 pr-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Unlock Full Access</h2>
          <p className="text-foreground/60 mb-6">Create an account to access all features</p>
          <div className="space-y-4">
            {UNLOCK_FEATURES.map((feature, i) => (
              <div 
                key={feature.label}
                className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{feature.label}</p>
                  <p className="text-sm text-foreground/60">{feature.description}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary/50" />
              </div>
            ))}
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full lg:w-96">
          {/* Mobile Features Preview */}
          <div className="lg:hidden mb-6">
            <div className="bg-gradient-to-r from-primary/10 to-violet/10 rounded-xl p-4 border border-primary/20">
              <p className="text-sm font-medium text-foreground mb-3 text-center">Unlock with an account:</p>
              <div className="flex justify-center gap-6">
                {UNLOCK_FEATURES.map((feature) => (
                  <div key={feature.label} className="flex flex-col items-center gap-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs text-foreground/70 text-center max-w-[60px]">{feature.label.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-xl p-8 shadow-lg">
            <div className="text-center mb-6">
              <h1 className="font-display text-4xl text-foreground mb-2">Hexology</h1>
              <p className="text-foreground/60 text-sm">
                {emailSent ? 'Check your inbox' : authTab === 'signup' ? 'Create your account' : 'Welcome back'}
              </p>
            </div>

            {emailSent ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-foreground mb-2">We sent a magic link to</p>
                  <p className="font-semibold text-foreground">{email}</p>
                </div>
                <p className="text-foreground/60 text-sm">
                  Click the link in your email to sign in instantly.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  className="text-foreground/60"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Use a different email
                </Button>
              </div>
            ) : (
              <>
                {/* Social Login - Coming Soon Banner */}
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50">
                  <div className="text-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Social Login Coming Soon
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {/* All social login buttons disabled - OAuth providers not configured */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 opacity-50 cursor-not-allowed grayscale bg-muted"
                      disabled
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.96.95-2.04 1.72-3.21 1.72-1.13 0-1.52-.72-2.84-.73-1.31 0-1.76.71-2.85.73-1.15.02-2.35-.83-3.32-1.78C2.81 18.22 1 14.88 1 11.23c0-3.66 2.39-5.59 4.67-5.59 1.19 0 2.22.45 2.95.45.71 0 1.81-.45 3.19-.45 1.58 0 2.76.57 3.51 1.25-1.54.91-1.81 3.19-.24 4.19 1.24.79 2.14 1.83 2.14 3.79-.02 1.95-1.05 4.31-2.12 5.41zM11.95 5.09c.65-.79 1.1-1.89 1.1-3.09 0-1.21-.45-2-1.1-2a1.86 1.86 0 0 0-1.1 3c.09 1.29.54 2 1.1 2.09z"/>
                      </svg>
                      Sign in with Apple
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10 opacity-50 cursor-not-allowed grayscale"
                        disabled
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10 opacity-50 cursor-not-allowed grayscale"
                        disabled
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="#5865F2">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        Discord
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-foreground/50">or continue with email</span>
                  </div>
                </div>

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
                      <Label htmlFor="email" className="text-foreground">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="mt-1 bg-background border-border"
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
                          <Label htmlFor="username" className="text-foreground">Username</Label>
                          <div className="relative mt-1">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="username"
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Choose a username"
                              className="pl-10 bg-background border-border"
                              required
                              autoFocus
                            />
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="email-password" className="text-foreground">Email</Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email-password"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="pl-10 bg-background border-border"
                            required
                            autoFocus={authTab === 'signin'}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-foreground">Password</Label>
                          {authTab === 'signin' && (
                            <button
                              type="button"
                              onClick={() => setAuthView('forgot-password')}
                              className="text-xs text-primary hover:underline"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative mt-1">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="pl-10 bg-background border-border"
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
                className="text-sm text-foreground/60 hover:text-foreground transition-gentle"
              >
                Continue as guest instead
              </button>
            </div>
          </div>

          <p className="text-center text-foreground/40 text-xs mt-8">
            "Every move is a question. The board will answer."
          </p>
        </div>
      </div>
    </div>
  );
}