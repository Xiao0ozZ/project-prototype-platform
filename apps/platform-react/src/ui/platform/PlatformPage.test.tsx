import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformPage } from './PlatformPage';

describe('PlatformPage', () => {
  it('renders orientation, supporting copy and page content', () => {
    render(
      <PlatformPage
        eyebrow="PROJECT LIBRARY"
        title="项目包状态"
        description="读取本地项目包"
        actions={<button>重新扫描</button>}
      >
        <div>项目清单</div>
      </PlatformPage>,
    );

    expect(screen.getByRole('main', { name: '项目包状态' })).toHaveAttribute(
      'data-description',
      '读取本地项目包',
    );
    expect(screen.getByRole('button', { name: '重新扫描' })).toBeInTheDocument();
    expect(screen.getByText('项目清单')).toBeInTheDocument();
  });
});
