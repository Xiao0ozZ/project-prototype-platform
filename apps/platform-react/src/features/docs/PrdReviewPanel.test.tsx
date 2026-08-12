import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { PrdReviewPanel } from './PrdReviewPanel';

describe('PrdReviewPanel', () => {
  it('keeps the page available when no valid document path is provided', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PrdReviewPanel
          open
          projectId="sample-project"
          pageTitle="示例页面"
          documentPath={undefined as unknown as string}
          documents={[]}
          mode="split"
          onModeChange={vi.fn()}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('示例页面')).toBeInTheDocument();
    expect(screen.getByText('当前页面未关联 PRD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新窗口打开' })).toBeDisabled();
  });
});
