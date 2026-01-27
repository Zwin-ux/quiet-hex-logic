import { memo } from 'react';
import { 
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import { 
  Address,
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity';
import { useBase } from '@/hooks/useBase';
import { Button } from '@/components/ui/button';
import { Wallet as WalletIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectWalletButtonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'icon';
  showNetworkWarning?: boolean;
}

function ConnectWalletButtonComponent({ 
  className,
  variant = 'default',
  showNetworkWarning = true,
}: ConnectWalletButtonProps) {
  const { isBaseAvailable, isConnected, isOnBase, switchToBase, platform } = useBase();

  // Don't render anything if Base isn't available (Discord, mobile app)
  if (!isBaseAvailable) {
    return null;
  }

  // Show network switch warning if connected but not on Base
  if (isConnected && !isOnBase && showNetworkWarning) {
    return (
      <Button
        onClick={switchToBase}
        variant="outline"
        size="sm"
        className={cn(
          'border-amber-600/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40',
          className
        )}
      >
        <AlertCircle className="h-4 w-4 mr-2" />
        Switch to Base
      </Button>
    );
  }

  // Render OnchainKit wallet component
  return (
    <div className={cn('base-wallet-container', className)}>
      <Wallet>
        <ConnectWallet 
          className={cn(
            'bg-[#0052FF] hover:bg-[#0052FF]/90 text-white font-semibold',
            'rounded-lg px-4 py-2 transition-all',
            variant === 'compact' && 'px-3 py-1.5 text-sm',
            variant === 'icon' && 'p-2'
          )}
        >
          {variant === 'icon' ? (
            <WalletIcon className="h-4 w-4" />
          ) : (
            <span className="flex items-center gap-2">
              <WalletIcon className="h-4 w-4" />
              {variant === 'compact' ? 'Connect' : 'Connect Wallet'}
            </span>
          )}
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address />
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}

export const ConnectWalletButton = memo(ConnectWalletButtonComponent);
