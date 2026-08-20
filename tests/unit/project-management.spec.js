import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createProjectPackage,
  normalizeProjectInput,
  readProjectManifest,
  updateProjectPackage,
} from '../../packages/project-core/src/index.js';

const temporaryRoots = [];

async function createWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prototype-project-management-'));
  temporaryRoots.push(root);
  await fs.mkdir(path.join(root, 'projects'), { recursive: true });
  await fs.mkdir(path.join(root, 'templates'), { recursive: true });
  await fs.cp(path.resolve('templates', 'project-package'), path.join(root, 'templates', 'project-package'), {
    recursive: true,
  });
  return root;
}

function projectPayload(overrides = {}) {
  return {
    id: 'test-project',
    name: '测试项目',
    shortName: '测试',
    clients: [
      {
        id: 'admin',
        name: '管理端',
        entry: { mode: 'direct' },
        layout: { type: 'sidebar' },
      },
    ],
    entries: [
      {
        id: 'admin',
        kind: 'client',
        clientId: 'admin',
        name: '管理端',
      },
    ],
    docs: { enabled: true, root: 'docs' },
    prototype: { enabled: false, root: 'prototype', clients: {} },
    mobile: { enabled: false },
    homepage: { visible: true },
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('project management core', () => {
  it('normalizes input and creates a complete project package', async () => {
    const root = await createWorkspace();
    const projectsRoot = path.join(root, 'projects');
    const input = normalizeProjectInput(projectPayload());

    const manifest = await createProjectPackage(projectsRoot, input);
    const storedManifest = await readProjectManifest(path.join(projectsRoot, input.id));

    expect(manifest.id).toBe('test-project');
    expect(storedManifest).toEqual(manifest);
    expect(storedManifest.clients[0].entry.mode).toBe('direct');
    expect(storedManifest.theme.primary).toBe('#2563eb');
  });

  it('updates an existing package without discarding optional manifest fields', async () => {
    const root = await createWorkspace();
    const projectsRoot = path.join(root, 'projects');
    const initialInput = normalizeProjectInput(projectPayload());
    const initialManifest = await createProjectPackage(projectsRoot, initialInput);
    const input = normalizeProjectInput(projectPayload({ name: '更新后的项目', primary: '#1677ff' }), {
      editing: true,
      existingManifest: initialManifest,
    });

    const updated = await updateProjectPackage(projectsRoot, input);

    expect(updated.name).toBe('更新后的项目');
    expect(updated.theme.primary).toBe('#1677ff');
    expect(updated.pageDefinitions).toBe('page-definitions.js');
    await expect(readProjectManifest(path.join(projectsRoot, input.id))).resolves.toEqual(updated);
  });

  it('rejects duplicate and invalid project ids with stable errors', async () => {
    const root = await createWorkspace();
    const projectsRoot = path.join(root, 'projects');
    const input = normalizeProjectInput(projectPayload());
    await createProjectPackage(projectsRoot, input);

    await expect(createProjectPackage(projectsRoot, input)).rejects.toMatchObject({ statusCode: 409 });
    expect(() => normalizeProjectInput(projectPayload({ id: 'Invalid ID' }))).toThrow(
      '项目 ID 必须使用小写 kebab-case。',
    );
  });

  it('rejects an invalid logo and removes the incomplete new package', async () => {
    const root = await createWorkspace();
    const projectsRoot = path.join(root, 'projects');
    const input = normalizeProjectInput(projectPayload({ logoDataUrl: 'data:text/plain;base64,QQ==' }));

    await expect(createProjectPackage(projectsRoot, input)).rejects.toThrow(
      'Logo 只支持 PNG、JPG、WebP 或 SVG 图片。',
    );
    await expect(fs.stat(path.join(projectsRoot, input.id))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('keeps project.json intact when an update fails before the atomic manifest write', async () => {
    const root = await createWorkspace();
    const projectsRoot = path.join(root, 'projects');
    const input = normalizeProjectInput(projectPayload());
    const initialManifest = await createProjectPackage(projectsRoot, input);
    const projectRoot = path.join(projectsRoot, input.id);
    await fs.writeFile(path.join(projectRoot, 'page-definitions.js'), 'invalid definition', 'utf8');
    const updateInput = normalizeProjectInput(
      projectPayload({
        name: '不应写入',
        clients: [...projectPayload().clients, { id: 'portal', name: '门户端' }],
      }),
      { editing: true, existingManifest: initialManifest },
    );

    await expect(updateProjectPackage(projectsRoot, updateInput)).rejects.toThrow(
      '页面定义文件缺少可写入的客户端定义结尾。',
    );
    await expect(readProjectManifest(projectRoot)).resolves.toEqual(initialManifest);
  });

  it('rolls page definitions back when the project manifest write fails after other files changed', async () => {
    const root = await createWorkspace();
    const projectsRoot = path.join(root, 'projects');
    const initialInput = normalizeProjectInput(projectPayload());
    const initialManifest = await createProjectPackage(projectsRoot, initialInput);
    const projectRoot = path.join(projectsRoot, initialInput.id);
    const definitionsPath = path.join(projectRoot, 'page-definitions.js');
    const originalDefinitions = await fs.readFile(definitionsPath, 'utf8');
    const updateInput = normalizeProjectInput(
      projectPayload({
        name: '不应保存的项目名称',
        clients: [...projectPayload().clients, { id: 'portal', name: '门户端' }],
      }),
      { editing: true, existingManifest: initialManifest },
    );

    let failure;
    try {
      await updateProjectPackage(projectsRoot, updateInput, {
        writeManifest: async () => {
          throw new Error('injected project manifest failure');
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      message: 'injected project manifest failure',
      rollback: { ok: true, errors: [] },
    });
    await expect(readProjectManifest(projectRoot)).resolves.toEqual(initialManifest);
    await expect(fs.readFile(definitionsPath, 'utf8')).resolves.toBe(originalDefinitions);
  });
});
