import { useEffect, useState } from 'react';
import {
  getWorldAppDeviceProperties,
  getWorldAppUser,
  hasWorldAppSurfaceHint,
  installWorldApp,
  isLikelyWorldApp,
} from '@/lib/worldApp/client';

export function useWorldApp() {
  const [installed, setInstalled] = useState(false);
  const [detected, setDetected] = useState(() => hasWorldAppSurfaceHint());
  const [, setTick] = useState(0);

  useEffect(() => {
    const surfaceHint = hasWorldAppSurfaceHint();
    setDetected(surfaceHint);

    if (!surfaceHint) return;

    const nextInstalled = installWorldApp();
    setInstalled(nextInstalled);
    setDetected(isLikelyWorldApp());

    const timer = window.setTimeout(() => {
      setTick((value) => value + 1);
      setInstalled(installWorldApp());
      setDetected(isLikelyWorldApp());
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  const isWorldApp = detected || installed;
  const deviceProperties = isWorldApp ? getWorldAppDeviceProperties() : null;

  return {
    isWorldApp,
    isInstalled: installed,
    user: isWorldApp ? getWorldAppUser() : null,
    deviceProperties,
    safeAreaInsets: deviceProperties?.safeAreaInsets,
  };
}
