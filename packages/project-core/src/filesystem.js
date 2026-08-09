import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { DEFAULT_SCAN_IGNORES } from './constants.js';

export function toWebPath(filePath) {
  return String(filePath || '')
    .split(path.sep)
    .join('/');
}

export function isInsideRoot(root, target, { allowRoot = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative) return allowRoot;
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function isSafeRelativePath(value) {
  const normalized = String(value || '').replaceAll('\\', '/');
  return (
    Boolean(normalized) &&
    !normalized.startsWith('/') &&
    !/^[a-z]:\//iu.test(normalized) &&
    !normalized.split('/').includes('..')
  );
}

export async function fileExists(filePath, type = 'file') {
  return fs
    .stat(filePath)
    .then((stats) => (type === 'directory' ? stats.isDirectory() : stats.isFile()))
    .catch(() => false);
}

export async function readJsonFile(filePath, { fallback, allowMissing = fallback !== undefined } = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return fallback;
    if (error instanceof SyntaxError) {
      error.message = `${path.basename(filePath)} 不是有效的 JSON：${error.message}`;
    }
    throw error;
  }
}

export async function writeJsonAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

export async function walkFiles(
  root,
  { extensions, skippedDirectories = DEFAULT_SCAN_IGNORES, includeHidden = true } = {},
) {
  const files = [];
  const normalizedExtensions = extensions
    ? new Set([...extensions].map((extension) => String(extension).toLowerCase()))
    : null;

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    entries.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN', { numeric: true }));

    for (const entry of entries) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
      if (!includeHidden && entry.name.startsWith('.')) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (
        entry.isFile() &&
        (!normalizedExtensions || normalizedExtensions.has(path.extname(entry.name).toLowerCase()))
      ) {
        files.push(absolutePath);
      }
    }
  }

  await walk(path.resolve(root));
  return files;
}

export async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
