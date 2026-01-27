import { memo, useEffect, useState } from 'react';
import { getName } from '@coinbase/onchainkit/identity';
import { base } from 'wagmi/chains';
import { useBaseContext } from '@/lib/base/BaseProvider';
import { cn } from '@/lib/utils';

interface BaseNameDisplayProps {
  address?: string;
  fallback?: string;
  className?: string;
  showAddress?: boolean;
}

function BaseNameDisplayComponent({ 
  address, 
  fallback,
  className,
  showAddress = false,
}: BaseNameDisplayProps) {
  const { isBaseAvailable } = useBaseContext();
  const [baseName, setBaseName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function resolveBaseName() {
      if (!isBaseAvailable || !address) {
        setBaseName(null);
        return;
      }

      setIsLoading(true);
      try {
        const name = await getName({ 
          address: address as `0x${string}`, 
          chain: base 
        });
        setBaseName(name || null);
      } catch (err) {
        console.error('[BaseNameDisplay] Resolution failed:', err);
        setBaseName(null);
      } finally {
        setIsLoading(false);
      }
    }

    resolveBaseName();
  }, [isBaseAvailable, address]);

  // Don't render if Base isn't available
  if (!isBaseAvailable || !address) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }

  if (isLoading) {
    return (
      <span className={cn('animate-pulse bg-muted rounded', className)}>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </span>
    );
  }

  if (baseName) {
    return (
      <span 
        className={cn('text-blue-400 font-medium', className)}
        title={showAddress ? address : undefined}
      >
        {baseName}
      </span>
    );
  }

  // Show truncated address if no basename
  if (showAddress) {
    const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return <span className={cn('font-mono text-muted-foreground', className)}>{truncated}</span>;
  }

  return fallback ? <span className={className}>{fallback}</span> : null;
}

export const BaseNameDisplay = memo(BaseNameDisplayComponent);
