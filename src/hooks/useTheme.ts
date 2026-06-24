import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'cookie_theme';
export type ThemePreference = 'system' | 'light' | 'dark';

function resolveDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(preference: ThemePreference): void {
  const dark = resolveDark(preference);
  document.documentElement.classList.toggle('dark-dim', dark);
  document.body.style.backgroundColor = dark ? '#1b1c19' : '#fbf9f4';
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return 'system';
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    return readPreference();
  });

  useEffect(() => {
    applyTheme(preference);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (preference === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
    setPreferenceState(next);
    applyTheme(next);
  }, []);

  return { preference, setPreference, isDark: resolveDark(preference) };
}
