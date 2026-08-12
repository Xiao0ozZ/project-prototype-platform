import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformPage } from './PlatformPage';

describe('PlatformPage', () => {
  it('renders orientation, supporting copy and page content', () => {
    render(
      <PlatformPage eyebrow="PROJECT LIBRARY" title="项目包状态" description="读取本地项目包">
        <div>项目清单</div>
      </PlatformPage>,
    );

    expect(screen.getByText('PROJECT LIBRARY')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '项目包状态' })).toBeInTheDocument();
    expect(screen.getByText('读取本地项目包')).toBeInTheDocument();
    expect(screen.getByText('项目清单')).toBeInTheDocument();
  });
});
