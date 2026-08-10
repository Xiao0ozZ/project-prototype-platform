import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parse } from 'node-html-parser';

import { createMenuIconMarkup, PROTOTYPE_MENU_ICON_RENDERER } from './html-prototype-menu-icons.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const SOURCE_ROOT = path.resolve(PROJECT_ROOT, '..', 'RIMORental', '02_原型和PRD', '原型');
const TARGET_ROOT = path.resolve(PROJECT_ROOT, '..', 'RIMORental', '02_原型和PRD', '原型-模板化副本');
const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'templates', 'html-prototype-page.html');
const SOURCE_CLIENTS = [
  { id: 'operation', directory: '营运端', label: '营运端' },
  { id: 'enterprise', directory: '企业端', label: '企业端' },
];

function sectionBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`模板缺少标记：${startMarker}`);
  return source.slice(start + startMarker.length, end).trim();
}

function normalizeHexColor(value) {
  const match = String(value || '')
    .trim()
    .match(/^#([0-9a-f]{6})$/iu);
  return match ? `#${match[1].toUpperCase()}` : null;
}

function adjustHexColor(hex, amount) {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)
    .map((channel) => Number.parseInt(channel, 16));
  return `#${channels
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel * (1 - amount)))))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function extractLegacyTheme(source) {
  const shellColor = String(source || '').match(/<aside\b[^>]*bg-\[#([0-9a-f]{6})\]/iu)?.[1];
  const declaredColor = String(source || '').match(/--app-color-primary\s*:\s*(#[0-9a-f]{6})/iu)?.[1];
  const primary = normalizeHexColor(shellColor ? `#${shellColor}` : declaredColor);
  if (!primary) return null;

  const knownThemes = {
    '#00689E': { hover: '#005B8A', active: '#004F78' },
  };
  const knownTheme = knownThemes[primary];
  const hover = knownTheme?.hover || adjustHexColor(primary, 0.1);
  const active = knownTheme?.active || adjustHexColor(primary, 0.2);
  const channels = primary
    .slice(1)
    .match(/.{2}/gu)
    .map((channel) => Number.parseInt(channel, 16));

  return {
    primary,
    hover,
    active,
    shadow: `rgb(${channels.join(' ')} / 18%)`,
  };
}

export function applyLegacyTheme(source, theme) {
  if (!theme?.primary) return source;
  return String(source)
    .replace(/(--app-color-primary\s*:\s*)#[0-9a-f]{6}/giu, `$1${theme.primary}`)
    .replace(/(--app-color-primary-hover\s*:\s*)#[0-9a-f]{6}/giu, `$1${theme.hover}`)
    .replace(/(--app-color-primary-active\s*:\s*)#[0-9a-f]{6}/giu, `$1${theme.active}`)
    .replace(/(--app-color-primary-shadow\s*:\s*)rgb\([^;]+\)/giu, `$1${theme.shadow}`);
}

export function applyTemplateFontFamily(source) {
  return String(source || '').replace(
    /font-family\s*:[^;{}]*Noto Sans[^;{}]*;/giu,
    'font-family: var(--app-font-family-sans);',
  );
}

function escapeHtmlAttribute(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim();
}

function shortHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 7);
}

function normalizeSlug(value) {
  const slug = String(value || '')
    .normalize('NFKC')
    .replace(/\.(?:html?|HTML?)$/u, '')
    .replace(/_/gu, '-')
    .replace(/[^a-zA-Z0-9-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .toLowerCase();
  return slug || `legacy-${shortHash(value)}`;
}

function pagePathFromFile(fileName) {
  const stem = path.basename(fileName, path.extname(fileName));
  return normalizeSlug(stem);
}

function readTitle(document, fileName) {
  const title = document.querySelector('title')?.text;
  if (title?.trim()) return decodeHtmlEntities(title.replace(/\s+-\s+RIMO.*$/iu, ''));
  const heading = document.querySelector('h1')?.text;
  return heading?.trim() || path.basename(fileName, path.extname(fileName));
}

function findMatchingDelimiter(source, start, opening, closing) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === opening) depth += 1;
    if (character === closing) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractInlineScripts(source) {
  return [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)]
    .filter((match) => !/\bsrc\s*=/iu.test(match[1]) && !/application\/json/iu.test(match[1]))
    .map((match) => match[2].trim())
    .filter(Boolean);
}

function extractExternalTags(source) {
  const scripts = [...source.matchAll(/<script\b([^>]*)\bsrc\s*=\s*(["'])(.*?)\2[^>]*>\s*<\/script>/giu)].map(
    (match) => ({ type: 'script', attributes: match[1], src: match[3] }),
  );
  const links = [...source.matchAll(/<link\b([^>]*)\bhref\s*=\s*(["'])(.*?)\2[^>]*>/giu)].map((match) => ({
    type: 'link',
    attributes: match[1],
    src: match[3],
  }));
  return [...scripts, ...links];
}

function stripLegacyBootstrapCalls(source) {
  let result = String(source || '');
  let searchStart = 0;

  while (searchStart < result.length) {
    const match = /\bapp\.(use|mount)\s*\(/u.exec(result.slice(searchStart));
    if (!match) break;

    const matchStart = searchStart + match.index;
    const openParen = matchStart + match[0].lastIndexOf('(');
    const closeParen = findMatchingDelimiter(result, openParen, '(', ')');
    if (closeParen < 0) break;

    let removeEnd = closeParen + 1;
    if (match[1] === 'use') {
      const chainedMount = /^\s*\.\s*mount\s*\(/u.exec(result.slice(removeEnd));
      if (chainedMount) {
        const mountOpen = removeEnd + chainedMount[0].lastIndexOf('(');
        const mountClose = findMatchingDelimiter(result, mountOpen, '(', ')');
        if (mountClose >= 0) removeEnd = mountClose + 1;
      }
    }

    const trailing = /^\s*;?/u.exec(result.slice(removeEnd));
    removeEnd += trailing?.[0].length || 0;
    result = `${result.slice(0, matchStart)}${result.slice(removeEnd)}`;
    searchStart = matchStart;
  }

  return result.trim();
}

function isVueOrElementDependency(src) {
  return /(?:vue(?:\.global)?|element-plus|icons-vue)/iu.test(src);
}

function isLocalPath(src) {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(src);
}

function rewriteLegacyEvents(markup) {
  return String(markup || '')
    .replace(/\bonclick\s*=/giu, '@click=')
    .replace(/\bonchange\s*=/giu, '@change=')
    .replace(/\boninput\s*=/giu, '@input=')
    .replace(/\bonsubmit\s*=/giu, '@submit=');
}

function removeLegacyShell(document, isLogin) {
  const body = document.querySelector('body');
  const main = body?.querySelector('main');
  const overlays = [];
  const overlayNodes = [
    ...(body?.querySelectorAll('el-dialog') || []),
    ...(body?.querySelectorAll('el-drawer') || []),
  ];
  for (const node of overlayNodes) {
    overlays.push(node.toString());
    node.remove();
  }

  if (main) {
    main.querySelectorAll('script,style').forEach((node) => node.remove());
    return {
      content: main.innerHTML,
      overlays,
      strategy: 'main',
    };
  }

  const app = body?.querySelector('#app');
  const container = app || body;
  if (!container) return { content: '', overlays, strategy: 'body' };
  if (!isLogin) container.querySelectorAll('aside,header,nav').forEach((node) => node.remove());
  container.querySelectorAll('script,style').forEach((node) => node.remove());
  return {
    content: container.innerHTML,
    overlays,
    strategy: app ? 'app' : 'body',
  };
}

function extractPageLogic(source) {
  const scripts = extractInlineScripts(source);
  const vueScript = scripts.find((script) => /(?:Vue\.)?createApp\s*\(/u.test(script));
  if (!vueScript) {
    return {
      mode: 'legacy-dom',
      logic: scripts.join('\n\n'),
      registerLegacyComponents: '',
    };
  }

  const createAppMatch = /(?:Vue\.)?createApp\s*\(/u.exec(vueScript);
  const openParen = vueScript.indexOf('(', createAppMatch.index);
  const closeParen = findMatchingDelimiter(vueScript, openParen, '(', ')');
  let optionsSource = '';
  let optionsEnd = closeParen;
  if (closeParen >= 0) {
    optionsSource = vueScript.slice(openParen + 1, closeParen).trim();
  } else {
    const objectOpen = vueScript.indexOf('{', openParen);
    const objectClose = objectOpen >= 0 ? findMatchingDelimiter(vueScript, objectOpen, '{', '}') : -1;
    if (objectClose >= 0) {
      optionsSource = vueScript.slice(objectOpen, objectClose + 1).trim();
      optionsEnd = objectClose;
    }
  }
  if (!optionsSource) {
    return {
      mode: 'legacy-dom',
      logic: vueScript,
      registerLegacyComponents: '',
    };
  }

  const prefix = vueScript
    .slice(0, createAppMatch.index)
    .replace(/(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*$/u, '')
    .trim();
  const suffix = vueScript.slice(optionsEnd + 1).replace(/^\s*\)?\s*;?\s*/u, '');
  const setupMatch = /\bsetup\s*\(\s*\)\s*\{/u.exec(optionsSource);
  const hasOptionsApi =
    /(?:^|[,{}]\s*)(?:data|computed|methods|watch|mounted|beforeUnmount)\s*(?::|\()/mu.test(optionsSource);

  const registerLegacyComponents = stripLegacyBootstrapCalls(suffix);

  if (!hasOptionsApi && setupMatch) {
    const setupOpen = optionsSource.indexOf('{', setupMatch.index);
    const setupClose = findMatchingDelimiter(optionsSource, setupOpen, '{', '}');
    if (setupClose > setupOpen) {
      const setupBody = optionsSource.slice(setupOpen + 1, setupClose).trim();
      return {
        mode: 'composition-api',
        logic: `function pageSetup() {\n${prefix}\n${setupBody}\n}`,
        registerLegacyComponents,
      };
    }
  }

  return {
    mode: 'options-api',
    logic: `${prefix}\nconst pageOptions = ${optionsSource};`,
    registerLegacyComponents,
  };
}

function createManifest({ client, page, fileName, title, sourceFile, isLogin, isLegacyDom }) {
  const routePath = page?.path || pagePathFromFile(fileName);
  return {
    templateVersion: 1,
    fileName,
    scriptMode: isLegacyDom ? 'legacy-dom' : page?.prototype?.scriptMode || 'composition-api',
    pageKey: page?.prototype?.pageKey || routePath,
    pageTitle: title,
    pageType: page?.prototype?.pageType || (isLogin ? 'login' : 'legacy-page'),
    pageHeaderMode: isLogin ? 'none' : page?.prototype?.pageHeaderMode || 'none',
    client: client.id,
    routePath: `/${client.id}/${routePath}`,
    menuSection: page?.section || null,
    menuTitle: page?.title || title,
    menuIcon: page?.icon || 'Document',
    menu: page?.menu !== false && !isLogin,
    sourceFile,
    legacySource: true,
  };
}

function pageDefinitionFor(definitions, clientId, routePath) {
  return definitions[clientId]?.pages?.find((page) => page.path === routePath) || null;
}

function createShell({ client, title, activeFile, pages, isLogin, isLegacyDom }) {
  if (isLogin) {
    return `<div class="prototype-workspace legacy-login-workspace">\n  <header class="prototype-topbar" data-prototype-shell="topbar">\n    <div class="prototype-breadcrumb">${escapeHtmlAttribute(client.label)} / 登录</div>\n    <div class="prototype-user"><span class="prototype-avatar">A</span><span>Admin</span></div>\n  </header>`;
  }

  const groups = new Map();
  for (const page of pages) {
    const section = page.section || 'workspace';
    if (!groups.has(section)) groups.set(section, page.sectionTitle || section);
  }
  const menu = [...groups.entries()]
    .map(([section, sectionTitle]) => {
      const items = pages
        .filter((page) => (page.section || 'workspace') === section)
        .map(
          (page) =>
            `<a class="prototype-menu-item${page.fileName === activeFile ? ' is-active' : ''}" href="./${escapeHtmlAttribute(page.fileName)}"${page.fileName === activeFile ? ' aria-current="page"' : ''}>${createMenuIconMarkup(page.icon)}<span>${escapeHtmlAttribute(page.title)}</span></a>`,
        )
        .join('\n');
      return `<div class="prototype-menu-group">${escapeHtmlAttribute(sectionTitle)}</div>\n${items}`;
    })
    .join('\n');

  const shellNote = isLegacyDom ? '静态模拟' : client.label;
  return `<aside class="prototype-sidebar" data-prototype-shell="sidebar">
  <div class="prototype-brand"><span>RIMO Rental</span><small>${escapeHtmlAttribute(shellNote)}</small></div>
  ${menu}
</aside>
<div class="prototype-workspace">
  <header class="prototype-topbar" data-prototype-shell="topbar">
    <div class="prototype-breadcrumb">首页 / ${escapeHtmlAttribute(client.label)} / ${escapeHtmlAttribute(title)}</div>
    <div class="prototype-user"><span class="prototype-avatar">A</span><span>Admin</span></div>
  </header>`;
}

const IGNORED_LEGACY_DEPENDENCIES = new Set(['client_portal_switcher.js']);

export function isIgnoredLegacyDependency(sourcePath) {
  return IGNORED_LEGACY_DEPENDENCIES.has(path.basename(String(sourcePath || '')));
}

function createDependencyTags(source, sourceDirectory, targetDirectory, localCopies, report) {
  const tags = extractExternalTags(source);
  const earlyScripts = [];
  const lateScripts = [];
  const styles = [];
  const seen = new Set();
  for (const tag of tags) {
    const sourcePath = tag.src.trim();
    if (isIgnoredLegacyDependency(sourcePath)) continue;
    if (!sourcePath || isVueOrElementDependency(sourcePath)) continue;
    if (seen.has(`${tag.type}:${sourcePath}`)) continue;
    seen.add(`${tag.type}:${sourcePath}`);
    if (isLocalPath(sourcePath)) {
      const absolutePath = path.resolve(sourceDirectory, sourcePath);
      if (absolutePath.startsWith(SOURCE_ROOT) && localCopies.has(absolutePath)) {
        const targetName = localCopies.get(absolutePath);
        const rewrittenTag =
          tag.type === 'script'
            ? `<script src="./${escapeHtmlAttribute(targetName)}"></script>`
            : `<link rel="stylesheet" href="./${escapeHtmlAttribute(targetName)}" />`;
        if (tag.type === 'script') lateScripts.push(rewrittenTag);
        else styles.push(rewrittenTag);
        continue;
      }
      report.warnings.push(`未复制本地依赖：${sourcePath}`);
      continue;
    }
    if (tag.type === 'script')
      earlyScripts.push(`<script src="${escapeHtmlAttribute(sourcePath)}"></script>`);
    else styles.push(`<link rel="stylesheet" href="${escapeHtmlAttribute(sourcePath)}" />`);
  }

  if (/cdn\.tailwindcss\.com/iu.test(source)) {
    earlyScripts.unshift('<script src="https://cdn.tailwindcss.com"></script>');
  }
  if (/echarts/iu.test(source) && !earlyScripts.some((tag) => /echarts/iu.test(tag))) {
    earlyScripts.push(
      '<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>',
    );
  }

  if (/dayjs/iu.test(source) && !earlyScripts.some((tag) => /dayjs/iu.test(tag))) {
    earlyScripts.push('<script src="https://unpkg.com/dayjs@1.11.10/dayjs.min.js"></script>');
  }

  return { earlyScripts: [...new Set(earlyScripts)], lateScripts, styles: [...new Set(styles)] };
}

function buildOutput({
  template,
  client,
  title,
  manifest,
  content,
  overlays,
  styles,
  dependencies,
  logic,
  registerLegacyComponents,
  scriptMode,
  activeFile,
  pages,
  isLogin,
  isLegacyDom,
  theme,
}) {
  const baseStyle = sectionBetween(
    template,
    '<!-- PROTOTYPE_BASE_STYLE_START -->',
    '<!-- PROTOTYPE_BASE_STYLE_END -->',
  );
  const headStart = template.indexOf('<head>') + '<head>'.length;
  const pageStyleStart = template.indexOf('<!-- [AI-EDIT] PAGE_STYLE_START');
  let headPrelude = template
    .slice(headStart, pageStyleStart)
    .replace(/<title>[\s\S]*?<\/title>/iu, `<title>${escapeHtmlAttribute(title)}</title>`);
  headPrelude = applyLegacyTheme(headPrelude, theme);
  headPrelude = `${headPrelude.trim()}\n${dependencies.styles.join('\n')}`;
  const themedBaseStyle = applyLegacyTheme(baseStyle, theme);
  const normalizedStyles = applyTemplateFontFamily(styles || '/* 页面没有独立样式。 */');
  const manifestJson = JSON.stringify(manifest, null, 2).replaceAll('<', '\\u003c');
  const pageStyle = `<!-- [AI-EDIT] PAGE_STYLE_START: 保留旧页面视觉样式；后续维护时逐步收敛到页面根类。 -->
<style data-page-style>
/* LEGACY_PAGE_STYLE_START: 原历史页面样式，未覆盖原文件；请按页面根类逐步整理。 */
    ${normalizedStyles}
/* LEGACY_PAGE_STYLE_END */
</style>
<!-- PAGE_STYLE_END -->`;
  const contentBlock = `<!-- [AI-EDIT] PAGE_CONTENT_START: 当前页面业务内容；模板化副本由历史 HTML 转换生成。 -->
<section class="legacy-page legacy-${escapeHtmlAttribute(manifest.pageKey)}" data-page-content data-page-root="legacy-${escapeHtmlAttribute(manifest.pageKey)}" data-page-key="${escapeHtmlAttribute(manifest.pageKey)}">
  <div data-business-content data-layout-type="legacy">
${rewriteLegacyEvents(content).trim()}
  </div>
</section>
<!-- PAGE_CONTENT_END -->`;
  const overlayBlock = `<!-- [AI-EDIT] PAGE_OVERLAYS_START: 页面弹窗与抽屉统一放在这里。 -->
<div data-page-overlay="overlay" data-block-id="legacy-overlays" data-block-name="历史页面覆盖层">
${rewriteLegacyEvents(overlays.join('\n')).trim() || '<!-- 当前页面没有独立覆盖层。 -->'}
</div>
<!-- PAGE_OVERLAYS_END -->`;
  const safeLogic = String(logic || '').replace(/<\/script/giu, '<\\/script');
  const logicBlock = `<!-- [AI-EDIT] PAGE_LOGIC_START: 保留历史页面逻辑；维护时优先整理为 Vue 组件逻辑。 -->
<script data-page-script>
/* [AI-EDIT] PAGE_LOGIC_START */
${safeLogic}
/* PAGE_LOGIC_END */
</script>`;
  const bootstrap = isLegacyDom
    ? ''
    : `<script data-page-bootstrap>
  const app = ${scriptMode === 'options-api' ? 'Vue.createApp(pageOptions)' : 'Vue.createApp({ setup: pageSetup })'};
  ${registerLegacyComponents ? 'function registerLegacyComponents(app) {\n' + registerLegacyComponents + '\n  }\n  registerLegacyComponents(app);' : ''}
  app.use(ElementPlus);
  if (typeof ElementPlusIconsVue !== 'undefined') {
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) app.component(key, component);
  }
  app.mount('#app');
</script>`;
  const lateScripts = dependencies.lateScripts.join('\n');
  const shell = createShell({ client, title, activeFile, pages, isLogin, isLegacyDom });
  const loginMainClass = isLogin ? ' legacy-login-main' : '';
  return `<!doctype html>
<html lang="zh-CN">
  <head>
${headPrelude}

    ${themedBaseStyle}

    ${pageStyle}

    <!-- [AI-EDIT] 页面元数据。由历史 HTML 转换生成，可继续手动维护。 -->
    <script id="prototype-page-manifest" type="application/json">${manifestJson}</script>
  </head>
  <body>
    <div id="app" class="prototype-app" v-cloak>
      <!-- PROTOTYPE_SHELL_START -->
      ${shell}
      <main class="prototype-main${loginMainClass}">
${contentBlock}
      </main>
      </div>
      ${overlayBlock}
    </div>

    <!-- PROTOTYPE_DEPENDENCIES_START -->
    <script src="https://unpkg.com/vue@3.4.21/dist/vue.global.prod.js"></script>
    <script src="https://unpkg.com/element-plus@2.8.0/dist/index.full.min.js"></script>
    <script src="https://unpkg.com/element-plus@2.8.0/dist/locale/zh-cn"></script>
    <script src="https://unpkg.com/@element-plus/icons-vue@2.3.1/dist/index.iife.min.js"></script>
    ${PROTOTYPE_MENU_ICON_RENDERER}
${dependencies.earlyScripts.join('\n')}
    <!-- PROTOTYPE_DEPENDENCIES_END -->

${logicBlock}
${bootstrap}
${lateScripts}
  </body>
</html>
`;
}

async function readDefinitions() {
  const definitionPath = path.join(PROJECT_ROOT, 'projects', 'rimo-rental', 'page-definitions.js');
  const module = await import(`${pathToFileURL(definitionPath).href}?legacyConversion=${Date.now()}`);
  return module.clientPageDefinitions;
}

async function collectLocalDependencies() {
  const result = new Map();
  const candidates = await fs.readdir(SOURCE_ROOT, { recursive: true }).catch(() => []);
  for (const relativePath of candidates) {
    if (!/\.js$/iu.test(relativePath)) continue;
    if (isIgnoredLegacyDependency(relativePath)) continue;
    const absolutePath = path.join(SOURCE_ROOT, relativePath);
    const stats = await fs.stat(absolutePath).catch(() => null);
    if (!stats?.isFile()) continue;
    result.set(absolutePath, path.basename(relativePath));
  }
  return result;
}

function pageMeta(client, fileName, source, definitions) {
  const document = parse(source);
  const title = readTitle(document, fileName);
  const routePath = pagePathFromFile(fileName);
  const page = pageDefinitionFor(definitions, client.id, routePath);
  const isLogin = /(?:^|_)login$/iu.test(path.basename(fileName, path.extname(fileName)));
  const isLegacyDom = !/(?:Vue\.)?createApp\s*\(/u.test(source);
  return {
    title: page?.title || title,
    page,
    isLogin,
    isLegacyDom,
    routePath,
  };
}

async function convertOne({ client, sourcePath, outputPath, definitions, template, localCopies, allPages }) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const theme = extractLegacyTheme(source);
  const fileName = path.basename(sourcePath);
  const meta = pageMeta(client, fileName, source, definitions);
  const document = parse(source, { comment: true });
  const extracted = removeLegacyShell(document, meta.isLogin);
  const logic = extractPageLogic(source);
  const report = {
    source: sourcePath,
    output: outputPath,
    client: client.id,
    fileName,
    title: meta.title,
    routePath: meta.routePath,
    scriptMode: logic.mode,
    contentStrategy: extracted.strategy,
    sourceBytes: Buffer.byteLength(source),
    warnings: [],
    primaryColor: theme?.primary || null,
  };
  if (source.includes('onclick='))
    report.warnings.push('已将 onclick 属性转换为 Vue @click 属性；请人工复核表达式。');
  if (/window\.location|\.html\s*['"`]/iu.test(source))
    report.warnings.push('仍包含旧式页面跳转逻辑，模板化副本保留原行为。');
  if (/cdn\.tailwindcss\.com/iu.test(source))
    report.warnings.push('保留 Tailwind CDN 依赖，尚未迁移为工程设计变量。');
  if (/<style\b/iu.test(source)) report.warnings.push('历史样式整体保留，尚未逐条限制到页面根类。');
  if (logic.mode === 'options-api')
    report.warnings.push('页面保留 Vue Options API，未强制改写为 Composition API。');
  if (logic.mode === 'legacy-dom')
    report.warnings.push('页面不是 Vue 页面，保留原生 DOM 脚本；该页需人工确认是否适合回导。');

  const dependencyTags = createDependencyTags(
    source,
    path.dirname(sourcePath),
    path.dirname(outputPath),
    localCopies,
    report,
  );
  const manifest = createManifest({
    client,
    page: meta.page,
    fileName,
    title: meta.title,
    sourceFile: path.relative(SOURCE_ROOT, sourcePath).split(path.sep).join('/'),
    isLogin: meta.isLogin,
    isLegacyDom: meta.isLegacyDom,
  });
  manifest.scriptMode = logic.mode;
  const output = buildOutput({
    template,
    client,
    title: meta.title,
    manifest,
    content: extracted.content,
    overlays: extracted.overlays,
    styles: [...document.querySelectorAll('style')]
      .map((node) => node.innerHTML.trim())
      .filter(Boolean)
      .join('\n\n'),
    dependencies: dependencyTags,
    logic: logic.logic,
    registerLegacyComponents: logic.registerLegacyComponents,
    scriptMode: logic.mode,
    activeFile: fileName,
    pages: allPages,
    isLogin: meta.isLogin,
    isLegacyDom: meta.isLegacyDom,
    theme,
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output, 'utf8');
  report.outputBytes = Buffer.byteLength(output);
  report.importable = logic.mode !== 'legacy-dom';
  report.dependencies = {
    earlyScripts: dependencyTags.earlyScripts,
    lateScripts: dependencyTags.lateScripts,
    styles: dependencyTags.styles,
  };
  return report;
}

async function main() {
  const force = process.argv.includes('--force');
  if (
    !force &&
    (await fs
      .stat(TARGET_ROOT)
      .then(() => true)
      .catch(() => false))
  ) {
    throw new Error(`输出目录已存在，如需重新生成请显式使用 --force：${TARGET_ROOT}`);
  }
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
  const definitions = await readDefinitions();
  const localCopies = await collectLocalDependencies();
  const reports = [];

  await fs.rm(TARGET_ROOT, { recursive: true, force: true });
  await fs.mkdir(TARGET_ROOT, { recursive: true });

  for (const client of SOURCE_CLIENTS) {
    const sourceDirectory = path.join(SOURCE_ROOT, client.directory);
    const targetDirectory = path.join(TARGET_ROOT, client.directory);
    const sourceFiles = (await fs.readdir(sourceDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /\.html?$/iu.test(entry.name))
      .map((entry) => path.join(sourceDirectory, entry.name))
      .sort((left, right) =>
        path.basename(left).localeCompare(path.basename(right), 'zh-Hans-CN', { numeric: true }),
      );
    const pageMetas = [];
    for (const sourcePath of sourceFiles) {
      const source = await fs.readFile(sourcePath, 'utf8');
      const meta = pageMeta(client, path.basename(sourcePath), source, definitions);
      const page = meta.page;
      pageMetas.push({
        fileName: path.basename(sourcePath),
        title: page?.title || meta.title,
        icon: page?.icon || 'Document',
        section: page?.section || 'workspace',
        sectionTitle:
          definitions[client.id]?.sections?.find((section) => section.id === page?.section)?.title ||
          '工作区',
      });
    }
    for (const [absolutePath, targetName] of localCopies.entries()) {
      const targetPath = path.join(targetDirectory, targetName);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(absolutePath, targetPath);
    }
    for (const sourcePath of sourceFiles) {
      const outputPath = path.join(targetDirectory, path.basename(sourcePath));
      reports.push(
        await convertOne({
          client,
          sourcePath,
          outputPath,
          definitions,
          template,
          localCopies,
          allPages: pageMetas,
        }),
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: SOURCE_ROOT,
    outputRoot: TARGET_ROOT,
    originalFilesUntouched: true,
    total: reports.length,
    importable: reports.filter((item) => item.importable).length,
    byScriptMode: Object.fromEntries(
      [...new Set(reports.map((item) => item.scriptMode))].map((mode) => [
        mode,
        reports.filter((item) => item.scriptMode === mode).length,
      ]),
    ),
    reports,
  };
  await fs.writeFile(
    path.join(TARGET_ROOT, 'conversion-report.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  await fs.writeFile(
    path.join(TARGET_ROOT, 'README.md'),
    `# 历史 HTML 模板化副本\n\n本目录由项目资料原型工程自动生成。\n\n- 原始目录：\`${SOURCE_ROOT}\`\n- 原始 HTML 未修改。\n- 营运端和企业端页面已补齐模板外壳、页面内容区、覆盖层、逻辑区和页面元数据。\n- 详细转换结果见 \`conversion-report.json\`。\n- 页面中的历史业务逻辑、CDN、Tailwind 和部分旧式跳转按原行为保留，并在报告中标记。\n`,
    'utf8',
  );
  console.log(
    JSON.stringify(
      {
        outputRoot: TARGET_ROOT,
        total: report.total,
        importable: report.importable,
        byScriptMode: report.byScriptMode,
      },
      null,
      2,
    ),
  );
}

export { stripLegacyBootstrapCalls };

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
