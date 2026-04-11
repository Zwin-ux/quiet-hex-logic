import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, Shield, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BoardLogo } from "@/components/BoardLogo";
import { SiteFrame } from "@/components/board/SiteFrame";
import { SkeletalBoardScene } from "@/components/board/SkeletalBoardScene";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters");

type AuthMode = "magic-link" | "password";
type AuthTab = "signin" | "signup";
type AuthView = "main" | "forgot-password" | "reset-password";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("magic-link");
  const [authTab, setAuthTab] = useState<AuthTab>("signup");
  const [authView, setAuthView] = useState<AuthView>("main");
  const { user, signInWithMagicLink, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      setAuthView("reset-password");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !user.is_anonymous && authView !== "reset-password") {
      navigate("/worlds");
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
          title: "Failed to send reset link",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Check your email",
          description: "We sent you a password reset link.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid email",
          description: error.issues[0].message,
          variant: "destructive",
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
          title: "Passwords do not match",
          description: "Please make sure both passwords are the same.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await updatePassword(newPassword);

      if (error) {
        toast({
          title: "Failed to reset password",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password updated",
          description: "You can now sign in with your new password.",
        });
        setAuthView("main");
        setAuthMode("password");
        setAuthTab("signin");
        navigate("/auth", { replace: true });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid password",
          description: error.issues[0].message,
          variant: "destructive",
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
          title: "Failed to send link",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Check your email",
          description: "We sent you a magic link to sign in.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid email",
          description: error.issues[0].message,
          variant: "destructive",
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

      if (authTab === "signup") {
        usernameSchema.parse(username);
        const { error } = await signUp(email, password, username);

        if (error) {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created",
            description: "Your BOARD identity is ready.",
          });
          navigate("/worlds");
        }
      } else {
        const { error } = await signIn(email, password);

        if (error) {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          navigate("/worlds");
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SiteFrame contentClassName="pt-24">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="order-2 space-y-6 xl:order-1">
          <div className="max-w-3xl">
            <p className="board-rail-label">Identity gate</p>
            <h1 className="board-page-title mt-4 max-w-[10ch] text-foreground">
              Enter worlds, events, and recurring rooms.
            </h1>
            <p className="board-copy-lg mt-5 max-w-xl">
              One account handles host access, venue membership, and returning
              roles. Local practice stays instant when you just want to think and play.
            </p>
          </div>

          <SkeletalBoardScene variant="compact" className="hidden max-w-3xl md:block" />

          <div className="grid gap-4 md:grid-cols-2">
            <VenuePanel
              eyebrow="Account use"
              title="Use identity when the room needs memory."
              description="Create or join worlds, enter host-run events, return to rooms, and keep your role inside recurring venues."
            />
            <VenuePanel
              eyebrow="Local practice"
              title="Practice can stay light."
              description="If you only want a fast solo session, BOARD keeps that path immediate and separate from venue identity."
            >
              <Button variant="outline" onClick={() => navigate("/play")}>
                Practice locally
              </Button>
            </VenuePanel>
          </div>
        </div>

        <VenuePanel
          className="order-1 bg-white/92 xl:order-2"
          eyebrow={
            authView === "forgot-password"
              ? "Password reset"
              : authView === "reset-password"
                ? "New password"
                : "Entry"
          }
          title={getAuthTitle(authView, emailSent, authTab)}
          description={getAuthDescription(authView, emailSent, authTab, email)}
        >
          {authView === "forgot-password" ? (
            <ForgotPasswordForm
              email={email}
              setEmail={setEmail}
              emailSent={emailSent}
              isSubmitting={isSubmitting}
              onSubmit={handleForgotPassword}
              onBack={() => {
                setEmailSent(false);
                setAuthView("main");
              }}
            />
          ) : authView === "reset-password" ? (
            <ResetPasswordForm
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              setNewPassword={setNewPassword}
              setConfirmPassword={setConfirmPassword}
              isSubmitting={isSubmitting}
              onSubmit={handleResetPassword}
            />
          ) : emailSent ? (
            <MagicLinkSent email={email} onReset={() => { setEmailSent(false); setEmail(""); }} />
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-4">
                <BoardLogo tone="dark" />
                <button
                  type="button"
                  onClick={() => navigate("/play")}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Practice locally
                </button>
              </div>

              <div className="mb-6 grid grid-cols-2 border border-black/10 bg-[#f7f5ef] p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("magic-link")}
                  className={authMode === "magic-link" ? "bg-black px-3 py-2 text-sm font-semibold text-white" : "px-3 py-2 text-sm font-semibold text-muted-foreground"}
                >
                  Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("password")}
                  className={authMode === "password" ? "bg-black px-3 py-2 text-sm font-semibold text-white" : "px-3 py-2 text-sm font-semibold text-muted-foreground"}
                >
                  Email + Password
                </button>
              </div>

              {authMode === "magic-link" ? (
                <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
                  <Field label="Email" htmlFor="email">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@club.com"
                        className="h-12 border-black/10 bg-[#faf9f4] pl-10"
                        required
                        autoFocus
                      />
                    </div>
                  </Field>

                  <Button type="submit" variant="hero" className="clip-stage h-12 w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <>
                  <div className="mb-5 flex gap-6 border-b border-black/10">
                    <button
                      type="button"
                      onClick={() => setAuthTab("signup")}
                      className={authTab === "signup" ? "border-b border-black pb-3 text-sm font-semibold text-foreground" : "pb-3 text-sm font-semibold text-muted-foreground"}
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthTab("signin")}
                      className={authTab === "signin" ? "border-b border-black pb-3 text-sm font-semibold text-foreground" : "pb-3 text-sm font-semibold text-muted-foreground"}
                    >
                      Sign In
                    </button>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    {authTab === "signup" ? (
                      <Field label="Username" htmlFor="username">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a name"
                            className="h-12 border-black/10 bg-[#faf9f4] pl-10"
                            required
                            autoFocus
                          />
                        </div>
                      </Field>
                    ) : null}

                    <Field label="Email" htmlFor="email-password">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email-password"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@club.com"
                          className="h-12 border-black/10 bg-[#faf9f4] pl-10"
                          required
                          autoFocus={authTab === "signin"}
                        />
                      </div>
                    </Field>

                    <Field label="Password" htmlFor="password">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Password</span>
                        {authTab === "signin" ? (
                          <button
                            type="button"
                            onClick={() => setAuthView("forgot-password")}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            Forgot password?
                          </button>
                        ) : null}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="h-12 border-black/10 bg-[#faf9f4] pl-10"
                          required
                        />
                      </div>
                    </Field>

                    <Button type="submit" variant="hero" className="clip-stage h-12 w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {authTab === "signup" ? "Creating account" : "Signing in"}
                        </>
                      ) : authTab === "signup" ? (
                        "Create Account"
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </>
              )}
            </>
          )}
        </VenuePanel>
      </div>
    </SiteFrame>
  );
}

function getAuthTitle(authView: AuthView, emailSent: boolean, authTab: AuthTab) {
  if (authView === "forgot-password") return emailSent ? "Check your inbox" : "Reset password";
  if (authView === "reset-password") return "Set a new password";
  if (emailSent) return "Magic link sent";
  return authTab === "signup" ? "Create your BOARD identity" : "Return to BOARD";
}

function getAuthDescription(
  authView: AuthView,
  emailSent: boolean,
  authTab: AuthTab,
  email: string,
) {
  if (authView === "forgot-password") {
    return emailSent
      ? `A reset link was sent to ${email}.`
      : "Enter your email and we will send you a reset link.";
  }
  if (authView === "reset-password") {
    return "Choose a new password for this account.";
  }
  if (emailSent) {
    return `Use the link we sent to ${email} to continue into BOARD.`;
  }
  return authTab === "signup"
    ? "Use an email or magic link to create your host or member identity."
    : "Sign in to re-enter your worlds, rooms, and events.";
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label === "Password" ? null : <Label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-foreground">{label}</Label>}
      {children}
    </div>
  );
}

function ForgotPasswordForm({
  email,
  setEmail,
  emailSent,
  isSubmitting,
  onSubmit,
  onBack,
}: {
  email: string;
  setEmail: (value: string) => void;
  emailSent: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBack: () => void;
}) {
  return emailSent ? (
    <div className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-black/10 bg-[#faf9f4]">
        <Mail className="h-6 w-6 text-foreground" />
      </div>
      <p className="text-sm leading-7 text-muted-foreground">
        Click the link in your email to reset your password, then return here to sign in.
      </p>
      <Button variant="outline" onClick={onBack} className="h-11 w-full">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Button>
    </div>
  ) : (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Email" htmlFor="reset-email">
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@club.com"
          className="h-12 border-black/10 bg-[#faf9f4]"
          required
          autoFocus
        />
      </Field>
      <Button type="submit" variant="hero" className="clip-stage h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            Send Reset Link
          </>
        )}
      </Button>
      <Button type="button" variant="outline" className="h-11 w-full" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Button>
    </form>
  );
}

function ResetPasswordForm({
  newPassword,
  confirmPassword,
  setNewPassword,
  setConfirmPassword,
  isSubmitting,
  onSubmit,
}: {
  newPassword: string;
  confirmPassword: string;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-black/10 bg-[#faf9f4]">
        <KeyRound className="h-6 w-6 text-foreground" />
      </div>
      <Field label="New Password" htmlFor="new-password">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="h-12 border-black/10 bg-[#faf9f4] pl-10"
            required
            autoFocus
          />
        </div>
      </Field>
      <Field label="Confirm Password" htmlFor="confirm-password">
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="h-12 border-black/10 bg-[#faf9f4] pl-10"
            required
          />
        </div>
      </Field>
      <Button type="submit" variant="hero" className="clip-stage h-12 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating
          </>
        ) : (
          "Update Password"
        )}
      </Button>
    </form>
  );
}

function MagicLinkSent({
  email,
  onReset,
}: {
  email: string;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-black/10 bg-[#faf9f4]">
        <Mail className="h-6 w-6 text-foreground" />
      </div>
      <p className="text-sm leading-7 text-muted-foreground">
        The sign-in link was sent to <span className="font-semibold text-foreground">{email}</span>.
      </p>
      <Button variant="outline" className="h-11 w-full" onClick={onReset}>
        Use a different email
      </Button>
    </div>
  );
}
