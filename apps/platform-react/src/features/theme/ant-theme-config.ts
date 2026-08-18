import { theme, type ThemeConfig } from '@/ui/ant';

import type { ResolvedThemeMode } from './platform-theme';

const FONT_FAMILY =
  "'SF Pro Text', 'SF Pro Display', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif";
const FONT_FAMILY_CODE =
  "'SFMono-Regular', 'SF Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const LIGHT_LAYOUT = {
  bodyBg: '#f5f8ff',
  footerBg: '#f5f8ff',
  headerBg: '#ffffff',
  headerColor: 'rgba(0, 0, 0, 0.88)',
  lightSiderBg: '#ffffff',
  siderBg: '#ffffff',
  triggerBg: '#f0f5ff',
  lightTriggerBg: '#f0f5ff',
  triggerColor: 'rgba(0, 0, 0, 0.88)',
} as const;

const DARK_LAYOUT = {
  bodyBg: '#000000',
  footerBg: '#000000',
  headerBg: '#141414',
  headerColor: 'rgba(255, 255, 255, 0.85)',
  lightSiderBg: '#141414',
  siderBg: '#141414',
  triggerBg: '#1f1f1f',
  lightTriggerBg: '#1f1f1f',
  triggerColor: 'rgba(255, 255, 255, 0.85)',
} as const;

const GLASS_LAYOUT = {
  bodyBg: 'transparent',
  footerBg: 'transparent',
  headerBg: 'rgba(255, 255, 255, 0.76)',
  headerColor: 'rgba(0, 0, 0, 0.88)',
  lightSiderBg: 'rgba(255, 255, 255, 0.72)',
  siderBg: 'rgba(255, 255, 255, 0.72)',
  triggerBg: 'rgba(240, 245, 255, 0.82)',
  lightTriggerBg: 'rgba(240, 245, 255, 0.82)',
  triggerColor: 'rgba(0, 0, 0, 0.88)',
} as const;

export function createAntThemeConfig(resolvedMode: ResolvedThemeMode, compact: boolean): ThemeConfig {
  const isDark = resolvedMode === 'dark';
  const isGlass = resolvedMode === 'glass';
  const algorithms = [isDark ? theme.darkAlgorithm : theme.defaultAlgorithm];
  if (compact) algorithms.push(theme.compactAlgorithm);

  const layout = isDark ? DARK_LAYOUT : isGlass ? GLASS_LAYOUT : LIGHT_LAYOUT;
  const progressTextColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.88)';
  const progressRemainingColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)';

  return {
    cssVar: { key: 'product-experience-center' },
    algorithm: algorithms,
    token: {
      colorPrimary: '#1677FF',
      colorInfo: '#1677FF',
      ...(isDark
        ? {}
        : isGlass
          ? {
              colorBgLayout: '#edf5ff',
              colorBgContainer: 'rgba(255, 255, 255, 0.68)',
              colorBgElevated: 'rgba(255, 255, 255, 0.9)',
              colorBorderSecondary: 'rgba(5, 5, 5, 0.1)',
            }
          : {
              colorBgLayout: '#f5f8ff',
              colorBgContainer: '#ffffff',
              colorBgElevated: '#ffffff',
              colorBorderSecondary: '#f0f0f0',
            }),
      borderRadius: 6,
      borderRadiusLG: 8,
      controlHeight: 32,
      fontFamily: FONT_FAMILY,
      fontFamilyCode: FONT_FAMILY_CODE,
      fontSize: 14,
      fontWeightStrong: 600,
      motion: true,
    },
    components: {
      Layout: { ...layout, headerHeight: 56, headerPadding: '0 24px' },
      Menu: {
        activeBarBorderWidth: 0,
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemBorderRadius: 8,
        itemHeight: 40,
        subMenuItemBorderRadius: 8,
      },
      Button: { borderRadius: 6 },
      Card: { borderRadiusLG: 8, headerHeight: 56, bodyPadding: 24 },
      Modal: { borderRadiusLG: 8 },
      Progress: {
        circleTextColor: progressTextColor,
        defaultColor: '#1677FF',
        remainingColor: progressRemainingColor,
      },
      Table: {
        cellPaddingBlock: 12,
        cellPaddingInline: 8,
        headerBg: isDark ? undefined : '#fafafa',
        headerBorderRadius: 8,
        rowHoverBg: isDark ? undefined : '#f5f8ff',
      },
      Tabs: { horizontalItemGutter: 24 },
    },
  };
}
