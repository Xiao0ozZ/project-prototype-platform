import { describe, expect, it, vi } from 'vitest';

import type { PrdBinding } from '../../../../../packages/platform-contracts/src/index.js';
import { clearPrdBindingMarkers, installPrdBindingMarkers } from './prd-binding-markers';

const binding: PrdBinding = {
  id: 'dashboard::0',
  pagePath: '/p/demo/admin/dashboard',
  target: { domPath: [0], tag: 'SECTION', classes: ['summary'], text: '统计内容' },
  prd: { document: 'dashboard.md', anchor: '统计口径', label: '统计口径' },
};

describe('read-only PRD binding markers', () => {
  it('attaches a marker to the matching page element and removes it cleanly', () => {
    document.body.innerHTML =
      '<main class="page-container"><section class="summary">统计内容</section></main>';
    const open = vi.fn();
    installPrdBindingMarkers(document, [binding], open);
    const marker = document.querySelector<HTMLElement>('[data-platform-prd-marker]');
    expect(marker?.textContent).toBe('PRD');
    marker?.click();
    expect(open).toHaveBeenCalledWith(binding);
    clearPrdBindingMarkers(document);
    expect(document.querySelector('[data-platform-prd-marker]')).toBeNull();
  });
});
