import { useState } from 'react';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { Globe, CheckCircle2, AlertCircle, Loader2, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWorldID, WORLD_ID_APP_ID, WORLD_ID_ACTION } from '@/hooks/useWorldID';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function WorldIDWidget() {
  const { user } = useAuth();
  const {
    isVerified,
    isVerifying,
    isLoading,
    verifiedAt,
    error,
    platform,
    canVerify,
    verifyProof,
    clearError,
  } = useWorldID();
  const [widgetOpen, setWidgetOpen] = useState(false);

  const handleSuccess = async (result: ISuccessResult) => {
    console.log('[WorldIDWidget] Verification success, submitting proof...');
    
    const success = await verifyProof({
      merkle_root: result.merkle_root,
      nullifier_hash: result.nullifier_hash,
      proof: result.proof,
      verification_level: result.verification_level,
    });

    if (success) {
      toast.success('🎉 You are now verified as a unique human!');
    } else {
      toast.error('Verification failed. Please try again.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-mono">Checking verification status...</span>
        </div>
      </Card>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Card className="p-6 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Globe className="h-5 w-5" />
          <span className="font-mono">Log in to verify your identity</span>
        </div>
      </Card>
    );
  }

  // Already verified - success state
  if (isVerified) {
    return (
      <Card className="p-6 border-emerald-800/50 bg-emerald-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-emerald-900/30">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-300 mb-1">Verified Human</h3>
            <p className="text-sm text-emerald-400/70 font-mono">
              Your identity has been verified with World ID
            </p>
            {verifiedAt && (
              <p className="text-xs text-emerald-500/50 mt-1 font-mono">
                Verified on {new Date(verifiedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/40 text-emerald-300 text-sm font-medium border border-emerald-700/30">
              <Globe className="h-4 w-4" />
              World ID
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // Discord environment - show info card
  if (platform === 'discord') {
    return (
      <Card className="p-6 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-indigo-900/30">
            <Globe className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">Verify Your Identity</h3>
            <p className="text-sm text-muted-foreground mb-4">
              World ID verification is not available in Discord. Visit Hexology on the web or mobile app to complete verification.
            </p>
            <a
              href="https://hexology.me/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open hexology.me
            </a>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 bg-red-950/30 border-red-900/50 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-300 mb-1">Verification Failed</h3>
            <p className="text-sm text-red-400/80 mb-4">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearError}
              className="text-red-300 border-red-800 hover:bg-red-900/30"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Web platform - show verification widget
  return (
    <Card className="p-6 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-zinc-800">
          <Globe className="h-6 w-6 text-zinc-300" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2">Identity Verification</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Verify you're a unique human with World ID. This helps maintain fair play and prevents multi-accounting.
          </p>
          
          <IDKitWidget
            app_id={WORLD_ID_APP_ID}
            action={WORLD_ID_ACTION}
            verification_level={VerificationLevel.Device}
            onSuccess={handleSuccess}
            signal={user.id}
          >
            {({ open }) => (
              <Button
                onClick={() => {
                  setWidgetOpen(true);
                  open();
                }}
                disabled={isVerifying || !canVerify}
                className="bg-white hover:bg-zinc-100 text-black font-semibold px-6 py-2.5 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Verify with World ID
                  </>
                )}
              </Button>
            )}
          </IDKitWidget>
        </div>
      </div>
    </Card>
  );
}

export default WorldIDWidget;
