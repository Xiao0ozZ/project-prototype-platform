import { describe, expect, it } from 'vitest';

import { createAntThemeConfig } from './ant-theme-config';

describe('createAntThemeConfig', () => {
  it('uses the approved Ant Design light layout tokens for the default theme', () => {
    const config = createAntThemeConfig('default', false);

    expect(config.token).toMatchObject({
      colorPrimary: '#1677FF',
      colorBgLayout: '#f5f8ff',
      colorBgContainer: '#ffffff',
      borderRadius: 6,
      borderRadiusLG: 8,
      controlHeight: 32,
      fontFamily:
        "'SF Pro Text', 'SF Pro Display', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
      fontFamilyCode:
        "'SFMono-Regular', 'SF Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    });
    expect(config.components?.Layout).toMatchObject({
      bodyBg: '#f5f8ff',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      triggerBg: '#f0f5ff',
    });
    expect(config.components?.Menu).toMatchObject({
      activeBarBorderWidth: 0,
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
    });
  });

  it('keeps compact density composable with every visual theme', () => {
    const comfortable = createAntThemeConfig('default', false);
    const compactDark = createAntThemeConfig('dark', true);

    expect(comfortable.algorithm).toHaveLength(1);
    expect(compactDark.algorithm).toHaveLength(2);
  });

  it('keeps glass as a translucent derivative instead of changing component semantics', () => {
    const config = createAntThemeConfig('glass', false);

    expect(config.token).toMatchObject({
      colorPrimary: '#1677FF',
      colorBgLayout: '#edf5ff',
      colorBgContainer: 'rgba(255, 255, 255, 0.68)',
    });
    expect(config.components?.Layout).toMatchObject({
      bodyBg: 'transparent',
      headerBg: 'rgba(255, 255, 255, 0.76)',
    });
  });
});
