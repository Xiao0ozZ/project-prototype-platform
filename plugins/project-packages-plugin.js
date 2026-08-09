import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  normalizePagePrdLinks,
  normalizePrdBindings,
  scanProjectPackages as scanProjectPackagesCore,
} from '../packages/project-core/src/index.js';

const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const PAGE_PATH_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTRY_KINDS = new Set(['client', 'docs', 'mobile']);
const CLIENT_ENTRY_MODES = new Set(['direct', 'platform-login', 'custom-page']);
const CLIENT_LAYOUT_TYPES = new Set(['sidebar', 'topnav', 'none', 'bare']);
const HTML_SHELL_MODES = new Set(['auto', 'full']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const PUBLIC_DIRECTORIES = new Set(['.platform', 'assets', 'data', 'mobile']);
const PUBLIC_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.gif',
  '.html',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.png',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
]);
const SOURCE_EXTENSIONS = new Set(['.vue']);
const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const MANAGEMENT_BODY_LIMIT = 8 * 1024 * 1024;
const LOGO_DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([a-z\d+/=\s]+)$/i;
const LOGO_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function toWebPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function isInsideRoot(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function isSafeRelativePath(value) {
  const normalized = String(value || '').replaceAll('\\', '/');
  return Boolean(normalized) && !normalized.startsWith('/') && !normalized.split('/').includes('..');
}

async function fileExists(filePath, type = 'file') {
  return fs
    .stat(filePath)
    .then((stats) => (type === 'directory' ? stats.isDirectory() : stats.isFile()))
    .catch(() => false);
}

function prototypeRootsForClient(manifest, projectRoot, clientId) {
  const configuredClients = manifest.prototype?.clients;
  const entries = Array.isArray(configuredClients)
    ? configuredClients.map((item) => [item?.clientId || item?.id, item])
    : configuredClients && typeof configuredClients === 'object'
      ? Object.entries(configuredClients)
      : [];

  if (entries.length) {
    return entries
      .filter(([configuredClientId, item]) => {
        return (
          item?.enabled !== false &&
          String(item?.clientId || configuredClientId || '').trim() === clientId &&
          String(item?.root || '').trim()
        );
      })
      .map(([, item]) => path.resolve(projectRoot, item.root));
  }

  if (!manifest.prototype?.enabled || !manifest.prototype?.root) return [];
  const configuredClientId = String(manifest.prototype.client || '').trim();
  if (configuredClientId && configuredClientId !== clientId) return [];
  return [path.resolve(projectRoot, manifest.prototype.root)];
}

async function hasExternalPrototypePage(manifest, projectRoot, clientId, expectedPath) {
  const expected = String(expectedPath || '')
    .trim()
    .toLowerCase();
  if (!expected || !manifest.prototype?.enabled) return false;

  async function containsHtmlRoute(root) {
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const target = path.join(root, entry.name);
      if (entry.isDirectory() && (await containsHtmlRoute(target))) return true;
      if (!entry.isFile() || !HTML_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      const routeName = path.basename(entry.name, path.extname(entry.name)).toLowerCase();
      if (routeName === expected) return true;
    }
    return false;
  }

  for (const root of prototypeRootsForClient(manifest, projectRoot, clientId)) {
    if (await containsHtmlRoute(root)) return true;
  }
  return false;
}

export async function validateProjectDefinitions(manifest, projectRoot, definitions, definitionsSource = '') {
  const errors = [];
  if (!definitions || typeof definitions !== 'object' || Array.isArray(definitions)) {
    return ['page-definitions.js 必须导出 clientPageDefinitions 对象。'];
  }

  const clientIds = new Set((manifest.clients || []).map((client) => client.id));
  for (const clientId of Object.keys(definitions)) {
    if (!clientIds.has(clientId)) errors.push(`页面定义包含未登记客户端：${clientId}。`);
  }

  for (const client of manifest.clients || []) {
    const definition = definitions[client.id];
    if (!definition) {
      errors.push(`客户端 ${client.id} 缺少页面定义。`);
      continue;
    }
    if (!Array.isArray(definition.sections)) errors.push(`客户端 ${client.id} 的 sections 必须是数组。`);
    if (!Array.isArray(definition.pages)) errors.push(`客户端 ${client.id} 的 pages 必须是数组。`);
    if (!Array.isArray(definition.sections) || !Array.isArray(definition.pages)) continue;

    const sectionIds = new Set();
    for (const section of definition.sections) {
      if (!PROJECT_ID_PATTERN.test(section.id || '')) errors.push(`客户端 ${client.id} 的菜单分组 id 无效。`);
      if (sectionIds.has(section.id)) errors.push(`客户端 ${client.id} 的菜单分组重复：${section.id}。`);
      sectionIds.add(section.id);
      if (!String(section.title || '').trim())
        errors.push(`菜单分组 ${client.id}/${section.id || '未知'} 缺少名称。`);
    }

    const pagePaths = new Set();
    const pageNames = new Set();
    for (const page of definition.pages) {
      if (!PAGE_PATH_PATTERN.test(page.path || ''))
        errors.push(`客户端 ${client.id} 的页面路径无效：${page.path || '空值'}。`);
      if (pagePaths.has(page.path)) errors.push(`客户端 ${client.id} 的页面路径重复：${page.path}。`);
      pagePaths.add(page.path);
      if (!String(page.name || '').trim())
        errors.push(`页面 ${client.id}/${page.path || '未知'} 缺少 name。`);
      if (pageNames.has(page.name)) errors.push(`客户端 ${client.id} 的页面 name 重复：${page.name}。`);
      pageNames.add(page.name);
      if (!String(page.title || '').trim())
        errors.push(`页面 ${client.id}/${page.path || '未知'} 缺少标题。`);
      if (page.menu !== false && !sectionIds.has(page.section)) {
        errors.push(
          `页面 ${client.id}/${page.path || '未知'} 引用了不存在的菜单分组：${page.section || '空值'}。`,
        );
      }
      if (!isSafeRelativePath(page.view) || path.extname(page.view || '').toLowerCase() !== '.vue') {
        errors.push(`页面 ${client.id}/${page.path || '未知'} 的 view 路径无效。`);
        continue;
      }
      const packageView = path.resolve(projectRoot, 'views', page.view);
      const compatibilityRoot = manifest.compatibility?.legacyViewRoot;
      const compatibilityView = compatibilityRoot
        ? path.resolve(projectRoot, '..', '..', compatibilityRoot, page.view)
        : null;
      if (!(await fileExists(packageView)) && !(compatibilityView && (await fileExists(compatibilityView)))) {
        errors.push(`页面文件不存在：${page.view}。`);
      }
    }
    if (
      client.defaultPage &&
      !pagePaths.has(client.defaultPage) &&
      !(await hasExternalPrototypePage(manifest, projectRoot, client.id, client.defaultPage))
    ) {
      errors.push(`客户端 ${client.id} 的 defaultPage 未登记：${client.defaultPage}。`);
    }
    if (
      client.entry?.mode === 'custom-page' &&
      client.entry.page &&
      !pagePaths.has(client.entry.page) &&
      !(await hasExternalPrototypePage(manifest, projectRoot, client.id, client.entry.page))
    ) {
      errors.push(`客户端 ${client.id} 的自定义入口页面未登记：${client.entry.page}。`);
    }
    if (manifest.features?.pageTransfer) {
      const marker = `// <generator:${client.id}-pages>`;
      if (!definitionsSource.includes(marker)) errors.push(`页面定义缺少导入生成器标记：${marker}。`);
    }
  }
  return errors;
}

function toPublicManifest(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    id: manifest.id,
    name: manifest.name,
    shortName: manifest.shortName || manifest.name,
    description: manifest.description || '',
    version: manifest.version || '0.0.0',
    defaultLocale: manifest.defaultLocale || 'zh-CN',
    homepage: { visible: manifest.homepage?.visible !== false },
    branding: manifest.branding || {},
    theme: manifest.theme || {},
    clients: manifest.clients || [],
    entries: manifest.entries || [],
    docs: { enabled: Boolean(manifest.docs?.enabled), root: manifest.docs?.root || 'docs' },
    prototype: {
      enabled: Boolean(manifest.prototype?.enabled),
      root: manifest.prototype?.root || 'prototype',
      client: manifest.prototype?.client || '',
      section: manifest.prototype?.section || '',
      clients: manifest.prototype?.clients || {},
    },
    mobile: { enabled: Boolean(manifest.mobile?.enabled), entry: manifest.mobile?.entry || null },
    features: manifest.features || {},
    compatibility: manifest.compatibility || {},
  };
}

export async function scanProjectPackages(projectsRoot, { cache } = {}) {
  return scanProjectPackagesCore(projectsRoot, { cache });
}

async function walkPublicFiles(projectRoot) {
  const files = [];
  for (const directoryName of PUBLIC_DIRECTORIES) {
    const directory = path.join(projectRoot, directoryName);
    const walk = async (currentDirectory) => {
      const entries = await fs.readdir(currentDirectory, { withFileTypes: true }).catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });
      for (const entry of entries) {
        const absolutePath = path.join(currentDirectory, entry.name);
        if (entry.isDirectory()) await walk(absolutePath);
        else if (entry.isFile() && PUBLIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          files.push(absolutePath);
        }
      }
    };
    await walk(directory);
  }
  return files;
}

function resolveProjectFile(projectsRoot, projectId, relativePath) {
  if (!PROJECT_ID_PATTERN.test(projectId || '') || !isSafeRelativePath(relativePath)) return null;
  const projectRoot = path.resolve(projectsRoot, projectId);
  const target = path.resolve(projectRoot, ...String(relativePath).replaceAll('\\', '/').split('/'));
  const topDirectory = path.relative(projectRoot, target).split(path.sep)[0];
  if (!isInsideRoot(projectRoot, target) || !PUBLIC_DIRECTORIES.has(topDirectory)) return null;
  if (!PUBLIC_EXTENSIONS.has(path.extname(target).toLowerCase())) return null;
  return target;
}

function resolveProjectSource(projectsRoot, projectId, relativePath) {
  if (!PROJECT_ID_PATTERN.test(projectId || '') || !isSafeRelativePath(relativePath)) return null;
  const normalizedPath = String(relativePath).replaceAll('\\', '/');
  if (!normalizedPath.startsWith('views/')) return null;
  if (!SOURCE_EXTENSIONS.has(path.extname(normalizedPath).toLowerCase())) return null;
  const projectRoot = path.resolve(projectsRoot, projectId);
  const target = path.resolve(projectRoot, ...normalizedPath.split('/'));
  if (!isInsideRoot(projectRoot, target)) return null;
  return target;
}

function sourceContentDisposition(filePath) {
  const fileName = path.basename(filePath);
  const fallbackName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\\r\n]/g, '_');
  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function sendJson(res, payload, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function isLocalRequest(req) {
  const address = String(req.socket?.remoteAddress || '').replace('::ffff:', '');
  return address === '' || address === '127.0.0.1' || address === '::1' || address === 'localhost';
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MANAGEMENT_BODY_LIMIT) {
        rejected = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) {
        reject(new Error('请求内容过大，项目 Logo 请控制在 2 MB 以内。'));
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('请求内容不是有效的 JSON。'));
      }
    });
    req.on('error', reject);
  });
}

function normalizePrdBindingsPayload(projectId, payload) {
  return normalizePrdBindings(projectId, payload);
}

function normalizePagePrdLinksPayload(projectId, payload) {
  return normalizePagePrdLinks(projectId, payload);
}

async function readPagePrdLinksFile(projectRoot, projectId) {
  const filePath = path.join(projectRoot, '.platform', 'page-prd-links.json');
  try {
    return normalizePagePrdLinksPayload(projectId, JSON.parse(await fs.readFile(filePath, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return normalizePagePrdLinksPayload(projectId, {});
    throw error;
  }
}

async function readPrdBindingsFile(projectRoot, projectId) {
  const filePath = path.join(projectRoot, '.platform', 'prd-bindings.json');
  try {
    return normalizePrdBindingsPayload(projectId, JSON.parse(await fs.readFile(filePath, 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return normalizePrdBindingsPayload(projectId, {});
    throw error;
  }
}

function requiredText(value, label, fallback = '') {
  const source = value === undefined || value === null || value === '' ? fallback : value;
  const text = String(source).trim();
  if (!text) throw new Error(`${label}不能为空。`);
  return text;
}

function normalizeColor(value, label, fallback) {
  const color = String(value || fallback || '').trim();
  if (!/^#[a-f\d]{6}$/i.test(color)) throw new Error(`${label}必须使用六位十六进制色值。`);
  return color.toLowerCase();
}

function darkenColor(color, ratio) {
  const value = color.replace('#', '');
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return `#${channels
    .map((channel) =>
      Math.max(0, Math.round(channel * ratio))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function mergeTheme(theme, primary, pageBackground) {
  const nextTheme = { ...theme, primary, pageBackground };
  if (theme.primary !== primary) {
    nextTheme.primaryHover = darkenColor(primary, 0.9);
    nextTheme.primaryActive = darkenColor(primary, 0.75);
  }
  return nextTheme;
}

function normalizeClientInput(value, index, defaultEntryMode = 'platform-login') {
  const id = requiredText(value?.id, `第 ${index + 1} 个客户端 ID`);
  if (!PROJECT_ID_PATTERN.test(id)) throw new Error(`客户端 ${id} 必须使用小写 kebab-case。`);
  const login = value?.login || {};
  const entryMode = String(value?.entry?.mode || defaultEntryMode).trim();
  if (!CLIENT_ENTRY_MODES.has(entryMode)) throw new Error(`客户端 ${id} 的进入方式无效。`);
  const entryPage = String(value?.entry?.page || '').trim();
  if (entryMode === 'custom-page' && !entryPage) {
    throw new Error(`客户端 ${id} 使用自定义入口时必须指定入口页面。`);
  }
  const layoutType = String(value?.layout?.type || 'sidebar').trim();
  if (!CLIENT_LAYOUT_TYPES.has(layoutType)) throw new Error(`客户端 ${id} 的页面外壳无效。`);
  return {
    id,
    name: requiredText(value?.name, `客户端 ${id} 名称`),
    description: String(value?.description || '').trim(),
    icon: String(value?.icon || 'Document').trim() || 'Document',
    defaultPage: String(value?.defaultPage || '').trim(),
    entry: {
      mode: entryMode,
      ...(entryMode === 'custom-page' ? { page: entryPage } : {}),
    },
    layout: { type: layoutType },
    login: {
      account: String(login.account || '').trim(),
      tenantCode: String(login.tenantCode || '').trim(),
      ...(String(login.background || '').trim() ? { background: String(login.background).trim() } : {}),
    },
  };
}

function normalizeEntryInput(value, index) {
  const id = requiredText(value?.id, `第 ${index + 1} 个首页入口 ID`);
  if (!PROJECT_ID_PATTERN.test(id)) throw new Error(`首页入口 ${id} 必须使用小写 kebab-case。`);
  if (!ENTRY_KINDS.has(value?.kind)) throw new Error(`首页入口 ${id} 的类型无效。`);
  return {
    id,
    kind: value.kind,
    ...(value.kind === 'client' ? { clientId: requiredText(value.clientId, `首页入口 ${id} 的客户端`) } : {}),
    name: requiredText(value.name, `首页入口 ${id} 名称`),
    description: String(value.description || '').trim(),
    icon: String(value.icon || 'Document').trim() || 'Document',
    order: Math.max(1, Number(value.order) || 10),
  };
}

function normalizeProjectInput(body, { editing = false, existingManifest = null } = {}) {
  const id = String(body.id || '').trim();
  if (!PROJECT_ID_PATTERN.test(id)) throw new Error('项目 ID 必须使用小写 kebab-case。');
  if (editing && body.id !== id) throw new Error('项目 ID 不允许修改。');
  const clients = Array.isArray(body.clients)
    ? body.clients.map((client, index) =>
        normalizeClientInput(client, index, editing ? 'platform-login' : 'direct'),
      )
    : existingManifest?.clients || [];
  if (!clients.length) throw new Error('项目至少需要登记一个客户端。');
  const clientIds = new Set();
  for (const client of clients) {
    if (clientIds.has(client.id)) throw new Error(`客户端 ID 重复：${client.id}。`);
    clientIds.add(client.id);
  }
  const docs = {
    ...(existingManifest?.docs || {}),
    ...(body.docs || {}),
    enabled: Boolean(body.docs?.enabled ?? existingManifest?.docs?.enabled),
    root: String(body.docs?.root || existingManifest?.docs?.root || 'docs').trim() || 'docs',
  };
  const prototype = {
    ...(existingManifest?.prototype || {}),
    ...(body.prototype || {}),
    enabled: Boolean(body.prototype?.enabled ?? existingManifest?.prototype?.enabled),
    root:
      String(body.prototype?.root || existingManifest?.prototype?.root || 'prototype').trim() || 'prototype',
    client: String(body.prototype?.client || existingManifest?.prototype?.client || '').trim(),
    section: String(body.prototype?.section || existingManifest?.prototype?.section || '').trim(),
    clients: body.prototype?.clients || existingManifest?.prototype?.clients || {},
  };
  const prototypeClientEntries = Array.isArray(prototype.clients)
    ? prototype.clients.map((item) => [item?.clientId || item?.id, item])
    : prototype.clients && typeof prototype.clients === 'object'
      ? Object.entries(prototype.clients)
      : [];
  const normalizedPrototypeClientEntries = prototypeClientEntries.map(([clientId, item]) => {
    const shellMode = String(item?.shellMode || 'auto').trim();
    if (!HTML_SHELL_MODES.has(shellMode)) {
      throw new Error(`客户端 ${item?.clientId || clientId || '未知'} 的 HTML 外壳处理方式无效。`);
    }
    return [clientId, { ...item, shellMode }];
  });
  prototype.clients = Array.isArray(prototype.clients)
    ? normalizedPrototypeClientEntries.map(([, item]) => item)
    : Object.fromEntries(normalizedPrototypeClientEntries);
  const mobile = {
    ...(existingManifest?.mobile || {}),
    ...(body.mobile || {}),
    enabled: Boolean(body.mobile?.enabled ?? existingManifest?.mobile?.enabled),
    entry: String(body.mobile?.entry || existingManifest?.mobile?.entry || 'mobile/app.html').trim(),
  };
  const homepage = {
    ...(existingManifest?.homepage || {}),
    ...(body.homepage || {}),
    visible: Boolean(body.homepage?.visible ?? existingManifest?.homepage?.visible ?? true),
  };
  const entries = Array.isArray(body.entries)
    ? body.entries.map(normalizeEntryInput)
    : existingManifest?.entries || [];
  const entryIds = new Set();
  for (const entry of entries) {
    if (entryIds.has(entry.id)) throw new Error(`首页入口 ID 重复：${entry.id}。`);
    entryIds.add(entry.id);
    if (entry.kind === 'client' && !clientIds.has(entry.clientId)) {
      throw new Error(`首页入口 ${entry.id} 引用了不存在的客户端：${entry.clientId}。`);
    }
  }
  const features = { ...(existingManifest?.features || {}), ...(body.features || {}) };
  const compatibility = { ...(existingManifest?.compatibility || {}), ...(body.compatibility || {}) };
  delete compatibility.externalDocs;
  return {
    id,
    name: requiredText(body.name, '项目名称'),
    shortName: requiredText(body.shortName, '项目简称', body.name),
    version: requiredText(body.version, '项目版本', existingManifest?.version || '0.1.0'),
    defaultLocale: requiredText(body.defaultLocale, '默认语言', existingManifest?.defaultLocale || 'zh-CN'),
    description: String(body.description || '').trim(),
    primary: normalizeColor(body.primary, '主色', '#2563eb'),
    pageBackground: normalizeColor(body.pageBackground, '内容区背景色', '#f5f7fb'),
    clients,
    entries,
    docs,
    prototype,
    mobile,
    homepage,
    features,
    compatibility,
    logoDataUrl: body.logoDataUrl ? String(body.logoDataUrl) : '',
    removeLogo: Boolean(body.removeLogo),
  };
}

function parseLogoDataUrl(dataUrl) {
  if (!dataUrl) return null;
  const match = LOGO_DATA_URL_PATTERN.exec(dataUrl);
  if (!match) throw new Error('Logo 只支持 PNG、JPG、WebP 或 SVG 图片。');
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replaceAll(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
    throw new Error('Logo 文件大小需控制在 2 MB 以内。');
  }
  return { buffer, relativePath: `assets/auth/brand-logo.${LOGO_EXTENSIONS[mimeType]}` };
}

async function removeProjectAsset(projectRoot, resourcePath) {
  if (!resourcePath || !isSafeRelativePath(resourcePath)) return;
  const target = path.resolve(projectRoot, ...resourcePath.replaceAll('\\', '/').split('/'));
  const topDirectory = path.relative(projectRoot, target).split(path.sep)[0];
  if (!isInsideRoot(projectRoot, target) || topDirectory !== 'assets') return;
  await fs.rm(target, { force: true });
}

async function writeProjectLogo(projectRoot, dataUrl) {
  const logo = parseLogoDataUrl(dataUrl);
  if (!logo) return null;
  const target = path.resolve(projectRoot, ...logo.relativePath.split('/'));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, logo.buffer);
  return logo.relativePath;
}

async function readManifest(projectRoot) {
  return JSON.parse(await fs.readFile(path.join(projectRoot, 'project.json'), 'utf8'));
}

async function writeManifest(projectRoot, manifest) {
  await fs.writeFile(
    path.join(projectRoot, 'project.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function ensureClientDefinitions(projectRoot, manifest) {
  const definitionsPath = path.resolve(projectRoot, manifest.pageDefinitions || 'page-definitions.js');
  let source = await fs.readFile(definitionsPath, 'utf8');
  let changed = false;
  for (const client of manifest.clients || []) {
    const marker = `// <generator:${client.id}-pages>`;
    const keyPattern = new RegExp(`(?:^|\\n)\\s*(?:${client.id}|"${client.id}")\\s*:`);
    if (source.includes(marker) || keyPattern.test(source)) continue;
    const insertAt = source.lastIndexOf('};');
    if (insertAt < 0) throw new Error('页面定义文件缺少可写入的客户端定义结尾。');
    const block = [
      `  ${JSON.stringify(client.id)}: {`,
      `    basePath: '/${client.id}',`,
      `    sections: [{ id: 'workspace', title: '工作区' }],`,
      '    pages: [',
      `      ${marker}`,
      '    ],',
      '  },',
      '',
    ].join('\n');
    source = source.slice(0, insertAt) + block + source.slice(insertAt);
    changed = true;
  }
  if (changed) await fs.writeFile(definitionsPath, source, 'utf8');
}

async function createProjectPackage(projectsRoot, input) {
  const templateRoot = path.resolve(projectsRoot, '..', 'templates', 'project-package');
  const projectRoot = path.resolve(projectsRoot, input.id);
  if ((await fileExists(projectRoot, 'directory')) || (await fileExists(projectRoot))) {
    throw Object.assign(new Error(`项目 ID 已存在：${input.id}。`), { statusCode: 409 });
  }
  if (!(await fileExists(templateRoot, 'directory'))) {
    throw new Error('找不到项目包初始化模板。');
  }

  await fs.cp(templateRoot, projectRoot, { recursive: true });
  try {
    const templateManifest = await readManifest(projectRoot);
    const logoPath = await writeProjectLogo(projectRoot, input.logoDataUrl);
    const primary = input.primary;
    const manifest = {
      ...templateManifest,
      id: input.id,
      name: input.name,
      shortName: input.shortName,
      version: input.version,
      defaultLocale: input.defaultLocale,
      description: input.description,
      clients: input.clients,
      entries: input.entries,
      docs: input.docs,
      prototype: input.prototype,
      mobile: input.mobile,
      homepage: input.homepage,
      features: input.features,
      compatibility: input.compatibility,
      branding: logoPath ? { logo: logoPath, favicon: logoPath } : {},
      theme: mergeTheme(templateManifest.theme, primary, input.pageBackground),
    };
    await ensureClientDefinitions(projectRoot, manifest);
    await writeManifest(projectRoot, manifest);
    return manifest;
  } catch (error) {
    await fs.rm(projectRoot, { recursive: true, force: true });
    throw error;
  }
}

async function updateProjectPackage(projectsRoot, input) {
  const projectRoot = path.resolve(projectsRoot, input.id);
  if (!(await fileExists(projectRoot, 'directory'))) {
    throw Object.assign(new Error(`找不到项目包：${input.id}。`), { statusCode: 404 });
  }
  const manifest = await readManifest(projectRoot);
  const oldLogo = manifest.branding?.logo;
  const oldFavicon = manifest.branding?.favicon;
  const nextManifest = {
    ...manifest,
    name: input.name,
    shortName: input.shortName,
    version: input.version,
    defaultLocale: input.defaultLocale,
    description: input.description,
    clients: input.clients,
    entries: input.entries,
    docs: input.docs,
    prototype: input.prototype,
    mobile: input.mobile,
    homepage: input.homepage,
    features: input.features,
    compatibility: input.compatibility,
    theme: mergeTheme(manifest.theme, input.primary, input.pageBackground),
    branding: { ...(manifest.branding || {}) },
  };
  const assetsToRemove = new Set();

  if (input.logoDataUrl) {
    const logoPath = await writeProjectLogo(projectRoot, input.logoDataUrl);
    nextManifest.branding.logo = logoPath;
    if (!oldFavicon || oldFavicon === oldLogo) nextManifest.branding.favicon = logoPath;
    if (oldLogo && oldLogo !== logoPath) assetsToRemove.add(oldLogo);
    if (oldFavicon && oldFavicon !== oldLogo && oldFavicon !== logoPath) {
      assetsToRemove.add(oldFavicon);
    }
  } else if (input.removeLogo && oldLogo) {
    delete nextManifest.branding.logo;
    if (oldFavicon === oldLogo) delete nextManifest.branding.favicon;
    assetsToRemove.add(oldLogo);
  }

  await ensureClientDefinitions(projectRoot, nextManifest);
  await writeManifest(projectRoot, nextManifest);
  await Promise.allSettled(
    [...assetsToRemove].map((resourcePath) => removeProjectAsset(projectRoot, resourcePath)),
  );
  return nextManifest;
}

export function projectPackagesPlugin({ projectsRoot }) {
  const root = path.resolve(projectsRoot);
  let isBuild = false;
  let refreshTimer;
  const scanCache = new Map();

  const loadScanResult = () => scanProjectPackages(root, { cache: scanCache });

  return {
    name: 'project-packages',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    configureServer(server) {
      server.watcher.add(root);
      server.watcher.on('all', (_eventName, changedPath) => {
        const absolutePath = path.resolve(changedPath);
        if (absolutePath !== root && !isInsideRoot(root, absolutePath)) return;
        const relativePath = toWebPath(path.relative(root, absolutePath));
        const projectEntryChange = absolutePath === root || /^[a-z][a-z0-9-]*$/i.test(relativePath);
        const bindingChange = /^([a-z][a-z0-9-]*)\/\.platform\/prd-bindings\.json$/i.exec(relativePath);
        const manifestChange =
          /^([a-z][a-z0-9-]*)\/(?:project\.json|page-definitions\.js|\.platform\/(?:page-prd-links|route-order)\.json)$/i.test(
            relativePath,
          );
        const viewChange = /^([a-z][a-z0-9-]*)\/views\/.+\.vue$/i.test(relativePath);
        if (!projectEntryChange && !manifestChange && !viewChange && !bindingChange) return;
        if (projectEntryChange || manifestChange || viewChange) scanCache.delete(root);
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          if (projectEntryChange || manifestChange) {
            server.ws.send({ type: 'custom', event: 'project-packages:changed' });
          }
          if (bindingChange) {
            server.ws.send({
              type: 'custom',
              event: 'prd-bindings:changed',
              data: { projectId: bindingChange[1] },
            });
          }
          if (projectEntryChange || manifestChange || viewChange) {
            server.ws.send({ type: 'full-reload' });
          }
        }, 120);
      });

      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        if (requestUrl.pathname === '/__projects/prd-bindings') {
          const projectId = requestUrl.searchParams.get('project') || '';
          if (!PROJECT_ID_PATTERN.test(projectId)) {
            sendJson(res, { message: '项目 ID 无效。' }, 400);
            return;
          }
          const projectRoot = path.join(root, projectId);
          if (req.method === 'GET') {
            try {
              sendJson(res, await readPrdBindingsFile(projectRoot, projectId));
            } catch (error) {
              sendJson(res, { message: 'PRD 关联配置读取失败。', detail: error.message }, 500);
            }
            return;
          }
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST');
            sendJson(res, { message: 'PRD 关联配置只支持 GET 或 POST。' }, 405);
            return;
          }
          if (!isLocalRequest(req)) {
            sendJson(res, { message: 'PRD 关联编辑仅允许本机开发环境使用。' }, 403);
            return;
          }
          try {
            const body = await readJsonBody(req);
            const payload = normalizePrdBindingsPayload(projectId, body);
            const filePath = path.join(projectRoot, '.platform', 'prd-bindings.json');
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
            server.ws.send({ type: 'custom', event: 'prd-bindings:changed', data: { projectId } });
            sendJson(res, payload);
          } catch (error) {
            sendJson(res, { message: 'PRD 关联配置保存失败。', detail: error.message }, 400);
          }
          return;
        }
        if (requestUrl.pathname === '/__projects/page-prd-links') {
          const projectId = requestUrl.searchParams.get('project') || '';
          if (!PROJECT_ID_PATTERN.test(projectId)) {
            sendJson(res, { message: '项目 ID 无效。' }, 400);
            return;
          }
          const projectRoot = path.join(root, projectId);
          if (req.method === 'GET') {
            try {
              sendJson(res, await readPagePrdLinksFile(projectRoot, projectId));
            } catch (error) {
              sendJson(res, { message: '页面 PRD 关联配置读取失败。', detail: error.message }, 500);
            }
            return;
          }
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST');
            sendJson(res, { message: '页面 PRD 关联配置只支持 GET 或 POST。' }, 405);
            return;
          }
          if (!isLocalRequest(req)) {
            sendJson(res, { message: '页面 PRD 关联编辑仅允许本机开发环境使用。' }, 403);
            return;
          }
          try {
            const body = await readJsonBody(req);
            const payload = normalizePagePrdLinksPayload(projectId, body);
            const filePath = path.join(projectRoot, '.platform', 'page-prd-links.json');
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
            server.ws.send({ type: 'custom', event: 'page-prd-links:changed', data: { projectId } });
            sendJson(res, payload);
          } catch (error) {
            sendJson(res, { message: '页面 PRD 关联配置保存失败。', detail: error.message }, 400);
          }
          return;
        }
        if (requestUrl.pathname === '/__projects/create' || requestUrl.pathname === '/__projects/update') {
          if (!isLocalRequest(req)) {
            sendJson(res, { message: '项目管理接口仅允许本机访问。' }, 403);
            return;
          }
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            sendJson(res, { message: '项目管理接口只支持 POST。' }, 405);
            return;
          }
          try {
            const body = await readJsonBody(req);
            const editing = requestUrl.pathname.endsWith('/update');
            const projectId = String(body.id || '').trim();
            if (editing && !PROJECT_ID_PATTERN.test(projectId)) {
              throw new Error('项目 ID 必须使用小写 kebab-case。');
            }
            const existingManifest = editing ? await readManifest(path.join(root, projectId)) : null;
            const input = normalizeProjectInput(body, { editing, existingManifest });
            const manifest = requestUrl.pathname.endsWith('/create')
              ? await createProjectPackage(root, input)
              : await updateProjectPackage(root, input);
            scanCache.delete(root);
            sendJson(res, {
              ok: true,
              project: toPublicManifest(manifest),
              message: requestUrl.pathname.endsWith('/create') ? '项目初始化包已生成。' : '项目配置已保存。',
            });
          } catch (error) {
            sendJson(res, { ok: false, message: error.message }, error.statusCode || 400);
          }
          return;
        }
        if (requestUrl.pathname === '/__projects/manifest') {
          try {
            sendJson(res, await loadScanResult());
          } catch (error) {
            sendJson(res, { message: '项目包扫描失败', detail: error.message }, 500);
          }
          return;
        }
        if (requestUrl.pathname === '/__projects/file') {
          const target = resolveProjectFile(
            root,
            requestUrl.searchParams.get('project'),
            requestUrl.searchParams.get('path'),
          );
          if (!target) {
            sendJson(res, { message: '项目资源路径无效' }, 400);
            return;
          }
          try {
            const content = await fs.readFile(target);
            res.statusCode = 200;
            res.setHeader(
              'Content-Type',
              MIME_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
            );
            res.setHeader('Cache-Control', 'no-store');
            res.end(content);
          } catch (error) {
            sendJson(
              res,
              { message: '项目资源读取失败', detail: error.message },
              error.code === 'ENOENT' ? 404 : 500,
            );
          }
          return;
        }
        if (requestUrl.pathname === '/__projects/source') {
          if (!isLocalRequest(req)) {
            sendJson(res, { message: '页面源文件下载仅允许本机使用。' }, 403);
            return;
          }
          const target = resolveProjectSource(
            root,
            requestUrl.searchParams.get('project'),
            requestUrl.searchParams.get('path'),
          );
          if (!target) {
            sendJson(res, { message: '页面源文件路径无效。' }, 400);
            return;
          }
          try {
            const content = await fs.readFile(target);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', sourceContentDisposition(target));
            res.setHeader('Cache-Control', 'no-store');
            res.end(content);
          } catch (error) {
            sendJson(
              res,
              { message: '页面源文件读取失败。', detail: error.message },
              error.code === 'ENOENT' ? 404 : 500,
            );
          }
          return;
        }
        next();
      });
    },
    async buildStart() {
      if (!isBuild) return;
      const manifest = await scanProjectPackages(root);
      if (manifest.invalidProjects.length) {
        const details = manifest.invalidProjects
          .flatMap((project) => project.errors.map((error) => `${project.folder}: ${error}`))
          .join('\n');
        this.error(`存在无效项目包，已停止构建：\n${details}`);
      }
      this.emitFile({
        type: 'asset',
        fileName: 'projects/manifest.json',
        source: JSON.stringify(manifest, null, 2),
      });
      for (const project of manifest.projects) {
        const projectRoot = path.join(root, project.folder);
        for (const absolutePath of await walkPublicFiles(projectRoot)) {
          const relativePath = toWebPath(path.relative(projectRoot, absolutePath));
          this.emitFile({
            type: 'asset',
            fileName: `projects/${project.id}/${relativePath}`,
            source: await fs.readFile(absolutePath),
          });
        }
      }
    },
  };
}
