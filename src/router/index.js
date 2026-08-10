import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';

import ProjectUnavailableView from '../views/system/ProjectUnavailableView.vue';
import ClientLoginView from '../views/auth/ClientLoginView.vue';
import MobilePrototypeView from '../views/mobile/MobilePrototypeView.vue';
import ProjectClientLayout from '../layouts/ProjectClientLayout.vue';
import ClientEmptyView from '../views/system/ClientEmptyView.vue';

// 可插拔项目包关联关系
import { createProjectPageRoutes, getProject, installedProjects } from '../config/project-packages';
import { projectConfig } from '../config/project.config';
import { applyProjectTheme } from '../config/theme';
import { getProjectClientEntryPath } from '../services/project-navigation';

function createInstalledProjectRoutes() {
  return installedProjects.flatMap((project) => {
    const projectRoutes = [
      {
        path: `/p/${project.id}`,
        name: `${project.id}-home`,
        meta: { projectId: project.id },
        redirect: { name: 'home', query: { project: project.id } },
      },
    ];

    for (const client of project.clients) {
      const clientRoot = `/p/${project.id}/${client.id}`;
      const entryPath = getProjectClientEntryPath(project.id, client);
      const children = createProjectPageRoutes(project, client);
      if (!children.length) {
        children.push({
          path: '',
          component: ClientEmptyView,
          meta: {
            title: '客户端暂无页面',
            projectId: project.id,
            clientId: client.id,
          },
        });
      }
      projectRoutes.push(
        {
          path: `/p/${project.id}/${client.id}/login`,
          name: `${project.id}-${client.id}-login`,
          component: ClientLoginView,
          props: { projectId: project.id, clientId: client.id },
          meta: { title: `${client.name}登录`, projectId: project.id, clientId: client.id },
        },
        {
          path: clientRoot,
          component: ProjectClientLayout,
          props: { projectId: project.id, clientId: client.id },
          ...(entryPath !== clientRoot ? { redirect: entryPath } : {}),
          children,
        },
      );
    }

    if (project.mobile?.enabled) {
      projectRoutes.push({
        path: `/p/${project.id}/mobile`,
        name: `${project.id}-mobile`,
        component: MobilePrototypeView,
        props: { projectId: project.id },
        meta: { title: '移动端原型', projectId: project.id },
      });
    }

    if (project.docs?.enabled) {
      projectRoutes.push({
        path: `/p/${project.id}/docs`,
        name: `${project.id}-docs`,
        component: () => import('../views/docs/DocsCenterView.vue'),
        props: { projectId: project.id },
        meta: { title: '文档中心', projectId: project.id, theme: 'platform' },
      });
    }

    return projectRoutes;
  });
}

function createLegacyProjectRedirects() {
  const project = installedProjects.find((item) => item.compatibility?.legacyRoutes);
  if (!project) return [];

  const redirects = project.clients.map((client) => ({
    path: `/${client.id}/:legacyPath(.*)*`,
    meta: { projectId: project.id },
    redirect: (to) => {
      const rawPath = Array.isArray(to.params.legacyPath)
        ? to.params.legacyPath.join('/')
        : String(to.params.legacyPath || '');
      return {
        path: rawPath
          ? `/p/${project.id}/${client.id}/${rawPath}`
          : getProjectClientEntryPath(project.id, client),
        query: to.query,
        hash: to.hash,
      };
    },
  }));

  if (project.mobile?.enabled) {
    redirects.push({
      path: '/mobile',
      meta: { projectId: project.id },
      redirect: `/p/${project.id}/mobile`,
    });
  }

  if (project.docs?.enabled) {
    redirects.push({
      path: '/docs',
      meta: { projectId: project.id },
      redirect: (to) => ({
        path: `/p/${project.id}/docs`,
        query: to.query,
        hash: to.hash,
      }),
    });
  }

  return redirects;
}

const routes = [
  // 默认平台首页：使用带多套皮肤的新首页
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },

  // 新首页备用入口，保留原有地址兼容
  {
    path: '/home-skins',
    name: 'home-skins',
    component: () => import('../views/HomeView.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },

  // 连续 A 至 K 独立皮肤/排版架构方案路由 (方案 A 确定为苹果液体玻璃)
  {
    path: '/variant-a',
    name: 'variant-a',
    component: () => import('../views/home-variants/HomeViewAppleGlass.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-b',
    name: 'variant-b',
    component: () => import('../views/home-variants/HomeViewStageHub.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-c',
    name: 'variant-c',
    component: () => import('../views/home-variants/HomeViewSplitAccordion.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-d',
    name: 'variant-d',
    component: () => import('../views/home-variants/HomeViewAlabasterGallery.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-e',
    name: 'variant-e',
    component: () => import('../views/home-variants/HomeViewOrbitalCompass.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-f',
    name: 'variant-f',
    component: () => import('../views/home-variants/HomeViewParallaxTheater.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-g',
    name: 'variant-g',
    component: () => import('../views/home-variants/HomeViewInterstellarWarp.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-h',
    name: 'variant-h',
    component: () => import('../views/home-variants/HomeViewBlackHoleGravity.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-i',
    name: 'variant-i',
    component: () => import('../views/home-variants/HomeViewQuantumCube.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-j',
    name: 'variant-j',
    component: () => import('../views/home-variants/HomeViewYinYangOrbit.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-k',
    name: 'variant-k',
    component: () => import('../views/home-variants/HomeViewCyberCockpit.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/variant-v',
    name: 'variant-v',
    component: () => import('../views/home-variants/HomeViewAppleVisionOS.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/home-legacy',
    name: 'home-legacy',
    component: () => import('../views/HomeViewLegacy.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },

  {
    path: '/tools/console',
    name: 'tools-console',
    component: () => import('../views/tools/ConsoleView.vue'),
    meta: { title: '控制台', transition: 'platform', theme: 'platform' },
  },

  // 研发与工具链管理页面
  {
    path: '/tools/projects',
    name: 'project-packages',
    component: () => import('../views/tools/ProjectPackagesView.vue'),
    meta: { title: '项目包状态', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/tools/project-routes',
    name: 'project-routes',
    component: () => import('../views/tools/ProjectRoutesView.vue'),
    meta: { title: '路由与页面映射', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/tools/page-transfer',
    name: 'page-transfer',
    component: () => import('../views/tools/PageTransferView.vue'),
    meta: { title: '页面导入与导出', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/tools/ai-context',
    name: 'ai-context',
    component: () => import('../views/tools/AiContextView.vue'),
    meta: { title: 'AI 上下文中心', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/components',
    name: 'component-catalog',
    component: () => import('../views/DesignSystemView.vue'),
    meta: { title: '组件规范目录', transition: 'platform', theme: 'platform' },
  },
];

routes.push(...createInstalledProjectRoutes(), ...createLegacyProjectRedirects());

routes.push(
  {
    path: '/p/:projectId/:pathMatch(.*)*',
    name: 'project-unavailable',
    component: ProjectUnavailableView,
    props: (route) => ({ projectId: route.params.projectId }),
    meta: { title: '项目不可用', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/system/NotFoundView.vue'),
    meta: { title: '页面不存在', transition: 'platform', theme: 'platform' },
  },
);

const isExportRuntime = typeof window !== 'undefined' && Boolean(window.__PROJECT_EXPORT__);
const router = createRouter({
  history: isExportRuntime ? createWebHashHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes,
});

function isHiddenProject(projectId) {
  return getProject(projectId)?.homepage?.visible === false;
}

router.beforeEach((to) => {
  const projectId = String(to.meta.projectId || to.params.projectId || '');
  if (isHiddenProject(projectId)) return { name: 'home' };

  const requestedProjectId = typeof to.query.project === 'string' ? to.query.project : '';
  if (to.name === 'home' && isHiddenProject(requestedProjectId)) return { name: 'home' };

  return true;
});

router.afterEach((to) => {
  const queryProjectId = typeof to.query.project === 'string' ? to.query.project : '';
  const project = getProject(to.meta.projectId || queryProjectId);
  applyProjectTheme(to.meta.theme === 'platform' ? null : project);
  const pageTitle = to.meta.title || projectConfig.platformTitle;
  const scopeTitle = project?.name || projectConfig.name;
  document.title = pageTitle === scopeTitle ? pageTitle : `${pageTitle} - ${scopeTitle}`;
});

export default router;
