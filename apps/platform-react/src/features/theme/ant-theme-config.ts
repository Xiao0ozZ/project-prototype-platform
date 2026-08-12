import { theme, type ThemeConfig } from '@/ui/ant';

import type { ResolvedThemeMode } from './platform-theme';

const FONT_FAMILY =
  "'PingFang SC', 'SF Pro Text', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif";

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
              colorBgContainer: 'rgba(255, 255, 255, 0.76)',
              colorBgElevated: 'rgba(255, 255, 255, 0.94)',
              colorBorderSecondary: 'rgba(5, 5, 5, 0.08)',
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
      fontSize: 14,
      motion: true,
    },
    components: {
      Layout: layout,
      Menu: {
        activeBarBorderWidth: 0,
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemBorderRadius: 6,
        itemHeight: 40,
      },
      Button: { borderRadius: 6 },
      Card: { borderRadiusLG: 8 },
      Modal: { borderRadiusLG: 8 },
      Progress: {
        circleTextColor: progressTextColor,
        defaultColor: '#1677FF',
        remainingColor: progressRemainingColor,
      },
      Table: { headerBorderRadius: 8 },
    },
  };
}
