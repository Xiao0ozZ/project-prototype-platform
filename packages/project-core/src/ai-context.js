const CONTEXT_SCHEMA_VERSION = '1.0';
const SUGGESTION_THRESHOLD = 0.42;

function normalizePath(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '');
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\.(?:md|html?|vue)$/iu, '')
    .replace(/^\d+[_-]*/u, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function fileStem(value) {
  return (
    normalizePath(value)
      .split('/')
      .at(-1)
      ?.replace(/\.[^.]+$/u, '') || ''
  );
}

function bigrams(value) {
  const normalized = normalizeText(value);
  if (!normalized) return new Set();
  if (normalized.length === 1) return new Set([normalized]);
  return new Set(
    Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)),
  );
}

function similarity(left, right) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (
    Math.min(normalizedLeft.length, normalizedRight.length) >= 2 &&
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
  ) {
    return 0.86;
  }

  const leftBigrams = bigrams(normalizedLeft);
  const rightBigrams = bigrams(normalizedRight);
  const intersection = [...leftBigrams].filter((item) => rightBigrams.has(item)).length;
  return (2 * intersection) / Math.max(1, leftBigrams.size + rightBigrams.size);
}

function clampScore(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function normalizePagePrdLink(value) {
  if (typeof value === 'string') return normalizePath(value);
  return normalizePath(value?.path || value?.file || value?.document);
}

function normalizeBindingPrd(binding) {
  const value = binding?.prd;
  if (typeof value === 'string') return { document: normalizePath(value), anchor: '' };
  return {
    document: normalizePath(value?.document || value?.path || value?.file),
    anchor: String(value?.anchor || ''),
  };
}

function headingId(text, usedIds) {
  const base =
    String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/gu, '') || 'section';
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  return id;
}

export function extractContextHeadings(source) {
  const headings = [];
  const usedIds = new Set();
  let fence = null;

  for (const line of String(source || '').split(/\r?\n/u)) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/u.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;

    const match = /^(#{1,3})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (!match) continue;
    const text = match[2].replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1').trim();
    headings.push({ id: headingId(text, usedIds), text, level: match[1].length });
  }

  return headings;
}

export function createStableContentHash(source) {
  let hash = 2166136261;
  for (const character of String(source || '')) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function createPages(project) {
  return (project.clients || []).flatMap((client) => {
    const sections = new Map((client.definition?.sections || []).map((section) => [section.id, section]));
    return (client.definition?.pages || []).map((page) => {
      const section = sections.get(page.section);
      const fullPath = `/p/${project.id}/${client.id}/${page.path}`;
      const documentPath = normalizePagePrdLink(project.pagePrdLinks?.[client.id]?.[page.name]);
      return {
        key: `${client.id}:${page.name}`,
        projectId: project.id,
        clientId: client.id,
        clientName: client.name,
        name: page.name,
        title: page.title,
        path: page.path,
        fullPath,
        sectionId: page.section || '',
        sectionTitle: section?.title || '',
        menu: page.menu !== false,
        sourceType: page.sourceType || (page.view ? 'vue' : 'unknown'),
        source: page.source || page.view || '',
        documentPath,
      };
    });
  });
}

function createDocuments(documentManifest, documentSources) {
  const sourceMap =
    documentSources instanceof Map ? documentSources : new Map(Object.entries(documentSources || {}));
  return (documentManifest?.documents || []).map((document) => {
    const path = normalizePath(document.path);
    const source = String(sourceMap.get(path) || '');
    return {
      ...document,
      path,
      content: source,
      contentAvailable: sourceMap.has(path),
      headings: extractContextHeadings(source),
      hash: createStableContentHash(source || `${document.updatedAt || ''}:${document.size || 0}`),
      linkedPageKeys: [],
      componentBindingIds: [],
    };
  });
}

function scoreDocumentForPage(page, document) {
  const titleScore = similarity(page.title, document.title || document.fileName);
  const headingScore = Math.max(
    0,
    ...(document.headings || []).map((heading) => similarity(page.title, heading.text)),
  );
  const sourceScore = similarity(fileStem(page.source), document.fileName || document.title);
  const routeScore = similarity(page.path, document.fileName || document.title);
  const folderScore = Math.max(
    0,
    ...(document.folders || []).map((folder) => similarity(page.sectionTitle || page.sectionId, folder)),
  );
  let score =
    titleScore * 0.46 + headingScore * 0.15 + sourceScore * 0.2 + routeScore * 0.14 + folderScore * 0.05;
  if (titleScore === 1) score = Math.max(score, 0.98);
  else if (titleScore >= 0.86 && Math.max(sourceScore, routeScore) >= 0.5) score = Math.max(score, 0.82);
  else if (headingScore === 1) score = Math.max(score, 0.72);
  else if (headingScore >= 0.86) score = Math.max(score, 0.64);

  const reasons = [];
  if (titleScore >= 0.86) reasons.push('页面标题与文档标题接近');
  if (headingScore >= 0.86) reasons.push('页面标题命中 PRD 章节标题');
  if (sourceScore >= 0.72) reasons.push('页面源文件名与 PRD 文件名接近');
  if (routeScore >= 0.72) reasons.push('页面路由与 PRD 文件名接近');
  if (folderScore >= 0.72) reasons.push('菜单分组与 PRD 目录接近');
  if (!reasons.length && titleScore >= 0.45) reasons.push('页面与文档标题包含相似关键词');

  return { score: clampScore(score), reasons };
}

function createSuggestions(pages, documents) {
  const candidates = documents.filter((document) => !document.archived);
  const documentPaths = new Set(documents.map((document) => document.path));
  return pages
    .filter((page) => !page.documentPath || !documentPaths.has(page.documentPath))
    .map((page) => {
      const matches = candidates
        .map((document) => ({ document, ...scoreDocumentForPage(page, document) }))
        .filter((match) => match.score >= SUGGESTION_THRESHOLD)
        .sort(
          (left, right) => right.score - left.score || left.document.path.localeCompare(right.document.path),
        )
        .slice(0, 3)
        .map(({ document, score, reasons }) => ({
          path: document.path,
          title: document.title,
          score,
          confidence: score >= 0.78 ? 'high' : score >= 0.58 ? 'medium' : 'low',
          reasons,
        }));
      return matches.length ? { pageKey: page.key, page, candidates: matches } : null;
    })
    .filter(Boolean);
}

function createIssues({ project, pages, documents, bindings, documentLoadErrors }) {
  const issues = [];
  const documentPaths = new Set(documents.map((document) => document.path));
  const documentByPath = new Map(documents.map((document) => [document.path, document]));
  const pagePaths = new Set(pages.map((page) => page.fullPath));

  if (project.docs?.enabled && !documents.length) {
    issues.push({
      severity: 'error',
      type: 'documents-unavailable',
      subject: project.name,
      message: '项目已启用文档中心，但没有读取到 Markdown 文档。',
    });
  }

  for (const page of pages) {
    if (!page.documentPath && project.docs?.enabled) {
      issues.push({
        severity: 'warning',
        type: 'page-without-prd',
        subject: `${page.clientName} · ${page.title}`,
        pageKey: page.key,
        message: '页面尚未关联 PRD 文件。',
      });
    } else if (page.documentPath && !documentPaths.has(page.documentPath)) {
      issues.push({
        severity: 'error',
        type: 'missing-linked-document',
        subject: `${page.clientName} · ${page.title}`,
        pageKey: page.key,
        documentPath: page.documentPath,
        message: `已关联的 PRD 不存在：${page.documentPath}`,
      });
    }
  }

  for (const document of documents) {
    if (!document.archived && !document.linkedPageKeys.length && !document.componentBindingIds.length) {
      issues.push({
        severity: 'info',
        type: 'document-without-page',
        subject: document.title || document.path,
        documentPath: document.path,
        message: 'PRD 尚未被页面或页面组件使用。',
      });
    }
  }

  for (const binding of bindings) {
    const prd = normalizeBindingPrd(binding);
    if (prd.document && !documentPaths.has(prd.document)) {
      issues.push({
        severity: 'error',
        type: 'missing-binding-document',
        subject: binding.label || binding.id || binding.pagePath,
        documentPath: prd.document,
        message: `组件关联的 PRD 不存在：${prd.document}`,
      });
    } else if (prd.document && prd.anchor) {
      const document = documentByPath.get(prd.document);
      const anchorSource = String(prd.anchor).replace(/^#/, '').trim();
      let anchor = anchorSource;
      try {
        anchor = decodeURIComponent(anchorSource);
      } catch {
        // 保留原始锚点，避免格式错误的百分号编码中断整个项目上下文生成。
      }
      const headingIds = new Set((document?.headings || []).map((heading) => heading.id));
      if (document?.contentAvailable && anchor && !headingIds.has(anchor)) {
        issues.push({
          severity: 'warning',
          type: 'missing-binding-anchor',
          subject: binding.label || binding.id || binding.pagePath,
          documentPath: prd.document,
          message: `组件关联的 PRD 章节不存在：#${anchor}`,
        });
      }
    }
    if (binding.pagePath && !pagePaths.has(binding.pagePath)) {
      issues.push({
        severity: 'warning',
        type: 'missing-binding-page',
        subject: binding.label || binding.id || binding.pagePath,
        message: `组件关联指向未登记页面：${binding.pagePath}`,
      });
    }
  }

  for (const item of documentLoadErrors || []) {
    issues.push({
      severity: 'warning',
      type: 'document-content-unavailable',
      subject: item.path,
      documentPath: item.path,
      message: item.message || '文档正文读取失败，标题匹配和影响分析精度会降低。',
    });
  }

  return issues;
}

export function createProjectContext({
  project,
  documentManifest = { documents: [] },
  documentSources = {},
  bindings = [],
  documentLoadErrors = [],
  generatedAt = new Date().toISOString(),
}) {
  if (!project?.id) throw new Error('生成项目上下文需要有效的项目配置。');
  const pages = createPages(project);
  const documents = createDocuments(documentManifest, documentSources);
  const documentByPath = new Map(documents.map((document) => [document.path, document]));
  const pageByPath = new Map(pages.map((page) => [page.fullPath, page]));

  for (const page of pages) {
    const document = documentByPath.get(page.documentPath);
    if (document) document.linkedPageKeys.push(page.key);
  }

  const normalizedBindings = (bindings || []).map((binding, index) => ({
    ...binding,
    id: binding.id || `binding-${index + 1}`,
    prd: normalizeBindingPrd(binding),
  }));
  for (const binding of normalizedBindings) {
    const document = documentByPath.get(binding.prd.document);
    if (document) document.componentBindingIds.push(binding.id);
    const page = pageByPath.get(binding.pagePath);
    if (page) {
      page.componentBindingIds ||= [];
      page.componentBindingIds.push(binding.id);
    }
  }

  const issues = createIssues({
    project,
    pages,
    documents,
    bindings: normalizedBindings,
    documentLoadErrors,
  });
  const suggestions = createSuggestions(pages, documents);
  const linkedPages = pages.filter((page) => documentByPath.has(page.documentPath)).length;
  const linkedDocuments = documents.filter((document) => document.linkedPageKeys.length).length;
  const pagesWithComponentBindings = pages.filter((page) => page.componentBindingIds?.length).length;

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    generatedAt,
    project: {
      id: project.id,
      name: project.name,
      shortName: project.shortName || project.name,
      version: project.version || '',
      description: project.description || '',
      docsEnabled: Boolean(project.docs?.enabled),
    },
    clients: (project.clients || []).map((client) => ({
      id: client.id,
      name: client.name,
      shortName: client.shortName || client.name,
      layout: client.layout || 'sidebar',
      pageCount: pages.filter((page) => page.clientId === client.id).length,
    })),
    pages,
    documents,
    bindings: normalizedBindings,
    issues,
    suggestions,
    summary: {
      clients: project.clients?.length || 0,
      pages: pages.length,
      linkedPages,
      unlinkedPages: pages.length - linkedPages,
      pageCoverage: pages.length ? Math.round((linkedPages / pages.length) * 100) : 0,
      documents: documents.length,
      linkedDocuments,
      unlinkedDocuments: documents.length - linkedDocuments,
      componentBindings: normalizedBindings.length,
      pagesWithComponentBindings,
      componentCoverage: pages.length ? Math.round((pagesWithComponentBindings / pages.length) * 100) : 0,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
      suggestions: suggestions.length,
    },
  };
}

export function createTraceabilityReport(context, { baseline = null } = {}) {
  const documents = new Map(context.documents.map((document) => [document.path, document]));
  const issuesByPage = new Map();
  for (const issue of context.issues || []) {
    if (!issue.pageKey) continue;
    issuesByPage.set(issue.pageKey, [...(issuesByPage.get(issue.pageKey) || []), issue]);
  }
  const rows = context.pages.map((page) => {
    const document = documents.get(page.documentPath);
    const componentBindings = (page.componentBindingIds || [])
      .map((bindingId) => context.bindings.find((binding) => binding.id === bindingId))
      .filter(Boolean);
    return {
      pageKey: page.key,
      client: { id: page.clientId, name: page.clientName },
      page: {
        name: page.name,
        title: page.title,
        path: page.fullPath,
        section: page.sectionTitle || page.sectionId,
        sourceType: page.sourceType,
        source: page.source,
      },
      requirement: document
        ? { path: document.path, title: document.title, archived: Boolean(document.archived) }
        : null,
      componentBindings: componentBindings.map((binding) => ({
        id: binding.id,
        label: binding.prd.label || binding.label || '',
        target: binding.target || null,
        document: binding.prd.document,
        anchor: binding.prd.anchor || '',
      })),
      issues: issuesByPage.get(page.key) || [],
      status: document ? 'covered' : 'uncovered',
    };
  });
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    kind: 'project-traceability-report',
    generatedAt: new Date().toISOString(),
    project: context.project,
    summary: context.summary,
    rows,
    orphanDocuments: context.documents
      .filter(
        (document) =>
          !document.archived && !document.linkedPageKeys.length && !document.componentBindingIds.length,
      )
      .map((document) => ({ path: document.path, title: document.title })),
    impact: compareContextBaseline(context, baseline),
  };
}

function serializeDocument(document, includeDocumentContent) {
  const { content, ...metadata } = document;
  return includeDocumentContent ? { ...metadata, content } : metadata;
}

export function createContextExport(context, { includeDocumentContent = false } = {}) {
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    kind: 'project-delivery-context',
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: context.generatedAt,
    project: context.project,
    summary: context.summary,
    clients: context.clients,
    pages: context.pages,
    documents: context.documents.map((document) => serializeDocument(document, includeDocumentContent)),
    bindings: context.bindings,
    issues: context.issues,
    suggestions: context.suggestions,
  };
}

export function createPageContextPackage(context, pageReference) {
  const page = context.pages.find(
    (item) => item.key === pageReference || item.fullPath === pageReference || item.name === pageReference,
  );
  if (!page) return null;
  const requirements = context.documents
    .filter((document) => document.path === page.documentPath)
    .map((document) => serializeDocument(document, true));
  const bindings = context.bindings.filter((binding) => binding.pagePath === page.fullPath);
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    kind: 'page-delivery-context',
    generatedAt: new Date().toISOString(),
    project: context.project,
    page,
    requirements,
    componentBindings: bindings,
    issues: context.issues.filter((issue) => issue.pageKey === page.key),
  };
}

export function createContextBaseline(context) {
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    projectId: context.project.id,
    capturedAt: new Date().toISOString(),
    documents: context.documents.map((document) => ({
      path: document.path,
      title: document.title,
      hash: document.hash,
      updatedAt: document.updatedAt,
      linkedPageKeys: [...document.linkedPageKeys],
      componentBindingIds: [...document.componentBindingIds],
    })),
  };
}

export function compareContextBaseline(context, baseline) {
  if (!baseline || baseline.projectId !== context.project.id || !Array.isArray(baseline.documents)) {
    return {
      status: 'uninitialized',
      changes: [],
      summary: { added: 0, changed: 0, removed: 0, impactedPages: 0 },
    };
  }

  const previous = new Map(baseline.documents.map((document) => [document.path, document]));
  const current = new Map(context.documents.map((document) => [document.path, document]));
  const changes = [];

  for (const document of context.documents) {
    const before = previous.get(document.path);
    const type = !before ? 'added' : before.hash !== document.hash ? 'changed' : '';
    if (!type) continue;
    changes.push({
      type,
      path: document.path,
      title: document.title,
      beforeHash: before?.hash || '',
      afterHash: document.hash,
      linkedPageKeys: [...document.linkedPageKeys],
      componentBindingIds: [...document.componentBindingIds],
    });
  }

  for (const document of baseline.documents) {
    if (current.has(document.path)) continue;
    changes.push({
      type: 'removed',
      path: document.path,
      title: document.title,
      beforeHash: document.hash,
      afterHash: '',
      linkedPageKeys: [...(document.linkedPageKeys || [])],
      componentBindingIds: [...(document.componentBindingIds || [])],
    });
  }

  const impactedPages = new Set(changes.flatMap((change) => change.linkedPageKeys));
  return {
    status: changes.length ? 'changed' : 'current',
    baselineCapturedAt: baseline.capturedAt,
    changes: changes.sort((left, right) =>
      left.path.localeCompare(right.path, 'zh-Hans-CN', { numeric: true }),
    ),
    summary: {
      added: changes.filter((change) => change.type === 'added').length,
      changed: changes.filter((change) => change.type === 'changed').length,
      removed: changes.filter((change) => change.type === 'removed').length,
      impactedPages: impactedPages.size,
    },
  };
}
