import { Buffer } from 'node:buffer';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  CLIENT_ENTRY_MODES,
  CLIENT_LAYOUT_TYPES,
  ENTRY_KINDS,
  HTML_SHELL_MODES,
  PROJECT_ID_PATTERN,
} from './constants.js';
import {
  fileExists,
  resolveExistingPathInsideRoot,
  resolveWritablePathInsideRoot,
  withFileRollback,
  writeFileAtomic,
  writeJsonAtomic,
} from './filesystem.js';

const LOGO_DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([a-z\d+/=\s]+)$/i;
const LOGO_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

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

function mergeTheme(theme = {}, primary, pageBackground) {
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

export function normalizeProjectInput(body, { editing = false, existingManifest = null } = {}) {
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
  const normalized = String(resourcePath || '').replaceAll('\\', '/');
  if (!normalized.startsWith('assets/')) return;
  const target = await resolveExistingPathInsideRoot(projectRoot, normalized);
  if (!target) return;
  await fs.rm(target, { force: true });
}

async function writeProjectLogo(projectRoot, dataUrl) {
  const logo = parseLogoDataUrl(dataUrl);
  if (!logo) return null;
  const target = await resolveWritablePathInsideRoot(projectRoot, logo.relativePath, {
    allowedExtensions: new Set(Object.values(LOGO_EXTENSIONS).map((extension) => `.${extension}`)),
  });
  if (!target) throw new Error('Logo 写入路径不安全。');
  await writeFileAtomic(target, logo.buffer);
  return logo.relativePath;
}

export async function readProjectManifest(projectRoot) {
  const manifestPath = await resolveExistingPathInsideRoot(projectRoot, 'project.json', {
    allowedExtensions: new Set(['.json']),
  });
  if (!manifestPath) throw new Error('项目配置文件不存在、越界或不是 JSON 文件。');
  return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

async function projectDefinitionsPath(projectRoot, manifest) {
  const definitionsPath = await resolveExistingPathInsideRoot(
    projectRoot,
    manifest.pageDefinitions || 'page-definitions.js',
    { allowedExtensions: new Set(['.js']) },
  );
  if (!definitionsPath) throw new Error('页面定义文件不存在、越界或不是 JavaScript 文件。');
  return definitionsPath;
}

async function ensureClientDefinitions(projectRoot, manifest) {
  const definitionsPath = await projectDefinitionsPath(projectRoot, manifest);
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
  if (changed) await writeFileAtomic(definitionsPath, source, { encoding: 'utf8' });
}

export async function createProjectPackage(projectsRoot, input) {
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
    const templateManifest = await readProjectManifest(projectRoot);
    const logoPath = await writeProjectLogo(projectRoot, input.logoDataUrl);
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
      theme: mergeTheme(templateManifest.theme, input.primary, input.pageBackground),
    };
    await ensureClientDefinitions(projectRoot, manifest);
    const manifestPath = await resolveWritablePathInsideRoot(projectRoot, 'project.json', {
      allowedExtensions: new Set(['.json']),
    });
    if (!manifestPath) throw new Error('项目配置写入路径不安全。');
    await writeJsonAtomic(manifestPath, manifest);
    return manifest;
  } catch (error) {
    await fs.rm(projectRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function updateProjectPackage(
  projectsRoot,
  input,
  { writeManifest = writeJsonAtomic, projectRoot: configuredProjectRoot = '' } = {},
) {
  const projectRoot = configuredProjectRoot
    ? path.resolve(configuredProjectRoot)
    : path.resolve(projectsRoot, input.id);
  if (!(await fileExists(projectRoot, 'directory'))) {
    throw Object.assign(new Error(`找不到项目包：${input.id}。`), { statusCode: 404 });
  }
  const manifest = await readProjectManifest(projectRoot);
  const manifestPath = await resolveExistingPathInsideRoot(projectRoot, 'project.json', {
    allowedExtensions: new Set(['.json']),
  });
  const definitionsPath = await projectDefinitionsPath(projectRoot, manifest);
  if (!manifestPath) throw new Error('项目配置文件不存在、越界或不是 JSON 文件。');
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

  const managedLogoPaths = await Promise.all(
    Object.values(LOGO_EXTENSIONS).map((extension) =>
      resolveWritablePathInsideRoot(projectRoot, `assets/auth/brand-logo.${extension}`),
    ),
  );
  const existingBrandAssets = await Promise.all(
    [oldLogo, oldFavicon].map((resourcePath) =>
      resourcePath ? resolveExistingPathInsideRoot(projectRoot, resourcePath) : null,
    ),
  );

  await withFileRollback(
    [manifestPath, definitionsPath, ...managedLogoPaths, ...existingBrandAssets],
    async () => {
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
      await writeManifest(manifestPath, nextManifest);
      await Promise.all(
        [...assetsToRemove].map((resourcePath) => removeProjectAsset(projectRoot, resourcePath)),
      );
    },
  );
  return nextManifest;
}
