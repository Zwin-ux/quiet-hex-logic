// Base network configuration constants.
// Keep this file free of Web3 SDK imports so the main app bundle stays lightweight.

export const BASE_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

// EAS Contract addresses on Base
export const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021';
export const EAS_SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020';

// Schema for World ID verification attestation
export const WORLD_ID_ATTESTATION_SCHEMA = 'bool isVerifiedHuman, string platform, uint256 verifiedAt';

