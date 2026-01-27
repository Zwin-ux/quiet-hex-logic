import { memo, useState } from 'react';
import { Wallet, Link2, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectWalletButton } from './ConnectWalletButton';
import { BaseNameDisplay } from './BaseNameDisplay';
import { useBase } from '@/hooks/useBase';
import { useBaseName } from '@/hooks/useBaseName';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

function BaseWalletSectionComponent() {
  const { user } = useAuth();
  const { 
    isBaseAvailable, 
    isConnected, 
    address, 
    isOnBase,
    walletLinked,
    linkWalletToProfile,
    isLinking,
    linkError,
    platform,
  } = useBase();
  const { baseName, saveBaseName } = useBaseName();
  const [isSavingName, setIsSavingName] = useState(false);

  // Hide entirely on non-web platforms
  if (!isBaseAvailable) {
    return null;
  }

  // Not logged in
  if (!user) {
    return (
      <Card className="p-6 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Wallet className="h-5 w-5" />
          <span className="font-mono">Log in to connect your wallet</span>
        </div>
      </Card>
    );
  }

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <Card className="p-6 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-[#0052FF]/20">
            <Wallet className="h-6 w-6 text-[#0052FF]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">Connect Base Wallet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Coinbase Smart Wallet to link your onchain identity, 
              display your basename, and access token-gated features.
            </p>
            <ConnectWalletButton />
          </div>
        </div>
      </Card>
    );
  }

  // Connected but not on Base
  if (!isOnBase) {
    return (
      <Card className="p-6 border-amber-800/50 bg-amber-950/20 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-amber-900/30">
            <AlertCircle className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-300 mb-2">Wrong Network</h3>
            <p className="text-sm text-amber-400/80 mb-4">
              Please switch to the Base network to continue.
            </p>
            <ConnectWalletButton showNetworkWarning />
          </div>
        </div>
      </Card>
    );
  }

  // Connected and on Base - show wallet info
  const handleLinkWallet = async () => {
    const success = await linkWalletToProfile();
    if (success) {
      toast.success('Wallet linked successfully!');
      
      // If we have a basename, save it to profile
      if (baseName) {
        setIsSavingName(true);
        await saveBaseName(baseName);
        setIsSavingName(false);
      }
    } else if (linkError) {
      toast.error(linkError);
    }
  };

  return (
    <Card className="p-6 border-[#0052FF]/30 bg-[#0052FF]/5 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-[#0052FF]/20">
          <CheckCircle2 className="h-6 w-6 text-[#0052FF]" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2">Base Wallet Connected</h3>
          
          <div className="space-y-3 mb-4">
            {/* Address */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Address:</span>
              <code className="font-mono text-xs bg-zinc-800 px-2 py-1 rounded">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </code>
            </div>
            
            {/* Basename */}
            {baseName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Basename:</span>
                <span className="text-[#0052FF] font-medium">{baseName}</span>
              </div>
            )}
            
            {/* Link status */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              {walletLinked ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Linked to profile
                </span>
              ) : (
                <span className="text-amber-400">Not linked</span>
              )}
            </div>
          </div>

          {/* Link button if not linked */}
          {!walletLinked && (
            <Button
              onClick={handleLinkWallet}
              disabled={isLinking || isSavingName}
              className="bg-[#0052FF] hover:bg-[#0052FF]/90 text-white"
            >
              {isLinking || isSavingName ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Link to Profile
                </>
              )}
            </Button>
          )}

          {linkError && (
            <p className="text-sm text-red-400 mt-2">{linkError}</p>
          )}
        </div>
        
        <div className="shrink-0">
          <ConnectWalletButton variant="compact" showNetworkWarning={false} />
        </div>
      </div>
    </Card>
  );
}

export const BaseWalletSection = memo(BaseWalletSectionComponent);
