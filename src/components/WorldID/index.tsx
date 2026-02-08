import { useState, useCallback } from 'react';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scan, CheckCircle2, Loader2, AlertCircle, Globe, ExternalLink } from 'lucide-react';
import { useWorldID, WORLD_ID_APP_ID, WORLD_ID_ACTION } from '@/hooks/useWorldID';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { toast } from 'sonner';

export default function WorldIDWidget() {
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

  const { isDiscordEnvironment } = useDiscord();
  const [widgetOpen, setWidgetOpen] = useState(false);

  const handleSuccess = useCallback(async (result: ISuccessResult) => {
    const { success, error } = await verifyProof({
      merkle_root: result.merkle_root,
      nullifier_hash: result.nullifier_hash,
      proof: result.proof,
      verification_level: result.verification_level as 'orb' | 'device',
    });

    if (success) {
      toast.success('Humanity verified! You now have the Verified Human badge.');
    } else {
      toast.error(error || 'Verification failed. Please try again.');
    }
  }, [verifyProof]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Already verified state
  if (isVerified) {
    return (
      <Card className="border-emerald-800/50 bg-emerald-950/20 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg text-emerald-400">Verified Human</CardTitle>
            <Badge variant="outline" className="ml-auto border-emerald-700 text-emerald-400 text-xs">
              <Globe className="h-3 w-3 mr-1" />
              World ID
            </Badge>
          </div>
          <CardDescription className="text-emerald-300/70">
            Your humanity has been verified via World ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground font-mono">
            Verified {verifiedAt ? new Date(verifiedAt).toLocaleDateString() : 'recently'}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Discord environment - show info card
  if (isDiscordEnvironment) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">World ID</CardTitle>
          </div>
          <CardDescription>
            Verify your humanity to earn the "Verified Human" badge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted/50 p-4 border border-border text-sm text-muted-foreground">
            <p className="mb-3">
              World ID verification requires the World App on your phone and is not available directly in Discord.
            </p>
            <a
              href="https://hexology.me/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Verify on the web
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Web verification UI
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-border transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">World ID</CardTitle>
        </div>
        <CardDescription>
          Verify your humanity to earn the "Verified Human" badge and access exclusive features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p>{error}</p>
              <button
                onClick={clearError}
                className="text-xs underline mt-1 hover:text-destructive/80"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <IDKitWidget
          app_id={WORLD_ID_APP_ID as `app_${string}`}
          action={WORLD_ID_ACTION}
          onSuccess={handleSuccess}
          verification_level={VerificationLevel.Device}
        >
          {({ open }) => (
            <Button
              onClick={open}
              disabled={isVerifying}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
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

        <p className="text-xs text-muted-foreground text-center">
          World ID verifies you're a unique human without revealing your identity.
        </p>
      </CardContent>
    </Card>
  );
}
