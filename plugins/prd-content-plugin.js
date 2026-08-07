import { promises as fs } from 'node:fs';
import path from 'node:path';

const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const PUBLIC_EXTENSIONS = new Set(['.md', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const MIME_TYPES = {
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=utf-8',
};

const toWebPath = (filePath) => filePath.split(path.sep).join('/');

function isInsideRoot(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolvePublicFile(root, relativePath) {
  const normalized = String(relativePath || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '');
  const target = path.resolve(root, ...normalized.split('/'));
  if (!isInsideRoot(root, target) || !PUBLIC_EXTENSIONS.has(path.extname(target).toLowerCase())) return null;
  return target;
}

async function walkFiles(root) {
  const files = [];
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolutePath);
      else if (entry.isFile() && PUBLIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(absolutePath);
      }
    }
  }
  await walk(root);
  return files;
}

async function createManifest(root) {
  const files = await walkFiles(root);
  const documents = [];
  for (const absolutePath of files) {
    if (path.extname(absolutePath).toLowerCase() !== '.md') continue;
    const relativePath = toWebPath(path.relative(root, absolutePath));
    const stats = await fs.stat(absolutePath);
    const segments = relativePath.split('/');
    const fileName = segments.at(-1).replace(/\.md$/i, '');
    documents.push({
      path: relativePath,
      title: fileName.replace(/^\d+[_-]/, ''),
      fileName,
      folders: segments.slice(0, -1),
      archived: segments.includes('归档') || segments.includes('存档'),
      updatedAt: stats.mtime.toISOString(),
      size: stats.size,
    });
  }
  documents.sort((a, b) => a.path.localeCompare(b.path, 'zh-Hans-CN', { numeric: true }));
  return { generatedAt: new Date().toISOString(), documents };
}

async function loadProjectDocumentRoots(projectsRoot) {
  const roots = new Map();
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    if (!entry.isDirectory() || !PROJECT_ID_PATTERN.test(entry.name)) continue;
    const projectRoot = path.join(projectsRoot, entry.name);
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(projectRoot, 'project.json'), 'utf8'));
      if (manifest.id !== entry.name || !manifest.docs?.enabled) continue;
      const docsRoot = path.resolve(projectRoot, manifest.docs.root || 'docs');
      const exists = await fs
        .stat(docsRoot)
        .then((stats) => stats.isDirectory())
        .catch(() => false);
      if (exists) roots.set(entry.name, docsRoot);
    } catch {
      // Invalid project packages are reported by the project package scanner.
    }
  }
  return roots;
}

function sendJson(res, payload, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function prdContentPlugin({ projectsRoot }) {
  const root = path.resolve(projectsRoot);
  let isBuild = false;
  let documentRoots = new Map();
  let documentRootsLoading = null;

  async function refreshDocumentRoots() {
    if (!documentRootsLoading) {
      documentRootsLoading = loadProjectDocumentRoots(root)
        .then((nextRoots) => {
          documentRoots = nextRoots;
          return nextRoots;
        })
        .finally(() => {
          documentRootsLoading = null;
        });
    }
    return documentRootsLoading;
  }

  return {
    name: 'project-prd-content',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    async configureServer(server) {
      await refreshDocumentRoots();
      server.watcher.add(root);
      documentRoots.forEach((docsRoot) => server.watcher.add(docsRoot));
      server.watcher.on('all', async (_eventName, changedPath) => {
        try {
          const absolutePath = path.resolve(changedPath);
          const relativePath = toWebPath(path.relative(root, absolutePath));
          const isProjectConfigChange =
            absolutePath === root || /^([a-z][a-z0-9-]*)\/project\.json$/i.test(relativePath);
          if (isProjectConfigChange) {
            await refreshDocumentRoots();
            documentRoots.forEach((docsRoot) => server.watcher.add(docsRoot));
          }
          for (const [projectId, docsRoot] of documentRoots) {
            if (isInsideRoot(docsRoot, absolutePath)) {
              server.ws.send({ type: 'custom', event: 'prd-docs:changed', data: { projectId } });
              break;
            }
          }
        } catch (error) {
          server.config.logger.error(`[prd-content] 文档目录刷新失败：${error.message}`);
        }
      });
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        if (!['/__prd/manifest', '/__prd/file'].includes(requestUrl.pathname)) return next();
        const projectId = requestUrl.searchParams.get('project');
        let docsRoot = documentRoots.get(projectId);
        if (!docsRoot) {
          const refreshedRoots = await refreshDocumentRoots();
          docsRoot = refreshedRoots.get(projectId);
        }
        if (!docsRoot) {
          sendJson(res, { message: '项目文档目录不存在或项目不可用' }, 404);
          return;
        }
        if (requestUrl.pathname === '/__prd/manifest') {
          try {
            sendJson(res, await createManifest(docsRoot));
          } catch (error) {
            sendJson(res, { message: '文档清单读取失败', detail: error.message }, 500);
          }
          return;
        }
        const target = resolvePublicFile(docsRoot, requestUrl.searchParams.get('path'));
        if (!target) {
          sendJson(res, { message: '文档路径无效' }, 400);
          return;
        }
        try {
          const content = await fs.readFile(target);
          res.statusCode = 200;
          res.setHeader(
            'Content-Type',
            MIME_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
          );
          res.setHeader('Cache-Control', 'no-store');
          res.end(content);
        } catch (error) {
          sendJson(
            res,
            { message: '文档读取失败', detail: error.message },
            error.code === 'ENOENT' ? 404 : 500,
          );
        }
      });
    },
    async buildStart() {
      if (!isBuild) return;
      documentRoots = await loadProjectDocumentRoots(root);
      for (const [projectId, docsRoot] of documentRoots) {
        const manifest = await createManifest(docsRoot);
        this.emitFile({
          type: 'asset',
          fileName: `projects/${projectId}/docs/manifest.json`,
          source: JSON.stringify(manifest, null, 2),
        });
        for (const absolutePath of await walkFiles(docsRoot)) {
          const relativePath = toWebPath(path.relative(docsRoot, absolutePath));
          this.emitFile({
            type: 'asset',
            fileName: `projects/${projectId}/docs/content/${relativePath}`,
            source: await fs.readFile(absolutePath),
          });
        }
      }
    },
  };
}
