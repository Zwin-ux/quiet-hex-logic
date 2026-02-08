import { Suspense, lazy } from 'react';

const Lazy = lazy(async () => {
  const mod = await import('./BaseWalletSection');
  return { default: mod.BaseWalletSection };
});

export function BaseWalletSectionLazy() {
  const enabled = String(import.meta.env.VITE_ENABLE_BASE_WALLET ?? '').toLowerCase() === 'true';
  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <Lazy />
    </Suspense>
  );
}

