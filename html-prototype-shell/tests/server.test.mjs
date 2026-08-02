import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  HttpError,
  bindingFor,
  buildHealthReport,
  createServer,
  injectPrototypeBridge,
  normalizeBranding,
  normalizeMenu,
  compactMenuTitle,
  readHtmlTitle,
  readMarkdownHeadings,
  readMarkdownTitle,
  resolveConfiguredRoot,
  safePath,
  writeJsonAtomic,
} from '../server.mjs';

const shellRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('branding normalization keeps safe shell-owned appearance settings', () => {
  assert.deepEqual(normalizeBranding({ name: ' Demo  ', subtitle: ' 原型 ', themeColor: '#12abEF' }), {
    name: 'Demo',
    subtitle: '原型',
    themeColor: '#12ABEF',
  });
  assert.throws(() => normalizeBranding({ themeColor: 'red' }, 400), (error) => error.statusCode === 400);
});

test('menu settings default to grouped title labels and compact brand suffixes', () => {
  assert.deepEqual(normalizeMenu({}), {
    groupByFolder: true,
    labelSource: 'title',
    compactTitle: true,
  });
  assert.equal(compactMenuTitle('租車券批次详情 - RIMO Admin'), '租車券批次详情');
  assert.equal(compactMenuTitle('RIMO Rental - 合作通路租車券'), '合作通路租車券');
  assert.throws(() => normalizeMenu({ labelSource: 'unknown' }, 400), (error) => error.statusCode === 400);
});

test('safePath accepts descendants and rejects traversal or malformed encoding', () => {
  const root = path.join(shellRoot, 'fixtures');
  assert.equal(safePath(root, 'folder/page.html'), path.join(root, 'folder', 'page.html'));
  assert.throws(
    () => safePath(root, '..%2Foutside.html'),
    (error) => error instanceof HttpError && error.statusCode === 403,
  );
  assert.throws(
    () => safePath(root, '%E0%A4%A'),
    (error) => error instanceof HttpError && error.statusCode === 400,
  );
});

test('source roots resolve from the shell directory and reject absolute paths', () => {
  assert.equal(resolveConfiguredRoot('../prototype', 'prototypeRoot'), path.resolve(shellRoot, '../prototype'));
  assert.throws(
    () => resolveConfiguredRoot('D:/private/prototype', 'prototypeRoot'),
    (error) => error instanceof HttpError && error.statusCode === 500,
  );
});

test('JSON configuration writes replace complete files without partial content', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'prototype-shell-'));
  const filePath = path.join(directory, 'config.json');
  try {
    await fs.writeFile(filePath, '{"old":true}\n', 'utf8');
    await writeJsonAtomic(filePath, { current: true, items: [1, 2] });
    assert.deepEqual(JSON.parse(await fs.readFile(filePath, 'utf8')), {
      current: true,
      items: [1, 2],
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('title readers use document headings and stable fallbacks', () => {
  assert.equal(readHtmlTitle('<title> 页面标题 </title><h1>正文标题</h1>', 'fallback'), '页面标题');
  assert.equal(readHtmlTitle('<h1><span>正文标题</span></h1>', 'fallback'), '正文标题');
  assert.equal(readHtmlTitle('<main>content</main>', 'fallback'), 'fallback');
  assert.equal(readMarkdownTitle('intro\n# PRD 标题\ncontent', 'fallback'), 'PRD 标题');
  assert.deepEqual(readMarkdownHeadings('## 1. 范围\n### 1.1 细节（补充）'), ['1. 范围', '1.1 细节（补充）']);
});

test('binding fallback only resolves an unambiguous basename', () => {
  const bindings = [
    { page: '营运端/orders.html', document: 'orders.md' },
    { page: '企业端/dashboard.html', document: 'enterprise.md' },
    { page: '营运端/dashboard.html', document: 'operations.md' },
  ];
  assert.equal(bindingFor(bindings, '营运端/orders.html')?.document, 'orders.md');
  assert.equal(bindingFor(bindings, '归档/orders.html')?.document, 'orders.md');
  assert.equal(bindingFor(bindings, '归档/dashboard.html'), null);
});

test('prototype bridge is injected once and avoids a persistent observer', () => {
  const output = injectPrototypeBridge(
    '<!doctype html><html><head></head><body><main>content</main></body></html>',
    '营运端/orders.html',
    { hideSelectors: ['#app > aside', '.topbar'] },
  );
  assert.match(output, /id="html-prototype-shell-isolation"/);
  assert.match(output, /id="html-prototype-shell-bridge"/);
  assert.match(output, /window\.parent\.postMessage\(.+location\.origin\)/s);
  assert.match(output, /const scheduleLayout = \(\) =>/);
  assert.doesNotMatch(output, /new MutationObserver/);
  assert.equal(output.match(/html-prototype-shell-bridge/g)?.length, 1);
});

test('page rules override global hiding and provide an explicit content root', () => {
  const output = injectPrototypeBridge(
    '<html><head></head><body><main class="workspace">content</main></body></html>',
    'orders.html',
    {
      hideSelectors: ['.topbar', '.global-sidebar'],
      pageRules: {
        'orders.html': {
          contentRoot: 'main.workspace',
          layoutMode: 'content',
          hideSelectors: ['.legacy-filter'],
          excludeGlobalSelectors: ['.topbar'],
        },
      },
    },
  );
  assert.doesNotMatch(output, /\.topbar \{ display: none/);
  assert.match(output, /\.global-sidebar \{ display: none/);
  assert.match(output, /\.legacy-filter \{ display: none/);
  assert.match(output, /"contentRoot":"main\.workspace"/);
});

test('health report accepts a configured anchor followed by heading notes', () => {
  const health = buildHealthReport(
    [{ path: 'orders.html', title: '订单' }],
    [{ path: 'orders.md', title: '订单 PRD', headings: ['7.5 企业申报审批（原规划外新增）'] }],
    [{ page: 'orders.html', document: 'orders.md', anchor: '7.5 企业申报审批', primary: true }],
  );
  assert.equal(health.summary.issueCount, 0);
  assert.equal(health.missingAnchors.length, 0);
});

test('current bindings point to existing prototype and PRD files without duplicates', async () => {
  const config = JSON.parse(await fs.readFile(path.join(shellRoot, 'config.json'), 'utf8'));
  const bindings = JSON.parse(await fs.readFile(path.join(shellRoot, 'bindings.json'), 'utf8'));
  const prototypeRoot = path.resolve(shellRoot, config.prototypeRoot);
  const docsRoot = path.resolve(shellRoot, config.docsRoot);
  const keys = new Set();
  const primaryCounts = new Map();

  for (const binding of bindings.filter((item) => item && !item._comment)) {
    const key = `${binding.page}\n${binding.document}`;
    assert.equal(keys.has(key), false, `重复关联：${binding.page} → ${binding.document}`);
    keys.add(key);
    await fs.access(path.join(prototypeRoot, binding.page));
    await fs.access(path.join(docsRoot, binding.document));
    if (binding.primary) primaryCounts.set(binding.page, (primaryCounts.get(binding.page) || 0) + 1);
  }

  primaryCounts.forEach((count, page) => {
    assert.ok(count <= 1, `${page} 配置了多个主 PRD`);
  });
});

test('HTTP endpoints return scanned data, injected prototypes, and controlled errors', async (context) => {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const [indexResponse, managementScriptResponse] = await Promise.all([
    fetch(`${baseUrl}/`),
    fetch(`${baseUrl}/management.js`),
  ]);
  assert.equal(indexResponse.status, 200);
  assert.equal(managementScriptResponse.status, 200);
  assert.match(await indexResponse.text(), /id="managementPanel"/);
  assert.match(await managementScriptResponse.text(), /prototype-shell:command/);

  const notFoundResponse = await fetch(`${baseUrl}/missing-page/for-test`);
  assert.equal(notFoundResponse.status, 404);
  assert.match(notFoundResponse.headers.get('content-type'), /text\/html/);
  assert.match(await notFoundResponse.text(), /页面不存在/);

  const bootstrapResponse = await fetch(`${baseUrl}/api/bootstrap`);
  assert.equal(bootstrapResponse.status, 200);
  const { pages, docs: documents, bindings, health, pageRules } = await bootstrapResponse.json();
  assert.ok(pages.length > 0);
  assert.ok(documents.length > 0);
  assert.ok(bindings.length > 0);
  assert.equal(typeof pageRules, 'object');
  assert.equal(health.summary.issueCount, 0);

  const prototypePath = pages[0].path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const prototypeResponse = await fetch(`${baseUrl}/prototype/${prototypePath}`);
  assert.equal(prototypeResponse.status, 200);
  const prototypeSource = await prototypeResponse.text();
  assert.match(prototypeSource, /html-prototype-shell-bridge/);
  assert.match(prototypeSource, /search: location\.search/);
  const rawPrototypeResponse = await fetch(`${baseUrl}/prototype/${prototypePath}?raw=1`);
  assert.equal(rawPrototypeResponse.status, 200);
  assert.doesNotMatch(await rawPrototypeResponse.text(), /html-prototype-shell-bridge/);

  const traversalResponse = await fetch(`${baseUrl}/api/doc?path=..%2Foutside.md`);
  assert.equal(traversalResponse.status, 403);
  const methodResponse = await fetch(`${baseUrl}/api/pages`, { method: 'POST' });
  assert.equal(methodResponse.status, 405);
  const unauthorizedWriteResponse = await fetch(`${baseUrl}/api/page-rule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: pages[0].path, rule: null }),
  });
  assert.equal(unauthorizedWriteResponse.status, 403);
  const invalidWriteResponse = await fetch(`${baseUrl}/api/page-rule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Prototype-Shell-Admin': '1' },
    body: JSON.stringify({ page: '__missing__.html', rule: null }),
  });
  assert.equal(invalidWriteResponse.status, 400);
});
