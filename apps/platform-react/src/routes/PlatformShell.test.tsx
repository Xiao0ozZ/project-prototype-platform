import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PlatformThemeProvider } from '@/features/theme/platform-theme';

import { PlatformShell } from './PlatformShell';

afterEach(cleanup);

describe('PlatformShell', () => {
  it('uses one global header with navigation below and a separate context row', () => {
    render(
      <PlatformThemeProvider>
        <MemoryRouter initialEntries={['/tools/console']}>
          <Routes>
            <Route element={<PlatformShell />}>
              <Route path="tools/console" element={<div>控制台内容</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </PlatformThemeProvider>,
    );

    expect(screen.getByRole('banner')).toHaveClass('platform-workspace__global-header');
    expect(screen.getByText('产品功能体验中心')).toBeInTheDocument();
    expect(screen.getAllByText('控制台').length).toBeGreaterThan(0);
    expect(screen.getByText('控制台内容')).toBeInTheDocument();
  });
});
