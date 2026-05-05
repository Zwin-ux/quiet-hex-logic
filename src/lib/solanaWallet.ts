import type { WalletProvider } from '@/lib/competitiveIdentity';

type SolanaConnectResult = {
  publicKey?: {
    toBase58: () => string;
  };
};

type SolanaSignedMessage =
  | Uint8Array
  | {
      signature: Uint8Array;
    };

export interface InjectedSolanaProvider {
  isPhantom?: boolean;
  isBackpack?: boolean;
  publicKey?: {
    toBase58: () => string;
  };
  connect: () => Promise<SolanaConnectResult>;
  signMessage?: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<SolanaSignedMessage>;
}

export type SolanaSignaturePayload = {
  provider: WalletProvider;
  address: string;
  signatureBase64: string;
  message: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

export function getInjectedSolanaProvider(): InjectedSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as Window & {
    phantom?: { solana?: InjectedSolanaProvider };
    backpack?: { solana?: InjectedSolanaProvider };
    solana?: InjectedSolanaProvider;
  };

  return anyWindow.phantom?.solana ?? anyWindow.backpack?.solana ?? anyWindow.solana ?? null;
}

export function getSolanaProviderLabel(provider: InjectedSolanaProvider | null) {
  if (!provider) return 'Solana wallet';
  if (provider.isPhantom) return 'Phantom';
  if (provider.isBackpack) return 'Backpack';
  return 'Solana wallet';
}

export async function connectAndSignSolanaMessage(message: string): Promise<SolanaSignaturePayload> {
  const provider = getInjectedSolanaProvider();
  if (!provider) {
    throw new Error('Install Phantom or Backpack to link a Solana wallet.');
  }

  if (!provider.signMessage) {
    throw new Error('This wallet cannot sign messages.');
  }

  const connectResult = await provider.connect();
  const address = connectResult.publicKey?.toBase58() ?? provider.publicKey?.toBase58();
  if (!address) {
    throw new Error('Connected wallet did not return an address.');
  }

  const messageBytes = new TextEncoder().encode(message);
  const signatureResult = await provider.signMessage(messageBytes, 'utf8');
  const signatureBytes =
    signatureResult instanceof Uint8Array ? signatureResult : signatureResult.signature;

  return {
    provider: 'solana',
    address,
    message,
    signatureBase64: bytesToBase64(signatureBytes),
  };
}
