#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  PROJECT_ID_PATTERN,
  createContextBaseline,
  createDocumentManifest,
  createProjectContext,
  createTraceabilityReport,
  describeProjectMounts,
  inspectHtmlPrototype,
  loadProjectMounts,
  migrateProjectManifest,
  normalizeProjectMounts,
  normalizePagePrdLinks,
  normalizePrdBindings,
  readJsonFile,
  resolveProjectDocsRoot,
  resolveProjectPrototypeSources,
  scanProjectPackages,
  walkFiles,
  writeJsonAtomic,
} from '../packages/project-core/src/index.js';
import { scanHtmlPrototypePages } from '../plugins/html-prototype-plugin.js';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArguments(values) {
  const result = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) {
      result._.push(value);
      continue;
    }
    const [rawKey, inlineValue] = value.slice(2).split('=', 2);
    const nextValue = values[index + 1];
    if (inlineValue !== undefined) result[rawKey] = inlineValue;
    else if (nextValue && !nextValue.startsWith('--')) {
      result[rawKey] = nextValue;
      index += 1;
    } else result[rawKey] = true;
  }
  return result;
}

function resolveFromWorkspace(value, fallback) {
  return path.resolve(workspaceRoot, String(value || fallback));
}

function printHelp() {
  console.log(`产品功能体验中心 CLI

用法：
  npm run project -- validate [--projects-root projects] [--json]
  npm run project -- init --id sample --name "示例项目" [--projects-root projects]
  npm run project -- install-example [--id sample-project] [--projects-root projects]
  npm run project -- migrate --project sample [--write]
  npm run project -- mounts [--json]
  npm run project -- mount --project sample [--docs D:\\docs] [--prototype admin=D:\\html]
  npm run project -- health [--project sample] [--json]
  npm run project -- preflight --file prototypes/page.html [--json]
  npm run project -- snapshot --project sample [--output output/context-baseline.json]
  npm run project -- trace --project sample [--baseline output/context-baseline.json] [--output output/traceability.json]
  npm run project -- serve [--host 127.0.0.1] [--port 5188]
  npm run project -- build-review [--base /] [--out-dir dist]

说明：
  validate      校验全部项目包，不写入文件。
  init          从标准模板创建最小项目包，目标目录存在时拒绝覆盖。
  install-example 安装仓库内置的可运行示例，目标目录存在时拒绝覆盖。
  migrate       预览项目配置迁移；只有 --write 才写回 project.json。
  mounts        查看仅保存在本机的项目资料挂载。
  mount         设置或清除项目的外部 PRD/HTML 目录，不修改项目包。
  health        检查项目包、挂载目录、HTML 原型和需求关联健康状态。
  preflight     检查单个 HTML 是否符合独立预览、直读和导入的基础契约。
  snapshot      保存项目 PRD 上下文基线，用于后续差异和影响分析。
  trace         导出页面、PRD、组件关联覆盖率和相对基线的影响清单。
  serve         启动当前工程的 Vite 开发服务。
  build-review  生成静态评审快照，不修改项目包。`);
}

function mountsPath() {
  return path.join(workspaceRoot, 'project-mounts.local.json');
}

async function loadWorkspaceMounts() {
  return loadProjectMounts(mountsPath());
}

async function readDefinitions(projectRoot, manifest) {
  const definitionsPath = path.resolve(projectRoot, manifest.pageDefinitions || 'page-definitions.js');
  const url = pathToFileURL(definitionsPath);
  url.searchParams.set('cli', String(Date.now()));
  const module = await import(url.href);
  return module.clientPageDefinitions || module.default;
}

function mergeClientPages(definitions, htmlPages = {}) {
  return Object.fromEntries(
    Object.entries(definitions || {}).map(([clientId, definition]) => {
      const pages = [...(definition.pages || [])];
      const existingPaths = new Set(pages.map((page) => page.path));
      for (const page of htmlPages[clientId] || []) {
        if (!existingPaths.has(page.path)) pages.push(page);
      }
      return [clientId, { ...definition, pages }];
    }),
  );
}

function mergePageLinks(baseLinks, overrideLinks) {
  const merged = Object.fromEntries(
    Object.entries(baseLinks || {}).map(([clientId, pages]) => [clientId, { ...(pages || {}) }]),
  );
  for (const [clientId, pages] of Object.entries(overrideLinks || {})) {
    merged[clientId] ||= {};
    for (const [pageName, documentPath] of Object.entries(pages || {})) {
      if (documentPath === null || documentPath === '') delete merged[clientId][pageName];
      else merged[clientId][pageName] = documentPath;
    }
  }
  return merged;
}

async function readLegacyPageLinks(projectRoot) {
  const filePath = path.join(projectRoot, 'page-prd-links.js');
  const exists = await fs
    .stat(filePath)
    .then(() => true)
    .catch(() => false);
  if (!exists) return {};
  const url = pathToFileURL(filePath);
  url.searchParams.set('cli', String(Date.now()));
  const module = await import(url.href);
  return module.default || module.pagePrdLinks || {};
}

async function loadContextInput(projectsRoot, projectId) {
  const projectRoot = path.join(projectsRoot, projectId);
  const manifest = await readJsonFile(path.join(projectRoot, 'project.json'));
  const mounts = await loadWorkspaceMounts();
  const definitions = mergeClientPages(
    await readDefinitions(projectRoot, manifest),
    (await scanHtmlPrototypePages(projectsRoot, { mounts })).projects[projectId],
  );
  const docsRoot = manifest.docs?.enabled ? resolveProjectDocsRoot(manifest, projectRoot, mounts) : '';
  const documentManifest = docsRoot
    ? await createDocumentManifest(docsRoot)
    : { generatedAt: new Date().toISOString(), documents: [] };
  const documentSources = {};
  for (const document of documentManifest.documents) {
    documentSources[document.path] = await fs.readFile(
      path.join(docsRoot, ...document.path.split('/')),
      'utf8',
    );
  }
  const platformRoot = path.join(projectRoot, '.platform');
  const linksPayload = normalizePagePrdLinks(
    projectId,
    await readJsonFile(path.join(platformRoot, 'page-prd-links.json'), { fallback: {} }),
  );
  const pagePrdLinks = mergePageLinks(await readLegacyPageLinks(projectRoot), linksPayload.links);
  const bindingsPayload = normalizePrdBindings(
    projectId,
    await readJsonFile(path.join(platformRoot, 'prd-bindings.json'), { fallback: {} }),
  );
  return createProjectContext({
    project: {
      ...manifest,
      clients: (manifest.clients || []).map((client) => ({ ...client, definition: definitions[client.id] })),
      pagePrdLinks,
    },
    documentManifest,
    documentSources,
    bindings: bindingsPayload.bindings,
  });
}

async function preflightCommand(args) {
  const filePath = resolveFromWorkspace(args.file, '');
  if (!args.file) throw new Error('preflight 需要 --file。');
  const result = inspectHtmlPrototype(await fs.readFile(filePath, 'utf8'), {
    fileName: path.basename(filePath),
  });
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`${result.valid ? '✓' : '✗'} ${filePath}`);
    for (const item of result.errors) console.error(`  错误 [${item.code}] ${item.message}`);
    for (const item of result.warnings) console.warn(`  提醒 [${item.code}] ${item.message}`);
  }
  if (!result.valid) process.exitCode = 1;
}

async function healthCommand(args) {
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const scan = await scanProjectPackages(projectsRoot, { mounts: await loadWorkspaceMounts() });
  const selectedId = String(args.project || '').trim();
  const projects = selectedId ? scan.projects.filter((project) => project.id === selectedId) : scan.projects;
  if (selectedId && !projects.length) throw new Error(`找不到可用项目：${selectedId}`);
  const details = [];
  const mounts = await loadWorkspaceMounts();
  for (const project of projects) {
    const projectRoot = path.join(projectsRoot, project.folder);
    const manifest = await readJsonFile(path.join(projectRoot, 'project.json'));
    const html = [];
    for (const source of resolveProjectPrototypeSources(manifest, projectRoot, mounts)) {
      for (const filePath of await walkFiles(source.root, { extensions: new Set(['.html', '.htm']) })) {
        html.push(
          inspectHtmlPrototype(await fs.readFile(filePath, 'utf8'), {
            fileName: path.relative(source.root, filePath).split(path.sep).join('/'),
          }),
        );
      }
    }
    const context = await loadContextInput(projectsRoot, project.id);
    details.push({
      project: { id: project.id, name: project.name },
      mounts: describeProjectMounts(manifest, projectRoot, mounts),
      html: {
        files: html.length,
        invalid: html.filter((item) => !item.valid).length,
        warnings: html.reduce((sum, item) => sum + item.warnings.length, 0),
        results: html,
      },
      traceability: context.summary,
      issues: context.issues,
    });
  }
  const result = {
    generatedAt: new Date().toISOString(),
    invalidProjects: scan.invalidProjects,
    projects: details,
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    for (const item of details) {
      console.log(`\n${item.project.name}（${item.project.id}）`);
      console.log(
        `  HTML ${item.html.files} 个，失败 ${item.html.invalid} 个，提醒 ${item.html.warnings} 条`,
      );
      console.log(
        `  页面 PRD 覆盖 ${item.traceability.pageCoverage}%（${item.traceability.linkedPages}/${item.traceability.pages}）`,
      );
      console.log(`  关联错误 ${item.traceability.errors} 个，待检查 ${item.traceability.warnings} 个`);
    }
    for (const project of scan.invalidProjects)
      console.error(`\n✗ ${project.folder}: ${project.errors.join('；')}`);
  }
  if (scan.invalidProjects.length || details.some((item) => item.html.invalid || item.traceability.errors)) {
    process.exitCode = 1;
  }
}

async function snapshotCommand(args) {
  const projectId = String(args.project || '').trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error('snapshot 需要有效的 --project。');
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const context = await loadContextInput(projectsRoot, projectId);
  const output = resolveFromWorkspace(args.output, `output/context-baselines/${projectId}.json`);
  await writeJsonAtomic(output, createContextBaseline(context));
  console.log(`项目上下文基线已保存：${output}`);
}

async function traceCommand(args) {
  const projectId = String(args.project || '').trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error('trace 需要有效的 --project。');
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const context = await loadContextInput(projectsRoot, projectId);
  const baseline = args.baseline
    ? await readJsonFile(resolveFromWorkspace(args.baseline, ''))
    : await readJsonFile(path.join(workspaceRoot, 'output', 'context-baselines', `${projectId}.json`), {
        fallback: null,
      });
  const payload = createTraceabilityReport(context, { baseline });
  const output = resolveFromWorkspace(args.output, `output/traceability/${projectId}.json`);
  await writeJsonAtomic(output, payload);
  console.log(`需求追溯报告已生成：${output}`);
}

function parsePrototypeMounts(value) {
  const entries = {};
  for (const item of String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)) {
    const separator = item.indexOf('=');
    if (separator <= 0) throw new Error('--prototype 使用 client-id=绝对目录，多项用逗号分隔。');
    const clientId = item.slice(0, separator).trim();
    const root = item.slice(separator + 1).trim();
    if (!PROJECT_ID_PATTERN.test(clientId) || !path.isAbsolute(root)) {
      throw new Error(`无效的原型挂载：${item}`);
    }
    entries[clientId] = path.resolve(root);
  }
  return entries;
}

async function mountsCommand(args) {
  const mounts = await loadWorkspaceMounts();
  if (args.json) console.log(JSON.stringify(mounts, null, 2));
  else if (!Object.keys(mounts.projects).length) console.log('当前没有本地项目挂载。');
  else {
    for (const [projectId, mount] of Object.entries(mounts.projects)) {
      console.log(`\n${projectId}`);
      if (mount.docsRoot) console.log(`  PRD：${mount.docsRoot}`);
      for (const [clientId, root] of Object.entries(mount.prototypes || {})) {
        console.log(`  HTML ${clientId}：${root}`);
      }
    }
  }
}

async function mountCommand(args) {
  const projectId = String(args.project || '').trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error('mount 需要有效的 --project。');
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const projectRoot = path.join(projectsRoot, projectId);
  if (
    !(await fs
      .stat(path.join(projectRoot, 'project.json'))
      .then(() => true)
      .catch(() => false))
  ) {
    throw new Error(`项目包不存在：${projectId}`);
  }

  const mounts = await loadWorkspaceMounts();
  const current = mounts.projects[projectId] || { prototypes: {} };
  const next = { ...current, prototypes: { ...(current.prototypes || {}) } };
  if (args.docs) {
    if (!path.isAbsolute(String(args.docs))) throw new Error('--docs 必须使用绝对目录。');
    next.docsRoot = path.resolve(String(args.docs));
  }
  if (args['clear-docs']) delete next.docsRoot;
  Object.assign(next.prototypes, parsePrototypeMounts(args.prototype));
  for (const clientId of String(args['clear-prototype'] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)) {
    delete next.prototypes[clientId];
  }
  for (const target of [next.docsRoot, ...Object.values(next.prototypes)]) {
    if (!target) continue;
    const isDirectory = await fs
      .stat(target)
      .then((stats) => stats.isDirectory())
      .catch(() => false);
    if (!isDirectory) throw new Error(`挂载目录不存在：${target}`);
  }

  const projects = { ...mounts.projects };
  if (next.docsRoot || Object.keys(next.prototypes).length) projects[projectId] = next;
  else delete projects[projectId];
  const normalized = normalizeProjectMounts({ schemaVersion: 1, projects });
  await writeJsonAtomic(mountsPath(), normalized);
  console.log(`本地项目挂载已更新：${mountsPath()}`);
}

async function validateCommand(args) {
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const result = await scanProjectPackages(projectsRoot, { mounts: await loadWorkspaceMounts() });
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const project of result.projects) console.log(`✓ ${project.id}（${project.name}）`);
    for (const project of result.invalidProjects) {
      console.error(`✗ ${project.folder}`);
      for (const error of project.errors) console.error(`  - ${error}`);
    }
    console.log(`\n有效 ${result.projects.length} 个，无效 ${result.invalidProjects.length} 个。`);
  }
  if (result.invalidProjects.length) process.exitCode = 1;
}

async function initCommand(args) {
  const projectId = String(args.id || '').trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error('--id 必须使用小写 kebab-case。');
  const projectName = String(args.name || projectId).trim();
  if (!projectName) throw new Error('--name 不能为空。');

  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const templateRoot = resolveFromWorkspace(args.template, 'templates/project-package');
  const targetRoot = path.join(projectsRoot, projectId);
  const targetExists = await fs
    .stat(targetRoot)
    .then(() => true)
    .catch(() => false);
  if (targetExists) throw new Error(`项目目录已存在，未覆盖：${targetRoot}`);

  await fs.mkdir(projectsRoot, { recursive: true });
  await fs.cp(templateRoot, targetRoot, { recursive: true, errorOnExist: true, force: false });
  try {
    const manifestPath = path.join(targetRoot, 'project.json');
    const manifest = await readJsonFile(manifestPath);
    manifest.id = projectId;
    manifest.name = projectName;
    manifest.shortName = String(args['short-name'] || projectName).trim();
    await writeJsonAtomic(manifestPath, manifest);
  } catch (error) {
    await fs.rm(targetRoot, { recursive: true, force: true });
    throw error;
  }
  console.log(`项目包已创建：${targetRoot}`);
}

async function installExampleCommand(args) {
  const projectId = String(args.id || 'sample-project').trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error('--id 必须使用小写 kebab-case。');
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const sourceRoot = path.join(workspaceRoot, 'examples', 'sample-project');
  const targetRoot = path.join(projectsRoot, projectId);
  const exists = await fs
    .stat(targetRoot)
    .then(() => true)
    .catch(() => false);
  if (exists) throw new Error(`项目目录已存在，未覆盖：${targetRoot}`);
  await fs.mkdir(projectsRoot, { recursive: true });
  await fs.cp(sourceRoot, targetRoot, { recursive: true, errorOnExist: true, force: false });
  if (projectId !== 'sample-project') {
    const manifestPath = path.join(targetRoot, 'project.json');
    const manifest = await readJsonFile(manifestPath);
    manifest.id = projectId;
    await writeJsonAtomic(manifestPath, manifest);
  }
  console.log(`示例项目已安装：${targetRoot}`);
}

async function migrateCommand(args) {
  const projectId = String(args.project || '').trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) throw new Error('--project 必须使用有效的项目 ID。');
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const manifestPath = path.join(projectsRoot, projectId, 'project.json');
  const current = await readJsonFile(manifestPath);
  const migrated = migrateProjectManifest(current);
  if (args.write) {
    await writeJsonAtomic(manifestPath, migrated);
    console.log(`项目配置已迁移并写回：${manifestPath}`);
  } else {
    console.log(JSON.stringify(migrated, null, 2));
    console.log('\n当前为预览模式；确认后添加 --write 才会写回文件。');
  }
}

function runNpm(arguments_, environment = {}) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, arguments_, {
      cwd: workspaceRoot,
      env: { ...process.env, ...environment },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`子进程被信号 ${signal} 终止。`));
      else resolve(code ?? 1);
    });
  });
}

async function serveCommand(args) {
  const host = String(args.host || '127.0.0.1');
  const port = Number(args.port || 5188);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port 必须是有效端口。');
  process.exitCode = await runNpm([
    'run',
    'dev',
    '--',
    '--host',
    host,
    '--port',
    String(port),
    '--strictPort',
  ]);
}

async function buildReviewCommand(args) {
  const base = String(args.base || '/');
  const buildArguments = ['run', 'build'];
  if (args['out-dir']) buildArguments.push('--', '--outDir', String(args['out-dir']));
  const exitCode = await runNpm(buildArguments, { VITE_BASE_PATH: base });
  process.exitCode = exitCode;
  if (exitCode) return;
  const outputRoot = resolveFromWorkspace(args['out-dir'], 'dist');
  const scan = await scanProjectPackages(path.join(workspaceRoot, 'projects'), {
    mounts: await loadWorkspaceMounts(),
  });
  await writeJsonAtomic(path.join(outputRoot, 'review-manifest.json'), {
    schemaVersion: 1,
    artifactType: 'static-review-snapshot',
    generatedAt: new Date().toISOString(),
    base,
    editable: false,
    projects: scan.projects.map((project) => ({
      id: project.id,
      name: project.name,
      version: project.version,
      clients: (project.clients || []).map((client) => ({ id: client.id, name: client.name })),
    })),
  });
  console.log(`静态评审清单已生成：${path.join(outputRoot, 'review-manifest.json')}`);
}

const args = parseArguments(process.argv.slice(2));
const command = args._[0];

try {
  if (!command || command === 'help' || args.help) printHelp();
  else if (command === 'validate') await validateCommand(args);
  else if (command === 'init') await initCommand(args);
  else if (command === 'install-example') await installExampleCommand(args);
  else if (command === 'migrate') await migrateCommand(args);
  else if (command === 'mounts') await mountsCommand(args);
  else if (command === 'mount') await mountCommand(args);
  else if (command === 'health') await healthCommand(args);
  else if (command === 'preflight') await preflightCommand(args);
  else if (command === 'snapshot') await snapshotCommand(args);
  else if (command === 'trace') await traceCommand(args);
  else if (command === 'serve') await serveCommand(args);
  else if (command === 'build-review') await buildReviewCommand(args);
  else throw new Error(`未知命令：${command}`);
} catch (error) {
  console.error(`CLI 执行失败：${error.message}`);
  process.exitCode = 1;
}
