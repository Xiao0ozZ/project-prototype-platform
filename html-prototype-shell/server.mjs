import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const shellRoot = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(shellRoot, 'public');
const configPath = path.join(shellRoot, 'config.json');
const bindingsPath = path.join(shellRoot, 'bindings.json');
const pageRulesPath = path.join(shellRoot, 'page-rules.json');
const DEFAULT_PORT = 5190;
const DEFAULT_BRANDING = {
  name: 'RIMO Rental',
  subtitle: '原型工作台',
  themeColor: '#0879B0',
};
const DEFAULT_MENU = {
  groupByFolder: true,
  labelSource: 'title',
  compactTitle: true,
};
const MAX_PARALLEL_READS = 16;
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'exports', '.git']);

const pageMetadataCache = new Map();
const documentMetadataCache = new Map();
let settingsCache = null;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.map': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    if (error instanceof SyntaxError) {
      throw new HttpError(500, `${path.basename(filePath)} 不是有效的 JSON：${error.message}`);
    }
    throw error;
  }
}

async function fileSignature(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return `${stats.mtimeMs}:${stats.size}`;
  } catch (error) {
    if (error.code === 'ENOENT') return 'missing';
    throw error;
  }
}

function normalizePort(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new HttpError(500, 'config.json 中的 port 必须是 1–65535 之间的整数。');
  }
  return port;
}

function normalizeHideSelectors(value, label = 'config.json 中的 hideSelectors') {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(500, `${label} 必须是数组。`);
  }
  const selectors = value
    .filter((selector) => typeof selector === 'string')
    .map((selector) => selector.trim())
    .filter(Boolean);
  const unsafe = selectors.find((selector) => /[{}]|<\/style/i.test(selector));
  if (unsafe) throw new HttpError(500, `${label} 包含不安全的选择器：${unsafe}`);
  return [...new Set(selectors)];
}

function resolveConfiguredRoot(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(500, `${label} 必须是相对于 html-prototype-shell 的非空相对路径。`);
  }
  const configuredPath = value.trim().replaceAll('\\', '/');
  if (path.isAbsolute(configuredPath) || /^[A-Z]:\//i.test(configuredPath) || configuredPath.startsWith('//')) {
    throw new HttpError(500, `${label} 必须使用相对路径，不能写入本机绝对路径。`);
  }
  return path.resolve(shellRoot, configuredPath);
}

function normalizeBranding(value, statusCode = 500) {
  const branding = value === undefined || value === null ? {} : value;
  if (!branding || typeof branding !== 'object' || Array.isArray(branding)) {
    throw new HttpError(statusCode, '外壳 branding 必须是对象。');
  }
  const name = String(branding.name ?? DEFAULT_BRANDING.name).replace(/\s+/g, ' ').trim();
  const subtitle = String(branding.subtitle ?? DEFAULT_BRANDING.subtitle).replace(/\s+/g, ' ').trim();
  const themeColor = String(branding.themeColor ?? DEFAULT_BRANDING.themeColor).trim().toUpperCase();
  if (!name || name.length > 64) {
    throw new HttpError(statusCode, '项目名称不能为空且不能超过 64 个字符。');
  }
  if (subtitle.length > 64) {
    throw new HttpError(statusCode, '项目副标题不能超过 64 个字符。');
  }
  if (!/^#[0-9A-F]{6}$/.test(themeColor)) {
    throw new HttpError(statusCode, '主题色必须是 6 位十六进制颜色，例如 #0879B0。');
  }
  return { name, subtitle, themeColor };
}

function normalizeMenu(value, statusCode = 500) {
  const menu = value === undefined || value === null ? {} : value;
  if (!menu || typeof menu !== 'object' || Array.isArray(menu)) {
    throw new HttpError(statusCode, '外壳 menu 必须是对象。');
  }
  const labelSource = menu.labelSource ?? DEFAULT_MENU.labelSource;
  if (!['title', 'filename'].includes(labelSource)) {
    throw new HttpError(statusCode, '菜单名称来源只支持 title 或 filename。');
  }
  return {
    groupByFolder: menu.groupByFolder !== false,
    labelSource,
    compactTitle: menu.compactTitle !== false,
  };
}

function normalizePageRules(value) {
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(500, 'page-rules.json 的根节点必须是对象。');
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([page, rule]) => page !== '_comment' && rule && typeof rule === 'object')
      .map(([page, rule]) => {
        const normalizedPage = page.replaceAll('\\', '/').replace(/^\/+/, '');
        const layoutMode = rule.layoutMode || 'auto';
        const contentRoot = typeof rule.contentRoot === 'string' ? rule.contentRoot.trim() : '';
        if (!['auto', 'content'].includes(layoutMode)) {
          throw new HttpError(500, `${page} 的 layoutMode 只支持 auto 或 content。`);
        }
        if (layoutMode === 'content' && !contentRoot) {
          throw new HttpError(500, `${page} 使用指定内容区模式时必须配置 contentRoot。`);
        }
        return [
          normalizedPage,
          {
            contentRoot,
            layoutMode,
            hideSelectors: normalizeHideSelectors(rule.hideSelectors, `${page} 的 hideSelectors`),
            excludeGlobalSelectors: normalizeHideSelectors(
              rule.excludeGlobalSelectors,
              `${page} 的 excludeGlobalSelectors`,
            ),
          },
        ];
      })
      .filter(([page]) => page),
  );
}

function normalizeBindings(value) {
  if (!Array.isArray(value)) {
    throw new HttpError(500, 'bindings.json 的根节点必须是数组。');
  }
  return value
    .filter((item) => item && typeof item === 'object' && !item._comment)
    .filter((item) => typeof item.page === 'string' && typeof item.document === 'string')
    .map((item) => ({
      ...item,
      page: item.page.replaceAll('\\', '/').replace(/^\/+/, ''),
      document: item.document.replaceAll('\\', '/').replace(/^\/+/, ''),
    }))
    .filter((item) => item.page && item.document);
}

async function loadSettings({ force = false } = {}) {
  const [configSignature, bindingsSignature, pageRulesSignature] = await Promise.all([
    fileSignature(configPath),
    fileSignature(bindingsPath),
    fileSignature(pageRulesPath),
  ]);
  const signature = `${configSignature}|${bindingsSignature}|${pageRulesSignature}`;
  if (!force && settingsCache?.signature === signature) return settingsCache.value;

  const config = await readJson(configPath, {});
  const bindings = await readJson(bindingsPath, []);
  const pageRules = await readJson(pageRulesPath, {});
  const value = {
    ...config,
    port: normalizePort(config.port),
    prototypeRoot: resolveConfiguredRoot(config.prototypeRoot, 'config.json 的 prototypeRoot'),
    docsRoot: resolveConfiguredRoot(config.docsRoot, 'config.json 的 docsRoot'),
    hideSelectors: normalizeHideSelectors(config.hideSelectors),
    branding: normalizeBranding(config.branding),
    menu: normalizeMenu(config.menu),
    bindings: normalizeBindings(bindings),
    pageRules: normalizePageRules(pageRules),
  };
  settingsCache = { signature, value };
  return value;
}

async function readJsonBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) throw new HttpError(413, '请求内容过大。');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch (error) {
    throw new HttpError(400, `请求内容不是有效的 JSON：${error.message}`);
  }
}

async function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
  }
  settingsCache = null;
}

function normalizePagePath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\/+/, '').trim();
}

async function savePageBindings(page, value) {
  const normalizedPage = normalizePagePath(page);
  if (!normalizedPage) throw new HttpError(400, '缺少需要维护的页面路径。');
  if (!Array.isArray(value)) throw new HttpError(400, '页面关联必须是数组。');
  if (
    value.some(
      (binding) =>
        !binding || typeof binding !== 'object' || typeof binding.document !== 'string' || !binding.document.trim(),
    )
  ) {
    throw new HttpError(400, '每条页面关联都必须包含 PRD 文件路径。');
  }
  const current = normalizeBindings(await readJson(bindingsPath, []));
  const incoming = normalizeBindings(value.map((binding) => ({ ...binding, page: normalizedPage })));
  const primaryCount = incoming.filter((binding) => binding.primary).length;
  if (primaryCount > 1) throw new HttpError(400, '同一页面只能设置一个主 PRD。');
  const keys = new Set();
  incoming.forEach((binding) => {
    const key = `${binding.page}\n${binding.document}`;
    if (keys.has(key)) throw new HttpError(400, `重复关联：${binding.document}`);
    keys.add(key);
  });
  const settings = await loadSettings();
  await fs.access(safePath(settings.prototypeRoot, normalizedPage)).catch(() => {
    throw new HttpError(400, `页面不存在：${normalizedPage}`);
  });
  await Promise.all(
    incoming.map((binding) =>
      fs.access(safePath(settings.docsRoot, binding.document)).catch(() => {
        throw new HttpError(400, `PRD 不存在：${binding.document}`);
      }),
    ),
  );
  const next = [];
  let inserted = false;
  current.forEach((binding) => {
    if (binding.page !== normalizedPage) {
      next.push(binding);
      return;
    }
    if (!inserted) {
      next.push(...incoming);
      inserted = true;
    }
  });
  if (!inserted) next.push(...incoming);
  await writeJsonAtomic(bindingsPath, next);
  return next;
}

async function savePageRule(page, value) {
  const normalizedPage = normalizePagePath(page);
  if (!normalizedPage) throw new HttpError(400, '缺少需要维护的页面路径。');
  const settings = await loadSettings();
  await fs.access(safePath(settings.prototypeRoot, normalizedPage)).catch(() => {
    throw new HttpError(400, `页面不存在：${normalizedPage}`);
  });
  const current = await readJson(pageRulesPath, {});
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    throw new HttpError(500, 'page-rules.json 的根节点必须是对象。');
  }
  const next = { ...current };
  if (value === null) delete next[normalizedPage];
  else {
    const normalized = normalizePageRules({ [normalizedPage]: value });
    next[normalizedPage] = normalized[normalizedPage];
  }
  await writeJsonAtomic(pageRulesPath, next);
  return normalizePageRules(next);
}

async function saveBranding(value) {
  const config = await readJson(configPath, {});
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new HttpError(500, 'config.json 的根节点必须是对象。');
  }
  const branding = normalizeBranding(value, 400);
  await writeJsonAtomic(configPath, { ...config, branding });
  return branding;
}

async function saveMenu(value) {
  const config = await readJson(configPath, {});
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new HttpError(500, 'config.json 的根节点必须是对象。');
  }
  const menu = normalizeMenu(value, 400);
  await writeJsonAtomic(configPath, { ...config, menu });
  return menu;
}

function isInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safePath(root, relativePath) {
  let decoded = '';
  try {
    decoded = decodeURIComponent(String(relativePath || '')).replace(/^[/\\]+/, '');
  } catch {
    throw new HttpError(400, '文件路径编码无效。');
  }
  if (decoded.includes('\0')) throw new HttpError(400, '文件路径包含无效字符。');
  const target = path.resolve(root, decoded);
  if (!isInside(root, target)) throw new HttpError(403, '非法文件路径。');
  return target;
}

async function walkFiles(root, extensions) {
  const files = [];
  async function visit(directory, isRoot = false) {
    let entries = [];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (!isRoot && error.code === 'ENOENT') return;
      if (error.code === 'ENOENT') throw new HttpError(500, `目录不存在：${directory}`);
      throw error;
    }
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name, 'zh-CN', { numeric: true }),
    )) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
        files.push(absolutePath);
      }
    }
  }
  await visit(root, true);
  return files;
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function readCachedMetadata(filePath, cache, createMetadata) {
  const stats = await fs.stat(filePath);
  const signature = `${stats.mtimeMs}:${stats.size}`;
  const cached = cache.get(filePath);
  if (cached?.signature === signature) return cached.metadata;
  const source = await fs.readFile(filePath, 'utf8');
  const metadata = createMetadata(source, stats);
  cache.set(filePath, { signature, metadata });
  return metadata;
}

function pruneMetadataCache(cache, files) {
  const activeFiles = new Set(files);
  cache.keys().forEach((filePath) => {
    if (!activeFiles.has(filePath)) cache.delete(filePath);
  });
}

function readHtmlTitle(source, fallback) {
  return (
    source
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .trim() ||
    source
      .match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .trim() ||
    fallback
  );
}

function compactMenuTitle(title, fallback = '') {
  const original = String(title || fallback).trim();
  if (!original) return String(fallback || '').trim();
  const withoutBrandSuffix = original
    .replace(/\s+[-–—|·]\s+(?:RIMO(?:\s+(?:Rental|Admin|Enterprise))?|RIMORental)\s*$/i, '')
    .trim();
  const withoutBrandPrefix = withoutBrandSuffix
    .replace(/^(?:RIMO(?:\s+(?:Rental|Admin|Enterprise))?|RIMORental)\s*[-–—|·]\s*/i, '')
    .trim();
  return withoutBrandPrefix || withoutBrandSuffix || original;
}

function readMarkdownTitle(source, fallback) {
  return source.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function readMarkdownHeadings(source) {
  return [...String(source || '').matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) =>
    match[1]
      .replace(/\s+#+\s*$/, '')
      .replace(/\*\*|__|`/g, '')
      .trim(),
  );
}

function bindingFor(bindings, pagePath) {
  const normalized = pagePath.replaceAll('\\', '/');
  const exactMatch = bindings.find((item) => item.page === normalized);
  if (exactMatch) return exactMatch;

  const basenameMatches = bindings.filter(
    (item) => path.basename(item.page || '') === path.basename(normalized),
  );
  return basenameMatches.length === 1 ? basenameMatches[0] : null;
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function jsonResponse(res, payload, statusCode = 200) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': body.byteLength,
  });
  res.end(body);
}

function textResponse(res, body, contentType = 'text/plain; charset=utf-8', statusCode = 200) {
  const responseBody = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Content-Length': responseBody.byteLength,
  });
  res.end(responseBody);
}

async function notFoundResponse(res) {
  return textResponse(
    res,
    await fs.readFile(path.join(publicRoot, '404.html'), 'utf8'),
    'text/html; charset=utf-8',
    404,
  );
}

function injectPrototypeBridge(source, pagePath, settings) {
  const pageRule = settings.pageRules?.[pagePath] || {
    contentRoot: '',
    layoutMode: 'auto',
    hideSelectors: [],
    excludeGlobalSelectors: [],
  };
  const excludedSelectors = new Set(pageRule.excludeGlobalSelectors);
  const hiddenSelectors = [
    ...settings.hideSelectors.filter((selector) => !excludedSelectors.has(selector)),
    ...pageRule.hideSelectors,
  ].filter((selector, index, list) => list.indexOf(selector) === index);
  const selectorCss = hiddenSelectors
    .filter((selector) => typeof selector === 'string' && selector.trim())
    .map((selector) => `${selector.trim()} { display: none !important; }`)
    .join('\n');
  const isolationCss = `
    html,
    body {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      overflow: auto !important;
    }
    #app,
    .app-shell,
    .prototype-app {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      min-height: 100% !important;
      margin: 0 !important;
    }
    [data-html-prototype-grid-root] {
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-rows: minmax(0, 1fr) !important;
    }
    [data-html-prototype-content-host] {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      flex: 1 1 auto !important;
    }
    [data-html-prototype-content-scroll] {
      max-width: none !important;
      min-width: 0 !important;
      margin-left: 0 !important;
    }
    ${selectorCss}
  `;
  const bridgeSettings = JSON.stringify({
    hiddenSelectors,
    contentRoot: pageRule.contentRoot,
    layoutMode: pageRule.layoutMode,
  }).replaceAll('<', '\\u003c');
  const bridgeScript = `
    <script id="html-prototype-shell-bridge">
      (() => {
        const bridgeSettings = ${bridgeSettings};
        const { hiddenSelectors, contentRoot, layoutMode } = bridgeSettings;
        const safeMatches = (element, selector) => {
          try {
            return element.matches(selector);
          } catch {
            return false;
          }
        };
        const safeQuerySelector = (selector) => {
          if (!selector) return null;
          try {
            return document.querySelector(selector);
          } catch {
            return null;
          }
        };
        const describeElement = (element) => {
          if (!element) return '';
          const id = element.id ? '#' + element.id : '';
          const classes = [...element.classList].slice(0, 2).map((name) => '.' + name).join('');
          return element.tagName.toLowerCase() + id + classes;
        };
        const isConfiguredShellElement = (element) =>
          hiddenSelectors.some((selector) => safeMatches(element, selector));
        const isLayoutElement = (element) =>
          !['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK'].includes(element.tagName);

        const normalizeRoot = (root) => {
          if (!root) return;
          root.removeAttribute('data-html-prototype-grid-root');
          root.querySelectorAll('[data-html-prototype-content-host], [data-html-prototype-content-scroll]').forEach(
            (element) => {
              element.removeAttribute('data-html-prototype-content-host');
              element.removeAttribute('data-html-prototype-content-scroll');
            },
          );

          const children = [...root.children].filter(isLayoutElement);
          const hasHiddenShellChild = children.some(isConfiguredShellElement);
          const visibleChildren = children.filter(
            (element) => !isConfiguredShellElement(element) && getComputedStyle(element).display !== 'none',
          );
          if (!visibleChildren.length) return;

          const rootDisplay = getComputedStyle(root).display;
          if (hasHiddenShellChild && rootDisplay.includes('grid')) {
            root.setAttribute('data-html-prototype-grid-root', '');
          }

          const explicitContentRoot = safeQuerySelector(contentRoot);
          const contentHost =
            explicitContentRoot ||
            visibleChildren.reduce((largest, element) => {
              const rect = element.getBoundingClientRect();
              const area = Math.max(rect.width, element.scrollWidth) * Math.max(rect.height, element.scrollHeight);
              return !largest || area > largest.area ? { element, area } : largest;
            }, null)?.element;
          if (!contentHost) return;

          contentHost.setAttribute('data-html-prototype-content-host', '');
          const contentScroll =
            (contentHost.matches('main') ? contentHost : contentHost.querySelector(':scope > main')) ||
            contentHost.querySelector('.page-container, .prototype-main, .main-content, .content-wrapper');
          contentScroll?.setAttribute('data-html-prototype-content-scroll', '');
        };

        const normalizeLayout = () => {
          const roots = [
            document.querySelector('#app'),
            document.querySelector('.app-shell'),
            document.querySelector('.prototype-app'),
          ].filter((root, index, list) => root && list.indexOf(root) === index);
          if (roots.length) roots.forEach(normalizeRoot);
          else normalizeRoot(document.body);
        };
        const resetHorizontalOffsets = () => {
          const candidates = [
            document.scrollingElement,
            document.documentElement,
            document.body,
            document.querySelector('#app'),
            document.querySelector('.app-shell'),
            document.querySelector('.prototype-app'),
            document.querySelector('[data-html-prototype-content-host]'),
            document.querySelector('[data-html-prototype-content-scroll]'),
          ].filter((element, index, list) => element && list.indexOf(element) === index);
          candidates.forEach((element) => {
            if (element.scrollLeft) element.scrollLeft = 0;
          });
        };
        const stabilizeLayout = () => {
          normalizeLayout();
          resetHorizontalOffsets();
        };
        const buildDiagnostic = () => ({
          layoutMode,
          requestedContentRoot: contentRoot,
          contentRootMatched: Boolean(safeQuerySelector(contentRoot)),
          contentHost: describeElement(document.querySelector('[data-html-prototype-content-host]')),
          hiddenMatches: hiddenSelectors.map((selector) => ({
            selector,
            count: (() => {
              try {
                return document.querySelectorAll(selector).length;
              } catch {
                return -1;
              }
            })(),
          })),
        });
        const postToShell = (type, detail = {}) => {
          if (window.parent === window) return;
          window.parent.postMessage(
            { type, path: location.pathname, search: location.search, hash: location.hash, detail },
            location.origin,
          );
        };
        const notify = () => postToShell('html-prototype:navigate');
        const notifyReady = () => postToShell('html-prototype:layout-ready', buildDiagnostic());
        let layoutFrame = 0;
        const scheduleLayout = () => {
          if (layoutFrame) return;
          layoutFrame = requestAnimationFrame(() => {
            layoutFrame = 0;
            stabilizeLayout();
          });
        };
        let readyTimer = 0;
        const settle = () => {
          stabilizeLayout();
          notify();
          scheduleLayout();
          setTimeout(scheduleLayout, 120);
          setTimeout(scheduleLayout, 360);
          clearTimeout(readyTimer);
          readyTimer = setTimeout(() => {
            stabilizeLayout();
            notifyReady();
          }, 180);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', settle, { once: true });
        else settle();
        window.addEventListener('load', settle, { once: true });
        window.addEventListener('resize', scheduleLayout, { passive: true });
        window.addEventListener('hashchange', notify);
        document.addEventListener('click', () => setTimeout(notify, 0), true);
        ['pushState', 'replaceState'].forEach((method) => {
          const original = history[method];
          history[method] = function (...args) {
            const result = original.apply(this, args);
            queueMicrotask(notify);
            return result;
          };
        });
        window.addEventListener('popstate', notify);

        window.addEventListener('error', (event) => {
          const resource = event.target && event.target !== window ? event.target : null;
          postToShell('html-prototype:runtime-error', {
            kind: resource ? 'resource' : 'script',
            message: resource
              ? '资源加载失败：' + (resource.currentSrc || resource.src || resource.href || resource.tagName)
              : event.message || '页面脚本执行失败',
            source: event.filename || '',
            line: event.lineno || 0,
          });
        }, true);
        window.addEventListener('unhandledrejection', (event) => {
          postToShell('html-prototype:runtime-error', {
            kind: 'promise',
            message: String(event.reason?.message || event.reason || '未处理的 Promise 异常'),
          });
        });
        window.addEventListener('message', (event) => {
          if (event.source !== window.parent || event.origin !== location.origin) return;
          if (event.data?.type === 'html-prototype:reapply-layout') settle();
        });
      })();
    </script>
  `;
  const styleBlock = `<style id="html-prototype-shell-isolation" data-page-path="${escapeHtmlAttribute(pagePath)}">${isolationCss}</style>`;
  if (/<\/head>/i.test(source)) {
    return source.replace(/<\/head>/i, `${styleBlock}</head>`).replace(/<\/body>/i, `${bridgeScript}</body>`);
  }
  return `${styleBlock}${source}${bridgeScript}`;
}

async function listPages(settings) {
  const files = await walkFiles(settings.prototypeRoot, new Set(['.html', '.htm']));
  const pages = await mapWithConcurrency(
    files,
    MAX_PARALLEL_READS,
    async (filePath) => {
      const relative = relativePath(settings.prototypeRoot, filePath);
      const folder =
        path.dirname(relative).replaceAll('\\', '/') === '.'
          ? '未分组'
          : path.dirname(relative).replaceAll('\\', '/');
      const filename = path.basename(filePath, path.extname(filePath));
      const metadata = await readCachedMetadata(filePath, pageMetadataCache, (source) => ({
        title: readHtmlTitle(source, filename),
      }));
      const menuTitle = settings.menu.labelSource === 'filename'
        ? filename
        : settings.menu.compactTitle
          ? compactMenuTitle(metadata.title, filename)
          : metadata.title;
      return {
        path: relative,
        title: metadata.title,
        menuTitle,
        folder,
        binding: bindingFor(settings.bindings, relative),
      };
    },
  );
  pruneMetadataCache(pageMetadataCache, files);
  return pages;
}

async function listDocs(settings) {
  const files = await walkFiles(settings.docsRoot, new Set(['.md', '.markdown']));
  const documents = await mapWithConcurrency(
    files,
    MAX_PARALLEL_READS,
    async (filePath) => {
      const relative = relativePath(settings.docsRoot, filePath);
      const metadata = await readCachedMetadata(filePath, documentMetadataCache, (source, stats) => ({
        title: readMarkdownTitle(source, path.basename(filePath, path.extname(filePath))),
        updatedAt: stats.mtime.toISOString(),
        headings: readMarkdownHeadings(source),
      }));
      return {
        path: relative,
        title: metadata.title,
        folder:
          path.dirname(relative).replaceAll('\\', '/') === '.'
            ? '根目录'
            : path.dirname(relative).replaceAll('\\', '/'),
        updatedAt: metadata.updatedAt,
        headings: metadata.headings,
      };
    },
  );
  pruneMetadataCache(documentMetadataCache, files);
  return documents;
}

function buildHealthReport(pages, docs, bindings, pageRules = {}) {
  const pageMap = new Map(pages.map((page) => [page.path, page]));
  const documentMap = new Map(docs.map((document) => [document.path, document]));
  const boundPages = new Set();
  const boundDocuments = new Set();
  const bindingKeys = new Set();
  const duplicateBindings = [];
  const primaryCounts = new Map();
  const missingPages = [];
  const missingDocuments = [];
  const missingAnchors = [];

  bindings.forEach((binding) => {
    boundPages.add(binding.page);
    boundDocuments.add(binding.document);
    const key = `${binding.page}\n${binding.document}`;
    if (bindingKeys.has(key)) duplicateBindings.push(binding);
    bindingKeys.add(key);
    if (binding.primary) primaryCounts.set(binding.page, (primaryCounts.get(binding.page) || 0) + 1);
    if (!pageMap.has(binding.page)) missingPages.push(binding);
    const document = documentMap.get(binding.document);
    if (!document) missingDocuments.push(binding);
    else if (
      binding.anchor &&
      !document.headings.some(
        (heading) =>
          heading === binding.anchor ||
          heading.startsWith(`${binding.anchor} `) ||
          heading.startsWith(`${binding.anchor}（`) ||
          heading.startsWith(`${binding.anchor}(`),
      )
    )
      missingAnchors.push(binding);
  });

  const multiplePrimaryPages = [...primaryCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([page, count]) => ({ page, count }));
  const unboundPages = pages.filter((page) => !boundPages.has(page.path));
  const orphanDocuments = docs.filter((document) => !boundDocuments.has(document.path));
  const orphanRules = Object.keys(pageRules).filter((page) => !pageMap.has(page));
  const issueCount =
    duplicateBindings.length +
    multiplePrimaryPages.length +
    missingPages.length +
    missingDocuments.length +
    missingAnchors.length +
    orphanRules.length;

  return {
    summary: {
      pages: pages.length,
      documents: docs.length,
      bindings: bindings.length,
      issueCount,
      unboundPages: unboundPages.length,
      orphanDocuments: orphanDocuments.length,
    },
    duplicateBindings,
    multiplePrimaryPages,
    missingPages,
    missingDocuments,
    missingAnchors,
    orphanRules,
    unboundPages,
    orphanDocuments,
  };
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = requestUrl.pathname;
  const isAdminWrite =
    req.method === 'PUT' && ['/api/page-bindings', '/api/page-rule', '/api/branding', '/api/menu'].includes(pathname);
  if (req.method !== 'GET' && !isAdminWrite) {
    res.setHeader('Allow', 'GET, PUT');
    return textResponse(res, '该接口不支持当前请求方法。', 'text/plain; charset=utf-8', 405);
  }
  if (isAdminWrite && req.headers['x-prototype-shell-admin'] !== '1') {
    throw new HttpError(403, '缺少本地管理请求标记。');
  }

  if (!pathname.startsWith('/api/') && !pathname.startsWith('/prototype/')) {
    const publicPath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = safePath(publicRoot, publicPath);
    const extension = path.extname(filePath).toLowerCase();
    return textResponse(
      res,
      await fs.readFile(filePath),
      MIME_TYPES[extension] || 'application/octet-stream',
    );
  }

  const forceRefresh = requestUrl.searchParams.get('refresh') === '1';
  const settings = await loadSettings({
    force:
      forceRefresh && ['/api/bindings', '/api/bootstrap', '/api/page-rules'].includes(pathname),
  });

  if (pathname === '/api/page-bindings' && req.method === 'PUT') {
    const payload = await readJsonBody(req);
    const bindings = await savePageBindings(payload.page, payload.bindings);
    return jsonResponse(res, { bindings });
  }
  if (pathname === '/api/page-rule' && req.method === 'PUT') {
    const payload = await readJsonBody(req);
    const pageRules = await savePageRule(payload.page, payload.rule ?? null);
    return jsonResponse(res, { pageRules });
  }
  if (pathname === '/api/branding' && req.method === 'PUT') {
    const payload = await readJsonBody(req);
    const branding = await saveBranding(payload.branding);
    return jsonResponse(res, { branding });
  }
  if (pathname === '/api/menu' && req.method === 'PUT') {
    const payload = await readJsonBody(req);
    const menu = await saveMenu(payload.menu);
    return jsonResponse(res, { menu });
  }

  if (pathname === '/api/config') {
    return jsonResponse(res, {
      port: settings.port,
      prototypeRoot: settings.prototypeRoot,
      docsRoot: settings.docsRoot,
      hideSelectors: settings.hideSelectors,
      branding: settings.branding,
      menu: settings.menu,
    });
  }
  if (pathname === '/api/bootstrap') {
    if (forceRefresh) {
      pageMetadataCache.clear();
      documentMetadataCache.clear();
    }
    const [pages, docs] = await Promise.all([listPages(settings), listDocs(settings)]);
    return jsonResponse(res, {
      pages,
      docs,
      bindings: settings.bindings,
      pageRules: settings.pageRules,
      branding: settings.branding,
      menu: settings.menu,
      health: buildHealthReport(pages, docs, settings.bindings, settings.pageRules),
    });
  }
  if (pathname === '/api/pages') {
    if (forceRefresh) pageMetadataCache.clear();
    return jsonResponse(res, await listPages(settings));
  }
  if (pathname === '/api/docs') {
    if (forceRefresh) documentMetadataCache.clear();
    return jsonResponse(res, await listDocs(settings));
  }
  if (pathname === '/api/bindings') return jsonResponse(res, settings.bindings);
  if (pathname === '/api/page-rules') return jsonResponse(res, settings.pageRules);
  if (pathname === '/api/doc') {
    if (!requestUrl.searchParams.get('path')) {
      return textResponse(res, '缺少 PRD 文件路径。', 'text/plain; charset=utf-8', 400);
    }
    const filePath = safePath(settings.docsRoot, requestUrl.searchParams.get('path'));
    if (!/\.(?:md|markdown)$/i.test(filePath))
      return textResponse(res, '只允许读取 Markdown 文件。', 'text/plain; charset=utf-8', 400);
    return textResponse(res, await fs.readFile(filePath, 'utf8'));
  }
  if (pathname.startsWith('/prototype/')) {
    const relative = pathname.slice('/prototype/'.length);
    const filePath = safePath(settings.prototypeRoot, relative);
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.html' || extension === '.htm') {
      const source = await fs.readFile(filePath, 'utf8');
      if (requestUrl.searchParams.get('raw') === '1') {
        return textResponse(res, source, 'text/html; charset=utf-8');
      }
      return textResponse(res, injectPrototypeBridge(source, relative, settings), 'text/html; charset=utf-8');
    }
    return textResponse(
      res,
      await fs.readFile(filePath),
      MIME_TYPES[extension] || 'application/octet-stream',
    );
  }

  throw new HttpError(404, '接口不存在。');
}

function createServer() {
  return http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      const statusCode = error.statusCode || (['ENOENT', 'EISDIR'].includes(error.code) ? 404 : 500);
      if (statusCode >= 500) console.error(error);
      const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
      if (statusCode === 404 && req.method === 'GET' && !pathname.startsWith('/api/') && !pathname.startsWith('/prototype/')) {
        notFoundResponse(res).catch((notFoundError) => {
          console.error(notFoundError);
          jsonResponse(res, { error: error.message || '页面不存在。' }, statusCode);
        });
        return;
      }
      jsonResponse(res, { error: error.message || '读取失败。' }, statusCode);
    });
  });
}

async function startServer() {
  const initialSettings = await loadSettings();
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(initialSettings.port, '0.0.0.0', resolve);
  });
  console.log(`HTML 原型外壳已启动：http://127.0.0.1:${initialSettings.port}`);
  console.log(`HTML 来源：${initialSettings.prototypeRoot}`);
  console.log(`PRD 来源：${initialSettings.docsRoot}`);
  return server;
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  startServer().catch((error) => {
    console.error(`HTML 原型外壳启动失败：${error.message}`);
    process.exitCode = 1;
  });
}

export {
  HttpError,
  bindingFor,
  buildHealthReport,
  createServer,
  handleRequest,
  injectPrototypeBridge,
  isInside,
  listDocs,
  listPages,
  loadSettings,
  normalizeBranding,
  normalizeMenu,
  compactMenuTitle,
  readHtmlTitle,
  readMarkdownHeadings,
  readMarkdownTitle,
  resolveConfiguredRoot,
  safePath,
  saveBranding,
  saveMenu,
  startServer,
  writeJsonAtomic,
};
