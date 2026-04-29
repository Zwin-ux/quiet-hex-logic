import { useCallback, useMemo, useState } from "react";
import {
  CredentialRequest,
  IDKitRequestWidget,
  any as anyCredential,
  type IDKitResult,
} from "@worldcoin/idkit";
import { AlertCircle, CheckCircle2, ExternalLink, Globe, Loader2, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useWorldID } from "@/hooks/useWorldID";
import { useDiscord } from "@/lib/discord/DiscordContext";
import { buildAppUrl } from "@/lib/authRedirect";
import {
  getWorldIdAction,
  getWorldIdAppId,
  getWorldIdConfigurationIssue,
} from "@/lib/worldIdConfig";
import { toast } from "sonner";

export default function WorldIDWidget({ variant = "default" }: { variant?: "default" | "support" }) {
  const { user } = useAuth();
  const {
    isVerified,
    isVerifying,
    isLoading,
    verifiedAt,
    error,
    canVerify,
    requestRpContext,
    verifyIdKitResult,
    clearError,
  } = useWorldID();
  const { isDiscordEnvironment } = useDiscord();
  const worldIdAppId = getWorldIdAppId();
  const worldIdAction = getWorldIdAction();
  const configurationIssue = getWorldIdConfigurationIssue();
  const isSupport = variant === "support";
  const shellClassName = isSupport
    ? "space-y-4 rounded-[1.6rem] bg-[#090909] px-4 py-4 text-[#f6f4f0]"
    : "space-y-4 rounded-[1.6rem] bg-white px-4 py-4 text-[#090909]";
  const labelClassName = isSupport ? "board-rail-label text-white/58" : "board-rail-label text-black/55";
  const bodyClassName = isSupport ? "text-sm leading-6 text-white/70" : "text-sm leading-6 text-black/62";
  const quietClassName = isSupport ? "text-xs leading-6 text-white/58" : "text-xs leading-6 text-black/55";
  const iconClassName = isSupport ? "h-5 w-5 text-white/72" : "h-5 w-5 text-black/62";
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<any>(null);
  const [preparing, setPreparing] = useState(false);

  const constraints = useMemo(() => {
    return anyCredential(CredentialRequest("proof_of_human", { signal: user?.id || "" }));
  }, [user?.id]);

  const prepareAndOpen = useCallback(async () => {
    setPreparing(true);

    try {
      const nextRpContext = await requestRpContext();
      setRpContext({
        sig: nextRpContext.sig,
        nonce: nextRpContext.nonce,
        createdAt: nextRpContext.createdAt,
        expiresAt: nextRpContext.expiresAt,
      });
      setWidgetOpen(true);
    } catch (prepareError) {
      toast.error(
        prepareError instanceof Error
          ? prepareError.message
          : "Could not start World ID verification.",
      );
    } finally {
      setPreparing(false);
    }
  }, [requestRpContext]);

  const handleSuccess = useCallback(async (result: IDKitResult) => {
    const { success, error } = await verifyIdKitResult(result);

    if (success) {
      toast.success("Verification complete", {
        description: "Ranked and competitive unlocked.",
      });
      return;
    }

    toast.error(error || "Verification failed. Please try again.");
  }, [verifyIdKitResult]);

  if (isLoading) {
    return (
      <div className={`${shellClassName} flex min-h-[132px] items-center justify-center`}>
        <Loader2 className={isSupport ? "h-5 w-5 animate-spin text-white/58" : "h-5 w-5 animate-spin text-black/55"} />
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className={shellClassName}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={labelClassName}>Trust state</p>
            <div className="mt-3 flex items-center gap-3">
              <CheckCircle2 className={iconClassName} />
              <div>
                <p className={isSupport ? "font-semibold text-white" : "font-semibold text-black"}>Human verification complete</p>
                <p className={bodyClassName}>Ranked and competitive unlocked.</p>
              </div>
            </div>
          </div>
          <span className={isSupport ? "rounded-full bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#090909]" : "rounded-full bg-[#090909] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f6f4f0]"}>
            verified
          </span>
        </div>

        <p className={quietClassName}>
          Verified {verifiedAt ? new Date(verifiedAt).toLocaleDateString() : "recently"}.
        </p>
      </div>
    );
  }

  if (isDiscordEnvironment) {
    return (
      <div className={shellClassName}>
        <div className="flex items-center gap-3">
          <Scan className={iconClassName} />
          <div>
            <p className={isSupport ? "font-semibold text-white" : "font-semibold text-black"}>Verify on the web</p>
            <p className={bodyClassName}>Open web. Scan in World App.</p>
          </div>
        </div>
        <a
          href={buildAppUrl("/profile#identity")}
          target="_blank"
          rel="noopener noreferrer"
          className={isSupport ? "inline-flex items-center gap-2 text-sm font-medium text-white underline underline-offset-2" : "inline-flex items-center gap-2 text-sm font-medium text-black underline underline-offset-2"}
        >
          <ExternalLink className="h-4 w-4" />
          Open verification on the web
        </a>
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={labelClassName}>Trust & verification</p>
          <div className="mt-3 flex items-center gap-3">
            <Globe className={iconClassName} />
            <div>
              <p className={isSupport ? "font-semibold text-white" : "font-semibold text-black"}>Competitive entry</p>
              <p className={bodyClassName}>World ID required for ranked and competitive.</p>
            </div>
          </div>
        </div>
        <span className={isSupport ? "rounded-full bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#090909]" : "rounded-full bg-[#090909] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f6f4f0]"}>
          ranked gate
        </span>
      </div>

      {configurationIssue ? (
        <div className={isSupport ? "flex items-start gap-2 rounded-[1.2rem] bg-white/10 px-3 py-3 text-sm text-white/70" : "flex items-start gap-2 rounded-[1.2rem] bg-[#f3efe6] px-3 py-3 text-sm text-black/62"}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{configurationIssue}</p>
            <p className="mt-1 text-xs">
              Set <code>WORLD_ID_APP_ID</code> and <code>VITE_WORLD_ID_APP_ID</code> on Railway, then redeploy.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className={isSupport ? "flex items-start gap-2 rounded-[1.2rem] bg-white/12 px-3 py-3 text-sm text-white" : "flex items-start gap-2 rounded-[1.2rem] bg-[#f3efe6] px-3 py-3 text-sm text-black"}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{error}</p>
            <button onClick={clearError} className="mt-1 text-xs underline underline-offset-2">
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {canVerify ? (
        <>
          {rpContext ? (
            <IDKitRequestWidget
              open={widgetOpen}
              onOpenChange={setWidgetOpen}
              app_id={worldIdAppId as `app_${string}`}
              action={worldIdAction}
              rp_context={rpContext}
              constraints={constraints}
              allow_legacy_proofs={false}
              onSuccess={handleSuccess}
            />
          ) : null}
          <Button
            onClick={prepareAndOpen}
            disabled={isVerifying || preparing}
            variant={isSupport ? "outline" : "hero"}
            className={isSupport ? "w-full justify-between border-white/20 bg-white text-[#090909] hover:bg-[#f2f0ea]" : "w-full justify-between"}
          >
            <span>{isVerifying || preparing ? "Verifying" : "Verify with World ID"}</span>
            {isVerifying || preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
          </Button>
        </>
      ) : (
        <Button
          disabled
          variant="outline"
          className={isSupport ? "w-full justify-between border-white/20 bg-transparent text-white" : "w-full justify-between"}
        >
          <span>World ID unavailable</span>
          <AlertCircle className="h-4 w-4" />
        </Button>
      )}

      <p className={quietClassName}>Scan in World App.</p>
    </div>
  );
}
