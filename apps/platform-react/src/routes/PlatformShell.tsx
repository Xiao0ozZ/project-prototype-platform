import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Breadcrumb, Button, Layout, Menu, type MenuProps } from '@/ui/ant';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@/ui/ant/icons';
import { ThemeControl } from '@/ui/platform/ThemeControl';

const { Header, Sider, Content } = Layout;
const COLLAPSED_KEY = 'product-experience-center:platform-nav-collapsed';

const navigation = [
  { key: '/tools/console', label: '控制台', icon: <SettingOutlined /> },
  { key: '/tools/projects', label: '项目包管理', icon: <FolderOpenOutlined /> },
  { key: '/tools/project-health', label: '项目健康检查', icon: <SafetyCertificateOutlined /> },
  { key: '/tools/project-routes', label: '路由菜单管理', icon: <OrderedListOutlined /> },
  { key: '/tools/page-transfer', label: '页面导入导出', icon: <UploadOutlined /> },
  { key: '/tools/ai-context', label: 'AI 上下文中心', icon: <DatabaseOutlined /> },
  { key: '/components', label: '组件规范', icon: <AppstoreOutlined /> },
];

const routeMeta = Object.fromEntries(navigation.map((item) => [item.key, item.label]));

export function PlatformShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');
  const currentPath = navigation.find((item) => location.pathname.startsWith(item.key))?.key;
  const items: MenuProps['items'] = navigation;

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <Layout className="platform-workspace">
      <Header className="platform-workspace__global-header">
        <Button className="platform-workspace__brand" type="text" onClick={() => navigate('/')}>
          <span>
            <AppstoreOutlined />
          </span>
          <div>
            <strong>产品功能体验中心</strong>
          </div>
        </Button>
        <div />
        <div className="platform-workspace__actions">
          <ThemeControl />
          <Button type="text" icon={<HomeOutlined />} onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </Header>
      <Layout className="platform-workspace__body">
        <Sider
          className="platform-workspace__sider"
          width={216}
          collapsedWidth={56}
          collapsed={collapsed}
          trigger={null}
        >
          <Menu
            className="platform-workspace__menu"
            mode="inline"
            selectedKeys={currentPath ? [currentPath] : []}
            items={items}
            onClick={({ key }) => navigate(key)}
          />
          <Button
            className="platform-workspace__collapse"
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
          >
            {collapsed ? null : '收起导航'}
          </Button>
        </Sider>
        <Layout className="platform-workspace__main">
          <div className="platform-workspace__context">
            <Breadcrumb
              items={[
                {
                  title: (
                    <HomeOutlined
                      className="platform-workspace__home"
                      aria-label="返回首页"
                      onClick={() => navigate('/')}
                    />
                  ),
                },
                { title: '平台管理' },
                { title: routeMeta[currentPath || ''] || '公共页面' },
              ]}
            />
          </div>
          <Content className="platform-workspace__content">
            <div className="platform-workspace__route" key={location.pathname}>
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
