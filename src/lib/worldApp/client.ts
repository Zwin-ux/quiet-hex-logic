import { MiniKit } from '@worldcoin/minikit-js';
import type { User as WorldAppUser, WalletAuthResult } from '@worldcoin/minikit-js/commands';
import { getPublicEnv } from '@/lib/runtimeEnv';

let installAttempted = false;

export type WorldWalletAuthRequest = {
  nonce: string;
  requestId: string;
  statement: string;
  expirationTime: string;
};

export type WorldSharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export type WorldHapticPreset =
  | 'move'
  | 'invalid'
  | 'success'
  | 'win'
  | 'loss'
  | 'selection';

export function getWorldAppId() {
  return getPublicEnv('VITE_WORLD_APP_ID') || getPublicEnv('VITE_WORLD_ID_APP_ID');
}

export function installWorldApp() {
  if (typeof window === 'undefined') return false;

  try {
    if (!installAttempted) {
      installAttempted = true;
      MiniKit.install(getWorldAppId() || undefined);
    }

    return MiniKit.isInstalled();
  } catch {
    return false;
  }
}

export function isLikelyWorldApp() {
  if (typeof window === 'undefined') return false;

  if ((window as any).WorldApp) return true;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('surface') === 'world' || params.get('worldApp') === '1') {
      return true;
    }
  } catch {
    // Ignore malformed test URLs.
  }

  try {
    return MiniKit.isInstalled();
  } catch {
    return false;
  }
}

export function getWorldAppUser(): WorldAppUser | null {
  try {
    return MiniKit.user ?? null;
  } catch {
    return null;
  }
}

export function getWorldAppDeviceProperties() {
  try {
    return MiniKit.deviceProperties ?? null;
  } catch {
    return null;
  }
}

export async function runWorldWalletAuth(request: WorldWalletAuthRequest) {
  const installed = installWorldApp();
  if (!installed) {
    throw new Error('World App wallet auth is only available inside World App.');
  }

  const result = await MiniKit.walletAuth<null>({
    nonce: request.nonce,
    statement: request.statement,
    requestId: request.requestId,
    expirationTime: new Date(request.expirationTime),
    fallback: () => null,
  });

  const data = result.data as WalletAuthResult | null;
  if (!data?.address || !data.message || !data.signature) {
    throw new Error('World wallet auth was not completed.');
  }

  return data;
}

export async function shareWorldApp(payload: WorldSharePayload) {
  if (installWorldApp()) {
    try {
      return await MiniKit.share({
        ...payload,
        fallback: async () => {
          await shareOnWeb(payload);
          return payload as any;
        },
      } as any);
    } catch {
      // Fall back to the browser share path below.
    }
  }

  await shareOnWeb(payload);
  return null;
}

async function shareOnWeb(payload: WorldSharePayload) {
  if (typeof window === 'undefined') return;

  const shareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };

  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share(shareData);
    return;
  }

  const text = [payload.title, payload.text, payload.url].filter(Boolean).join('\n');
  if (navigator.clipboard && text) {
    await navigator.clipboard.writeText(text);
  }
}

export async function sendWorldHapticFeedback(preset: WorldHapticPreset) {
  if (!installWorldApp()) return null;

  try {
    if (preset === 'invalid') {
      return MiniKit.sendHapticFeedback({ hapticsType: 'notification', style: 'error' });
    }

    if (preset === 'success' || preset === 'win') {
      return MiniKit.sendHapticFeedback({ hapticsType: 'notification', style: 'success' });
    }

    if (preset === 'loss') {
      return MiniKit.sendHapticFeedback({ hapticsType: 'notification', style: 'warning' });
    }

    if (preset === 'selection') {
      return MiniKit.sendHapticFeedback({ hapticsType: 'selection-changed' });
    }

    return MiniKit.sendHapticFeedback({ hapticsType: 'impact', style: 'light' });
  } catch {
    return null;
  }
}
