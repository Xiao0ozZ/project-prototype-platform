import { promises as fs } from 'node:fs';
import path from 'node:path';

import { PROJECT_ID_PATTERN } from './constants.js';
import { fileExists, readJsonFile, toWebPath, walkFiles } from './filesystem.js';
import { resolveProjectContentRoot } from './project-manifest.js';

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

export async function loadProjectDocumentRoots(projectsRoot) {
  const root = path.resolve(projectsRoot);
  const roots = new Map();
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    if (!entry.isDirectory() || !PROJECT_ID_PATTERN.test(entry.name)) continue;
    const projectRoot = path.join(root, entry.name);
    try {
      const manifest = await readJsonFile(path.join(projectRoot, 'project.json'));
      if (manifest.id !== entry.name || !manifest.docs?.enabled) continue;
      const docsRoot = resolveProjectContentRoot(projectRoot, manifest.docs.root, 'docs');
      if (await fileExists(docsRoot, 'directory')) roots.set(entry.name, docsRoot);
    } catch {
      // Invalid project packages are reported by the project package scanner.
    }
  }
  return roots;
}
