import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Chrome, Disc3, KeyRound, Loader2, Lock, Mail, User } from "lucide-react";
import { StateTag } from "@/components/board/StateTag";
import { SupportFrame } from "@/components/support/SupportFrame";
import { SupportPanel } from "@/components/support/SupportPanel";
import { SupportSoon } from "@/components/support/SupportSoon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getAuthStorageIssue } from "@/integrations/supabase/client";
import {
  buildAuthRoute,
  parseAuthUrlState,
  resolveAuthCompletionPath,
  resolvePostAuthPath,
} from "@/lib/authRedirect";
import { getPublicEnv } from "@/lib/runtimeEnv";

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
  const authCompletionPath = resolveAuthCompletionPath({
    returnTo: authUrlState.returnTo,
    hasExplicitNext: authUrlState.hasExplicitNext,
  });
  const authReturnTo = authUrlState.hasExplicitNext ? returnTo : null;
  const shouldShowReturnTarget = authUrlState.hasExplicitNext;
  const authStorageIssue = getAuthStorageIssue();
  const defaultAuthTab: AuthTab = shouldShowReturnTarget ? "signin" : "signup";
  const handledCallbackState = useRef<string | null>(null);
  const discordReady = Boolean(getPublicEnv("VITE_DISCORD_CLIENT_ID"));

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
      navigate(authCompletionPath, { replace: true });
    }
  }, [authCompletionPath, authView, navigate, user]);

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
      const { error } = await resetPassword(email, authReturnTo);

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
        navigate(buildAuthRoute(authReturnTo), { replace: true });
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
      const { error } = await signInWithMagicLink(email, authReturnTo);

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
        const { data, error } = await signUp(email, password, username, "indigo", authReturnTo);

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
            navigate(authCompletionPath);
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
          navigate(authCompletionPath);
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
          ? await signInWithGoogle(authReturnTo)
          : await signInWithDiscord(authReturnTo);

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
      <div className="mt-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
        <AuthProviderButton
          label="Continue with Google"
          detail="Fastest"
          icon={Chrome}
          disabled={isSubmitting || Boolean(authStorageIssue)}
          onClick={() => handleProviderSignIn("google")}
          variant="support"
        />
        <AuthProviderButton
          label="Discord"
          detail={discordReady ? "Backup" : "SOOON"}
          icon={Disc3}
          disabled={isSubmitting || Boolean(authStorageIssue) || !discordReady}
          onClick={() => handleProviderSignIn("discord")}
          variant="supportOutline"
        />
      </div>

      {!discordReady ? <SupportSoon className="mt-4" detail="Discord later." /> : null}

      <div className="mt-6 border-t border-white/14 pt-6">
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant={authMode === "password" && authTab === "signup" ? "support" : "supportGhost"}
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
            variant={authMode === "password" && authTab === "signin" ? "support" : "supportGhost"}
            onClick={() => {
              setAuthMode("password");
              setAuthTab("signin");
            }}
            disabled={Boolean(authStorageIssue)}
          >
            Sign In
          </Button>
          <Button
            type="button"
            variant={authMode === "magic-link" ? "support" : "supportGhost"}
            onClick={() => setAuthMode("magic-link")}
            disabled={Boolean(authStorageIssue)}
          >
            Magic Link
          </Button>
        </div>
      </div>

      <form
        onSubmit={authMode === "magic-link" ? handleMagicLinkSubmit : handlePasswordSubmit}
        className="mt-8 grid gap-6"
      >
        <div>
          <Label
            htmlFor="entry-email"
            className="support-mini-label mb-2 block text-white/60"
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
              variant="support"
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
            className="support-mini-label mb-2 block text-white/60"
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
                variant="support"
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
                className="support-mini-label text-white/60"
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
                placeholder="Enter password"
                variant="support"
                className="pl-11"
                required
                disabled={Boolean(authStorageIssue)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="support" disabled={isSubmitting || Boolean(authStorageIssue)}>
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
        </div>
      </form>

      <p className="mt-4 max-w-[430px] text-[13px] leading-6 text-white/68">
        One account. Add backups in <span className="font-semibold text-white">Profile</span>.
      </p>

      <div className="support-inline-card mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[24rem] text-[14px] leading-7 text-white/72">Local is open.</p>
        <Button type="button" variant="supportOutline" onClick={() => navigate("/play")}>
          Local practice
        </Button>
      </div>

      {shouldShowReturnTarget ? (
        <div className="support-note mt-6">
          <p className="support-mini-label text-white/58">Return</p>
          <p className="mt-2 text-[15px] leading-7 text-white">{returnTo}</p>
        </div>
      ) : null}

      {authStorageIssue ? (
        <div className="mt-6 rounded-[24px] border-4 border-[#ffe600] bg-[#ff6b35]/18 p-4 text-white">
          <p className="support-mini-label text-[#ffe600]">Compatibility issue</p>
          <p className="mt-2 text-[15px] leading-7">{authStorageIssue}</p>
        </div>
      ) : null}
    </>
  );

  return (
    <SupportFrame contentClassName="pt-28 md:pt-32">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex items-center justify-between gap-4 pb-8">
          <div className="support-chip">Sign in</div>
          {shouldShowReturnTarget ? (
            <div className="hidden rounded-full border-4 border-[#ff6b35] bg-white/10 px-4 py-2 md:block">
              <p className="support-mini-label text-white">
                Next / {returnTo.replace(/^\//, "")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 xl:grid-cols-[520px_minmax(0,1fr)]">
          <SupportPanel
            tone="light"
            eyebrow="Access desk"
            title={getAuthTitle(authView, emailSent, authTab)}
            description={getAuthDescription(authView, emailSent, authTab, email)}
            className="min-h-full"
            motionIndex={0}
            motionVariant="hero"
          >
            {authNotice ? (
              <div
                className={`mt-1 rounded-[24px] border-4 p-4 ${
                  authNotice.tone === "critical"
                    ? "border-[#ffe600] bg-[#ff6b35]/18 text-white"
                    : authNotice.tone === "warning"
                      ? "border-[#ff6b35] bg-[#ffe600]/20 text-white"
                      : "border-[#00f5d4] bg-white/8 text-white"
                }`}
              >
                <p className="support-mini-label text-inherit">{authNotice.title}</p>
                <p className="mt-2 text-[15px] leading-7">{authNotice.description}</p>
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
          </SupportPanel>

          <div className="space-y-8">
            <SupportPanel
              tone="dark"
              title="Google first."
              description="Email also works."
              motionIndex={1}
              motionVariant="aside"
            />

            <SupportPanel
              tone="paper"
              title="One account."
              description="Local works without sign-in."
              motionIndex={2}
              footer={
                <Button type="button" variant="supportOutline" className="w-full justify-between" onClick={() => navigate("/play")}>
                  <span>Play local</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </SupportFrame>
  );
}

function AuthProviderButton({
  label,
  detail,
  icon: Icon,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  detail: string;
  icon: typeof Chrome;
  disabled: boolean;
  onClick: () => void;
  variant: "support" | "supportOutline";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className="h-auto min-h-[76px] justify-between whitespace-normal px-4 py-4 text-left"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        <span className="min-w-0">
          <span className="block font-semibold">{label}</span>
          <span className="block text-[12px] font-medium uppercase tracking-[0.12em] opacity-80">
            {detail}
          </span>
        </span>
      </span>
    </Button>
  );
}

function getAuthTitle(authView: AuthView, emailSent: boolean, authTab: AuthTab) {
  if (authView === "forgot-password") return emailSent ? "Check inbox" : "Reset password";
  if (authView === "reset-password") return "Set a new password";
  if (emailSent) return "Magic link sent";
  return authTab === "signup" ? "Create account" : "Sign in";
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
      : "Enter email. Get reset link.";
  }
  if (authView === "reset-password") {
    return "Set a new password.";
  }
  if (emailSent) {
    return `Open the link sent to ${email}.`;
  }
  return authTab === "signup"
    ? "Google or email."
    : "Enter rooms. Join events.";
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
      <div className="support-note">
        <p className="support-mini-label text-white/58">Reset link sent</p>
        <p className="mt-3 text-[16px] leading-7 text-white">
          Open the link. Come back.
        </p>
      </div>
      <Button variant="supportOutline" onClick={onBack} className="h-11 w-full">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Button>
    </div>
  ) : (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label
          htmlFor="reset-email"
          className="support-mini-label mb-2 block text-white/60"
        >
          Email
        </Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          variant="support"
          required
          autoFocus
          disabled={isBlocked}
        />
      </div>
      <Button type="submit" variant="support" className="h-11 w-full" disabled={isSubmitting || isBlocked}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending
          </>
        ) : (
          "Send Reset Link"
        )}
      </Button>
      <Button type="button" variant="supportOutline" className="h-11 w-full" onClick={onBack}>
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
          className="support-mini-label mb-2 block text-white/60"
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
            variant="support"
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
          className="support-mini-label mb-2 block text-white/60"
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
            variant="support"
            className="pl-11"
            required
            disabled={isBlocked}
          />
        </div>
      </div>
      <Button type="submit" variant="support" className="h-11 w-full" disabled={isSubmitting || isBlocked}>
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
      <div className="support-note">
        <p className="support-mini-label text-white/58">Magic link sent</p>
        <p className="mt-3 text-[16px] leading-7 text-white">
          Link sent to <span className="font-semibold">{email}</span>.
        </p>
      </div>
      <Button variant="supportOutline" className="h-11 w-full" onClick={onReset}>
        Use another email
      </Button>
    </div>
  );
}
