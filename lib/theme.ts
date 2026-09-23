export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pulse-color-theme';

export function resolveThemePreference(
  storedTheme: string | null,
  systemPrefersDark: boolean,
): Theme {
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return systemPrefersDark ? 'dark' : 'light';
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function getThemeClassName(theme: Theme): Theme {
  return theme;
}

export function getThemeColor(theme: Theme) {
  return theme === 'dark' ? '#0e0f10' : '#f5f3ef';
}
