import { Button, Dropdown, Tooltip, type MenuProps } from '@/ui/ant';
import {
  BgColorsOutlined,
  CompressOutlined,
  DesktopOutlined,
  MoonOutlined,
  SunOutlined,
} from '@/ui/ant/icons';
import { usePlatformTheme, type PlatformThemeMode } from '@/features/theme/platform-theme';

const modeLabels: Record<PlatformThemeMode, string> = {
  system: '跟随系统',
  default: '默认主题',
  dark: '深色主题',
  glass: '玻璃主题',
};

export function ThemeControl({ showLabel = false }: { showLabel?: boolean }) {
  const { mode, resolvedMode, compact, setMode, setCompact } = usePlatformTheme();
  const items: MenuProps['items'] = [
    {
      type: 'group',
      label: '界面主题',
      children: [
        { key: 'system', icon: <DesktopOutlined />, label: '跟随系统' },
        { key: 'default', icon: <SunOutlined />, label: '默认主题' },
        { key: 'dark', icon: <MoonOutlined />, label: '深色主题' },
        { key: 'glass', icon: <BgColorsOutlined />, label: '玻璃主题' },
      ],
    },
    { type: 'divider' },
    {
      key: 'compact',
      icon: <CompressOutlined />,
      label: compact ? '使用舒适密度' : '使用紧凑密度',
    },
  ];
  const icon =
    mode === 'system' ? (
      <DesktopOutlined />
    ) : resolvedMode === 'dark' ? (
      <MoonOutlined />
    ) : resolvedMode === 'glass' ? (
      <BgColorsOutlined />
    ) : (
      <SunOutlined />
    );

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: true,
        selectedKeys: [mode, ...(compact ? ['compact'] : [])],
        onClick: ({ key }) => {
          if (key === 'compact') setCompact(!compact);
          else setMode(key as PlatformThemeMode);
        },
      }}
    >
      <Tooltip title={`主题：${modeLabels[mode]}`}>
        <Button className="theme-control" type="text" icon={icon} aria-label={`主题：${modeLabels[mode]}`}>
          {showLabel ? modeLabels[mode] : null}
        </Button>
      </Tooltip>
    </Dropdown>
  );
}
