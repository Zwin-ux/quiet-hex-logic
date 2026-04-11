import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, EAS_CONTRACT_ADDRESS, EAS_SCHEMA_REGISTRY, WORLD_ID_ATTESTATION_SCHEMA } from './constants';
import { getPublicEnv } from '@/lib/runtimeEnv';

// Use mainnet Base for production
export const TARGET_CHAIN = base;

// OnchainKit API Key (public - safe to expose)
export const ONCHAINKIT_API_KEY = getPublicEnv('VITE_ONCHAINKIT_API_KEY');

// Wagmi config for Base
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'BOARD',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

// EAS Contract addresses on Base
export { EAS_CONTRACT_ADDRESS, EAS_SCHEMA_REGISTRY, WORLD_ID_ATTESTATION_SCHEMA, BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID };
