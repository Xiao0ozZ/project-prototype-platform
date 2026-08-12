import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { PlatformThemeProvider, usePlatformTheme } from './platform-theme';

const STORAGE_KEY = 'product-experience-center:theme-mode';

function ThemeProbe() {
  const { mode, compact, setMode, setCompact } = usePlatformTheme();
  return (
    <>
      <button onClick={() => setMode('dark')}>{mode}</button>
      <button onClick={() => setCompact(!compact)}>{compact ? 'compact' : 'comfortable'}</button>
    </>
  );
}

describe('platform theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('restores and persists the selected Ant theme', async () => {
    localStorage.setItem(STORAGE_KEY, 'glass');
    render(
      <PlatformThemeProvider>
        <ThemeProbe />
      </PlatformThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'glass' })).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('glass'));

    fireEvent.click(screen.getByRole('button', { name: 'glass' }));
    expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));

    fireEvent.click(screen.getByRole('button', { name: 'comfortable' }));
    expect(localStorage.getItem('product-experience-center:theme-compact')).toBe('1');
    await waitFor(() => expect(document.documentElement.dataset.density).toBe('compact'));
  });
});
