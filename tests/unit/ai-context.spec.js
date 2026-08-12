import { describe, expect, it } from 'vitest';

import {
  compareContextBaseline,
  createContextBaseline,
  createContextExport,
  createPageContextPackage,
  createProjectContext,
  createTraceabilityReport,
} from '../../packages/project-core/src/index.js';

function createFixture(overrides = {}) {
  const project = {
    id: 'demo',
    name: '演示项目',
    version: '1.0.0',
    docs: { enabled: true },
    pagePrdLinks: { admin: { dashboard: '需求/控制台.md' } },
    clients: [
      {
        id: 'admin',
        name: '管理端',
        definition: {
          sections: [{ id: 'workspace', title: '工作台' }],
          pages: [
            {
              name: 'dashboard',
              title: '控制台',
              path: 'dashboard',
              section: 'workspace',
              view: 'DashboardView.vue',
            },
            {
              name: 'newOrder',
              title: '新增订单',
              path: 'new-order',
              section: 'workspace',
              sourceType: 'html-direct',
              source: 'new_order.html',
            },
          ],
        },
      },
    ],
    ...overrides.project,
  };
  return createProjectContext({
    project,
    documentManifest: overrides.documentManifest || {
      documents: [
        { path: '需求/控制台.md', title: '控制台', fileName: '控制台', folders: ['需求'] },
        { path: '需求/新增订单.md', title: '新增订单', fileName: '新增订单', folders: ['需求'] },
      ],
    },
    documentSources: {
      '需求/控制台.md': '# 控制台\n\n## 数据范围',
      '需求/新增订单.md': '# 新增订单\n\n## 表单规则',
      ...overrides.documentSources,
    },
    bindings: overrides.bindings || [],
  });
}

describe('AI project context', () => {
  it('builds coverage, issues and reviewable PRD suggestions', () => {
    const context = createFixture();

    expect(context.summary).toMatchObject({ pages: 2, linkedPages: 1, pageCoverage: 50 });
    expect(context.issues).toContainEqual(
      expect.objectContaining({ type: 'page-without-prd', pageKey: 'admin:newOrder' }),
    );
    expect(context.suggestions[0]).toMatchObject({
      pageKey: 'admin:newOrder',
      candidates: [expect.objectContaining({ path: '需求/新增订单.md', confidence: 'high' })],
    });
    expect(context.documents[0].headings).toEqual([
      { id: '控制台', text: '控制台', level: 1 },
      { id: '数据范围', text: '数据范围', level: 2 },
    ]);
  });

  it('creates compact and page-specific machine-readable packages', () => {
    const context = createFixture();
    const compact = createContextExport(context);
    const full = createContextExport(context, { includeDocumentContent: true });
    const pagePackage = createPageContextPackage(context, '/p/demo/admin/dashboard');

    expect(compact.documents[0]).not.toHaveProperty('content');
    expect(full.documents[0].content).toContain('# 控制台');
    expect(pagePackage).toMatchObject({
      kind: 'page-delivery-context',
      page: { title: '控制台' },
      requirements: [{ path: '需求/控制台.md' }],
    });
  });

  it('can suggest a general PRD when the page title matches one of its headings', () => {
    const context = createFixture({
      project: { pagePrdLinks: {} },
      documentManifest: {
        documents: [{ path: '需求/订单业务.md', title: '订单业务', fileName: '订单业务', folders: ['需求'] }],
      },
      documentSources: { '需求/订单业务.md': '# 订单业务\n\n## 新增订单\n\n表单规则。' },
    });
    const suggestion = context.suggestions.find((item) => item.pageKey === 'admin:newOrder');

    expect(suggestion?.candidates[0]).toMatchObject({
      path: '需求/订单业务.md',
      confidence: 'medium',
    });
    expect(suggestion?.candidates[0].reasons).toContain('页面标题命中 PRD 章节标题');
  });

  it('reports changed PRDs and the pages affected since a local baseline', () => {
    const before = createFixture();
    const baseline = createContextBaseline(before);
    const after = createFixture({
      documentSources: { '需求/控制台.md': '# 控制台\n\n## 数据范围\n\n新增规则。' },
    });
    const impact = compareContextBaseline(after, baseline);

    expect(impact.status).toBe('changed');
    expect(impact.summary).toMatchObject({ changed: 1, impactedPages: 1 });
    expect(impact.changes[0]).toMatchObject({
      type: 'changed',
      path: '需求/控制台.md',
      linkedPageKeys: ['admin:dashboard'],
    });
  });

  it('creates an auditable page, PRD and component traceability matrix', () => {
    const context = createFixture({
      bindings: [
        {
          id: 'dashboard-filter',
          pagePath: '/p/demo/admin/dashboard',
          selector: '[data-filter]',
          label: '数据筛选',
          prd: { document: '需求/控制台.md', anchor: '数据范围' },
        },
      ],
    });
    const report = createTraceabilityReport(context);

    expect(context.summary).toMatchObject({ pagesWithComponentBindings: 1, componentCoverage: 50 });
    expect(report).toMatchObject({
      kind: 'project-traceability-report',
      rows: [
        expect.objectContaining({
          pageKey: 'admin:dashboard',
          status: 'covered',
          componentBindings: [expect.objectContaining({ id: 'dashboard-filter' })],
        }),
        expect.objectContaining({ pageKey: 'admin:newOrder', status: 'uncovered' }),
      ],
    });
  });

  it('reports stale component anchors and orphan PRDs separately', () => {
    const context = createFixture({
      bindings: [
        {
          id: 'stale-anchor',
          pagePath: '/p/demo/admin/dashboard',
          prd: { document: '需求/控制台.md', anchor: '不存在的章节' },
        },
      ],
    });

    expect(context.issues).toContainEqual(expect.objectContaining({ type: 'missing-binding-anchor' }));
    expect(context.issues).toContainEqual(
      expect.objectContaining({ type: 'document-without-page', documentPath: '需求/新增订单.md' }),
    );
  });
});
