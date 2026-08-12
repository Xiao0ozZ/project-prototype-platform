import {
  PLATFORM_ERROR_CODES,
  PlatformApiError,
  assertSuccessPayload,
  createApiError,
  createStaticReadOnlyError,
  normalizeDocumentManifest,
  normalizeHtmlPageCatalog,
  normalizePagePrdLinks,
  normalizePlatformSettings,
  normalizePrdBindings,
  normalizeProjectScanResult,
  normalizeRouteList,
} from '../../platform-contracts/src/index.js';

const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json' });

function normalizeBaseUrl(value) {
  const baseUrl = String(value || '/');
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function encodeFilePath(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createPlatformClient({
  fetchImpl = globalThis.fetch,
  baseUrl = '/',
  development = false,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('createPlatformClient 需要可用的 fetch。');
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function requestJson(url, options = {}) {
    const { fallbackMessage = '平台请求失败。', normalize, ...requestOptions } = options;
    let response;
    try {
      response = await fetchImpl(url, { cache: 'no-store', ...requestOptions });
    } catch (cause) {
      throw new PlatformApiError('无法连接到平台服务。', {
        code: PLATFORM_ERROR_CODES.NETWORK_ERROR,
        cause,
      });
    }

    const payload = await parseJsonResponse(response);
    if (!response.ok) throw createApiError(payload, { status: response.status, fallbackMessage });
    if (payload === null) {
      throw new PlatformApiError('平台接口返回了无法解析的数据。', {
        code: PLATFORM_ERROR_CODES.INVALID_RESPONSE,
        status: response.status,
      });
    }
    return normalize ? normalize(payload) : payload;
  }

  async function requestText(url, options = {}) {
    const { fallbackMessage = '平台内容读取失败。', ...requestOptions } = options;
    let response;
    try {
      response = await fetchImpl(url, { cache: 'no-store', ...requestOptions });
    } catch (cause) {
      throw new PlatformApiError('无法连接到平台服务。', {
        code: PLATFORM_ERROR_CODES.NETWORK_ERROR,
        cause,
      });
    }
    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw createApiError(payload, { status: response.status, fallbackMessage });
    }
    return response.text();
  }

  function requireDevelopment(message) {
    if (!development) throw createStaticReadOnlyError(message);
  }

  function documentAssetUrl(projectId, documentPath) {
    const encodedProjectId = encodeURIComponent(projectId);
    const encodedPath = encodeFilePath(documentPath);
    return development
      ? `/__prd/file?project=${encodedProjectId}&path=${encodeURIComponent(documentPath)}`
      : `${normalizedBaseUrl}projects/${encodedProjectId}/docs/content/${encodedPath}`;
  }

  return Object.freeze({
    development,
    baseUrl: normalizedBaseUrl,

    loadProjectManifest() {
      const url = development ? '/__projects/manifest' : `${normalizedBaseUrl}projects/manifest.json`;
      return requestJson(url, {
        fallbackMessage: '项目包扫描失败。',
        normalize: normalizeProjectScanResult,
      });
    },

    loadHtmlPageCatalog() {
      const url = development ? '/__projects/html-pages' : `${normalizedBaseUrl}projects/html-pages.json`;
      return requestJson(url, {
        fallbackMessage: 'HTML 页面目录读取失败。',
        normalize: normalizeHtmlPageCatalog,
      });
    },

    getHtmlPrototypeUrl(projectId, clientId, sourcePath) {
      const encodedProjectId = encodeURIComponent(projectId);
      const encodedClientId = encodeURIComponent(clientId || '_');
      const encodedPath = encodeFilePath(sourcePath);
      if (!encodedProjectId || !encodedPath) return '';
      const hasSourceRoot = clientId && clientId !== '_';
      return development
        ? `/__projects/html-content/${encodedProjectId}/${encodedClientId}/${encodedPath}`
        : `${normalizedBaseUrl}projects/${encodedProjectId}/prototype/${hasSourceRoot ? `${encodedClientId}/` : ''}${encodedPath}`;
    },

    getHtmlPrototypeSourceDownloadUrl(projectId, clientId, sourcePath) {
      if (!development) return '';
      const encodedProjectId = encodeURIComponent(projectId);
      const encodedClientId = encodeURIComponent(clientId || '_');
      const encodedPath = encodeFilePath(sourcePath);
      if (!encodedProjectId || !encodedPath) return '';
      return `/__projects/html-content/${encodedProjectId}/${encodedClientId}/${encodedPath}?download=source`;
    },

    getProjectAssetUrl(projectId, assetPath) {
      const encodedProjectId = encodeURIComponent(projectId);
      const encodedPath = encodeFilePath(assetPath);
      if (!encodedProjectId || !encodedPath) return '';
      return development
        ? `/__projects/file?project=${encodedProjectId}&path=${encodeURIComponent(assetPath)}`
        : `${normalizedBaseUrl}projects/${encodedProjectId}/${encodedPath}`;
    },

    async saveProject(project, { editing = false } = {}) {
      requireDevelopment('静态部署不支持修改项目配置。');
      return requestJson(editing ? '/__projects/update' : '/__projects/create', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(project),
        fallbackMessage: editing ? '项目配置保存失败。' : '项目创建失败。',
        normalize: (payload) => assertSuccessPayload(payload, '项目配置保存失败。'),
      });
    },

    async loadPagePrdLinks(projectId) {
      const encodedProjectId = encodeURIComponent(projectId);
      const url = development
        ? `/__projects/page-prd-links?project=${encodedProjectId}`
        : `${normalizedBaseUrl}projects/${encodedProjectId}/.platform/page-prd-links.json`;
      try {
        return await requestJson(url, {
          fallbackMessage: '页面 PRD 关联配置读取失败。',
          normalize: normalizePagePrdLinks,
        });
      } catch (error) {
        if (error instanceof PlatformApiError && error.status === 404) return {};
        throw error;
      }
    },

    async savePagePrdLinks(projectId, links) {
      requireDevelopment('静态页面只能查看页面关联，请在本地开发环境中编辑。');
      const normalizedLinks = normalizePagePrdLinks(links);
      return requestJson(`/__projects/page-prd-links?project=${encodeURIComponent(projectId)}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ projectId, links: normalizedLinks }),
        fallbackMessage: '页面 PRD 关联配置保存失败。',
        normalize: normalizePagePrdLinks,
      });
    },

    async loadPrdBindings(projectId) {
      const encodedProjectId = encodeURIComponent(projectId);
      const url = development
        ? `/__projects/prd-bindings?project=${encodedProjectId}`
        : `${normalizedBaseUrl}projects/${encodedProjectId}/.platform/prd-bindings.json`;
      try {
        return await requestJson(url, {
          fallbackMessage: 'PRD 关联配置读取失败。',
          normalize: normalizePrdBindings,
        });
      } catch (error) {
        if (error instanceof PlatformApiError && error.status === 404) {
          return normalizePrdBindings({});
        }
        throw error;
      }
    },

    async savePrdBindings(projectId, bindings) {
      requireDevelopment('静态页面只能查看关联，请在本地开发环境中进入关联编辑模式。');
      return requestJson(`/__projects/prd-bindings?project=${encodeURIComponent(projectId)}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ projectId, bindings }),
        fallbackMessage: 'PRD 关联配置保存失败。',
        normalize: normalizePrdBindings,
      });
    },

    getDocumentAssetUrl: documentAssetUrl,

    loadDocumentManifest(projectId) {
      const encodedProjectId = encodeURIComponent(projectId);
      const url = development
        ? `/__prd/manifest?project=${encodedProjectId}`
        : `${normalizedBaseUrl}projects/${encodedProjectId}/docs/manifest.json`;
      return requestJson(url, {
        fallbackMessage: '项目文档目录读取失败。',
        normalize: normalizeDocumentManifest,
      });
    },

    loadDocument(projectId, documentPath) {
      return requestText(documentAssetUrl(projectId, documentPath), {
        fallbackMessage: 'PRD 文档读取失败。',
      });
    },

    async loadPlatformSettings() {
      const urls = development
        ? ['/__platform/settings', `${normalizedBaseUrl}platform-settings.json`]
        : [`${normalizedBaseUrl}platform-settings.json`];
      for (const url of urls) {
        try {
          return await requestJson(url, {
            fallbackMessage: '平台设置读取失败。',
            normalize: normalizePlatformSettings,
          });
        } catch {
          // 开发接口不可用时回退到静态设置；离线场景使用关闭状态。
        }
      }
      return normalizePlatformSettings({});
    },

    async savePlatformSettings(settings) {
      requireDevelopment('静态部署不支持在线修改共享开发模式。');
      return requestJson('/__platform/settings', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(normalizePlatformSettings(settings)),
        fallbackMessage: '共享开发模式保存失败。',
        normalize: normalizePlatformSettings,
      });
    },

    async inspectHtml(html) {
      requireDevelopment('静态部署不支持检查待导入页面。');
      return requestJson('/__page-transfer/inspect', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ html }),
        fallbackMessage: 'HTML 检查失败。',
        normalize: (payload) => assertSuccessPayload(payload, 'HTML 检查失败。'),
      });
    },

    async importPage(html, target) {
      requireDevelopment('静态部署不支持导入页面。');
      return requestJson('/__page-transfer/import', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ html, target }),
        fallbackMessage: '页面导入失败。',
        normalize: (payload) => assertSuccessPayload(payload, '页面导入失败。'),
      });
    },

    async exportPages({ projectId, selectedPaths = [], packageName }) {
      requireDevelopment('静态部署不支持导出页面。');
      return requestJson('/__page-transfer/export', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ projectId, selectedPaths, packageName }),
        fallbackMessage: '页面导出失败。',
        normalize: (payload) => assertSuccessPayload(payload, '页面导出失败。'),
      });
    },

    async listRoutes(projectId) {
      requireDevelopment('静态部署不支持路由管理。');
      return requestJson(`/__page-transfer/routes?projectId=${encodeURIComponent(projectId)}`, {
        fallbackMessage: '路由读取失败。',
        normalize: normalizeRouteList,
      });
    },

    async mutateRoute(action, target) {
      requireDevelopment('静态部署不支持路由管理。');
      const endpoints = {
        create: '/__page-transfer/route/create',
        update: '/__page-transfer/route/update',
        delete: '/__page-transfer/route/delete',
        restore: '/__page-transfer/route/restore',
        order: '/__page-transfer/route/order',
        'section-update': '/__page-transfer/section/update',
        'section-restore': '/__page-transfer/section/restore',
      };
      const endpoint = endpoints[action];
      if (!endpoint) throw new TypeError(`未知路由操作：${action}`);
      return requestJson(endpoint, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(target),
        fallbackMessage: '路由操作失败。',
        normalize: (payload) => assertSuccessPayload(payload, '路由操作失败。'),
      });
    },
  });
}
