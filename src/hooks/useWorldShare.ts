import { useCallback } from 'react';
import {
  sendWorldHapticFeedback,
  shareWorldApp,
  type WorldHapticPreset,
  type WorldSharePayload,
} from '@/lib/worldApp/client';

export function useWorldShare() {
  const share = useCallback((payload: WorldSharePayload) => shareWorldApp(payload), []);
  const haptic = useCallback((preset: WorldHapticPreset) => sendWorldHapticFeedback(preset), []);

  return {
    share,
    haptic,
  };
}
