import {
  compareContextBaseline,
  createContextBaseline,
  createProjectContext,
} from '../../packages/project-core/src/ai-context.js';
import { getProject } from '../config/project-packages';
import { loadPagePrdLinks } from './page-prd-links';
import { loadPrdBindings } from './prd-bindings';
import { loadDocument, loadDocumentManifest } from './prd-documents';

const contextCache = new Map();
const DOCUMENT_CONCURRENCY = 6;

function cloneLinks(source) {
  return Object.fromEntries(
    Object.entries(source || {}).map(([clientId, pages]) => [clientId, { ...(pages || {}) }]),
  );
}

function mergeLinks(baseLinks, overrideLinks) {
  const merged = cloneLinks(baseLinks);
  for (const [clientId, pages] of Object.entries(overrideLinks || {})) {
    if (!pages || typeof pages !== 'object') continue;
    merged[clientId] ||= {};
    for (const [pageName, documentPath] of Object.entries(pages)) {
      if (documentPath === null || documentPath === '') delete merged[clientId][pageName];
      else merged[clientId][pageName] = documentPath;
    }
  }
  return merged;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function loadDocumentSources(projectId, documents) {
  const sourceEntries = [];
  const errors = [];
  await mapWithConcurrency(documents, DOCUMENT_CONCURRENCY, async (document) => {
    try {
      sourceEntries.push([document.path, await loadDocument(projectId, document.path)]);
    } catch (error) {
      errors.push({ path: document.path, message: error.message || '文档正文读取失败。' });
    }
  });
  return { documentSources: Object.fromEntries(sourceEntries), documentLoadErrors: errors };
}

export function clearProjectAiContextCache(projectId = '') {
  if (projectId) contextCache.delete(projectId);
  else contextCache.clear();
}

export async function loadProjectAiContext(projectId, { force = false } = {}) {
  if (!force && contextCache.has(projectId)) return contextCache.get(projectId);

  const promise = (async () => {
    const project = getProject(projectId);
    if (!project) throw new Error('项目不存在或当前不可用。');

    const [linkOverrides, bindingsPayload, documentManifest] = await Promise.all([
      import.meta.env.DEV ? loadPagePrdLinks(projectId) : Promise.resolve({}),
      loadPrdBindings(projectId),
      project.docs?.enabled
        ? loadDocumentManifest(projectId)
        : Promise.resolve({ generatedAt: new Date().toISOString(), documents: [] }),
    ]);
    const { documentSources, documentLoadErrors } = await loadDocumentSources(
      projectId,
      documentManifest.documents || [],
    );
    return createProjectContext({
      project: {
        ...project,
        pagePrdLinks: mergeLinks(project.pagePrdLinks, linkOverrides),
      },
      documentManifest,
      documentSources,
      bindings: bindingsPayload.bindings,
      documentLoadErrors,
    });
  })();

  contextCache.set(projectId, promise);
  try {
    const context = await promise;
    contextCache.set(projectId, Promise.resolve(context));
    return context;
  } catch (error) {
    contextCache.delete(projectId);
    throw error;
  }
}

function baselineStorageKey(projectId) {
  return `project-platform:ai-context-baseline:${projectId}`;
}

export function loadProjectContextBaseline(projectId) {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(baselineStorageKey(projectId)) || 'null');
  } catch {
    return null;
  }
}

export function saveProjectContextBaseline(context) {
  const baseline = createContextBaseline(context);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(baselineStorageKey(context.project.id), JSON.stringify(baseline));
  }
  return baseline;
}

export function analyzeProjectContextImpact(context) {
  return compareContextBaseline(context, loadProjectContextBaseline(context.project.id));
}
