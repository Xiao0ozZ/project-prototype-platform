// @vitest-environment node

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const injectedFailure = vi.hoisted(() => ({ atomicFile: '', atomicJson: '' }));

vi.mock('../../packages/project-core/src/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFileAtomic: async (filePath, ...args) => {
      if (injectedFailure.atomicFile && path.basename(filePath) === injectedFailure.atomicFile) {
        injectedFailure.atomicFile = '';
        throw new Error(`injected atomic file failure: ${path.basename(filePath)}`);
      }
      return actual.writeFileAtomic(filePath, ...args);
    },
    writeJsonAtomic: async (filePath, ...args) => {
      if (injectedFailure.atomicJson && path.basename(filePath) === injectedFailure.atomicJson) {
        injectedFailure.atomicJson = '';
        throw new Error(`injected atomic json failure: ${path.basename(filePath)}`);
      }
      return actual.writeJsonAtomic(filePath, ...args);
    },
  };
});

import {
  createProjectRoute,
  deleteProjectRoute,
  restoreProjectRoute,
} from '../../packages/platform-transfer/src/index.js';

const temporaryRoots = [];

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prototype-transfer-rollback-'));
  temporaryRoots.push(root);
  const packageRoot = path.join(root, 'projects', 'sample-project');
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'project.json'),
    JSON.stringify({
      schemaVersion: 1,
      id: 'sample-project',
      name: '示例项目',
      pageDefinitions: 'page-definitions.js',
      clients: [{ id: 'admin', name: '管理端' }],
      entries: [{ id: 'admin', kind: 'client', clientId: 'admin', name: '管理端' }],
      features: { pageTransfer: true },
    }),
    'utf8',
  );
  const definitionsPath = path.join(packageRoot, 'page-definitions.js');
  await fs.writeFile(
    definitionsPath,
    `export const clientPageDefinitions = {
  admin: {
    sections: [{ id: 'workspace', title: '工作区' }],
    pages: [
      // <generator:admin-pages>
    ],
  },
};
`,
    'utf8',
  );
  return { root, packageRoot, definitionsPath };
}

afterEach(async () => {
  injectedFailure.atomicFile = '';
  injectedFailure.atomicJson = '';
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('page transfer transaction rollback', () => {
  it('removes a newly written page when the following definition write fails', async () => {
    const fixture = await createFixture();
    const beforeDefinitions = await fs.readFile(fixture.definitionsPath, 'utf8');
    injectedFailure.atomicFile = 'page-definitions.js';

    let failure;
    try {
      await createProjectRoute({
        projectRoot: fixture.root,
        target: {
          projectId: 'sample-project',
          client: 'admin',
          routePath: 'fault-page',
          pageTitle: '故障页面',
          menuSection: 'workspace',
          menuIcon: 'Document',
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ rollback: { ok: true, errors: [] } });
    await expect(fs.readFile(fixture.definitionsPath, 'utf8')).resolves.toBe(beforeDefinitions);
    await expect(
      fs.stat(path.join(fixture.packageRoot, 'views/admin/FaultPageView.vue')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rolls a restore back to the deleted state when its audit metadata write fails', async () => {
    const fixture = await createFixture();
    await createProjectRoute({
      projectRoot: fixture.root,
      target: {
        projectId: 'sample-project',
        client: 'admin',
        routePath: 'restorable-page',
        pageTitle: '可恢复页面',
        menuSection: 'workspace',
        menuIcon: 'Document',
      },
    });
    const deleted = await deleteProjectRoute({
      projectRoot: fixture.root,
      target: { projectId: 'sample-project', client: 'admin', pagePath: 'restorable-page' },
    });
    const deletedDefinitions = await fs.readFile(fixture.definitionsPath, 'utf8');
    const sourcePath = path.join(fixture.packageRoot, 'views/admin/RestorablePageView.vue');
    const metadataPath = path.join(
      fixture.packageRoot,
      '.backups',
      'pages',
      deleted.backupId,
      'metadata.json',
    );
    injectedFailure.atomicJson = 'metadata.json';

    let failure;
    try {
      await restoreProjectRoute({
        projectRoot: fixture.root,
        target: { projectId: 'sample-project', backupId: deleted.backupId },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ rollback: { ok: true, errors: [] } });
    await expect(fs.readFile(fixture.definitionsPath, 'utf8')).resolves.toBe(deletedDefinitions);
    await expect(fs.stat(sourcePath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(JSON.parse(await fs.readFile(metadataPath, 'utf8'))).not.toHaveProperty('restoredAt');
  });
});
