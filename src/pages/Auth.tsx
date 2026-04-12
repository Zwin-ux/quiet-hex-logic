import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Chrome, Disc3, KeyRound, Loader2, Lock, Mail, User } from "lucide-react";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getAuthStorageIssue } from "@/integrations/supabase/client";
import { buildAuthRoute, parseAuthUrlState, resolvePostAuthPath } from "@/lib/authRedirect";

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
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const authUrlState = useMemo(
    () => parseAuthUrlState(location.search, location.hash),
    [location.hash, location.search],
  );
  const returnTo = resolvePostAuthPath(authUrlState.returnTo);
  const shouldShowReturnTarget = returnTo !== "/worlds";
  const authStorageIssue = getAuthStorageIssue();
  const defaultAuthTab: AuthTab = shouldShowReturnTarget ? "signin" : "signup";
  const handledCallbackState = useRef<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("magic-link");
  const [authTab, setAuthTab] = useState<AuthTab>(defaultAuthTab);
  const [authView, setAuthView] = useState<AuthView>("main");
  const [authNotice, setAuthNotice] = useState(authUrlState.notice);

  const {
    user,
    loading,
    signInWithMagicLink,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithDiscord,
    resetPassword,
    updatePassword,
  } = useAuth();

  useEffect(() => {
    if (authUrlState.isResetFlow || searchParams.get("reset") === "true") {
      setAuthView("reset-password");
    }
  }, [authUrlState.isResetFlow, searchParams]);

  useEffect(() => {
    const signature = `${location.search}|${location.hash}`;
    if (handledCallbackState.current === signature) return;
    handledCallbackState.current = signature;

    if (authUrlState.notice) {
      setAuthNotice(authUrlState.notice);
      if (authUrlState.notice.tone === "critical") {
        toast({
          title: authUrlState.notice.title,
          description: authUrlState.notice.description,
          variant: "destructive",
        });
      }
    }

    const canCleanSearch =
      authUrlState.cleanedSearch !== location.search && (Boolean(authUrlState.authError) || !loading);
    const canCleanHash =
      Boolean(location.hash) && authUrlState.shouldClearHash && (Boolean(authUrlState.authError) || !loading);

    if (canCleanSearch || canCleanHash) {
      navigate(
        {
          pathname: location.pathname,
          search: canCleanSearch ? authUrlState.cleanedSearch : location.search,
          hash: "",
        },
        { replace: true },
      );
    }
  }, [authUrlState, loading, location.hash, location.pathname, location.search, navigate, toast]);

  useEffect(() => {
    if (user && !user.is_anonymous && authView !== "reset-password") {
      navigate(returnTo, { replace: true });
    }
  }, [authView, navigate, returnTo, user]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStorageIssue) {
      toast({
        title: "Browser storage required",
        description: authStorageIssue,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      const { error } = await resetPassword(email, returnTo);

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
    if (authStorageIssue) {
      toast({
        title: "Browser storage required",
        description: authStorageIssue,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      passwordSchema.parse(newPassword);

      if (newPassword !== confirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Please make sure both passwords are the same.",
          variant: "destructive",
        });
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
        navigate(buildAuthRoute(returnTo), { replace: true });
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
    if (authStorageIssue) {
      toast({
        title: "Browser storage required",
        description: authStorageIssue,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      const { error } = await signInWithMagicLink(email, returnTo);

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
    if (authStorageIssue) {
      toast({
        title: "Browser storage required",
        description: authStorageIssue,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      if (authTab === "signup") {
        usernameSchema.parse(username);
        const { data, error } = await signUp(email, password, username, "indigo", returnTo);

        if (error) {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          const hasSession = Boolean(data?.session);
          toast({
            title: hasSession ? "Account created" : "Check your email",
            description: hasSession
              ? "Your BOARD identity is ready."
              : "Use the link in your inbox to finish entering BOARD.",
          });

          if (hasSession) {
            navigate(returnTo);
          } else {
            setEmailSent(true);
          }
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
          navigate(returnTo);
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

  const handleProviderSignIn = async (provider: "google" | "discord") => {
    if (authStorageIssue) {
      toast({
        title: "Browser storage required",
        description: authStorageIssue,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const { error } =
        provider === "google"
          ? await signInWithGoogle(returnTo)
          : await signInWithDiscord(returnTo);

      if (error) {
        toast({
          title: `${provider === "google" ? "Google" : "Discord"} sign in failed`,
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMainForm = () => (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          type="button"
          variant={authMode === "password" && authTab === "signup" ? "secondary" : "outline"}
          onClick={() => {
            setAuthMode("password");
            setAuthTab("signup");
          }}
          disabled={Boolean(authStorageIssue)}
        >
          Create Account
        </Button>
        <Button
          type="button"
          variant={authMode === "password" && authTab === "signin" ? "secondary" : "outline"}
          onClick={() => {
            setAuthMode("password");
            setAuthTab("signin");
          }}
          disabled={Boolean(authStorageIssue)}
        >
          Sign In
        </Button>
      </div>

      <form
        onSubmit={authMode === "magic-link" ? handleMagicLinkSubmit : handlePasswordSubmit}
        className="mt-8 grid gap-6"
      >
        <div>
          <Label
            htmlFor="entry-email"
            className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#525257]"
          >
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d7a74]" />
            <Input
              id="entry-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-11"
              autoFocus
              required
              disabled={Boolean(authStorageIssue)}
            />
          </div>
        </div>

        {authMode === "password" && authTab === "signup" ? (
          <div>
            <Label
              htmlFor="entry-username"
              className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#525257]"
            >
              Username
            </Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d7a74]" />
              <Input
                id="entry-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a name"
                className="pl-11"
                required
                disabled={Boolean(authStorageIssue)}
              />
            </div>
          </div>
        ) : null}

        {authMode === "password" ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label
                htmlFor="entry-password"
                className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#525257]"
              >
                Password
              </Label>
              {authTab === "signin" ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-[12px]"
                  onClick={() => setAuthView("forgot-password")}
                >
                  Forgot password?
                </Button>
              ) : null}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d7a74]" />
              <Input
                id="entry-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="pl-11"
                required
                disabled={Boolean(authStorageIssue)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="hero" disabled={isSubmitting || Boolean(authStorageIssue)}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {authMode === "magic-link"
                  ? "Sending"
                  : authTab === "signup"
                    ? "Creating"
                    : "Signing in"}
              </>
            ) : (
              "Continue"
            )}
          </Button>
          <Button
            type="button"
            variant={authMode === "magic-link" ? "secondary" : "outline"}
            onClick={() => setAuthMode("magic-link")}
            disabled={Boolean(authStorageIssue)}
          >
            Magic Link
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-w-[92px]"
          disabled={isSubmitting || Boolean(authStorageIssue)}
          onClick={() => handleProviderSignIn("google")}
        >
          <Chrome className="h-4 w-4" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-w-[92px]"
          disabled={isSubmitting || Boolean(authStorageIssue)}
          onClick={() => handleProviderSignIn("discord")}
        >
          <Disc3 className="h-4 w-4" />
          Discord
        </Button>
      </div>

      <p className="mt-4 max-w-[430px] text-[13px] leading-6 text-[#525257]">
        If this person already has a BOARD account, add Google or Discord later from{" "}
        <span className="font-semibold text-[#0e0e0f]">Profile / Account Connections</span> to avoid
        splitting identity across multiple accounts.
      </p>

      <p className="mt-8 text-[14px] leading-7 text-[#525257]">
        Hosted actions require identity. Practice does not.
      </p>

      {shouldShowReturnTarget ? (
        <div className="mt-6 border border-[#0e0e0f] p-4">
          <p className="board-rail-label text-[11px] text-[#525257]">Return target</p>
          <p className="mt-2 text-[15px] leading-7 text-[#0e0e0f]">{returnTo}</p>
        </div>
      ) : null}

      {authStorageIssue ? (
        <div className="mt-6 border border-[#8a4b08] bg-[#fff4e8] p-4">
          <p className="board-rail-label text-[11px] text-[#8a4b08]">Compatibility issue</p>
          <p className="mt-2 text-[15px] leading-7 text-[#0e0e0f]">{authStorageIssue}</p>
        </div>
      ) : null}
    </>
  );

  return (
    <SiteFrame contentClassName="pt-24">
      <div className="board-page-width mx-auto">
        <div className="flex items-start justify-between gap-4 pb-8">
          <BoardWordmark className="text-[#0e0e0f]" />
          {shouldShowReturnTarget ? (
            <div className="hidden border border-[#0e0e0f] px-3 py-2 md:block">
              <p className="board-rail-label text-[11px] text-[#0e0e0f]">
                Next / {returnTo.replace(/^\//, "")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 xl:grid-cols-[520px_minmax(0,1fr)]">
          <section className="border border-[#0e0e0f] bg-[#fbfaf8] p-6 md:p-7">
            <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#0e0e0f]">
              {getAuthTitle(authView, emailSent, authTab)}
            </h1>
            <p className="mt-5 max-w-[430px] text-[18px] leading-8 text-[#525257]">
              {getAuthDescription(authView, emailSent, authTab, email)}
            </p>

            {authNotice ? (
              <div
                className={`mt-6 border p-4 ${
                  authNotice.tone === "critical"
                    ? "border-[#a80000] bg-[#fff3f3]"
                    : authNotice.tone === "warning"
                      ? "border-[#8a4b08] bg-[#fff4e8]"
                      : "border-[#0e0e0f] bg-white"
                }`}
              >
                <p className="board-rail-label text-[11px] text-[#525257]">{authNotice.title}</p>
                <p className="mt-2 text-[15px] leading-7 text-[#0e0e0f]">{authNotice.description}</p>
              </div>
            ) : null}

            {authView === "forgot-password" ? (
              <div className="mt-8">
                <ForgotPasswordForm
                  email={email}
                  setEmail={setEmail}
                  emailSent={emailSent}
                  isSubmitting={isSubmitting}
                  isBlocked={Boolean(authStorageIssue)}
                  onSubmit={handleForgotPassword}
                  onBack={() => {
                    setEmailSent(false);
                    setAuthView("main");
                  }}
                />
              </div>
            ) : authView === "reset-password" ? (
              <div className="mt-8">
                <ResetPasswordForm
                  newPassword={newPassword}
                  confirmPassword={confirmPassword}
                  setNewPassword={setNewPassword}
                  setConfirmPassword={setConfirmPassword}
                  isSubmitting={isSubmitting}
                  isBlocked={Boolean(authStorageIssue)}
                  onSubmit={handleResetPassword}
                />
              </div>
            ) : emailSent ? (
              <div className="mt-8">
                <MagicLinkSent
                  email={email}
                  onReset={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                />
              </div>
            ) : (
              renderMainForm()
            )}
          </section>

          <div className="space-y-8">
            <section className="border border-[#0e0e0f] bg-[#0e0e0f] p-6 md:p-7">
              <p className="board-rail-label text-[11px] text-white/72">Hosted Access</p>
              <div className="mt-6 font-['League_Spartan'] text-[clamp(2.2rem,4vw,3.3rem)] font-black leading-[0.92] tracking-[-0.05em] text-[#f6f4f0]">
                <p>12 live tables</p>
                <p>2 finals queued</p>
              </div>
              <p className="mt-6 max-w-[380px] text-[18px] leading-8 text-white/82">
                Identity unlocks join, spectate, host controls, and world membership.
              </p>
            </section>

            <section className="border border-[#0e0e0f] bg-[#fbfaf8] p-6 md:p-7">
              <h2 className="text-[clamp(2rem,3.4vw,3rem)] font-black leading-[0.94] tracking-[-0.06em] text-[#0e0e0f]">
                Local Practice
              </h2>
              <p className="mt-5 max-w-[420px] text-[18px] leading-8 text-[#525257]">
                No account required. Use this when the player just wants to open a board and start immediately.
              </p>
              <Button type="button" variant="outline" className="mt-8" onClick={() => navigate("/play")}>
                Start Local Practice
              </Button>
            </section>

            <p className="max-w-[520px] text-[16px] leading-8 text-[#525257]">
              This page must answer one question fast: do I need identity for what I am about to do?
            </p>
          </div>
        </div>
      </div>
    </SiteFrame>
  );
}

function getAuthTitle(authView: AuthView, emailSent: boolean, authTab: AuthTab) {
  if (authView === "forgot-password") return emailSent ? "Check your inbox" : "Reset password";
  if (authView === "reset-password") return "Set a new password";
  if (emailSent) return "Magic link sent";
  return authTab === "signup" ? "Enter BOARD" : "Return to BOARD";
}

function getAuthDescription(
  authView: AuthView,
  emailSent: boolean,
  authTab: AuthTab,
  email: string,
) {
  if (authView === "forgot-password") {
    return emailSent
      ? `Reset link sent to ${email}.`
      : "Enter your email and we will send a reset link.";
  }
  if (authView === "reset-password") {
    return "Set a new password for your BOARD identity.";
  }
  if (emailSent) {
    return `Use the sign-in link sent to ${email}.`;
  }
  return authTab === "signup"
    ? "Use account access for worlds, rooms, and events. Local practice stays outside the auth wall."
    : "Use account access for hosted worlds, rooms, and events. Local practice stays outside the auth wall.";
}

function ForgotPasswordForm({
  email,
  setEmail,
  emailSent,
  isSubmitting,
  isBlocked,
  onSubmit,
  onBack,
}: {
  email: string;
  setEmail: (value: string) => void;
  emailSent: boolean;
  isSubmitting: boolean;
  isBlocked: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBack: () => void;
}) {
  return emailSent ? (
    <div className="space-y-6">
      <div className="border border-[#0e0e0f] p-4">
        <p className="board-rail-label text-[11px] text-[#525257]">Reset Link Sent</p>
        <p className="mt-3 text-[16px] leading-7 text-[#0e0e0f]">
          Use the reset link from your inbox, then return here.
        </p>
      </div>
      <Button variant="outline" onClick={onBack} className="h-11 w-full">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Button>
    </div>
  ) : (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label
          htmlFor="reset-email"
          className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#525257]"
        >
          Email
        </Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
          disabled={isBlocked}
        />
      </div>
      <Button type="submit" variant="hero" className="h-11 w-full" disabled={isSubmitting || isBlocked}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending
          </>
        ) : (
          "Send Reset Link"
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
  isBlocked,
  onSubmit,
}: {
  newPassword: string;
  confirmPassword: string;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  isSubmitting: boolean;
  isBlocked: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label
          htmlFor="new-password"
          className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#525257]"
        >
          New Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d7a74]" />
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="pl-11"
            required
            autoFocus
            disabled={isBlocked}
          />
        </div>
      </div>
      <div>
        <Label
          htmlFor="confirm-password"
          className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-[#525257]"
        >
          Confirm Password
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d7a74]" />
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="pl-11"
            required
            disabled={isBlocked}
          />
        </div>
      </div>
      <Button type="submit" variant="hero" className="h-11 w-full" disabled={isSubmitting || isBlocked}>
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
    <div className="space-y-6">
      <div className="border border-[#0e0e0f] p-4">
        <p className="board-rail-label text-[11px] text-[#525257]">Magic Link Sent</p>
        <p className="mt-3 text-[16px] leading-7 text-[#0e0e0f]">
          Sign-in link sent to <span className="font-semibold">{email}</span>.
        </p>
      </div>
      <Button variant="outline" className="h-11 w-full" onClick={onReset}>
        Use a different email
      </Button>
    </div>
  );
}
