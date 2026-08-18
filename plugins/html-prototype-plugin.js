import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { orderClientRouteData } from '../packages/project-core/src/route-order.js';
import {
  fileExists,
  isInsideRoot,
  isSafeRelativePath,
  resolveProjectPrototypeSources,
  toWebPath,
  walkFiles as walkCoreFiles,
} from '../packages/project-core/src/index.js';

import {
  isHtmlPrototypeContentSource,
  isSupportedPlatformExportFormat,
  readPlatformExportManifest,
} from './platform-export-format.js';

const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const PUBLIC_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.gif',
  '.html',
  '.htm',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.mjs',
  '.mp3',
  '.mp4',
  '.png',
  '.svg',
  '.ttf',
  '.wasm',
  '.webmanifest',
  '.webp',
  '.woff',
  '.woff2',
]);
const VIRTUAL_MODULE_ID = 'virtual:project-html-pages';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const HTML_PAGES_API_PATH = '/__projects/html-pages';

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function readMetaValue(source, name) {
  const tags = source.match(/<meta\b[^>]*>/giu) || [];
  const expected = String(name).toLowerCase();
  for (const tag of tags) {
    const nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/iu);
    if (nameMatch?.[1].toLowerCase() !== expected) continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/iu);
    if (contentMatch) return decodeHtmlEntities(contentMatch[1]);
  }
  return '';
}

function readHtmlTitle(source, filePath) {
  const explicitTitle = readMetaValue(source, 'prototype-title');
  if (explicitTitle) return explicitTitle;
  const title = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1];
  if (title) return decodeHtmlEntities(title.replace(/<[^>]+>/gu, ' '));
  const heading = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1];
  if (heading) return decodeHtmlEntities(heading.replace(/<[^>]+>/gu, ' '));
  return path.basename(filePath).replace(/\.(?:html?|HTML?)$/u, '');
}

function normalizeSlug(value) {
  const slug = String(value || '')
    .normalize('NFKC')
    .replace(/\.(?:html?|HTML?)$/u, '')
    .replace(/[^a-zA-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  return slug || 'page';
}

function shortHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 7);
}

function createRoutePath(relativePath, explicitPath = '') {
  const sourcePath = explicitPath || relativePath.replace(/\.(?:html?|HTML?)$/u, '');
  const segments = sourcePath
    .split('/')
    .filter(Boolean)
    .map((segment) => normalizeSlug(segment))
    .filter(Boolean);
  const routePath = segments.join('-');
  return routePath || `page-${shortHash(relativePath)}`;
}

function routePathFromPlatformExportManifest(manifest) {
  if (!isSupportedPlatformExportFormat(manifest?.exportFormat)) return '';
  const routePath =
    String(manifest?.routePath || '')
      .split('/')
      .filter(Boolean)
      .at(-1) || '';
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(routePath) ? routePath : '';
}

async function walkFiles(root) {
  return walkCoreFiles(root, { extensions: PUBLIC_EXTENSIONS });
}

async function readProjectDefinition(projectRoot, manifest) {
  const definitionPath = path.resolve(projectRoot, manifest.pageDefinitions || 'page-definitions.js');
  const definitionUrl = pathToFileURL(definitionPath);
  definitionUrl.searchParams.set('htmlPrototypeScan', String(Date.now()));
  const module = await import(definitionUrl.href);
  return module.clientPageDefinitions || module.default || {};
}

function normalizeClientKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

function resolveClientId({ prototype, sourceClientId = '', manifestClientId = '', relativePath, clients }) {
  for (const candidate of [sourceClientId, manifestClientId, prototype.client]) {
    const clientId = String(candidate || '').trim();
    if (clientId && clients.some((client) => client.id === clientId)) return clientId;
  }

  const firstSegment = relativePath.split('/')[0] || '';
  const normalizedSegment = normalizeClientKey(firstSegment);
  const matchedClient = clients.find((client) => {
    return [client.id, client.name, client.shortName].some(
      (candidate) => normalizeClientKey(candidate) === normalizedSegment,
    );
  });
  if (matchedClient) return matchedClient.id;
  if (clients.length === 1) return clients[0].id;
  return '';
}

function resolveSourceRelativePath(relativePath, clientId, clients) {
  const segments = relativePath.split('/').filter(Boolean);
  const firstSegment = segments[0] || '';
  const client = clients.find((item) => {
    return (
      item.id === clientId &&
      [item.id, item.name, item.shortName].some(
        (candidate) => normalizeClientKey(candidate) === normalizeClientKey(firstSegment),
      )
    );
  });
  return client ? segments.slice(1).join('/') || segments.join('/') : relativePath;
}

async function readProjectManifests(projectsRoot, mounts = {}) {
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !PROJECT_ID_PATTERN.test(entry.name)) continue;
    const projectRoot = path.join(projectsRoot, entry.name);
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, 'project.json'), 'utf8'));
      if (manifest.id !== entry.name) continue;
      const sources = [];
      for (const source of resolveProjectPrototypeSources(manifest, projectRoot, mounts)) {
        const prototypeRoot = source.root;
        if (await fileExists(prototypeRoot, 'directory')) sources.push({ ...source, prototypeRoot });
      }
      manifests.push({ projectId: entry.name, projectRoot, manifest, sources });
    } catch {
      // 项目包完整性由项目包扫描器负责；这里跳过无法读取的项目包。
    }
  }
  return manifests;
}

export async function scanHtmlPrototypePages(projectsRoot, { mounts = {} } = {}) {
  const projects = {};
  const roots = {};
  const sections = {};
  const manifests = await readProjectManifests(path.resolve(projectsRoot), mounts);

  for (const item of manifests) {
    const definitions = await readProjectDefinition(item.projectRoot, item.manifest).catch(() => ({}));
    const clients = item.manifest.clients || [];
    const pagesByClient = {};
    const managedSources = [];
    for (const client of clients) {
      const managedPages = (definitions[client.id]?.pages || []).filter(
        (page) => page?.sourceType === 'html-template' && String(page?.source || '').trim(),
      );
      if (!managedPages.length) continue;
      managedSources.push({
        clientId: client.id,
        sourceId: `managed-${client.id}`,
        root: path.join(item.projectRoot, 'html-pages', client.id),
        shellMode: 'auto',
        managed: true,
        pages: managedPages,
      });
    }
    const allSources = [...item.sources, ...managedSources];
    roots[item.projectId] = allSources.map((source) => ({
      clientId: source.clientId,
      sourceId: source.sourceId || source.clientId,
      root: source.prototypeRoot || source.root,
      shellMode: source.shellMode,
    }));

    for (const prototypeSource of allSources.filter((source) => !source.managed)) {
      const htmlFiles = await walkFiles(prototypeSource.prototypeRoot || prototypeSource.root);
      for (const absolutePath of htmlFiles) {
        if (!HTML_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) continue;
        const relativePath = toWebPath(path.relative(prototypeSource.prototypeRoot, absolutePath));
        const source = await fs.readFile(absolutePath, 'utf8');
        const exportManifest = readPlatformExportManifest(source);
        const isContentOnlyHtml = isHtmlPrototypeContentSource(source);
        const clientId = resolveClientId({
          prototype: item.manifest.prototype,
          sourceClientId: prototypeSource.clientId,
          manifestClientId: exportManifest?.client,
          relativePath,
          clients,
        });
        if (!clientId || !definitions[clientId]) continue;
        const clientDefinition = definitions[clientId];
        const sourcePath = prototypeSource.clientId
          ? relativePath
          : resolveSourceRelativePath(relativePath, clientId, clients);
        const explicitPath = isContentOnlyHtml
          ? routePathFromPlatformExportManifest(exportManifest)
          : readMetaValue(source, 'prototype-path');
        const pagePath = createRoutePath(sourcePath, explicitPath);
        // 页面标识只依赖项目配置中的相对来源，不依赖本机挂载后的绝对路径。
        // 这样移动外置目录或在另一台电脑重新挂载时，路由顺序和 PRD 关联仍能保持稳定。
        const sourceIdentity = `${clientId}/${prototypeSource.sourceId || prototypeSource.configuredRoot || prototypeSource.root}/${relativePath}`;
        const manifestPageKey =
          isContentOnlyHtml && exportManifest?.pageKey ? normalizeSlug(exportManifest.pageKey) : '';
        const pageName = manifestPageKey
          ? `html-${manifestPageKey}-${shortHash(sourceIdentity)}`
          : `html-${shortHash(sourceIdentity)}`;
        const sectionCandidates = [
          readMetaValue(source, 'prototype-section'),
          isContentOnlyHtml ? String(exportManifest?.menuSection || '').trim() : '',
          prototypeSource.section,
          String(item.manifest.prototype.section || '').trim(),
        ];
        const section =
          sectionCandidates.find((candidate) =>
            clientDefinition.sections?.some((item) => item.id === candidate),
          ) ||
          clientDefinition.sections?.[0]?.id ||
          'workspace';
        const page = {
          path: pagePath,
          name: pageName,
          title: isContentOnlyHtml
            ? exportManifest?.pageTitle || exportManifest?.menuTitle || readHtmlTitle(source, absolutePath)
            : readHtmlTitle(source, absolutePath),
          sourceType: 'html-direct',
          source: relativePath,
          sourceRoot: prototypeSource.sourceId || prototypeSource.clientId || '_',
          renderMode:
            prototypeSource.shellMode === 'full' ? 'full' : isContentOnlyHtml ? 'content-only' : 'full',
          section,
          icon:
            readMetaValue(source, 'prototype-icon') ||
            (isContentOnlyHtml ? exportManifest?.menuIcon : '') ||
            prototypeSource.icon ||
            'Document',
          menu:
            isContentOnlyHtml && typeof exportManifest?.menu === 'boolean'
              ? exportManifest.menu
              : readMetaValue(source, 'prototype-menu') !== 'false',
        };
        pagesByClient[clientId] ||= [];
        pagesByClient[clientId].push(page);
      }
    }

    for (const source of managedSources) {
      for (const page of source.pages) {
        const relativePath = String(page.source || '')
          .replaceAll('\\', '/')
          .replace(/^\/+/, '');
        const absolutePath = path.resolve(source.root, ...relativePath.split('/'));
        if (
          !isSafeRelativePath(relativePath) ||
          !HTML_EXTENSIONS.has(path.extname(relativePath).toLowerCase()) ||
          !isInsideRoot(source.root, absolutePath) ||
          !(await fileExists(absolutePath))
        ) {
          continue;
        }
        pagesByClient[source.clientId] ||= [];
        pagesByClient[source.clientId].push({
          path: page.path,
          name: page.name,
          title: page.title,
          sourceType: 'html-template',
          source: relativePath,
          sourceRoot: source.sourceId,
          renderMode: 'content-only',
          section: page.section,
          icon: page.icon || 'Document',
          menu: page.menu !== false,
        });
      }
    }
    const routeOrder = JSON.parse(
      await fs
        .readFile(path.join(item.projectRoot, '.platform', 'route-order.json'), 'utf8')
        .catch(() => '{}'),
    );
    const sectionsByClient = {};
    for (const [clientId, definition] of Object.entries(definitions)) {
      const ordered = orderClientRouteData(
        definition.sections || [],
        pagesByClient[clientId] || [],
        routeOrder?.clients?.[clientId] || {},
      );
      pagesByClient[clientId] = ordered.pages;
      sectionsByClient[clientId] = ordered.sections;
    }
    projects[item.projectId] = pagesByClient;
    sections[item.projectId] = sectionsByClient;
  }

  return { projects, roots, sections };
}

function resolvePublicFile(root, relativePath) {
  const normalizedPath = String(relativePath || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '');
  const target = path.resolve(root, ...normalizedPath.split('/'));
  if (!isInsideRoot(root, target) || !PUBLIC_EXTENSIONS.has(path.extname(target).toLowerCase())) return null;
  return target;
}

function mimeTypeFor(filePath) {
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.gif': 'image/gif',
      '.html': 'text/html; charset=utf-8',
      '.htm': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.ttf': 'font/ttf',
      '.wasm': 'application/wasm',
      '.webmanifest': 'application/manifest+json',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    }[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
  );
}

const CONTENT_ONLY_STYLE = `
<style id="platform-html-content-only">
  html,
  body,
  #app {
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 100% !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }
  .app-shell {
    display: block !important;
    width: 100% !important;
    min-height: 100vh !important;
    height: auto !important;
    overflow: visible !important;
    background: transparent !important;
  }
  .app-sidebar,
  .topbar,
  .sidebar-scrim,
  .prototype-sidebar,
  .prototype-topbar {
    display: none !important;
  }
  .page-workspace {
    display: block !important;
    width: 100% !important;
    min-height: 100vh !important;
    height: auto !important;
    overflow: visible !important;
  }
  .page-container {
    width: 100% !important;
    min-height: 100vh !important;
    padding: 24px 28px 32px !important;
    overflow: visible !important;
  }
  .prototype-app {
    display: block !important;
    width: 100% !important;
    min-height: 100vh !important;
    height: auto !important;
    overflow: visible !important;
    background: transparent !important;
  }
  .prototype-workspace {
    display: block !important;
    width: 100% !important;
    min-height: 100vh !important;
    height: auto !important;
    overflow: visible !important;
  }
  .prototype-main {
    width: 100% !important;
    min-height: 100vh !important;
    padding: 24px 28px 32px !important;
    overflow: visible !important;
  }
</style>`;

export function applyContentOnlyMode(source) {
  if (!isHtmlPrototypeContentSource(source) || /id=["']platform-html-content-only["']/i.test(source))
    return source;
  if (/<\/head>/i.test(source)) return source.replace(/<\/head>/i, `${CONTENT_ONLY_STYLE}</head>`);
  return `${CONTENT_ONLY_STYLE}${source}`;
}

function isLocalRequest(req) {
  const address = String(req.socket?.remoteAddress || '').replace('::ffff:', '');
  return address === '' || address === '127.0.0.1' || address === '::1' || address === 'localhost';
}

function sourceContentDisposition(filePath) {
  const fileName = path.basename(filePath);
  const fallbackName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\\r\n]/g, '_');
  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function htmlPrototypePlugin({
  projectsRoot,
  mountsPath = '',
  loadMounts = async () => ({ projects: {} }),
}) {
  const root = path.resolve(projectsRoot);
  const localMountsPath = mountsPath ? path.resolve(mountsPath) : '';
  let isBuild = false;
  let scanState = { projects: {}, roots: {}, sections: {} };
  let refreshTimer = null;

  async function refreshState() {
    scanState = await scanHtmlPrototypePages(root, { mounts: await loadMounts() });
    return scanState;
  }

  return {
    name: 'html-prototype',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    resolveId(id) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined;
      const state = await refreshState();
      return `export default ${JSON.stringify(state.projects)};`;
    },
    async configureServer(server) {
      await refreshState();
      server.watcher.add(root);
      if (localMountsPath) server.watcher.add(localMountsPath);
      Object.values(scanState.roots)
        .flat()
        .forEach((source) => server.watcher.add(source.root));
      server.watcher.on('all', (_eventName, changedPath) => {
        const absolutePath = path.resolve(changedPath);
        const relativePath = toWebPath(path.relative(root, absolutePath));
        const isProjectConfigChange =
          absolutePath === root || /^([a-z][a-z0-9-]*)\/project\.json$/i.test(relativePath);
        const isMountChange = Boolean(localMountsPath && absolutePath === localMountsPath);
        const isPrototypeChange = Object.values(scanState.roots)
          .flat()
          .some((source) => absolutePath === source.root || isInsideRoot(source.root, absolutePath));
        if (!isProjectConfigChange && !isPrototypeChange && !isMountChange) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(async () => {
          try {
            await refreshState();
            Object.values(scanState.roots)
              .flat()
              .forEach((source) => server.watcher.add(source.root));
            const virtualModule = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
            if (virtualModule && (isProjectConfigChange || isPrototypeChange || isMountChange)) {
              server.moduleGraph.invalidateModule(virtualModule);
            }
            if (isPrototypeChange || isMountChange) server.ws.send({ type: 'full-reload' });
          } catch (error) {
            server.config.logger.error(`[html-prototype] 原型目录刷新失败：${error.message}`);
          }
        }, 120);
      });

      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        if (requestUrl.pathname === HTML_PAGES_API_PATH) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(
            JSON.stringify({
              generatedAt: new Date().toISOString(),
              projects: scanState.projects,
              sections: scanState.sections,
            }),
          );
          return;
        }
        const prefix = '/__projects/html-content/';
        if (!requestUrl.pathname.startsWith(prefix)) return next();
        const pathParts = requestUrl.pathname.slice(prefix.length).split('/').filter(Boolean);
        const projectId = decodePathSegment(pathParts.shift() || '');
        const clientId = decodePathSegment(pathParts.shift() || '_');
        const relativePath = pathParts.map(decodePathSegment).join('/');
        const prototypeSource = (scanState.roots[projectId] || []).find(
          (source) => (source.sourceId || source.clientId || '_') === clientId,
        );
        const target = prototypeSource ? resolvePublicFile(prototypeSource.root, relativePath) : null;
        if (!target) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ message: 'HTML 原型文件不存在或路径无效。' }));
          return;
        }
        try {
          const isHtml = /\.html?$/i.test(target);
          const downloadSource = requestUrl.searchParams.get('download') === 'source';
          if (downloadSource && (!isHtml || !isLocalRequest(req))) {
            res.statusCode = isHtml ? 403 : 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                message: isHtml ? '页面源文件下载仅允许本机使用。' : '当前文件不是 HTML 页面。',
              }),
            );
            return;
          }
          const content = isHtml
            ? Buffer.from(
                downloadSource || prototypeSource.shellMode === 'full'
                  ? await fs.readFile(target, 'utf8')
                  : applyContentOnlyMode(await fs.readFile(target, 'utf8')),
                'utf8',
              )
            : await fs.readFile(target);
          res.statusCode = 200;
          res.setHeader('Content-Type', mimeTypeFor(target));
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          if (downloadSource) res.setHeader('Content-Disposition', sourceContentDisposition(target));
          res.end(content);
        } catch (error) {
          res.statusCode = error.code === 'ENOENT' ? 404 : 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ message: 'HTML 原型文件读取失败。', detail: error.message }));
        }
      });
    },
    async buildStart() {
      if (!isBuild) return;
      const state = await refreshState();
      this.emitFile({
        type: 'asset',
        fileName: 'projects/html-pages.json',
        source: JSON.stringify(
          { generatedAt: new Date().toISOString(), projects: state.projects, sections: state.sections },
          null,
          2,
        ),
      });
      for (const [projectId, sources] of Object.entries(state.roots)) {
        for (const prototypeSource of sources) {
          for (const absolutePath of await walkFiles(prototypeSource.root)) {
            const relativePath = toWebPath(path.relative(prototypeSource.root, absolutePath));
            const sourceId = prototypeSource.sourceId || prototypeSource.clientId || '';
            const clientPrefix = sourceId ? `${sourceId}/` : '';
            const source = await fs.readFile(absolutePath);
            const output = /\.html?$/i.test(absolutePath)
              ? Buffer.from(
                  prototypeSource.shellMode === 'full'
                    ? source.toString('utf8')
                    : applyContentOnlyMode(source.toString('utf8')),
                  'utf8',
                )
              : source;
            this.emitFile({
              type: 'asset',
              fileName: `projects/${projectId}/prototype/${clientPrefix}${relativePath}`,
              source: output,
            });
          }
        }
      }
    },
  };
}
