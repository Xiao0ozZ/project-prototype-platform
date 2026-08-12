import type { PagePrdLinks } from '../../../../../packages/platform-contracts/src/index.js';

export function clonePagePrdLinks(source: PagePrdLinks = {}): PagePrdLinks {
  return Object.fromEntries(Object.entries(source).map(([clientId, pages]) => [clientId, { ...pages }]));
}

/**
 * 项目清单内的关联是只读基础层，.platform/page-prd-links.json 是可编辑覆盖层。
 * null 代表显式取消基础层中的关联，不能在保存前删除该键。
 */
export function mergePagePrdLinks(base: PagePrdLinks = {}, overrides: PagePrdLinks = {}): PagePrdLinks {
  const next = clonePagePrdLinks(base);
  for (const [clientId, pages] of Object.entries(overrides)) {
    next[clientId] ||= {};
    for (const [pageName, path] of Object.entries(pages)) {
      if (path === null || path === '') delete next[clientId][pageName];
      else next[clientId][pageName] = path;
    }
  }
  return next;
}

export function updatePagePrdOverride(
  overrides: PagePrdLinks = {},
  clientId: string,
  pageName: string,
  documentPath: string | null,
): PagePrdLinks {
  const next = clonePagePrdLinks(overrides);
  next[clientId] ||= {};
  next[clientId][pageName] = documentPath || null;
  return next;
}

export function pagePrdLinkFor(links: PagePrdLinks, clientId: string, pageName: string) {
  return links?.[clientId]?.[pageName] || '';
}
