import { platformApi } from './platform-api';

export function normalizeDocumentPath(value) {
  const segments = String(value || '')
    .replaceAll('\\', '/')
    .split('/');
  const normalized = [];
  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') normalized.pop();
    else normalized.push(segment);
  }
  return normalized.join('/');
}

export function resolveDocumentReference(currentDocumentPath, reference) {
  const value = String(reference || '').trim();
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value)) return value;

  const suffixIndex = value.search(/[?#]/u);
  const pathPart = suffixIndex >= 0 ? value.slice(0, suffixIndex) : value;
  const suffix = suffixIndex >= 0 ? value.slice(suffixIndex) : '';
  const currentFolder = currentDocumentPath.split('/').slice(0, -1).join('/');
  const resolved = normalizeDocumentPath(
    pathPart.startsWith('/') ? pathPart : `${currentFolder}/${pathPart}`,
  );
  return `${resolved}${suffix}`;
}

export function getDocumentAssetUrl(projectId, documentPath) {
  const normalizedPath = normalizeDocumentPath(documentPath);
  return platformApi.getDocumentAssetUrl(projectId, normalizedPath);
}

export function loadDocumentManifest(projectId) {
  return platformApi.loadDocumentManifest(projectId);
}

export function loadDocument(projectId, documentPath) {
  return platformApi.loadDocument(projectId, normalizeDocumentPath(documentPath));
}

export function onDocumentsChanged(projectId, callback) {
  if (!import.meta.hot) return () => {};
  const handleChange = (payload) => {
    if (!payload?.projectId || payload.projectId === projectId) callback();
  };
  import.meta.hot.on('prd-docs:changed', handleChange);
  return () => import.meta.hot.off('prd-docs:changed', handleChange);
}
