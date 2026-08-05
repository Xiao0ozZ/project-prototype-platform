import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';

import ProjectUnavailableView from '../views/system/ProjectUnavailableView.vue';
import ClientLoginView from '../views/auth/ClientLoginView.vue';
import MobilePrototypeView from '../views/mobile/MobilePrototypeView.vue';
import ProjectClientLayout from '../layouts/ProjectClientLayout.vue';
import { createProjectPageRoutes, getProject, installedProjects } from '../config/project-packages';
import { projectConfig } from '../config/project.config';
import { applyProjectTheme } from '../config/theme';

function createInstalledProjectRoutes() {
  return installedProjects.flatMap((project) => {
    const routes = [
      {
        path: `/p/${project.id}`,
        name: `${project.id}-home`,
        meta: { projectId: project.id },
        redirect: { name: 'home', query: { project: project.id } },
      },
    ];

    for (const client of project.clients) {
      routes.push(
        {
          path: `/p/${project.id}/${client.id}/login`,
          name: `${project.id}-${client.id}-login`,
          component: ClientLoginView,
          props: { projectId: project.id, clientId: client.id },
          meta: { title: `${client.name}登录`, projectId: project.id, clientId: client.id },
        },
        {
          path: `/p/${project.id}/${client.id}`,
          component: ProjectClientLayout,
          props: { projectId: project.id, clientId: client.id },
          redirect: `/p/${project.id}/${client.id}/login`,
          children: createProjectPageRoutes(project, client),
        },
      );
    }

    if (project.mobile?.enabled) {
      routes.push({
        path: `/p/${project.id}/mobile`,
        name: `${project.id}-mobile`,
        component: MobilePrototypeView,
        props: { projectId: project.id },
        meta: { title: '移动端原型', projectId: project.id },
      });
    }
    if (project.docs?.enabled) {
      routes.push({
        path: `/p/${project.id}/docs`,
        name: `${project.id}-docs`,
        component: () => import('../views/docs/DocsCenterView.vue'),
        props: { projectId: project.id },
        meta: { title: '文档中心', projectId: project.id },
      });
    }
    return routes;
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
        path: `/p/${project.id}/${client.id}/${rawPath || 'login'}`,
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
      redirect: (to) => ({ path: `/p/${project.id}/docs`, query: to.query, hash: to.hash }),
    });
  }
  return redirects;
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: projectConfig.platformTitle, transition: 'platform' },
  },
  {
    path: '/home-v5-preview',
    name: 'home-v5-preview',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '首页候选稿', transition: 'platform' },
  },
  {
    path: '/tools/console',
    name: 'tools-console',
    component: () => import('../views/tools/ConsoleView.vue'),
    meta: { title: '控制台', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/components',
    name: 'design-system',
    component: () => import('../views/DesignSystemView.vue'),
    meta: { title: '组件规范', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/tools/page-transfer',
    name: 'page-transfer',
    component: () => import('../views/tools/PageTransferView.vue'),
    meta: { title: '页面导入导出', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/tools/projects',
    name: 'project-packages-status',
    component: () => import('../views/tools/ProjectPackagesView.vue'),
    meta: { title: '项目包状态', transition: 'platform', theme: 'platform' },
  },
  {
    path: '/tools/project-routes',
    name: 'project-routes',
    component: () => import('../views/tools/ProjectRoutesView.vue'),
    meta: { title: '路由菜单管理', transition: 'platform', theme: 'platform' },
  },
  ...createInstalledProjectRoutes(),
  ...createLegacyProjectRedirects(),
  {
    path: '/p/:projectId/:pathMatch(.*)*',
    name: 'project-unavailable',
    component: ProjectUnavailableView,
    props: (route) => ({ projectId: route.params.projectId }),
    meta: { title: '项目不可用' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/system/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
];

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
  document.title = `${to.meta.title || projectConfig.platformTitle} - ${project?.name || projectConfig.name}`;
});

export default router;
