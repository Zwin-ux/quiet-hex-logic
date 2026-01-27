import { useState, useEffect, useCallback } from 'react';
import { useBase } from './useBase';

interface TokenGateConfig {
  type: 'erc721' | 'erc20';
  contractAddress: `0x${string}`;
  minBalance?: bigint; // For ERC20
}

interface UseTokenGatingReturn {
  isGateChecking: boolean;
  gateError: string | null;
  hasAccess: boolean;
  checkTokenGate: (config: TokenGateConfig) => Promise<boolean>;
  checkMultipleGates: (configs: TokenGateConfig[]) => Promise<boolean[]>;
}

// ERC721 balanceOf ABI fragment
const erc721BalanceOf = {
  inputs: [{ name: 'owner', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
} as const;

// ERC20 balanceOf ABI fragment
const erc20BalanceOf = {
  inputs: [{ name: 'account', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
} as const;

export function useTokenGating(): UseTokenGatingReturn {
  const { address, isConnected, isOnBase, isBaseAvailable } = useBase();
  
  const [isGateChecking, setIsGateChecking] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const checkTokenGate = useCallback(async (config: TokenGateConfig): Promise<boolean> => {
    if (!isBaseAvailable || !isConnected || !address) {
      return false;
    }

    if (!isOnBase) {
      setGateError('Please switch to Base network');
      return false;
    }

    setIsGateChecking(true);
    setGateError(null);

    try {
      // Use fetch to call Base RPC directly
      const rpcUrl = 'https://mainnet.base.org';
      
      // Encode the balanceOf call
      const functionSelector = config.type === 'erc721' ? '0x70a08231' : '0x70a08231'; // Both use same selector
      const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0');
      const callData = functionSelector + paddedAddress;

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: config.contractAddress, data: callData }, 'latest'],
          id: 1,
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        console.error('[useTokenGating] RPC error:', result.error);
        setGateError('Failed to check token ownership');
        return false;
      }

      const balance = BigInt(result.result || '0x0');
      
      if (config.type === 'erc721') {
        const hasToken = balance > 0n;
        setHasAccess(hasToken);
        return hasToken;
      } else {
        const minRequired = config.minBalance ?? 1n;
        const hasEnough = balance >= minRequired;
        setHasAccess(hasEnough);
        return hasEnough;
      }
    } catch (err) {
      console.error('[useTokenGating] Check failed:', err);
      setGateError('Failed to check token ownership');
      return false;
    } finally {
      setIsGateChecking(false);
    }
  }, [isBaseAvailable, isConnected, address, isOnBase]);

  const checkMultipleGates = useCallback(async (configs: TokenGateConfig[]): Promise<boolean[]> => {
    if (!isBaseAvailable || !isConnected || !address || !isOnBase) {
      return configs.map(() => false);
    }

    setIsGateChecking(true);
    setGateError(null);

    try {
      const results = await Promise.all(
        configs.map(async (config) => {
          try {
            const rpcUrl = 'https://mainnet.base.org';
            const functionSelector = '0x70a08231';
            const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0');
            const callData = functionSelector + paddedAddress;

            const response = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{ to: config.contractAddress, data: callData }, 'latest'],
                id: 1,
              }),
            });

            const result = await response.json();
            if (result.error) return false;

            const balance = BigInt(result.result || '0x0');
            
            if (config.type === 'erc721') {
              return balance > 0n;
            } else {
              return balance >= (config.minBalance ?? 1n);
            }
          } catch {
            return false;
          }
        })
      );

      setHasAccess(results.some(r => r));
      return results;
    } catch (err) {
      console.error('[useTokenGating] Multi-check failed:', err);
      setGateError('Failed to check token ownership');
      return configs.map(() => false);
    } finally {
      setIsGateChecking(false);
    }
  }, [isBaseAvailable, isConnected, address, isOnBase]);

  // Reset access when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setHasAccess(false);
    }
  }, [isConnected]);

  return {
    isGateChecking,
    gateError,
    hasAccess,
    checkTokenGate,
    checkMultipleGates,
  };
}
