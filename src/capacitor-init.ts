import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { hydrateFromNative } from './services/recipeStore';

function waitForNextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  await hydrateFromNative();

  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setOverlaysWebView({ overlay: true });

  await Keyboard.setAccessoryBarVisible({ isVisible: true });

  await waitForNextPaint();
  await SplashScreen.hide({ fadeOutDuration: 220 });
}
