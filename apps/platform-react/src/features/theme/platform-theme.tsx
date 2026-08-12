import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PlatformThemeMode = 'system' | 'default' | 'dark' | 'glass';
export type ResolvedThemeMode = Exclude<PlatformThemeMode, 'system'>;

interface PlatformThemeContextValue {
  mode: PlatformThemeMode;
  resolvedMode: ResolvedThemeMode;
  compact: boolean;
  setMode: (mode: PlatformThemeMode) => void;
  setCompact: (compact: boolean) => void;
}

const THEME_MODE_KEY = 'product-experience-center:theme-mode';
const THEME_DENSITY_KEY = 'product-experience-center:theme-compact';
const PlatformThemeContext = createContext<PlatformThemeContextValue | null>(null);

function readThemeMode(): PlatformThemeMode {
  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    return stored === 'system' || stored === 'default' || stored === 'dark' || stored === 'glass'
      ? stored
      : 'default';
  } catch {
    return 'default';
  }
}

function readCompactMode() {
  try {
    return localStorage.getItem(THEME_DENSITY_KEY) === '1';
  } catch {
    return false;
  }
}

function prefersDarkTheme() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function resolveThemeMode(mode: PlatformThemeMode, prefersDark: boolean): ResolvedThemeMode {
  return mode === 'system' ? (prefersDark ? 'dark' : 'default') : mode;
}

export function PlatformThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PlatformThemeMode>(readThemeMode);
  const [compact, setCompactState] = useState(readCompactMode);
  const [prefersDark, setPrefersDark] = useState(prefersDarkTheme);
  const resolvedMode = resolveThemeMode(mode, prefersDark);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedMode;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.density = compact ? 'compact' : 'comfortable';
    document.documentElement.style.colorScheme = resolvedMode === 'dark' ? 'dark' : 'light';
  }, [compact, mode, resolvedMode]);

  const value = useMemo<PlatformThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      compact,
      setMode(nextMode) {
        setModeState(nextMode);
        try {
          localStorage.setItem(THEME_MODE_KEY, nextMode);
        } catch {
          // Storage is optional; the active session still updates.
        }
      },
      setCompact(nextCompact) {
        setCompactState(nextCompact);
        try {
          localStorage.setItem(THEME_DENSITY_KEY, nextCompact ? '1' : '0');
        } catch {
          // Storage is optional; the active session still updates.
        }
      },
    }),
    [compact, mode, resolvedMode],
  );

  return <PlatformThemeContext.Provider value={value}>{children}</PlatformThemeContext.Provider>;
}

export function usePlatformTheme() {
  const context = useContext(PlatformThemeContext);
  if (!context) throw new Error('usePlatformTheme must be used inside PlatformThemeProvider.');
  return context;
}
