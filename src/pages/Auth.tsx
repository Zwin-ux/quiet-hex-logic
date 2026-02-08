import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, ArrowLeft, Lock, User, Trophy, Users, Swords, Crown, CheckCircle2, KeyRound, Shield } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters');

type AuthMode = 'magic-link' | 'password';
type AuthTab = 'signin' | 'signup';
type AuthView = 'main' | 'forgot-password' | 'reset-password';

const UNLOCK_FEATURES = [
  { icon: Swords, label: 'Tactical Matches', description: 'Challenge Grandmasters worldwide' },
  { icon: Trophy, label: 'Official Tournaments', description: 'Compete for prestige and ranking' },
  { icon: Users, label: 'Strategy Hub', description: 'Connect with elite players' },
  { icon: Crown, label: 'Boutique Status', description: 'Unlock premium board aesthetics' },
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
  const { user, signInWithMagicLink, signIn, signUp, resetPassword, updatePassword } = useAuth();
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

          <div className="bg-card/40 backdrop-blur-xl border border-primary/20 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Shield className="h-20 w-20 text-primary" />
            </div>
            
            <div className="text-center mb-10">
              <h1 className="font-display-text text-5xl font-bold text-white mb-2 bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-transparent">Hexology</h1>
              <p className="text-muted-foreground/60 text-xs font-mono uppercase tracking-[0.2em]">
                {emailSent ? 'Verify Identity' : authTab === 'signup' ? 'Join the Hub' : 'Elite Access'}
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