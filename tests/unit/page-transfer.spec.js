// @vitest-environment node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildVueSource,
  createExportPackage,
  importPage,
  inspectHtml,
} from '../../plugins/page-transfer-plugin.js';
import { applyContentOnlyMode, scanHtmlPrototypePages } from '../../plugins/html-prototype-plugin.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const temporaryRoots = [];

async function createPlatformFixture() {
  const fixtureParent = path.join(projectRoot, '.test-page-transfer');
  await fs.mkdir(fixtureParent, { recursive: true });
  const root = await fs.mkdtemp(path.join(fixtureParent, 'fixture-'));
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
      clients: [{ id: 'admin', name: '管理端', defaultPage: 'home' }],
      entries: [{ id: 'admin', kind: 'client', clientId: 'admin', name: '管理端' }],
      features: { pageTransfer: true },
    }),
    'utf8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'page-definitions.js'),
    `export const clientPageDefinitions = {\n  admin: {\n    sections: [{ id: 'workspace', title: '工作区' }],\n    pages: [\n      // <generator:admin-pages>\n    ],\n  },\n};\n`,
    'utf8',
  );
  return { root, packageRoot };
}

async function createLightweightFixture() {
  const fixture = await createPlatformFixture();
  const prototypeRoot = path.join(fixture.packageRoot, 'prototype');
  await fs.mkdir(prototypeRoot, { recursive: true });
  const projectManifestPath = path.join(fixture.packageRoot, 'project.json');
  const projectManifest = JSON.parse(await fs.readFile(projectManifestPath, 'utf8'));
  projectManifest.prototype = { enabled: true, root: 'prototype', client: 'admin' };
  await fs.writeFile(projectManifestPath, JSON.stringify(projectManifest), 'utf8');
  return { ...fixture, prototypeRoot };
}

function createLightweightHtml({ title, subtitle, link }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      .lightweight-page { padding: 28px; color: #0f172a; }
      .lightweight-page h1 { margin: 0; font-size: 24px; line-height: 32px; }
      .lightweight-page .subtitle { margin: 8px 0 20px; color: #64748b; font-size: 14px; }
    </style>
  </head>
  <body>
    <div id="app" class="prototype-app">
      <aside class="prototype-sidebar"><a href="${link}">切换页面</a></aside>
      <div class="prototype-workspace">
        <header class="prototype-topbar">示例项目</header>
        <main class="prototype-main">
          <section class="lightweight-page" data-page-content>
            <h1>${title}</h1>
            <p class="subtitle">${subtitle}</p>
            <el-button type="primary" @click="dialogVisible = true">打开弹窗</el-button>
            <el-dialog v-model="dialogVisible" title="页面弹窗">
              <p>弹窗内容</p>
            </el-dialog>
          </section>
        </main>
      </div>
    </div>
    <script src="https://unpkg.com/vue@3.4.21/dist/vue.global.prod.js"></script>
    <script src="https://unpkg.com/element-plus@2.8.0/dist/index.full.min.js"></script>
    <script>
      Vue.createApp({
        setup() {
          const dialogVisible = Vue.ref(false);
          return { dialogVisible };
        },
      }).use(ElementPlus).mount('#app');
    </script>
  </body>
</html>`;
}

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 50 });
  }
  await fs.rm(path.join(projectRoot, '.test-page-transfer'), {
    recursive: true,
    force: true,
    maxRetries: 4,
    retryDelay: 50,
  });
});

describe('page transfer', () => {
  it('imports an Options API template page without converting its component model', async () => {
    const manifest = {
      templateVersion: 1,
      scriptMode: 'options-api',
      pageKey: 'options-page',
      pageTitle: 'Options 页面',
      pageType: 'list',
      pageHeaderMode: 'standard',
      client: 'admin',
      routePath: '/admin/options-page',
      menuSection: 'workspace',
      menuTitle: 'Options 页面',
      menuIcon: 'Document',
    };
    const source = [
      `<script type="application/json" id="prototype-page-manifest">${JSON.stringify(manifest)}</script>`,
      '<!-- [AI-EDIT] PAGE_CONTENT_START -->',
      '<section data-page-content><div data-business-content>Options 内容</div></section>',
      '<!-- PAGE_CONTENT_END -->',
      '<!-- [AI-EDIT] PAGE_OVERLAYS_START -->',
      '<div data-page-overlay="dialog"><el-dialog v-model="visible">弹窗</el-dialog></div>',
      '<!-- PAGE_OVERLAYS_END -->',
      '<script>/* [AI-EDIT] PAGE_LOGIC_START */\nconst pageOptions = { data() { return { visible: false }; } };\n/* PAGE_LOGIC_END */</script>',
    ].join('\n');
    const { root, packageRoot } = await createPlatformFixture();

    expect(inspectHtml(source)).toMatchObject({ valid: true, format: 'html-template' });
    expect(buildVueSource(source, manifest)).toContain('export default pageOptions;');
    await importPage({
      projectRoot: root,
      source,
      target: {
        projectId: 'sample-project',
        client: 'admin',
        routePath: 'options-page',
        menuSection: 'workspace',
        menuTitle: 'Options 页面',
      },
    });
    expect(
      await fs.readFile(path.join(packageRoot, 'views', 'admin', 'OptionsPageView.vue'), 'utf8'),
    ).toContain('export default pageOptions;');
  });

  it('imports a valid HTML template into the selected project package', async () => {
    const source = await fs.readFile(path.join(projectRoot, 'templates', 'html-prototype-page.html'), 'utf8');
    expect(inspectHtml(source)).toMatchObject({ valid: true, warnings: [] });
    const { root, packageRoot } = await createPlatformFixture();

    const result = await importPage({
      projectRoot: root,
      source,
      target: {
        projectId: 'sample-project',
        client: 'admin',
        routePath: 'imported-page',
        menuSection: 'workspace',
        menuTitle: '导入页面',
        sourceFile: 'prototype.html',
        fileName: '客户等级方案.html',
      },
    });

    expect(result.routePath).toBe('/p/sample-project/admin/imported-page');
    const generatedView = path.join(packageRoot, 'views', 'admin', 'ImportedPageView.vue');
    expect(await fs.readFile(generatedView, 'utf8')).toContain('<style scoped>');
    expect(await fs.readFile(path.join(packageRoot, 'page-definitions.js'), 'utf8')).toContain(
      '"path":"imported-page"',
    );
    expect(await fs.readFile(path.join(packageRoot, 'page-definitions.js'), 'utf8')).toContain(
      '"fileName":"客户等级方案.html"',
    );
  });

  it('keeps the HTML template AI contract and page identity synchronized', async () => {
    const source = await fs.readFile(path.join(projectRoot, 'templates', 'html-prototype-page.html'), 'utf8');
    const manifestSource = source.match(
      /<script\b[^>]*\bid=["']prototype-page-manifest["'][^>]*>([\s\S]*?)<\/script>/u,
    )?.[1];
    if (!manifestSource) throw new Error('模板缺少 prototype-page-manifest。');
    const manifest = JSON.parse(manifestSource.trim());
    const htmlWithoutComments = source.replace(/<!--[\s\S]*?-->/gu, '');

    expect(source).toContain('HTML 原型 AI 编写协议 v1.5');
    expect(source).toContain('以本模板作为唯一的结构与实现基准');
    expect(source).toContain('可将本模板复制为多个 HTML 文件组成多页面原型');
    expect(source).toContain('<!-- PROTOTYPE_AI_PROTOCOL_START -->');
    expect(source).toContain('<!-- PROTOTYPE_AI_PROTOCOL_END -->');
    expect(source).toContain('协议标题和全部正文必须完整保留');
    expect(source).toContain('现有内容只是一个可运行示例');
    expect(source).toContain('可以删除并完整替换');
    expect(source).not.toContain('四个统计卡片');
    expect(source).not.toContain('统计摘要仅在业务需要');
    expect(source).toContain('<a href="./目标页面.html">');
    expect(source).not.toMatch(/历史\s*HTML|旧\s*HTML|旧页面|legacy|迁移|转换生成|模板化副本/iu);
    expect(source).not.toMatch(
      /平台|导入器|正式导入|直接读取|独立预览|导入时|提取此节点|回导|直读|Vue\s*工程|data-preview/iu,
    );
    expect(source).toContain('不可破坏的模板契约');
    expect(source).toContain('交付自检');
    expect(manifest).toMatchObject({
      templateVersion: 1,
      scriptMode: 'composition-api',
      menu: true,
      pageKey: 'standard-list-page',
      fileName: '资料管理.html',
      rootClass: 'standard-list-page',
      overlayRootClass: 'standard-list-dialog',
    });
    expect(manifest.rootClass).toBe(manifest.pageKey);
    expect(manifest.menuTitle).toBe(manifest.pageTitle);
    expect(manifest.routePath.split('/').filter(Boolean)[0]).toBe(manifest.client);
    expect(source).toContain(`<title>${manifest.pageTitle}</title>`);
    expect(source).toContain(`<h1>${manifest.pageTitle}</h1>`);
    expect(source).toContain(`data-shell-page-title`);
    expect(htmlWithoutComments).not.toContain(`href="./${manifest.fileName}"`);
    expect(htmlWithoutComments).toContain('aria-disabled="true"');
    expect(source).toContain('<!-- [AI-EDIT] SHELL_NAV_START:');
    expect(source).toContain('<!-- SHELL_NAV_END -->');
    expect(source).toContain(`class="${manifest.rootClass}"`);
    expect(source).toContain(`data-page-root="${manifest.rootClass}"`);
    expect(source).toContain(`data-page-key="${manifest.pageKey}"`);
    expect(source).toContain(`.${manifest.rootClass} {`);
    expect(source).toContain(`.${manifest.overlayRootClass} .el-dialog__body`);
    expect(htmlWithoutComments.match(/<[^>]*\bdata-page-content\b[^>]*>/gu)).toHaveLength(1);
    expect(htmlWithoutComments.match(/<[^>]*\bdata-business-content\b[^>]*>/gu)).toHaveLength(1);
    expect(source.match(/<!-- \[AI-EDIT\] PAGE_CONTENT_START:/gu)).toHaveLength(1);
    expect(source.match(/<!-- \[AI-EDIT\] PAGE_MANIFEST_START:/gu)).toHaveLength(1);
    expect(source.match(/<!-- PAGE_MANIFEST_END -->/gu)).toHaveLength(1);
    expect(source.match(/\/\* \[AI-EDIT\] PAGE_LOGIC_START:/gu)).toHaveLength(1);
    expect(source).not.toMatch(/\bon(?:click|change|input|submit)\s*=/iu);
    expect(source).not.toMatch(/<script[^>]+src=["'](?!https?:)/iu);
  });

  it('rejects a duplicate route in the same project client', async () => {
    const source = await fs.readFile(path.join(projectRoot, 'templates', 'html-prototype-page.html'), 'utf8');
    const { root } = await createPlatformFixture();
    const target = {
      projectId: 'sample-project',
      client: 'admin',
      routePath: 'imported-page',
      menuSection: 'workspace',
      menuTitle: '导入页面',
      sourceFile: 'prototype.html',
    };
    await importPage({ projectRoot: root, source, target });
    expect(
      await fs.readFile(path.join(root, 'projects', 'sample-project', 'page-definitions.js'), 'utf8'),
    ).toContain('"fileName":"prototype.html"');
    await expect(importPage({ projectRoot: root, source, target })).rejects.toThrow('目标页面已存在');
  });

  it('imports a new platform export from its editable Vue source blocks', async () => {
    const manifest = {
      templateVersion: 1,
      exportFormat: 'vue-sfc',
      pageKey: 'exported-page',
      pageTitle: '导出页面',
      pageType: 'custom',
      pageHeaderMode: 'standard',
      client: 'admin',
      routePath: '/admin/exported-page',
      menuSection: 'workspace',
      menuTitle: '导出页面',
      menuIcon: 'Document',
    };
    const templateSource = '<main class="exported-page">导出内容</main>';
    const scriptSource = 'const ready = true';
    const styleSource = '.exported-page { color: var(--app-color-primary); }';
    const source = [
      `<script type="application/json" id="prototype-page-manifest">${JSON.stringify(manifest)}</script>`,
      `<script type="text/plain" id="prototype-editable-template" data-source-format="vue-sfc-template">${templateSource}</script>`,
      `<script type="text/plain" id="prototype-editable-script" data-source-format="vue-sfc-script" data-sfc-setup="true">${scriptSource}</script>`,
      `<script type="text/plain" id="prototype-editable-style" data-source-format="vue-sfc-style" data-sfc-scoped="true" data-sfc-module="classes">${styleSource}</script>`,
    ].join('');
    const { root, packageRoot } = await createPlatformFixture();

    const inspection = inspectHtml(source);
    expect(inspection.valid).toBe(true);
    expect(inspection.format).toBe('vue-sfc');

    await importPage({
      projectRoot: root,
      source,
      target: {
        projectId: 'sample-project',
        client: 'admin',
        routePath: 'exported-page',
        menuSection: 'workspace',
        menuTitle: '导出页面',
      },
    });

    const generatedView = path.join(packageRoot, 'views', 'admin', 'ExportedPageView.vue');
    const generatedSource = await fs.readFile(generatedView, 'utf8');
    expect(generatedSource).toContain('导出内容');
    expect(generatedSource).toContain('<script setup>');
    expect(generatedSource).toMatch(/<style[^>]*\bscoped\b/u);
    expect(generatedSource).toContain('module="classes"');
    expect(await fs.readFile(path.join(packageRoot, 'page-definitions.js'), 'utf8')).toContain(
      '"source":"html-export"',
    );
    expect(inspection.format).toBe('vue-sfc');
  });

  it('keeps export, direct-read and re-import metadata in one loop', async () => {
    const { root, packageRoot } = await createPlatformFixture();
    await fs.mkdir(path.join(packageRoot, 'views', 'admin'), { recursive: true });
    await fs.writeFile(
      path.join(packageRoot, 'page-definitions.js'),
      `export const clientPageDefinitions = {\n  admin: {\n    sections: [{ id: 'workspace', title: '工作区' }],\n    pages: [{ path: 'home', name: 'admin-home', title: '首页', view: 'admin/HomeView.vue', section: 'workspace', icon: 'House', menu: false }],\n  },\n};\n`,
      'utf8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'views', 'admin', 'HomeView.vue'),
      '<template><main class="home-page">闭环内容</main></template>\n<script setup>const ready = true</script>\n<style scoped>\n.home-page { color: var(--app-color-primary); }\n</style>\n',
      'utf8',
    );

    const exported = await createExportPackage({
      projectRoot: root,
      projectId: 'sample-project',
      selectedPaths: ['/p/sample-project/admin/home'],
      packageName: '闭环测试',
    });
    expect(exported.files).toEqual(['首页.html']);
    const exportedPath = path.join(root, exported.result?.html || exported.html);
    const exportedHtml = await fs.readFile(exportedPath, 'utf8');
    const inspection = inspectHtml(exportedHtml);
    expect(inspection).toMatchObject({ valid: true, format: 'vue-sfc' });
    expect(exportedHtml).toContain('id="prototype-editable-template"');
    expect(exportedHtml).toContain('id="prototype-editable-script"');
    expect(exportedHtml).toContain('id="prototype-editable-style"');
    expect(exportedHtml).toContain('PORTABLE HTML PROTOTYPE SOURCE');
    const contentOnlyHtml = applyContentOnlyMode(exportedHtml);
    expect(contentOnlyHtml).toContain('id="platform-html-content-only"');
    expect(applyContentOnlyMode(contentOnlyHtml)).toBe(contentOnlyHtml);

    const directRoot = path.join(root, 'direct-html');
    await fs.mkdir(directRoot, { recursive: true });
    await fs.writeFile(path.join(directRoot, 'home.html'), exportedHtml, 'utf8');
    const projectManifestPath = path.join(packageRoot, 'project.json');
    const projectManifest = JSON.parse(await fs.readFile(projectManifestPath, 'utf8'));
    projectManifest.prototype = { enabled: true, root: directRoot, client: 'admin' };
    await fs.writeFile(projectManifestPath, JSON.stringify(projectManifest), 'utf8');

    const directRead = await scanHtmlPrototypePages(path.join(root, 'projects'));
    expect(directRead.projects['sample-project'].admin[0]).toMatchObject({
      path: 'home',
      sourceType: 'html-direct',
      renderMode: 'content-only',
      menu: false,
    });

    await importPage({
      projectRoot: root,
      source: exportedHtml,
      target: {
        projectId: 'sample-project',
        client: 'admin',
        mode: 'replace',
        replacePagePath: 'home',
        routePath: 'home',
        menuSection: 'workspace',
        menuTitle: '首页',
        menuIcon: 'House',
      },
    });
    expect(await fs.readFile(path.join(packageRoot, 'views', 'admin', 'HomeView.vue'), 'utf8')).toContain(
      '闭环内容',
    );

    const editableStart = exportedHtml.indexOf('<script id="prototype-editable-template"');
    const editableEnd = exportedHtml.indexOf('</script>', editableStart);
    const editedHtml = `${exportedHtml.slice(0, editableStart)}${exportedHtml
      .slice(editableStart, editableEnd)
      .replace('闭环内容', 'AI修改内容')}${exportedHtml.slice(editableEnd)}`;
    await importPage({
      projectRoot: root,
      source: editedHtml,
      target: {
        projectId: 'sample-project',
        client: 'admin',
        mode: 'replace',
        replacePagePath: 'home',
        routePath: 'home',
        menuSection: 'workspace',
        menuTitle: '首页',
        menuIcon: 'House',
      },
    });
    expect(await fs.readFile(path.join(packageRoot, 'views', 'admin', 'HomeView.vue'), 'utf8')).toContain(
      'AI修改内容',
    );
  }, 30000);

  it('exports multiple pages as independent round-trip HTML files', async () => {
    const { root, packageRoot } = await createPlatformFixture();
    await fs.mkdir(path.join(packageRoot, 'views', 'admin'), { recursive: true });
    await fs.writeFile(
      path.join(packageRoot, 'page-definitions.js'),
      `export const clientPageDefinitions = {\n  admin: {\n    sections: [{ id: 'workspace', title: '工作区' }],\n    pages: [\n      { path: 'home', name: 'admin-home', title: '首页', view: 'admin/HomeView.vue', section: 'workspace', icon: 'House' },\n      { path: 'orders', name: 'admin-orders', title: '订单', view: 'admin/OrdersView.vue', section: 'workspace', icon: 'List' },\n    ],\n  },\n};\n`,
      'utf8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'views', 'admin', 'HomeView.vue'),
      '<template><main>首页</main></template>\n<script setup>const page = "home"</script>\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'views', 'admin', 'OrdersView.vue'),
      '<template><main>订单</main></template>\n<script setup>const page = "orders"</script>\n',
      'utf8',
    );

    const exported = await createExportPackage({
      projectRoot: root,
      projectId: 'sample-project',
      selectedPaths: ['/p/sample-project/admin/home', '/p/sample-project/admin/orders'],
      packageName: '多页闭环测试',
    });

    expect(exported.mode).toBe('multiple');
    expect(exported.files).toEqual(['首页.html', '订单.html']);
    const zipPath = path.join(root, exported.zip);
    expect((await fs.stat(zipPath)).size).toBeGreaterThan(0);
    const exportDirectory = zipPath.replace(/\.zip$/u, '');
    for (const file of exported.files) {
      const html = await fs.readFile(path.join(exportDirectory, file), 'utf8');
      expect(inspectHtml(html)).toMatchObject({ valid: true, format: 'vue-sfc' });
    }
  }, 30000);

  it('rewrites same-name HTML links by their resolved source path', async () => {
    const { root, packageRoot, prototypeRoot } = await createLightweightFixture();
    await fs.mkdir(path.join(packageRoot, 'views', 'admin'), { recursive: true });
    await fs.mkdir(path.join(prototypeRoot, 'group-a'), { recursive: true });
    await fs.mkdir(path.join(prototypeRoot, 'group-b'), { recursive: true });
    await fs.writeFile(
      path.join(packageRoot, 'page-definitions.js'),
      `export const clientPageDefinitions = {
  admin: {
    sections: [{ id: 'workspace', title: '工作区' }],
    pages: [
      { path: 'home', name: 'admin-home', title: '首页', view: 'admin/HomeView.vue', section: 'workspace', icon: 'House', source: 'html-template', prototype: { sourceFile: 'group-a/home.html' } },
      { path: 'detail-a', name: 'admin-detail-a', title: 'A 详情', view: 'admin/DetailAView.vue', section: 'workspace', icon: 'Document', source: 'html-template', prototype: { sourceFile: 'group-a/detail.html' } },
      { path: 'detail-b', name: 'admin-detail-b', title: 'B 详情', view: 'admin/DetailBView.vue', section: 'workspace', icon: 'Document', source: 'html-template', prototype: { sourceFile: 'group-b/detail.html' } },
    ],
  },
};
`,
      'utf8',
    );
    for (const [fileName, title] of [
      ['HomeView.vue', '首页'],
      ['DetailAView.vue', 'A 详情'],
      ['DetailBView.vue', 'B 详情'],
    ]) {
      await fs.writeFile(
        path.join(packageRoot, 'views', 'admin', fileName),
        `<template><main><h1>${title}</h1></main></template>\n`,
        'utf8',
      );
    }
    await fs.writeFile(
      path.join(prototypeRoot, 'group-a', 'home.html'),
      createLightweightHtml({ title: '首页', subtitle: '首页副标题', link: 'detail.html' }),
      'utf8',
    );
    await fs.writeFile(
      path.join(prototypeRoot, 'group-a', 'detail.html'),
      createLightweightHtml({ title: 'A 详情', subtitle: 'A 副标题', link: '../group-b/detail.html' }),
      'utf8',
    );
    await fs.writeFile(
      path.join(prototypeRoot, 'group-b', 'detail.html'),
      createLightweightHtml({ title: 'B 详情', subtitle: 'B 副标题', link: '../group-a/home.html' }),
      'utf8',
    );

    const exported = await createExportPackage({
      projectRoot: root,
      projectId: 'sample-project',
      selectedPaths: [
        '/p/sample-project/admin/home',
        '/p/sample-project/admin/detail-a',
        '/p/sample-project/admin/detail-b',
      ],
      packageName: '同名页面链接测试',
    });
    const exportDirectory = path.join(root, exported.zip.replace(/^\//u, '').replace(/\.zip$/u, ''));
    const homeHtml = await fs.readFile(path.join(exportDirectory, '首页.html'), 'utf8');
    const detailAHtml = await fs.readFile(path.join(exportDirectory, 'A 详情.html'), 'utf8');
    const detailBHtml = await fs.readFile(path.join(exportDirectory, 'B 详情.html'), 'utf8');

    expect(homeHtml).toContain('href="./A 详情.html"');
    expect(detailAHtml).toContain('href="./B 详情.html"');
    expect(detailBHtml).toContain('href="./首页.html"');
  }, 30000);

  it('exports existing HTML prototypes as lightweight editable files with rewritten links', async () => {
    const { root, packageRoot, prototypeRoot } = await createLightweightFixture();
    await fs.mkdir(path.join(packageRoot, 'views', 'admin'), { recursive: true });
    await fs.writeFile(
      path.join(packageRoot, 'page-definitions.js'),
      `export const clientPageDefinitions = {
  admin: {
    sections: [{ id: 'workspace', title: '工作区' }],
    pages: [
      { path: 'home', name: 'admin-home', title: '首页', view: 'admin/HomeView.vue', section: 'workspace', icon: 'House', source: 'html-template', prototype: { sourceFile: 'home.html' } },
      { path: 'detail', name: 'admin-detail', title: '详情', view: 'admin/DetailView.vue', section: 'workspace', icon: 'Document', source: 'html-template', prototype: { sourceFile: 'detail.html' } },
      // <generator:admin-pages>
    ],
  },
};
`,
      'utf8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'views', 'admin', 'HomeView.vue'),
      '<template><main class="lightweight-page"><h1>首页</h1><p>首页内容</p></main></template>\n<style scoped>.lightweight-page h1 { font-size: 24px; }</style>\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'views', 'admin', 'DetailView.vue'),
      '<template><main class="lightweight-page"><h1>详情</h1><p>详情内容</p></main></template>\n<style scoped>.lightweight-page h1 { font-size: 24px; }</style>\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(prototypeRoot, 'home.html'),
      createLightweightHtml({ title: '首页', subtitle: '首页副标题', link: 'detail.html' }),
      'utf8',
    );
    await fs.writeFile(
      path.join(prototypeRoot, 'detail.html'),
      createLightweightHtml({ title: '详情', subtitle: '详情副标题', link: 'home.html' }),
      'utf8',
    );
    const exported = await createExportPackage({
      projectRoot: root,
      projectId: 'sample-project',
      selectedPaths: ['/p/sample-project/admin/home', '/p/sample-project/admin/detail'],
      packageName: '轻量 HTML 测试',
    });
    const exportDirectory = path.join(root, exported.zip.replace(/^\//, '').replace(/\.zip$/u, ''));
    const homeHtml = await fs.readFile(path.join(exportDirectory, '首页.html'), 'utf8');
    const detailHtml = await fs.readFile(path.join(exportDirectory, '详情.html'), 'utf8');

    expect(Buffer.byteLength(homeHtml)).toBeLessThan(100_000);
    expect(homeHtml).toContain('id="prototype-editable-template"');
    expect(homeHtml).toContain('id="prototype-page-manifest"');
    expect(homeHtml).toContain('href="./详情.html"');
    expect(detailHtml).toContain('href="./首页.html"');
    expect(homeHtml).not.toContain('StandalonePrototypePage');
    expect(inspectHtml(homeHtml)).toMatchObject({ valid: true, format: 'html-template', roundTrip: true });
    expect(applyContentOnlyMode(homeHtml)).toContain('.prototype-sidebar');
    await importPage({
      projectRoot: root,
      source: homeHtml,
      target: {
        projectId: 'sample-project',
        client: 'admin',
        routePath: 'imported-light',
        menuSection: 'workspace',
        menuTitle: '轻量回导页面',
      },
    });
    expect(
      await fs.readFile(path.join(packageRoot, 'views', 'admin', 'ImportedLightView.vue'), 'utf8'),
    ).toContain('首页');

    await fs.writeFile(path.join(prototypeRoot, 'home.html'), applyContentOnlyMode(homeHtml), 'utf8');
    const reExported = await createExportPackage({
      projectRoot: root,
      projectId: 'sample-project',
      selectedPaths: ['/p/sample-project/admin/home'],
      packageName: '轻量 HTML 再导出测试',
    });
    const reExportedHtml = await fs.readFile(path.join(root, reExported.html.replace(/^\//u, '')), 'utf8');
    for (const id of [
      'prototype-page-manifest',
      'prototype-export-config',
      'prototype-editable-template',
      'prototype-editable-style',
    ]) {
      expect(reExportedHtml.match(new RegExp(`id=["']${id}["']`, 'gu'))).toHaveLength(1);
    }
    expect(reExportedHtml).not.toContain('id="platform-html-content-only"');
    expect(inspectHtml(reExportedHtml)).toMatchObject({
      valid: true,
      format: 'html-template',
      roundTrip: true,
    });
  }, 30000);
});
