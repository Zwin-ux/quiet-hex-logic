import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

// Base network configuration
export const BASE_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

// Use mainnet Base for production
export const TARGET_CHAIN = base;

// OnchainKit API Key (public - safe to expose)
export const ONCHAINKIT_API_KEY = import.meta.env.VITE_ONCHAINKIT_API_KEY || '';

// Wagmi config for Base
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Hexology',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

// EAS Contract addresses on Base
export const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021';
export const EAS_SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020';

// Schema for World ID verification attestation
export const WORLD_ID_ATTESTATION_SCHEMA = 'bool isVerifiedHuman, string platform, uint256 verifiedAt';
