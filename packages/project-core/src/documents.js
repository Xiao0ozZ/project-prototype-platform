import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  fileExists,
  readJsonFile,
  resolveExistingPathInsideRoot,
  toWebPath,
  walkFiles,
} from './filesystem.js';
import { listProjectLocations, resolveProjectDocsRoot } from './project-mounts.js';

export const DOCUMENT_PUBLIC_EXTENSIONS = new Set(['.md', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

export async function createDocumentManifest(root) {
  const documents = [];
  for (const absolutePath of await walkFiles(root, { extensions: DOCUMENT_PUBLIC_EXTENSIONS })) {
    if (path.extname(absolutePath).toLowerCase() !== '.md') continue;
    const relativePath = toWebPath(path.relative(root, absolutePath));
    const stats = await fs.stat(absolutePath);
    const segments = relativePath.split('/');
    const fileName = segments.at(-1).replace(/\.md$/iu, '');
    documents.push({
      path: relativePath,
      title: fileName.replace(/^\d+[_-]/u, ''),
      fileName,
      folders: segments.slice(0, -1),
      archived: segments.includes('归档') || segments.includes('存档'),
      updatedAt: stats.mtime.toISOString(),
      size: stats.size,
    });
  }
  documents.sort((left, right) => left.path.localeCompare(right.path, 'zh-Hans-CN', { numeric: true }));
  return { generatedAt: new Date().toISOString(), documents };
}

export async function loadProjectDocumentRoots(projectsRoot, { mounts = {} } = {}) {
  const root = path.resolve(projectsRoot);
  const roots = new Map();
  for (const location of await listProjectLocations(root, mounts)) {
    const projectRoot = location.root;
    try {
      const manifestPath = await resolveExistingPathInsideRoot(projectRoot, 'project.json', {
        allowedExtensions: new Set(['.json']),
      });
      if (!manifestPath) continue;
      const manifest = await readJsonFile(manifestPath);
      if (manifest.id !== location.projectId || !manifest.docs?.enabled) continue;
      const docsRoot = resolveProjectDocsRoot(manifest, projectRoot, mounts);
      if (await fileExists(docsRoot, 'directory')) roots.set(location.projectId, docsRoot);
    } catch {
      // Invalid project packages are reported by the project package scanner.
    }
  }
  return roots;
}
