import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrdReviewPanel } from './PrdReviewPanel';

afterEach(cleanup);

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
    expect(screen.getByRole('button', { name: '在文档中心打开' })).toBeDisabled();
    expect(screen.getByRole('complementary', { name: '示例页面 PRD' })).toBeInTheDocument();
  });

  it('keeps display mode and document outline as explicit Ant controls', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onModeChange = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <PrdReviewPanel
          open
          projectId="sample-project"
          pageTitle="示例页面"
          documentPath=""
          documents={[]}
          mode="split"
          onModeChange={onModeChange}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('radio', { name: '浮层' }));
    expect(onModeChange).toHaveBeenCalledWith('overlay');

    fireEvent.click(screen.getByRole('button', { name: '查看目录' }));
    expect(screen.getByLabelText('PRD 本文目录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收起目录' })).toHaveAttribute('aria-pressed', 'true');
  });
});
