import { describe, expect, it } from 'vitest';

import { inspectHtmlPrototype } from '../../packages/project-core/src/index.js';

function templateHtml(content = '<main data-page-content data-business-content>内容</main>') {
  return `<!doctype html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>页面</title><style>:root{--app-color-primary:#007aff}</style></head>
<body><!-- [AI-EDIT] PAGE_CONTENT_START -->${content}<!-- PAGE_CONTENT_END --><!-- [AI-EDIT] PAGE_OVERLAYS_START --><div data-page-overlay hidden></div><!-- PAGE_OVERLAYS_END -->
<script id="prototype-page-manifest" type="application/json">{"templateVersion":1,"pageKey":"page","pageTitle":"页面","client":"admin","routePath":"/admin/page"}</script>
<script>/* [AI-EDIT] PAGE_LOGIC_START */ const ready = true; void ready; /* PAGE_LOGIC_END */</script></body></html>`;
}

describe('HTML prototype preflight', () => {
  it('accepts a portable template that keeps the required editing boundaries', () => {
    expect(inspectHtmlPrototype(templateHtml())).toMatchObject({
      valid: true,
      summary: { template: true, contentCount: 1, businessContentCount: 1 },
    });
  });

  it('rejects duplicate content roots and inline event handlers', () => {
    const result = inspectHtmlPrototype(
      templateHtml(
        '<main data-page-content data-business-content onclick="run()"></main><div data-page-content></div>',
      ),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining(['page-content-count', 'inline-events']),
    );
  });
});
