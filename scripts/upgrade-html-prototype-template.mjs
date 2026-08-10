import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'node-html-parser';
import postcss from 'postcss';

import { applyMenuIcons, PROTOTYPE_MENU_ICON_RENDERER } from './html-prototype-menu-icons.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_TEMPLATE = path.join(PROJECT_ROOT, 'templates', 'html-prototype-page.html');
const LOGIN_FILE_PATTERN = /(?:^|_)login\.html?$/iu;
const FIXED_STYLE_DEPENDENCIES = [
  '<link rel="stylesheet" href="https://unpkg.com/element-plus@2.8.0/dist/index.css" />',
];
const FIXED_SCRIPT_DEPENDENCIES = [
  '<script src="https://unpkg.com/vue@3.4.21/dist/vue.global.prod.js"></script>',
  '<script src="https://unpkg.com/element-plus@2.8.0/dist/index.full.min.js"></script>',
  '<script src="https://unpkg.com/element-plus@2.8.0/dist/locale/zh-cn"></script>',
  '<script src="https://unpkg.com/@element-plus/icons-vue@2.3.1/dist/index.iife.min.js"></script>',
  PROTOTYPE_MENU_ICON_RENDERER,
];
const SHELL_SELECTOR_PATTERN =
  /(?:^|[\s>+~,(])(?:html|body|#app|\*|\.prototype-(?:app|sidebar|brand|menu(?:-group|-item|-icon)?|workspace|topbar|breadcrumb|user|avatar|main)|\[v-cloak\])(?:$|[\s>+~.#:[,)])/u;
const TELEPORTED_SELECTOR_PATTERN =
  /\.(?:el-(?:overlay|dialog|drawer|popper|select-dropdown|picker-panel|message-box|tooltip)|el-message)(?:\b|[-_])/u;

function parseArgs(argv) {
  const result = { write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--write') {
      result.write = true;
      continue;
    }
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`参数 ${token} 缺少值。`);
    result[key] = value;
    index += 1;
  }
  return result;
}

function requireArgument(args, key) {
  const value = String(args[key] || '').trim();
  if (!value) throw new Error(`缺少 --${key.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}。`);
  return value;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceHtmlRegion(source, startToken, endToken, body) {
  const startTokenIndex = source.indexOf(startToken);
  if (startTokenIndex < 0) throw new Error(`模板缺少 ${startToken}。`);
  const startCommentStart = source.lastIndexOf('<!--', startTokenIndex);
  const startCommentEnd = source.indexOf('-->', startTokenIndex);
  if (startCommentStart < 0 || startCommentEnd < 0) throw new Error(`无法解析 ${startToken} 注释。`);
  const endTokenIndex = source.indexOf(endToken, startCommentEnd + 3);
  if (endTokenIndex < 0) throw new Error(`模板缺少 ${endToken}。`);
  const endCommentStart = source.lastIndexOf('<!--', endTokenIndex);
  if (endCommentStart < 0) throw new Error(`无法解析 ${endToken} 注释。`);
  return `${source.slice(0, startCommentEnd + 3)}\n${body.trim()}\n${source.slice(endCommentStart)}`;
}

function extractHtmlRegion(source, startToken, endToken) {
  const startTokenIndex = source.indexOf(startToken);
  if (startTokenIndex < 0) throw new Error(`页面缺少 ${startToken}。`);
  const startCommentEnd = source.indexOf('-->', startTokenIndex);
  const endTokenIndex = source.indexOf(endToken, startCommentEnd + 3);
  if (startCommentEnd < 0 || endTokenIndex < 0) throw new Error(`页面无法解析 ${startToken}/${endToken}。`);
  const endCommentStart = source.lastIndexOf('<!--', endTokenIndex);
  return source.slice(startCommentEnd + 3, endCommentStart).trim();
}

function extractScript(source, attribute) {
  const pattern = new RegExp(`<script\\b[^>]*${escapeRegExp(attribute)}[^>]*>([\\s\\S]*?)<\\/script>`, 'iu');
  return source.match(pattern)?.[1]?.trim() || '';
}

function extractManifest(source) {
  const manifestSource = source.includes('PAGE_MANIFEST_START')
    ? extractHtmlRegion(source, 'PAGE_MANIFEST_START', 'PAGE_MANIFEST_END')
    : source;
  const match = manifestSource.match(
    /<script\b[^>]*\bid=["']prototype-page-manifest["'][^>]*>([\s\S]*)<\/script>/iu,
  );
  if (!match) throw new Error('页面缺少 prototype-page-manifest。');
  return JSON.parse(match[1].trim());
}

function extractCssVariable(source, name, fallback) {
  const match = source.match(new RegExp(`${escapeRegExp(name)}\\s*:\\s*([^;]+)`, 'iu'));
  return match?.[1]?.trim() || fallback;
}

function normalizeHex(value, fallback) {
  const match = String(value || '').match(/^#([0-9a-f]{6})$/iu);
  return match ? `#${match[1].toUpperCase()}` : fallback;
}

function mixWithWhite(hex, ratio) {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)
    .map((part) => Number.parseInt(part, 16));
  return `#${channels
    .map((channel) => Math.round(channel + (255 - channel) * ratio))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function themeFromSource(source) {
  const primary = normalizeHex(extractCssVariable(source, '--app-color-primary', ''), '#007AFF');
  const hover = normalizeHex(extractCssVariable(source, '--app-color-primary-hover', ''), primary);
  const active = normalizeHex(extractCssVariable(source, '--app-color-primary-active', ''), primary);
  const shadow = extractCssVariable(source, '--app-color-primary-shadow', 'rgb(0 122 255 / 16%)');
  return {
    primary,
    hover,
    active,
    shadow,
    light3: mixWithWhite(primary, 0.3),
    light5: mixWithWhite(primary, 0.5),
    light7: mixWithWhite(primary, 0.7),
    light8: mixWithWhite(primary, 0.8),
    light9: mixWithWhite(primary, 0.9),
  };
}

function applyTheme(template, theme) {
  const themeRegion = extractHtmlRegion(template, 'THEME_TOKENS_START', 'THEME_TOKENS_END');
  const replacements = {
    '--app-color-primary': theme.primary,
    '--app-color-primary-hover': theme.hover,
    '--app-color-primary-active': theme.active,
    '--app-color-primary-shadow': theme.shadow,
    '--app-color-primary-light-3': theme.light3,
    '--app-color-primary-light-5': theme.light5,
    '--app-color-primary-light-7': theme.light7,
    '--app-color-primary-light-8': theme.light8,
    '--app-color-primary-light-9': theme.light9,
  };
  let nextRegion = themeRegion;
  for (const [name, value] of Object.entries(replacements)) {
    nextRegion = nextRegion.replace(new RegExp(`(${escapeRegExp(name)}\\s*:\\s*)[^;]+`, 'iu'), `$1${value}`);
  }
  return replaceHtmlRegion(template, 'THEME_TOKENS_START', 'THEME_TOKENS_END', nextRegion);
}

function pageKeyFromManifest(manifest, fileName) {
  const candidate = String(manifest.pageKey || path.basename(fileName, path.extname(fileName)))
    .normalize('NFKC')
    .replace(/_/gu, '-')
    .replace(/[^a-zA-Z0-9-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .toLowerCase();
  if (candidate) return candidate;
  let hash = 2166136261;
  for (const character of fileName) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `page-${(hash >>> 0).toString(36)}`;
}

function readTitle(source, manifest, fileName) {
  const htmlTitle = source.match(/<title>([\s\S]*?)<\/title>/iu)?.[1]?.trim();
  return String(manifest.pageTitle || htmlTitle || path.basename(fileName, path.extname(fileName))).trim();
}

function extractPageStyle(source) {
  const match = source.match(/<style\b[^>]*\bdata-page-style\b[^>]*>([\s\S]*?)<\/style>/iu);
  if (!match) throw new Error('页面缺少 data-page-style。');
  return match[1]
    .replace(/\/\*\s*LEGACY_PAGE_STYLE_START:[\s\S]*?\*\//u, '')
    .replace(/\/\*\s*LEGACY_PAGE_STYLE_END\s*\*\//u, '')
    .trim();
}

function hasAncestorKeyframes(rule) {
  let current = rule.parent;
  while (current) {
    if (current.type === 'atrule' && /keyframes$/iu.test(current.name)) return true;
    current = current.parent;
  }
  return false;
}

function stripLeadingDocumentSelector(selector) {
  return selector.replace(/^(?:html|body|#app)(?:\.[\w-]+)?\s+/u, '');
}

function scopePageCss(css, rootClass, existingRootClasses) {
  const normalizedCss = css.replace(/(\{\s*)f\s+(?=background-color\s*:)/gu, '$1');
  const ast = postcss.parse(normalizedCss);
  ast.walkRules((rule) => {
    if (hasAncestorKeyframes(rule)) return;
    const selectors = rule.selectors || [];
    const nextSelectors = [];
    for (const rawSelector of selectors) {
      let selector = rawSelector.trim();
      if (!selector) continue;
      if (selector === ':root') {
        rule.walkDecls((declaration) => {
          if (/^--(?:app|el)-/u.test(declaration.prop)) declaration.remove();
        });
        if (rule.nodes?.length) nextSelectors.push(`.${rootClass}`);
        continue;
      }
      if (SHELL_SELECTOR_PATTERN.test(selector)) continue;
      if (TELEPORTED_SELECTOR_PATTERN.test(selector)) {
        nextSelectors.push(selector);
        continue;
      }
      selector = stripLeadingDocumentSelector(selector);
      const existingRoot = existingRootClasses.find((className) =>
        new RegExp(`^\\.${escapeRegExp(className)}(?=$|[\\s.#:[>+~])`, 'u').test(selector),
      );
      if (existingRoot) {
        nextSelectors.push(
          selector.replace(new RegExp(`^\\.${escapeRegExp(existingRoot)}`, 'u'), `.${rootClass}`),
        );
      } else if (new RegExp(`^\\.${escapeRegExp(rootClass)}(?=$|[\\s.#:[>+~])`, 'u').test(selector)) {
        nextSelectors.push(selector);
      } else {
        nextSelectors.push(`.${rootClass} ${selector}`);
      }
    }
    if (!nextSelectors.length) rule.remove();
    else rule.selectors = [...new Set(nextSelectors)];
  });
  ast.walkAtRules((atRule) => {
    if (atRule.nodes && atRule.nodes.length === 0) atRule.remove();
  });
  return ast.toString().trim() || `.${rootClass} { min-width: 0; }`;
}

function normalizeContent(content, rootClass) {
  const document = parse(content, { comment: true });
  const roots = document.querySelectorAll('[data-page-content]');
  if (roots.length !== 1) throw new Error(`data-page-content 数量应为 1，当前为 ${roots.length}。`);
  const businessRoots = document.querySelectorAll('[data-business-content]');
  if (businessRoots.length !== 1) {
    throw new Error(`data-business-content 数量应为 1，当前为 ${businessRoots.length}。`);
  }
  const root = roots[0];
  const existingRootClasses = String(root.getAttribute('class') || '')
    .split(/\s+/u)
    .filter(Boolean);
  root.setAttribute('class', [...new Set([...existingRootClasses, rootClass])].join(' '));
  root.setAttribute('data-page-root', rootClass);
  root.setAttribute('data-page-key', rootClass);
  return { markup: document.toString().trim(), existingRootClasses };
}

function normalizeOverlay(overlays, overlayRootClass) {
  const document = parse(overlays, { comment: true });
  const roots = document.querySelectorAll('[data-page-overlay]');
  if (roots.length !== 1) throw new Error(`data-page-overlay 数量应为 1，当前为 ${roots.length}。`);
  const root = roots[0];
  const classes = String(root.getAttribute('class') || '')
    .split(/\s+/u)
    .filter(Boolean);
  root.setAttribute('class', [...new Set([...classes, overlayRootClass])].join(' '));
  for (const component of document.querySelectorAll('el-dialog, el-drawer')) {
    const componentClasses = String(component.getAttribute('class') || '')
      .split(/\s+/u)
      .filter(Boolean);
    component.setAttribute('class', [...new Set([...componentClasses, overlayRootClass])].join(' '));
  }
  return document.toString().trim();
}

function extractShellData(source, fallbackProjectName, fallbackClientName) {
  const document = parse(source, { comment: true });
  const aside = document.querySelector('.prototype-sidebar');
  if (!aside) throw new Error('业务页面缺少 prototype-sidebar。');
  const projectName = aside.querySelector('.prototype-brand span')?.text.trim() || fallbackProjectName;
  const clientName = aside.querySelector('.prototype-brand small')?.text.trim() || fallbackClientName;
  const breadcrumb = document.querySelector('.prototype-breadcrumb')?.text.trim() || `首页 / ${clientName}`;
  const menuNodes = aside.querySelectorAll('.prototype-menu-group, .prototype-menu-item');
  if (!menuNodes.length) throw new Error('侧栏没有可保留的菜单项。');
  const menu = menuNodes.map((node) => {
    if (node.classNames.includes('is-active')) {
      node.setAttribute('data-shell-page-title', '');
      node.setAttribute('aria-current', 'page');
    } else {
      node.removeAttribute('data-shell-page-title');
      node.removeAttribute('aria-current');
    }
    return node.toString();
  });
  return { projectName, clientName, breadcrumb, menu };
}

function menuIdentity(source) {
  const document = parse(source);
  return document
    .querySelectorAll('.prototype-sidebar .prototype-menu-group, .prototype-sidebar .prototype-menu-item')
    .map((node) => ({
      kind: node.classNames.includes('prototype-menu-group') ? 'group' : 'item',
      text: node.text.trim().replace(/\s+/gu, ' '),
      href: node.getAttribute('href') || '',
    }));
}

function activateMenu(menu, fileName, pageTitle) {
  const document = parse(menu.join('\n'));
  const targetName = fileName.toLowerCase();
  let matched = false;
  for (const node of document.querySelectorAll('.prototype-menu-item')) {
    const classes = String(node.getAttribute('class') || '')
      .split(/\s+/u)
      .filter((className) => className && className !== 'is-active');
    node.setAttribute('class', classes.join(' '));
    node.removeAttribute('aria-current');
    node.removeAttribute('data-shell-page-title');
    const hrefName = path.basename(String(node.getAttribute('href') || '').split(/[?#]/u)[0]).toLowerCase();
    const matchesFile = hrefName === targetName;
    const matchesTitle = !matched && node.text.trim() === pageTitle;
    if (matchesFile || (!hrefName && matchesTitle)) {
      node.setAttribute('class', [...classes, 'is-active'].join(' '));
      node.setAttribute('aria-current', 'page');
      node.setAttribute('data-shell-page-title', '');
      matched = true;
    }
  }
  return document.childNodes.map((node) => node.toString());
}

function selectCanonicalMenu(sources, fallbackProjectName, fallbackClientName) {
  const variants = new Map();
  for (const source of sources) {
    const identity = menuIdentity(source);
    const key = JSON.stringify(identity);
    const current = variants.get(key) || {
      count: 0,
      shell: extractShellData(source, fallbackProjectName, fallbackClientName),
    };
    current.count += 1;
    variants.set(key, current);
  }
  return [...variants.values()].sort((left, right) => right.count - left.count)[0]?.shell || null;
}

function externalDependencies(source) {
  const document = parse(source);
  const styles = document
    .querySelectorAll('link[rel="stylesheet"]')
    .map((node) => node.getAttribute('href'))
    .filter((href) => href && !/element-plus@2\.8\.0\/dist\/index\.css/iu.test(href))
    .map((href) => `<link rel="stylesheet" href="${href}">`);
  const scripts = document
    .querySelectorAll('script[src]')
    .map((node) => node.getAttribute('src'))
    .filter(
      (src) =>
        src &&
        !/(?:vue\.global\.prod|element-plus@2\.8\.0\/dist\/index\.full|min\.js.*element-plus|icons-vue@2\.3\.1|locale\/zh-cn)/iu.test(
          src,
        ),
    )
    .map((src) => `<script src="${src}"></script>`);
  return { styles: [...new Set(styles)], scripts: [...new Set(scripts)] };
}

function dependencyReference(markup) {
  return String(markup || '').match(/\b(?:href|src)=["']([^"']+)["']/iu)?.[1] || String(markup || '').trim();
}

function repairCurrentManifest(source, menuIconByFile) {
  const manifest = extractManifest(source);
  const dependencies = Array.isArray(manifest.dependencies)
    ? [...new Set(manifest.dependencies.map(dependencyReference).filter(Boolean))]
    : [];
  const nextManifest = { ...manifest, dependencies };
  let output = replaceHtmlRegion(
    source,
    'PAGE_MANIFEST_START',
    'PAGE_MANIFEST_END',
    `<script id="prototype-page-manifest" type="application/json">\n${JSON.stringify(nextManifest, null, 2)}\n    </script>`,
  );
  if (!output.includes('data-prototype-menu-icon-renderer')) {
    const dependencies = extractHtmlRegion(
      output,
      'PROTOTYPE_SCRIPT_DEPENDENCIES_START',
      'PROTOTYPE_SCRIPT_DEPENDENCIES_END',
    );
    output = replaceHtmlRegion(
      output,
      'PROTOTYPE_SCRIPT_DEPENDENCIES_START',
      'PROTOTYPE_SCRIPT_DEPENDENCIES_END',
      `${dependencies}\n${PROTOTYPE_MENU_ICON_RENDERER}`,
    );
  }
  output = applyMenuIcons(output, menuIconByFile);
  return { output, manifest: nextManifest };
}

function stripLogicMarkers(script) {
  return script
    .replace(/^\s*\/\*[^\n]*PAGE_LOGIC_START[^\n]*\*\/\s*/u, '')
    .replace(/\s*\/\*\s*PAGE_LOGIC_END\s*\*\/\s*$/u, '')
    .trim();
}

function buildPageScript(source, scriptMode) {
  const logic = stripLogicMarkers(extractScript(source, 'data-page-script'));
  if (!logic) throw new Error('页面缺少 PAGE_LOGIC。');
  const existingBootstrap = extractScript(source, 'data-page-bootstrap');
  let bootstrap = existingBootstrap;
  if (!bootstrap && scriptMode === 'composition-api') {
    bootstrap = `const app = Vue.createApp({ setup: pageSetup });\napp.use(ElementPlus, { locale: ElementPlusLocaleZhCn });\napp.mount('#app');`;
  } else if (!bootstrap && scriptMode === 'options-api') {
    bootstrap = `const app = Vue.createApp(pageOptions);\napp.use(ElementPlus, { locale: ElementPlusLocaleZhCn });\napp.mount('#app');`;
  }
  bootstrap = bootstrap.replace(
    /app\.use\(ElementPlus\);/gu,
    'app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });',
  );
  const bootstrapBlock = bootstrap
    ? `\n\n      /* TEMPLATE-LOCK: PROTOTYPE_BOOTSTRAP_START。页面启动代码，不得放入业务逻辑。 */\n${bootstrap}\n      /* PROTOTYPE_BOOTSTRAP_END */`
    : '';
  return `<script data-page-script>\n      /* [AI-EDIT] PAGE_LOGIC_START: 页面状态、计算属性、方法和模拟数据。 */\n${logic}\n      /* PAGE_LOGIC_END */${bootstrapBlock}\n    </script>`;
}

function normalizeManifest({ sourceManifest, fileName, title, clientId, rootClass, dependencies }) {
  const routeTail = String(sourceManifest.routePath || `/${clientId}/${rootClass}`)
    .replace(/^\/+|\/+$/gu, '')
    .split('/')
    .slice(1)
    .join('/');
  return {
    templateVersion: 1,
    scriptMode: sourceManifest.scriptMode || 'composition-api',
    pageKey: rootClass,
    pageTitle: title,
    fileName,
    pageType: sourceManifest.pageType === 'legacy-page' ? 'custom' : sourceManifest.pageType || 'custom',
    pageHeaderMode: sourceManifest.pageHeaderMode || 'none',
    client: clientId,
    routePath: `/${clientId}/${routeTail || rootClass}`,
    menuSection: sourceManifest.menuSection ?? null,
    menuTitle: sourceManifest.menuTitle || title,
    menuIcon: sourceManifest.menuIcon || 'Document',
    menu: sourceManifest.menu !== false,
    rootClass,
    overlayRootClass: `${rootClass}-overlay`,
    contentSelector: '[data-page-content]',
    businessContentSelector: '[data-business-content]',
    overlaySelector: '[data-page-overlay]',
    styleSelector: '[data-page-style]',
    dependencies,
    assets: Array.isArray(sourceManifest.assets) ? sourceManifest.assets : [],
  };
}

function replaceShellText(source, shell) {
  return source
    .replace(
      /(<span\b[^>]*\bdata-shell-project-name\b[^>]*>)[\s\S]*?(<\/span>)/iu,
      `$1${escapeHtml(shell.projectName)}$2`,
    )
    .replace(
      /(<small\b[^>]*\bdata-shell-client-name\b[^>]*>)[\s\S]*?(<\/small>)/iu,
      `$1${escapeHtml(shell.clientName)}$2`,
    )
    .replace(
      /(<div\b[^>]*\bdata-shell-breadcrumb\b[^>]*>)[\s\S]*?(<\/div>)/iu,
      `$1${escapeHtml(shell.breadcrumb)}$2`,
    );
}

function buildOutput({
  template,
  source,
  fileName,
  clientId,
  fallbackProjectName,
  fallbackClientName,
  canonicalMenu,
  replaceInvalidMenu,
}) {
  const sourceManifest = extractManifest(source);
  const title = readTitle(source, sourceManifest, fileName);
  const rootClass = pageKeyFromManifest(sourceManifest, fileName);
  const theme = themeFromSource(source);
  const sourceShell = extractShellData(source, fallbackProjectName, fallbackClientName);
  const shell = replaceInvalidMenu
    ? {
        projectName: fallbackProjectName,
        clientName: fallbackClientName,
        breadcrumb: `首页 / ${fallbackClientName} / ${title}`,
        menu: activateMenu(canonicalMenu, fileName, title),
      }
    : sourceShell;
  const content = normalizeContent(
    extractHtmlRegion(source, 'PAGE_CONTENT_START', 'PAGE_CONTENT_END'),
    rootClass,
  );
  const overlayRootClass = `${rootClass}-overlay`;
  const overlays = normalizeOverlay(
    extractHtmlRegion(source, 'PAGE_OVERLAYS_START', 'PAGE_OVERLAYS_END'),
    overlayRootClass,
  );
  const dependencies = externalDependencies(source);
  const dependencyNames = [
    'vue',
    'element-plus',
    'element-plus/locale/zh-cn',
    '@element-plus/icons-vue',
    ...dependencies.styles.map(dependencyReference),
    ...dependencies.scripts.map(dependencyReference),
  ];
  const manifest = normalizeManifest({
    sourceManifest,
    fileName,
    title,
    clientId,
    rootClass,
    dependencies: dependencyNames,
  });
  const pageCss = scopePageCss(extractPageStyle(source), rootClass, content.existingRootClasses);
  let output = template.replace(/<title>[\s\S]*?<\/title>/iu, `<title>${escapeHtml(title)}</title>`);
  output = applyTheme(output, theme);
  output = replaceHtmlRegion(
    output,
    'PROTOTYPE_STYLE_DEPENDENCIES_START',
    'PROTOTYPE_STYLE_DEPENDENCIES_END',
    [...FIXED_STYLE_DEPENDENCIES, ...dependencies.styles].join('\n'),
  );
  output = replaceHtmlRegion(
    output,
    'PAGE_STYLE_START',
    'PAGE_STYLE_END',
    `<style data-page-style>\n${pageCss}\n    </style>`,
  );
  output = replaceHtmlRegion(
    output,
    'PAGE_MANIFEST_START',
    'PAGE_MANIFEST_END',
    `<script id="prototype-page-manifest" type="application/json">\n${JSON.stringify(manifest, null, 2)}\n    </script>`,
  );
  output = replaceShellText(output, shell);
  output = replaceHtmlRegion(output, 'SHELL_NAV_START', 'SHELL_NAV_END', shell.menu.join('\n'));
  output = replaceHtmlRegion(output, 'PAGE_CONTENT_START', 'PAGE_CONTENT_END', content.markup);
  output = replaceHtmlRegion(output, 'PAGE_OVERLAYS_START', 'PAGE_OVERLAYS_END', overlays);
  output = replaceHtmlRegion(
    output,
    'PROTOTYPE_SCRIPT_DEPENDENCIES_START',
    'PROTOTYPE_SCRIPT_DEPENDENCIES_END',
    [...FIXED_SCRIPT_DEPENDENCIES, ...dependencies.scripts].join('\n'),
  );
  output = output.replace(
    /<script\b[^>]*\bdata-page-script\b[^>]*>[\s\S]*?<\/script>/iu,
    buildPageScript(source, manifest.scriptMode),
  );
  if (manifest.scriptMode === 'legacy-dom') {
    output = output.replace(/(<div\s+id="app"\s+class="prototype-app")\s+v-cloak/iu, '$1');
  }
  return { output, manifest, theme, shell, sourceContent: content.markup };
}

function menuContract(source) {
  const document = parse(source);
  return document
    .querySelectorAll('.prototype-sidebar .prototype-menu-group, .prototype-sidebar .prototype-menu-item')
    .map((node) => ({
      text: node.text.trim().replace(/\s+/gu, ' '),
      href: node.getAttribute('href') || '',
      active: node.classNames.includes('is-active'),
    }));
}

function menuContractFromMarkup(markup) {
  const document = parse(markup);
  return document.querySelectorAll('.prototype-menu-group, .prototype-menu-item').map((node) => ({
    text: node.text.trim().replace(/\s+/gu, ' '),
    href: node.getAttribute('href') || '',
    active: node.classNames.includes('is-active'),
  }));
}

function countHtmlMarker(source, token) {
  return [...source.matchAll(/<!--([\s\S]*?)-->/gu)].filter((match) => {
    const comment = match[1].trim();
    return comment.startsWith(token) || comment.startsWith(`[AI-EDIT] ${token}`);
  }).length;
}

function findBrokenMenuLinks(source, root) {
  const document = parse(source);
  const brokenLinks = [];
  for (const link of document.querySelectorAll('.prototype-sidebar a[href]')) {
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || /^(?:[a-z]+:|\/\/)/iu.test(href)) continue;
    const cleanPath = decodeURIComponent(href.split(/[?#]/u)[0]);
    const target = path.resolve(root, cleanPath);
    if (!target.startsWith(root) || !fileNameSet.has(path.basename(target).toLowerCase())) {
      brokenLinks.push(href);
    }
  }
  return [...new Set(brokenLinks)];
}

function validateOutput({ output, root, theme, expectedMenu }) {
  const errors = [];
  const document = parse(output);
  for (const token of [
    'PROTOTYPE_AI_PROTOCOL_START',
    'PROTOTYPE_AI_PROTOCOL_END',
    'THEME_TOKENS_START',
    'THEME_TOKENS_END',
    'PROTOTYPE_BASE_STYLE_START',
    'PROTOTYPE_BASE_STYLE_END',
    'PAGE_MANIFEST_START',
    'PAGE_MANIFEST_END',
  ]) {
    const markerCount = countHtmlMarker(output, token);
    if (markerCount !== 1) errors.push(`${token} 数量为 ${markerCount}`);
  }
  if (document.querySelectorAll('[data-page-content]').length !== 1) errors.push('data-page-content 不唯一');
  if (document.querySelectorAll('[data-business-content]').length !== 1) {
    errors.push('data-business-content 不唯一');
  }
  if (document.querySelectorAll('[data-page-overlay]').length !== 1) errors.push('data-page-overlay 不唯一');
  const menuItems = document.querySelectorAll('.prototype-sidebar .prototype-menu-item');
  if (menuItems.some((item) => !item.querySelector('[data-prototype-menu-icon]'))) {
    errors.push('侧栏菜单存在缺失图标的项目');
  }
  if (menuItems.length && !document.querySelector('[data-prototype-menu-icon-renderer]')) {
    errors.push('页面缺少菜单图标 CDN 渲染器');
  }
  if (JSON.stringify(expectedMenu) !== JSON.stringify(menuContract(output))) {
    errors.push('菜单分组、顺序、文案、链接或当前项发生变化');
  }
  const outputTheme = themeFromSource(extractHtmlRegion(output, 'THEME_TOKENS_START', 'THEME_TOKENS_END'));
  if (outputTheme.primary !== theme.primary) errors.push(`主题色未保留：${outputTheme.primary}`);
  const brokenLinks = findBrokenMenuLinks(output, root);
  if (brokenLinks.length) errors.push(`菜单存在无效链接：${[...new Set(brokenLinks)].join('、')}`);
  return errors;
}

const fileNameSet = new Set();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(requireArgument(args, 'root'));
  const clientId = requireArgument(args, 'client');
  const templatePath = path.resolve(args.template || DEFAULT_TEMPLATE);
  const fallbackProjectName = String(args.projectName || '项目原型');
  const fallbackClientName = String(args.clientName || clientId);
  const [template, entries] = await Promise.all([
    fs.readFile(templatePath, 'utf8'),
    fs.readdir(root, { withFileTypes: true }),
  ]);
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && /\.html?$/iu.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN', { numeric: true }));
  htmlFiles.forEach((fileName) => fileNameSet.add(fileName.toLowerCase()));
  const sourceEntries = await Promise.all(
    htmlFiles
      .filter((fileName) => !LOGIN_FILE_PATTERN.test(fileName))
      .map(async (fileName) => ({
        fileName,
        source: await fs.readFile(path.join(root, fileName), 'utf8'),
      })),
  );
  const menuIconByFile = new Map(
    sourceEntries.map(({ fileName, source }) => {
      const manifest = extractManifest(source);
      return [fileName.toLowerCase(), manifest.menuIcon || 'Document'];
    }),
  );
  const canonicalShell = selectCanonicalMenu(
    sourceEntries.map((entry) => entry.source),
    fallbackProjectName,
    fallbackClientName,
  );
  if (!canonicalShell) throw new Error('无法确定客户端标准菜单。');
  const reports = [];
  for (const fileName of htmlFiles) {
    const filePath = path.join(root, fileName);
    if (LOGIN_FILE_PATTERN.test(fileName)) {
      reports.push({ fileName, status: 'skipped-login', errors: [] });
      continue;
    }
    const source = sourceEntries.find((entry) => entry.fileName === fileName)?.source;
    if (!source) throw new Error(`无法读取 ${fileName}。`);
    if (source.includes('PROTOTYPE_AI_PROTOCOL_START') && source.includes('THEME_TOKENS_START')) {
      try {
        const repaired = repairCurrentManifest(source, menuIconByFile);
        const changed = repaired.output !== source;
        const errors = validateOutput({
          output: repaired.output,
          root,
          theme: themeFromSource(source),
          expectedMenu: menuContract(source),
        });
        if (!errors.length && changed && args.write) await fs.writeFile(filePath, repaired.output, 'utf8');
        reports.push({
          fileName,
          status: errors.length
            ? 'invalid'
            : changed
              ? args.write
                ? 'repaired-current'
                : 'needs-repair'
              : 'already-current',
          errors,
        });
      } catch (error) {
        reports.push({ fileName, status: 'invalid', errors: [error.message] });
      }
      continue;
    }
    try {
      const result = buildOutput({
        template,
        source,
        fileName,
        clientId,
        fallbackProjectName,
        fallbackClientName,
        canonicalMenu: canonicalShell.menu,
        replaceInvalidMenu: findBrokenMenuLinks(source, root).length > 0,
      });
      const errors = validateOutput({
        output: result.output,
        root,
        theme: result.theme,
        expectedMenu: menuContractFromMarkup(result.shell.menu.join('\n')),
      });
      if (!errors.length && args.write) await fs.writeFile(filePath, result.output, 'utf8');
      reports.push({
        fileName,
        status: errors.length ? 'invalid' : args.write ? 'written' : 'ready',
        pageTitle: result.manifest.pageTitle,
        scriptMode: result.manifest.scriptMode,
        primary: result.theme.primary,
        menuItems: result.shell.menu.length,
        menuRepaired: findBrokenMenuLinks(source, root).length > 0,
        sourceBytes: Buffer.byteLength(source),
        outputBytes: Buffer.byteLength(result.output),
        errors,
      });
    } catch (error) {
      reports.push({ fileName, status: 'invalid', errors: [error.message] });
    }
  }
  const summary = {
    root,
    mode: args.write ? 'write' : 'dry-run',
    total: reports.length,
    ready: reports.filter((item) => item.status === 'ready').length,
    written: reports.filter((item) => item.status === 'written').length,
    skippedLogin: reports.filter((item) => item.status === 'skipped-login').length,
    alreadyCurrent: reports.filter((item) => item.status === 'already-current').length,
    needsRepair: reports.filter((item) => item.status === 'needs-repair').length,
    repairedCurrent: reports.filter((item) => item.status === 'repaired-current').length,
    invalid: reports.filter((item) => item.status === 'invalid').length,
  };
  console.log(JSON.stringify({ summary, reports }, null, 2));
  if (summary.invalid) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
