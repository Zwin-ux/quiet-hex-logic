import { useEffect, useState } from 'react';
import {
  getWorldAppDeviceProperties,
  getWorldAppUser,
  installWorldApp,
  isLikelyWorldApp,
} from '@/lib/worldApp/client';

export function useWorldApp() {
  const [installed, setInstalled] = useState(false);
  const [detected, setDetected] = useState(() => isLikelyWorldApp());
  const [, setTick] = useState(0);

  useEffect(() => {
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

  const deviceProperties = getWorldAppDeviceProperties();

  return {
    isWorldApp: detected || installed,
    isInstalled: installed,
    user: getWorldAppUser(),
    deviceProperties,
    safeAreaInsets: deviceProperties?.safeAreaInsets,
  };
}
