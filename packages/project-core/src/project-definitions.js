import path from 'node:path';

import { PAGE_PATH_PATTERN, PROJECT_ID_PATTERN } from './constants.js';
import { fileExists, isSafeRelativePath } from './filesystem.js';
import { hasExternalPrototypePage } from './project-manifest.js';

export async function validateProjectDefinitions(
  manifest,
  projectRoot,
  definitions,
  definitionsSource = '',
  { mounts = {} } = {},
) {
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
      if (!String(section.title || '').trim()) {
        errors.push(`菜单分组 ${client.id}/${section.id || '未知'} 缺少名称。`);
      }
    }

    const pagePaths = new Set();
    const pageNames = new Set();
    for (const page of definition.pages) {
      if (!PAGE_PATH_PATTERN.test(page.path || '')) {
        errors.push(`客户端 ${client.id} 的页面路径无效：${page.path || '空值'}。`);
      }
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
      if (page.sourceType === 'html-template') {
        const source = String(page.source || '').replaceAll('\\', '/');
        const sourcePath = path.resolve(projectRoot, 'html-pages', client.id, source);
        if (
          !isSafeRelativePath(source) ||
          !['.html', '.htm'].includes(path.extname(source).toLowerCase()) ||
          !(await fileExists(sourcePath))
        ) {
          errors.push(`HTML 页面文件不存在或路径无效：${client.id}/${source || '空值'}。`);
        }
        continue;
      }
      if (!isSafeRelativePath(page.view) || path.extname(page.view || '').toLowerCase() !== '.vue') {
        errors.push(`页面 ${client.id}/${page.path || '未知'} 的 view 路径无效。`);
        continue;
      }
      const packageView = path.resolve(projectRoot, 'views', page.view);
      const compatibilityView = manifest.compatibility?.legacyViewRoot
        ? path.resolve(projectRoot, '..', '..', manifest.compatibility.legacyViewRoot, page.view)
        : null;
      if (!(await fileExists(packageView)) && !(compatibilityView && (await fileExists(compatibilityView)))) {
        errors.push(`页面文件不存在：${page.view}。`);
      }
    }

    if (
      client.defaultPage &&
      !pagePaths.has(client.defaultPage) &&
      !(await hasExternalPrototypePage(manifest, projectRoot, client.id, client.defaultPage, mounts))
    ) {
      errors.push(`客户端 ${client.id} 的 defaultPage 未登记：${client.defaultPage}。`);
    }
    if (
      client.entry?.mode === 'custom-page' &&
      client.entry.page &&
      !pagePaths.has(client.entry.page) &&
      !(await hasExternalPrototypePage(manifest, projectRoot, client.id, client.entry.page, mounts))
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
