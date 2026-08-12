import { normalizePrdBindings as normalizeBindings } from '../../packages/platform-contracts/src/index.js';
import { platformApi } from './platform-api';

export function normalizePrdBindings(payload) {
  return normalizeBindings(payload);
}

export async function loadPrdBindings(projectId) {
  return platformApi.loadPrdBindings(projectId);
}

export async function savePrdBindings(projectId, bindings) {
  return platformApi.savePrdBindings(projectId, bindings);
}

export function onPrdBindingsChanged(projectId, callback) {
  if (!import.meta.hot) return () => {};
  const handleChange = (payload) => {
    if (!payload?.projectId || payload.projectId === projectId) callback();
  };
  import.meta.hot.on('prd-bindings:changed', handleChange);
  return () => import.meta.hot.off('prd-bindings:changed', handleChange);
}

function createHeadingId(text, usedIds) {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'section';
  let id = base;
  let index = 2;
  while (usedIds.has(id)) id = `${base}-${index++}`;
  usedIds.add(id);
  return id;
}

export function extractPrdHeadings(source) {
  const headings = [];
  const usedIds = new Set();
  let codeFence = null;
  for (const line of String(source || '').split(/\r?\n/u)) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/u.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!codeFence) codeFence = { character: marker[0], length: marker.length };
      else if (marker[0] === codeFence.character && marker.length >= codeFence.length) codeFence = null;
      continue;
    }
    if (codeFence) continue;
    const match = /^(#{1,3})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (!match) continue;
    const text = match[2].replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1').trim();
    headings.push({ id: createHeadingId(text, usedIds), text, level: match[1].length });
  }
  return headings;
}

export function createBindingId(pagePath, target) {
  const path = Array.isArray(target?.domPath) ? target.domPath.join('.') : '';
  return `${pagePath}::${path || target?.text || Date.now()}`;
}
