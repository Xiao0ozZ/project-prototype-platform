import { describe, expect, it } from 'vitest';

import { renderMarkdown, resolveDocumentAssetPath } from './markdown';

describe('React Markdown reader', () => {
  it('resolves document-relative assets without changing external URLs', () => {
    expect(resolveDocumentAssetPath('公务车/规则/说明.md', '../images/流程图.png')).toBe(
      '公务车/images/流程图.png',
    );
    const rendered = renderMarkdown('![本地图](../images/a.png)\n\n![网络图](https://example.com/a.png)', {
      documentPath: '公务车/规则/说明.md',
      resolveAssetUrl: (path) => `/docs/${path}`,
    });
    expect(rendered.html).toContain('src="/docs/公务车/images/a.png"');
    expect(rendered.html).toContain('src="https://example.com/a.png"');
  });

  it('creates stable, unique heading anchors', () => {
    const rendered = renderMarkdown('# 标题\n\n## 小节\n\n## 小节');
    expect(rendered.headings.map((heading) => heading.id)).toEqual(['标题', '小节', '小节-2']);
  });

  it('marks relative Markdown links for in-reader navigation', () => {
    const rendered = renderMarkdown('[下一章](../订单/详情.md#费用)', {
      documentPath: '公务车/规则/说明.md',
      resolveDocumentUrl: (path, anchor) => `/docs?doc=${path}&anchor=${anchor}`,
    });
    expect(rendered.html).toContain('data-doc-path="公务车/订单/详情.md"');
    expect(rendered.html).toContain('data-doc-anchor="费用"');
    expect(rendered.html).toContain('href="/docs?doc=公务车/订单/详情.md&amp;anchor=费用"');
  });
});
