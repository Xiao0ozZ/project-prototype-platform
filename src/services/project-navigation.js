const CLIENT_ENTRY_MODES = new Set(['direct', 'platform-login', 'custom-page']);
const CLIENT_LAYOUT_TYPES = new Set(['sidebar', 'topnav', 'none', 'bare']);

export function normalizePagePath(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

export function getClientEntryMode(client) {
  const mode = String(client?.entry?.mode || '').trim();
  return CLIENT_ENTRY_MODES.has(mode) ? mode : 'platform-login';
}

export function getClientLayoutType(client) {
  const type = String(client?.layout?.type || '').trim();
  return CLIENT_LAYOUT_TYPES.has(type) ? type : 'sidebar';
}

export function getClientDefaultPagePath(client) {
  const pages = Array.isArray(client?.definition?.pages) ? client.definition.pages : [];
  const configuredPath = normalizePagePath(client?.defaultPage);
  const configuredPage = pages.find(
    (page) => normalizePagePath(page?.path) === configuredPath && configuredPath,
  );
  if (configuredPage) return normalizePagePath(configuredPage.path);

  const firstMenuPage = pages.find((page) => page?.menu !== false && normalizePagePath(page?.path));
  if (firstMenuPage) return normalizePagePath(firstMenuPage.path);

  const firstPage = pages.find((page) => normalizePagePath(page?.path));
  return firstPage ? normalizePagePath(firstPage.path) : '';
}

export function getClientEntryPagePath(client) {
  const mode = getClientEntryMode(client);
  if (mode === 'platform-login') return 'login';

  if (mode === 'custom-page') {
    const requestedPath = normalizePagePath(client?.entry?.page);
    const pageExists = client?.definition?.pages?.some(
      (page) => normalizePagePath(page?.path) === requestedPath,
    );
    if (requestedPath && pageExists) return requestedPath;
  }

  return getClientDefaultPagePath(client);
}

export function getProjectClientEntryPath(projectId, client) {
  const clientRoot = `/p/${projectId}/${client?.id || ''}`.replace(/\/+$/u, '');
  const entryPage = getClientEntryPagePath(client);
  return entryPage ? `${clientRoot}/${entryPage}` : clientRoot;
}
