import { normalizePagePrdLinks as normalizeLinks } from '../../packages/platform-contracts/src/index.js';
import { platformApi } from './platform-api';

export function normalizePagePrdLinks(payload) {
  return normalizeLinks(payload);
}

export async function loadPagePrdLinks(projectId) {
  return platformApi.loadPagePrdLinks(projectId);
}

export async function savePagePrdLinks(projectId, links) {
  return platformApi.savePagePrdLinks(projectId, links);
}
