import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  fileExists,
  isInsideRoot,
  normalizePrototypeSources,
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

async function readProjectManifests(projectsRoot) {
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
      for (const source of normalizePrototypeSources(manifest.prototype)) {
        const prototypeRoot = path.resolve(projectRoot, source.root);
        if (await fileExists(prototypeRoot, 'directory')) sources.push({ ...source, prototypeRoot });
      }
      if (!sources.length) continue;
      manifests.push({ projectId: entry.name, projectRoot, manifest, sources });
    } catch {
      // 项目包完整性由项目包扫描器负责；这里跳过无法读取的项目包。
    }
  }
  return manifests;
}

export async function scanHtmlPrototypePages(projectsRoot) {
  const projects = {};
  const roots = {};
  const manifests = await readProjectManifests(path.resolve(projectsRoot));

  for (const item of manifests) {
    const definitions = await readProjectDefinition(item.projectRoot, item.manifest).catch(() => ({}));
    const clients = item.manifest.clients || [];
    const pagesByClient = {};
    roots[item.projectId] = item.sources.map((source) => ({
      clientId: source.clientId,
      root: source.prototypeRoot,
      shellMode: source.shellMode,
    }));

    for (const prototypeSource of item.sources) {
      const htmlFiles = await walkFiles(prototypeSource.prototypeRoot);
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
        const sourceIdentity = `${clientId}/${prototypeSource.root}/${relativePath}`;
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
          sourceRoot: prototypeSource.clientId || '_',
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
    projects[item.projectId] = pagesByClient;
  }

  return { projects, roots };
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

export function htmlPrototypePlugin({ projectsRoot }) {
  const root = path.resolve(projectsRoot);
  let isBuild = false;
  let scanState = { projects: {}, roots: {} };
  let refreshTimer = null;

  async function refreshState() {
    scanState = await scanHtmlPrototypePages(root);
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
      Object.values(scanState.roots)
        .flat()
        .forEach((source) => server.watcher.add(source.root));
      server.watcher.on('all', (_eventName, changedPath) => {
        const absolutePath = path.resolve(changedPath);
        const relativePath = toWebPath(path.relative(root, absolutePath));
        const isProjectConfigChange =
          absolutePath === root || /^([a-z][a-z0-9-]*)\/project\.json$/i.test(relativePath);
        const isPrototypeChange = Object.values(scanState.roots)
          .flat()
          .some((source) => absolutePath === source.root || isInsideRoot(source.root, absolutePath));
        if (!isProjectConfigChange && !isPrototypeChange) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(async () => {
          try {
            await refreshState();
            Object.values(scanState.roots)
              .flat()
              .forEach((source) => server.watcher.add(source.root));
            const virtualModule = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
            if (virtualModule && (isProjectConfigChange || isPrototypeChange)) {
              server.moduleGraph.invalidateModule(virtualModule);
            }
            if (isPrototypeChange) server.ws.send({ type: 'full-reload' });
          } catch (error) {
            server.config.logger.error(`[html-prototype] 原型目录刷新失败：${error.message}`);
          }
        }, 120);
      });

      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        const prefix = '/__projects/html-content/';
        if (!requestUrl.pathname.startsWith(prefix)) return next();
        const pathParts = requestUrl.pathname.slice(prefix.length).split('/').filter(Boolean);
        const projectId = decodePathSegment(pathParts.shift() || '');
        const clientId = decodePathSegment(pathParts.shift() || '_');
        const relativePath = pathParts.map(decodePathSegment).join('/');
        const prototypeSource = (scanState.roots[projectId] || []).find(
          (source) => (source.clientId || '_') === clientId,
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
          const content = isHtml
            ? Buffer.from(
                prototypeSource.shellMode === 'full'
                  ? await fs.readFile(target, 'utf8')
                  : applyContentOnlyMode(await fs.readFile(target, 'utf8')),
                'utf8',
              )
            : await fs.readFile(target);
          res.statusCode = 200;
          res.setHeader('Content-Type', mimeTypeFor(target));
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('X-Content-Type-Options', 'nosniff');
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
      for (const [projectId, sources] of Object.entries(state.roots)) {
        for (const prototypeSource of sources) {
          for (const absolutePath of await walkFiles(prototypeSource.root)) {
            const relativePath = toWebPath(path.relative(prototypeSource.root, absolutePath));
            const clientPrefix = prototypeSource.clientId ? `${prototypeSource.clientId}/` : '';
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
