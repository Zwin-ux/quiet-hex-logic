import { useCallback } from "react";
import { IDKitWidget, ISuccessResult, VerificationLevel } from "@worldcoin/idkit";
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

export default function WorldIDWidget() {
  const { user } = useAuth();
  const {
    isVerified,
    isVerifying,
    isLoading,
    verifiedAt,
    error,
    canVerify,
    verifyProof,
    clearError,
  } = useWorldID();
  const { isDiscordEnvironment } = useDiscord();
  const worldIdAppId = getWorldIdAppId();
  const worldIdAction = getWorldIdAction();
  const configurationIssue = getWorldIdConfigurationIssue();

  const handleSuccess = useCallback(async (result: ISuccessResult) => {
    const { success, error } = await verifyProof({
      merkle_root: result.merkle_root,
      nullifier_hash: result.nullifier_hash,
      proof: result.proof,
      verification_level: result.verification_level as "orb" | "device",
    });

    if (success) {
      toast.success("Verification complete", {
        description: "This BOARD account is now eligible for competitive queues and competitive events.",
      });
      return;
    }

    toast.error(error || "Verification failed. Please try again.");
  }, [verifyProof]);

  if (isLoading) {
    return (
      <div className="flex min-h-[132px] items-center justify-center border border-black bg-white px-4 py-4">
        <Loader2 className="h-5 w-5 animate-spin text-black/55" />
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="space-y-4 border border-black bg-white px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="board-rail-label text-black/55">Trust state</p>
            <div className="mt-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <div>
                <p className="font-semibold text-black">Human verification complete</p>
                <p className="text-sm leading-6 text-black/62">
                  Competitive queues and competitive events are unlocked for this account.
                </p>
              </div>
            </div>
          </div>
          <div className="retro-status-strip">
            <span>world id</span>
            <span>verified</span>
          </div>
        </div>

        <p className="text-xs leading-6 text-black/55">
          Verified {verifiedAt ? new Date(verifiedAt).toLocaleDateString() : "recently"}.
        </p>
      </div>
    );
  }

  if (isDiscordEnvironment) {
    return (
      <div className="space-y-4 border border-black bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <Scan className="h-5 w-5 text-black/62" />
          <div>
            <p className="font-semibold text-black">Verify on the web</p>
            <p className="text-sm leading-6 text-black/62">
              World ID requires the World App and is not available directly inside Discord.
            </p>
          </div>
        </div>
        <a
          href={buildAppUrl("/profile#identity")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-black underline underline-offset-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open verification on the web
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-black bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="board-rail-label text-black/55">Trust & verification</p>
          <div className="mt-3 flex items-center gap-3">
            <Globe className="h-5 w-5 text-black/62" />
            <div>
              <p className="font-semibold text-black">World ID upgrades this account for competitive play</p>
              <p className="text-sm leading-6 text-black/62">
                Required for ranked queues and competitive events. Not required for casual hosting, casual worlds, or local practice.
              </p>
            </div>
          </div>
        </div>
        <div className="retro-status-strip">
          <span>competitive gate</span>
          <span>world id</span>
        </div>
      </div>

      {configurationIssue ? (
        <div className="flex items-start gap-2 border border-dashed border-black/20 bg-[#fbfaf8] px-3 py-3 text-sm text-black/62">
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
        <div className="flex items-start gap-2 border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-700">
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
        <IDKitWidget
          app_id={worldIdAppId as `app_${string}`}
          action={worldIdAction}
          signal={user?.id || ""}
          onSuccess={handleSuccess}
          verification_level={VerificationLevel.Device}
        >
          {({ open }) => (
            <Button
              onClick={open}
              disabled={isVerifying}
              variant="hero"
              className="w-full justify-between"
            >
              <span>{isVerifying ? "Verifying" : "Verify for competitive play"}</span>
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
            </Button>
          )}
        </IDKitWidget>
      ) : (
        <Button
          disabled
          variant="outline"
          className="w-full justify-between"
        >
          <span>World ID unavailable</span>
          <AlertCircle className="h-4 w-4" />
        </Button>
      )}

      <p className="text-xs leading-6 text-black/55">
        World ID proves uniqueness without turning this profile into a public identity document.
      </p>
    </div>
  );
}
