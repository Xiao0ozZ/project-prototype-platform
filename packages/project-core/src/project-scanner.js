import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { fileExists, readJsonFile } from './filesystem.js';
import { validateProjectDefinitions } from './project-definitions.js';
import {
  toPublicProjectManifest,
  validateProjectManifest,
  validateProjectResources,
} from './project-manifest.js';

export async function scanProjectPackages(projectsRoot, { cache } = {}) {
  const root = path.resolve(projectsRoot);
  if (cache?.has(root)) return cache.get(root);
  const projects = [];
  const invalidProjects = [];
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;
    const projectRoot = path.join(root, entry.name);
    const manifestPath = path.join(projectRoot, 'project.json');
    try {
      const manifest = await readJsonFile(manifestPath);
      const errors = validateProjectManifest(manifest, entry.name, projectRoot);
      const definitionsPath = path.resolve(projectRoot, manifest.pageDefinitions || '');
      if (!errors.length) {
        if (!(await fileExists(definitionsPath))) {
          errors.push(`找不到页面定义文件：${manifest.pageDefinitions}。`);
        } else {
          const definitionsSource = await fs.readFile(definitionsPath, 'utf8');
          const definitionsUrl = pathToFileURL(definitionsPath);
          definitionsUrl.searchParams.set('projectScan', `${Date.now()}-${entry.name}`);
          const definitionsModule = await import(definitionsUrl.href);
          errors.push(
            ...(await validateProjectDefinitions(
              manifest,
              projectRoot,
              definitionsModule.clientPageDefinitions || definitionsModule.default,
              definitionsSource,
            )),
          );
          errors.push(...(await validateProjectResources(manifest, projectRoot)));
        }
      }
      if (errors.length) {
        invalidProjects.push({
          folder: entry.name,
          project: toPublicProjectManifest(manifest),
          errors,
        });
      } else {
        projects.push({ ...toPublicProjectManifest(manifest), folder: entry.name });
      }
    } catch (error) {
      invalidProjects.push({ folder: entry.name, errors: [`project.json 读取失败：${error.message}`] });
    }
  }

  const result = { generatedAt: new Date().toISOString(), projects, invalidProjects };
  cache?.set(root, result);
  return result;
}
