const INLINE_EVENT_PATTERN = /\son[a-z]+\s*=/giu;
const EXTERNAL_RESOURCE_PATTERN = /<(?:script|link|img)\b[^>]+(?:src|href)=["']https?:\/\//giu;

function countMatches(source, pattern) {
  return [...String(source || '').matchAll(new RegExp(pattern.source, pattern.flags))].length;
}

function readManifest(source) {
  const match = String(source || '').match(
    /<script\b[^>]*\bid=["']prototype-page-manifest["'][^>]*>([\s\S]*?)<\/script>/iu,
  );
  if (!match) return null;
  try {
    const value = JSON.parse(match[1].trim());
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return false;
  }
}

function issue(code, message, detail = '') {
  return { code, message, ...(detail ? { detail } : {}) };
}

export function inspectHtmlPrototype(source, { fileName = '', requireDocument = true } = {}) {
  const html = String(source || '');
  const errors = [];
  const warnings = [];
  const manifest = readManifest(html);
  const isRoundTripExport = Boolean(manifest?.exportFormat);
  const isEditableTemplate = manifest?.templateVersion === 1 && !isRoundTripExport;
  const markup = html.replace(/<!--[\s\S]*?-->/gu, '');
  const contentCount = countMatches(markup, /<[^>]*\bdata-page-content(?:\s|=|>)[^>]*>/giu);
  const businessContentCount = countMatches(markup, /<[^>]*\bdata-business-content(?:\s|=|>)[^>]*>/giu);

  if (requireDocument && !/^\s*<!doctype\s+html>/iu.test(html)) {
    errors.push(issue('missing-doctype', '缺少标准 HTML5 doctype。'));
  }
  if (requireDocument && !/<meta\b[^>]*charset=["']?utf-8/iu.test(html)) {
    errors.push(issue('missing-charset', '缺少 UTF-8 charset 声明。'));
  }
  if (requireDocument && !/<meta\b[^>]*name=["']viewport["']/iu.test(html)) {
    warnings.push(issue('missing-viewport', '缺少 viewport，窄窗口显示可能异常。'));
  }
  if (requireDocument && !/<title>\s*[^<\s][^<]*<\/title>/iu.test(html)) {
    errors.push(issue('missing-title', '浏览器标题为空或缺失。'));
  }
  if (manifest === false) {
    errors.push(issue('invalid-manifest', 'prototype-page-manifest 不是有效 JSON。'));
  } else if (!manifest) {
    warnings.push(issue('missing-manifest', '未找到页面 Manifest，只能作为普通 HTML 直读。'));
  } else {
    for (const field of ['pageKey', 'pageTitle', 'client', 'routePath']) {
      if (!String(manifest[field] || '').trim()) {
        errors.push(issue('manifest-field-missing', `页面 Manifest 缺少 ${field}。`, field));
      }
    }
  }

  if (isEditableTemplate && contentCount !== 1) {
    errors.push(
      issue(
        'page-content-count',
        `模板页面必须且只能有一个 data-page-content，当前检测到 ${contentCount} 个。`,
      ),
    );
  }
  if (isEditableTemplate && businessContentCount !== 1) {
    errors.push(
      issue(
        'business-content-count',
        `模板页面必须且只能有一个 data-business-content，当前检测到 ${businessContentCount} 个。`,
      ),
    );
  }
  if (isEditableTemplate) {
    const requiredMarkers = [
      '[AI-EDIT] PAGE_CONTENT_START',
      'PAGE_CONTENT_END',
      '[AI-EDIT] PAGE_OVERLAYS_START',
      'PAGE_OVERLAYS_END',
      '[AI-EDIT] PAGE_LOGIC_START',
      'PAGE_LOGIC_END',
    ];
    for (const marker of requiredMarkers) {
      if (!html.includes(marker)) {
        errors.push(issue('template-marker-missing', `模板编辑边界缺失：${marker}`, marker));
      }
    }
  }

  const inlineEvents = countMatches(html, INLINE_EVENT_PATTERN);
  if (inlineEvents) {
    errors.push(issue('inline-events', `检测到 ${inlineEvents} 个内联事件，请改用页面逻辑区事件绑定。`));
  }
  const duplicateTopbars = Math.max(
    countMatches(html, /<header\b[^>]*class=["'][^"']*prototype-topbar/giu),
    countMatches(html, /\bdata-prototype-topbar(?:\s|=|>)/giu),
  );
  if (duplicateTopbars > 1) {
    errors.push(issue('duplicate-topbar', `检测到 ${duplicateTopbars} 个原型顶栏，直读时会重复显示。`));
  }
  const externalResources = countMatches(html, EXTERNAL_RESOURCE_PATTERN);
  if (externalResources) {
    warnings.push(
      issue('external-resources', `页面引用 ${externalResources} 个外部资源，离线或受限网络下可能不可用。`),
    );
  }
  if (/href=["'](?:javascript:|file:)/iu.test(html)) {
    errors.push(issue('unsafe-link', '检测到 javascript: 或 file: 链接，无法安全导入或发布。'));
  }
  if (isEditableTemplate && !/--app-color-primary\s*:/u.test(html)) {
    warnings.push(
      issue('theme-token-missing', '模板页面没有声明 --app-color-primary，项目主题可能无法接管。'),
    );
  }

  return {
    fileName,
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: manifest || null,
    summary: {
      errors: errors.length,
      warnings: warnings.length,
      template: isEditableTemplate,
      roundTrip: isRoundTripExport,
      document: requireDocument,
      contentCount,
      businessContentCount,
    },
  };
}
