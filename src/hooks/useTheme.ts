import { useCallback, useEffect, useState } from 'react';

export type AppTheme = 'default' | '8bit';

const STORAGE_KEY = 'checklist_theme';

function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'default';
  try {
    return localStorage.getItem(STORAGE_KEY) === '8bit' ? '8bit' : 'default';
  } catch {
    return 'default';
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('theme-8bit', theme === '8bit');
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (favicon) favicon.href = theme === '8bit' ? '/favicon-8bit.png' : '/favicon.png';
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return { theme, setTheme };
}
