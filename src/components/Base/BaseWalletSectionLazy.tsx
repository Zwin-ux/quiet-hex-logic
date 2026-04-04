import { Suspense, lazy } from 'react';
import { getBooleanPublicEnv } from '@/lib/runtimeEnv';

const Lazy = lazy(async () => {
  const mod = await import('./BaseWalletSection');
  return { default: mod.BaseWalletSection };
});

export function BaseWalletSectionLazy() {
  const enabled = getBooleanPublicEnv('VITE_ENABLE_BASE_WALLET');
  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <Lazy />
    </Suspense>
  );
}

