// @vitest-environment node

import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatPlatformServerAddresses,
  installPlatformServerSignalHandlers,
  parsePlatformServerOptions,
  startPlatformServerRuntime,
  validatePlatformServerRuntime,
} from '../../packages/platform-server/src/runtime.js';

const temporaryRoots = [];

async function createRuntimeFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prototype-platform-runtime-'));
  temporaryRoots.push(root);
  const staticRoot = path.join(root, 'dist');
  await fs.mkdir(staticRoot);
  await fs.writeFile(path.join(staticRoot, 'index.html'), '<!doctype html>', 'utf8');
  return {
    host: '127.0.0.1',
    port: 5188,
    platformRoot: root,
    projectsRoot: path.join(root, 'projects'),
    staticRoot,
    mountsPath: path.join(root, 'project-mounts.local.json'),
    settingsPath: path.join(root, 'platform-settings.json'),
    writeEnabled: true,
  };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('platform server CLI options and preflight', () => {
  it('parses supported options and rejects typos or invalid ports', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'prototype-platform-options-'));
    temporaryRoots.push(root);
    const options = parsePlatformServerOptions(
      ['--host', '0.0.0.0', '--port', '6200', '--projects-root', 'local-projects', '--read-only'],
      {},
      root,
    );
    expect(options).toMatchObject({ host: '0.0.0.0', port: 6200, writeEnabled: false });
    expect(options.projectsRoot).toBe(path.join(root, 'local-projects'));
    expect(() => parsePlatformServerOptions(['--prot', '6200'], {}, root)).toThrow(
      '不支持的启动选项：--prot',
    );
    await expect(validatePlatformServerRuntime({ ...options, port: 70000 })).rejects.toMatchObject({
      code: 'INVALID_PORT',
    });
  });

  it('reports a missing build with an executable instruction and creates an absent projects directory', async () => {
    const options = await createRuntimeFixture();
    await validatePlatformServerRuntime(options);
    await expect(fs.stat(options.projectsRoot)).resolves.toMatchObject({});

    await fs.rm(options.staticRoot, { recursive: true, force: true });
    await expect(validatePlatformServerRuntime(options)).rejects.toMatchObject({
      code: 'STATIC_ROOT_MISSING',
      message: expect.stringContaining('请先执行 npm run build'),
    });
  });

  it('fails startup early when the local mounts file is invalid', async () => {
    const options = await createRuntimeFixture();
    await fs.writeFile(options.mountsPath, '{invalid json', 'utf8');
    await expect(validatePlatformServerRuntime(options)).rejects.toMatchObject({
      code: 'MOUNTS_INVALID',
      message: expect.stringContaining('本地挂载配置无效'),
    });
  });
});

describe('platform server lifecycle', () => {
  it('formats wildcard listeners as a local URL plus deduplicated LAN URLs', () => {
    expect(
      formatPlatformServerAddresses('0.0.0.0', 5188, {
        networkInterfaces: {
          Ethernet: [
            { family: 'IPv4', address: '192.168.1.20', internal: false },
            { family: 'IPv4', address: '192.168.1.20', internal: false },
          ],
          Loopback: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
        },
      }),
    ).toEqual({ local: 'http://127.0.0.1:5188', lan: ['http://192.168.1.20:5188'] });
  });

  it('turns an occupied port into an actionable startup error', async () => {
    const options = await createRuntimeFixture();
    const start = vi.fn(async () => {
      const error = new Error('address in use');
      error.code = 'EADDRINUSE';
      throw error;
    });
    await expect(
      startPlatformServerRuntime(options, {
        createServer: () => ({ start, close: vi.fn() }),
        log: vi.fn(),
      }),
    ).rejects.toMatchObject({
      code: 'PORT_IN_USE',
      message: expect.stringContaining('--port <其他端口>'),
    });
  });

  it('stops exactly once after SIGINT and leaves a successful process exit code', async () => {
    const options = await createRuntimeFixture();
    const close = vi.fn(async () => {});
    const logs = [];
    const runtime = await startPlatformServerRuntime(options, {
      createServer: () => ({
        start: async () => ({ address: '127.0.0.1', port: 5188 }),
        close,
      }),
      log: (message) => logs.push(message),
      networkInterfaces: () => ({}),
    });
    const processRef = new EventEmitter();
    processRef.exitCode = undefined;
    const signals = installPlatformServerSignalHandlers(runtime, { processRef });

    processRef.emit('SIGINT');
    await signals.shutdown('SIGINT');
    processRef.emit('SIGTERM');

    expect(close).toHaveBeenCalledTimes(1);
    expect(processRef.exitCode).toBe(0);
    expect(logs).toContain('平台本地服务已停止。');
    signals.dispose();
  });
});
