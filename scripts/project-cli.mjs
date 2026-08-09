#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  PROJECT_ID_PATTERN,
  migrateProjectManifest,
  readJsonFile,
  scanProjectPackages,
  writeJsonAtomic,
} from '../packages/project-core/src/index.js';

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
  npm run project -- migrate --project sample [--write]
  npm run project -- serve [--host 127.0.0.1] [--port 5188]
  npm run project -- build-review [--base /] [--out-dir dist]

说明：
  validate      校验全部项目包，不写入文件。
  init          从标准模板创建最小项目包，目标目录存在时拒绝覆盖。
  migrate       预览项目配置迁移；只有 --write 才写回 project.json。
  serve         启动当前工程的 Vite 开发服务。
  build-review  生成静态评审快照，不修改项目包。`);
}

async function validateCommand(args) {
  const projectsRoot = resolveFromWorkspace(args['projects-root'], 'projects');
  const result = await scanProjectPackages(projectsRoot);
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
  process.exitCode = await runNpm(buildArguments, { VITE_BASE_PATH: base });
}

const args = parseArguments(process.argv.slice(2));
const command = args._[0];

try {
  if (!command || command === 'help' || args.help) printHelp();
  else if (command === 'validate') await validateCommand(args);
  else if (command === 'init') await initCommand(args);
  else if (command === 'migrate') await migrateCommand(args);
  else if (command === 'serve') await serveCommand(args);
  else if (command === 'build-review') await buildReviewCommand(args);
  else throw new Error(`未知命令：${command}`);
} catch (error) {
  console.error(`CLI 执行失败：${error.message}`);
  process.exitCode = 1;
}
