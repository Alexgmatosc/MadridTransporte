export type HapticStyle = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

/**
 * Triggers progressive haptic feedback via Navigator Vibration API if supported.
 * Degrades gracefully on devices (such as iOS Safari WebKit) that do not support navigator.vibrate.
 */
export const triggerHaptic = (style: HapticStyle = 'light'): void => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      switch (style) {
        case 'selection':
          navigator.vibrate(8);
          break;
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'success':
          navigator.vibrate([10, 30, 15]);
          break;
        case 'warning':
          navigator.vibrate([20, 40, 20]);
          break;
        case 'error':
          navigator.vibrate([35, 30, 35, 30, 50]);
          break;
      }
    } catch {
      // Graceful degradation if vibrate is blocked or throws
    }
  }
};
