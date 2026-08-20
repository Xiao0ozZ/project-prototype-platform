import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  resolveExistingPathInsideRoot,
  resolveWritablePathInsideRoot,
  withFileRollback,
  writeFileAtomic,
} from '../../packages/project-core/src/index.js';

const temporaryRoots = [];

async function createRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prototype-safe-filesystem-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('safe filesystem boundaries', () => {
  it('accepts a valid file while rejecting traversal, absolute paths and non-whitelisted extensions', async () => {
    const root = await createRoot();
    await fs.writeFile(path.join(root, 'page.html'), '<main>ok</main>', 'utf8');
    await fs.writeFile(path.join(root, 'secret.exe'), 'blocked', 'utf8');
    const htmlExtensions = new Set(['.html']);

    await expect(
      resolveExistingPathInsideRoot(root, 'page.html', { allowedExtensions: htmlExtensions }),
    ).resolves.toBe(path.join(root, 'page.html'));
    await expect(resolveExistingPathInsideRoot(root, '../page.html')).resolves.toBeNull();
    await expect(resolveExistingPathInsideRoot(root, path.resolve(root, 'page.html'))).resolves.toBeNull();
    await expect(
      resolveExistingPathInsideRoot(root, 'secret.exe', { allowedExtensions: htmlExtensions }),
    ).resolves.toBeNull();
  });

  it('rejects existing and writable paths that escape through a directory junction', async () => {
    const workspace = await createRoot();
    const root = path.join(workspace, 'root');
    const outside = path.join(workspace, 'outside');
    await fs.mkdir(root);
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'outside.html'), '<main>outside</main>', 'utf8');
    await fs.symlink(outside, path.join(root, 'linked'), 'junction');

    await expect(resolveExistingPathInsideRoot(root, 'linked/outside.html')).resolves.toBeNull();
    await expect(resolveWritablePathInsideRoot(root, 'linked/new.html')).resolves.toBeNull();
  });

  it('allows a legitimate external directory when that directory is the configured root', async () => {
    const externalRoot = await createRoot();
    await fs.writeFile(path.join(externalRoot, 'prototype.html'), '<main>external</main>', 'utf8');

    await expect(resolveExistingPathInsideRoot(externalRoot, 'prototype.html')).resolves.toBe(
      path.join(externalRoot, 'prototype.html'),
    );
    await expect(resolveWritablePathInsideRoot(externalRoot, 'nested/new.html')).resolves.toBe(
      path.join(externalRoot, 'nested', 'new.html'),
    );
  });
});

describe('atomic writes and rollback', () => {
  it('keeps the original file when the atomic rename fails and removes its temporary file', async () => {
    const root = await createRoot();
    const target = path.join(root, 'project.json');
    await fs.writeFile(target, '{"name":"before"}\n', 'utf8');
    const failingFs = {
      ...fs,
      rename: async () => {
        const error = new Error('injected rename failure');
        error.code = 'EIO';
        throw error;
      },
    };

    await expect(
      writeFileAtomic(target, '{"name":"after"}\n', { encoding: 'utf8', fsApi: failingFs }),
    ).rejects.toThrow('injected rename failure');
    await expect(fs.readFile(target, 'utf8')).resolves.toBe('{"name":"before"}\n');
    expect((await fs.readdir(root)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('restores modified and newly created files after a multi-file operation fails', async () => {
    const root = await createRoot();
    const definitions = path.join(root, 'page-definitions.js');
    const routeOrder = path.join(root, 'route-order.json');
    await fs.writeFile(definitions, 'before definitions', 'utf8');

    let failure;
    try {
      await withFileRollback([definitions, routeOrder], async () => {
        await fs.writeFile(definitions, 'after definitions', 'utf8');
        await fs.writeFile(routeOrder, '{"changed":true}', 'utf8');
        throw new Error('injected transaction failure');
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      message: 'injected transaction failure',
      rollback: { ok: true, errors: [] },
    });
    await expect(fs.readFile(definitions, 'utf8')).resolves.toBe('before definitions');
    await expect(fs.stat(routeOrder)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
