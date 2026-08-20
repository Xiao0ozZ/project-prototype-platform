const SCRIPT_BLOCK_PATTERN = /<script\b[^>]*\bid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/script>/gi;
const PLATFORM_EXPORT_FORMATS = new Set(['vue-sfc', 'html-template']);

export function extractEmbeddedScript(source, scriptId) {
  const expectedId = String(scriptId || '').trim();
  if (!expectedId) return null;
  const html = String(source || '');
  const pattern = new RegExp(SCRIPT_BLOCK_PATTERN.source, 'gi');
  let match = pattern.exec(html);
  while (match) {
    if (match[1] === expectedId) return match[2];
    match = pattern.exec(html);
  }
  return null;
}

export function readPlatformExportManifest(source) {
  const content = extractEmbeddedScript(source, 'prototype-page-manifest');
  if (content === null) return null;
  try {
    const manifest = JSON.parse(content.trim());
    return manifest && typeof manifest === 'object' && !Array.isArray(manifest) ? manifest : null;
  } catch {
    return null;
  }
}

export function isSupportedPlatformExportFormat(value) {
  return PLATFORM_EXPORT_FORMATS.has(String(value || '').trim());
}

export function isPlatformExportHtml(source) {
  const format = readPlatformExportManifest(source)?.exportFormat;
  return Boolean(
    isSupportedPlatformExportFormat(format) &&
    extractEmbeddedScript(source, 'prototype-editable-template') !== null,
  );
}

export function isTemplatePrototypeHtml(source) {
  return readPlatformExportManifest(source)?.templateVersion === 1;
}

export function isHtmlPrototypeContentSource(source) {
  return isPlatformExportHtml(source) || isTemplatePrototypeHtml(source);
}
