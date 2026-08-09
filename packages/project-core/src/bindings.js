import { PROJECT_ID_PATTERN } from './constants.js';
import { isSafeRelativePath } from './filesystem.js';

export function normalizePagePrdLinks(projectId, payload = {}) {
  const source = payload?.links && typeof payload.links === 'object' ? payload.links : {};
  const links = {};
  for (const [clientId, pages] of Object.entries(source)) {
    if (!PROJECT_ID_PATTERN.test(clientId) || !pages || typeof pages !== 'object') continue;
    for (const [pageName, value] of Object.entries(pages)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/u.test(pageName)) continue;
      if (value === null || value === '') {
        links[clientId] ||= {};
        links[clientId][pageName] = null;
        continue;
      }
      const documentPath = typeof value === 'string' ? value.trim() : String(value?.path || '').trim();
      if (!documentPath || !isSafeRelativePath(documentPath) || !/\.md$/iu.test(documentPath)) {
        throw new Error(`页面 ${clientId}/${pageName} 的 PRD 路径无效。`);
      }
      links[clientId] ||= {};
      links[clientId][pageName] = documentPath.replaceAll('\\', '/');
    }
  }
  return { schemaVersion: 1, projectId, links };
}

export function normalizePrdBindings(projectId, payload = {}) {
  const bindings = Array.isArray(payload?.bindings) ? payload.bindings.slice(0, 1000) : [];
  return {
    schemaVersion: 1,
    projectId,
    bindings: bindings.filter((binding) => binding?.pagePath && binding?.target && binding?.prd),
  };
}
