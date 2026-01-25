import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20, 50, 30], // Celebratory pattern
  warning: [30, 50, 30],
  error: [50, 100, 50],
};

export function useHaptics() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((style: HapticStyle = 'light') => {
    if (!isSupported) return;
    
    try {
      const pattern = HAPTIC_PATTERNS[style];
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail if vibration not available
      console.debug('Haptic feedback not available:', e);
    }
  }, [isSupported]);

  const triggerPlacement = useCallback(() => {
    trigger('medium');
  }, [trigger]);

  const triggerVictory = useCallback(() => {
    // Multiple bursts for celebration
    trigger('success');
    setTimeout(() => trigger('success'), 300);
    setTimeout(() => trigger('success'), 600);
  }, [trigger]);

  const triggerDefeat = useCallback(() => {
    trigger('heavy');
  }, [trigger]);

  const triggerError = useCallback(() => {
    trigger('error');
  }, [trigger]);

  const triggerTap = useCallback(() => {
    trigger('light');
  }, [trigger]);

  return {
    isSupported,
    trigger,
    triggerPlacement,
    triggerVictory,
    triggerDefeat,
    triggerError,
    triggerTap,
  };
}
