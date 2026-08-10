// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  applyMenuIcons,
  createMenuIconMarkup,
  normalizeMenuIconName,
  PROTOTYPE_MENU_ICON_RENDERER,
} from '../../scripts/html-prototype-menu-icons.mjs';

describe('HTML prototype menu icons', () => {
  it('renders a CDN icon placeholder and falls back safely', () => {
    expect(createMenuIconMarkup('House')).toContain('data-prototype-menu-icon="House"');
    expect(createMenuIconMarkup('House')).toContain('prototype-menu-icon');
    expect(normalizeMenuIconName('UnknownIcon')).toBe('Document');
    expect(PROTOTYPE_MENU_ICON_RENDERER).toContain('ElementPlusIconsVue');
    expect(PROTOTYPE_MENU_ICON_RENDERER).toContain('Vue.render');
  });

  it('adds semantic icons without changing links, labels, or active state', () => {
    const source = `
      <a class="prototype-menu-item is-active" href="./dashboard.html?scope=all" aria-current="page">综合仪表板</a>
      <a class="prototype-menu-item" href="./members.html">个人会员管理</a>
    `;
    const icons = new Map([
      ['dashboard.html', 'Odometer'],
      ['members.html', 'User'],
    ]);

    const output = applyMenuIcons(source, icons);

    expect(output).toContain('href="./dashboard.html?scope=all" aria-current="page"');
    expect(output).toContain('<span>综合仪表板</span>');
    expect(output).toContain('<span>个人会员管理</span>');
    expect(output.match(/<span class="prototype-menu-icon"/gu)).toHaveLength(2);
    expect(output).not.toContain('<svg');
    expect(applyMenuIcons(output, icons)).toBe(output);
  });
});
