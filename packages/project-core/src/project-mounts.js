import { promises as fs } from 'node:fs';
import path from 'node:path';

import { PROJECT_ID_PATTERN } from './constants.js';
import { readJsonFile } from './filesystem.js';
import { normalizePrototypeSources } from './project-manifest.js';

export const PROJECT_MOUNTS_SCHEMA_VERSION = 1;

function normalizeAbsolutePath(value) {
  const source = String(value || '').trim();
  return source ? path.resolve(source) : '';
}

export function normalizeProjectMounts(payload = {}) {
  const projects = {};
  for (const [projectId, value] of Object.entries(payload.projects || {})) {
    if (!PROJECT_ID_PATTERN.test(projectId) || !value || typeof value !== 'object') continue;
    const root = normalizeAbsolutePath(value.root);
    const docsRoot = normalizeAbsolutePath(value.docsRoot);
    const prototypes = {};
    for (const [clientId, root] of Object.entries(value.prototypes || {})) {
      if (!PROJECT_ID_PATTERN.test(clientId)) continue;
      const normalizedRoot = normalizeAbsolutePath(root);
      if (normalizedRoot) prototypes[clientId] = normalizedRoot;
    }
    if (root || docsRoot || Object.keys(prototypes).length) {
      projects[projectId] = {
        ...(root ? { root } : {}),
        ...(docsRoot ? { docsRoot } : {}),
        prototypes,
      };
    }
  }
  return { schemaVersion: PROJECT_MOUNTS_SCHEMA_VERSION, projects };
}

export async function loadProjectMounts(filePath) {
  const payload = await readJsonFile(filePath, {
    fallback: { schemaVersion: PROJECT_MOUNTS_SCHEMA_VERSION, projects: {} },
  });
  if (payload.schemaVersion !== PROJECT_MOUNTS_SCHEMA_VERSION) {
    throw new Error(`项目挂载配置 schemaVersion 必须为 ${PROJECT_MOUNTS_SCHEMA_VERSION}。`);
  }
  return normalizeProjectMounts(payload);
}

export function getProjectMount(projectId, mounts = {}) {
  return mounts.projects?.[projectId] || null;
}

export function resolveProjectRoot(projectsRoot, projectId, mounts = {}) {
  const mountedRoot = getProjectMount(projectId, mounts)?.root;
  return mountedRoot || path.resolve(projectsRoot, projectId);
}

export async function listProjectLocations(projectsRoot, mounts = {}) {
  const locations = [];
  const root = path.resolve(projectsRoot);
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    if (entry.isDirectory() && PROJECT_ID_PATTERN.test(entry.name)) {
      locations.push({ projectId: entry.name, root: path.join(root, entry.name), mounted: false });
    }
  }
  for (const [projectId, mount] of Object.entries(mounts.projects || {})) {
    if (!mount.root) continue;
    const existing = locations.find((item) => item.projectId === projectId);
    if (existing) {
      existing.duplicateMountedRoot = path.resolve(mount.root);
      continue;
    }
    locations.push({ projectId, root: path.resolve(mount.root), mounted: true });
  }
  return locations.sort((left, right) => left.projectId.localeCompare(right.projectId));
}

export function resolveProjectDocsRoot(manifest, projectRoot, mounts = {}) {
  const mountedRoot = getProjectMount(manifest.id, mounts)?.docsRoot;
  return mountedRoot || path.resolve(projectRoot, String(manifest.docs?.root || 'docs').trim());
}

export function resolveProjectPrototypeSources(manifest, projectRoot, mounts = {}) {
  const mounted = getProjectMount(manifest.id, mounts)?.prototypes || {};
  return normalizePrototypeSources(manifest.prototype).map((source) => ({
    ...source,
    configuredRoot: source.root,
    root: mounted[source.clientId] || path.resolve(projectRoot, source.root),
    mounted: Boolean(mounted[source.clientId]),
  }));
}

export function describeProjectMounts(manifest, projectRoot, mounts = {}) {
  const projectMount = getProjectMount(manifest.id, mounts);
  return {
    projectId: manifest.id,
    project: { root: projectRoot, mounted: Boolean(projectMount?.root) },
    docs: manifest.docs?.enabled
      ? {
          root: resolveProjectDocsRoot(manifest, projectRoot, mounts),
          mounted: Boolean(projectMount?.docsRoot),
        }
      : null,
    prototypes: resolveProjectPrototypeSources(manifest, projectRoot, mounts).map((source) => ({
      clientId: source.clientId,
      root: source.root,
      mounted: source.mounted,
    })),
  };
}
