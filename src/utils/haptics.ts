/**
 * Web haptics — a thin wrapper over the Vibration API.
 *
 * On the native iOS shell this used Capacitor Haptics; on the web we use
 * `navigator.vibrate`, which is supported on Android/Chromium browsers and is a
 * silent no-op everywhere else (notably iOS Safari, which has no web vibration).
 * Calls are best-effort and never throw.
 */

type HapticKind = 'light' | 'medium' | 'success';

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 16,
  success: [12, 40, 12],
};

export function haptic(kind: HapticKind = 'light'): void {
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    // Vibration unsupported or blocked — ignore.
  }
}
