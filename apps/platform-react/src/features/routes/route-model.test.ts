import { describe, expect, it } from 'vitest';

import { moveRoutePage, routeGroups, routeOrderSignature, type RouteClient } from './route-model';

const client: RouteClient = {
  id: 'admin',
  name: '管理端',
  basePath: '/admin',
  sections: [
    { id: 'workbench', title: '工作区' },
    { id: 'orders', title: '订单中心' },
  ],
  pages: [
    { name: 'home', path: 'home', title: '首页', section: 'workbench' },
    { name: 'orders', path: 'orders', title: '订单', section: 'orders' },
    { name: 'detail', path: 'detail', title: '详情', section: 'orders' },
  ],
};

describe('route menu model', () => {
  it('keeps section grouping and derives deterministic order state', () => {
    expect(routeGroups(client).map((group) => group.pages.length)).toEqual([1, 2]);
    expect(routeOrderSignature(client)).toContain('orders');
  });

  it('moves only routes in the same group', () => {
    expect(moveRoutePage(client, 'orders', 0, 1).pages.map((page) => page.name)).toEqual([
      'home',
      'detail',
      'orders',
    ]);
  });
});
