import { createRouter, createWebHashHistory } from 'vue-router';

// 可插拔项目包关联关系
import { installedProjects } from '../config/project-packages';
import { projectConfig } from '../config/project.config';

const routes = [
  // 核心独立新首页
  {
    path: '/',
    name: 'clean-home',
    component: () => import('../views/HomeViewClean.vue'),
    meta: { title: '项目展示中心', transition: 'platform' },
  },

  // 连续 A 至 K 独立皮肤/排版架构方案路由 (方案 A 确定为苹果液体玻璃)
  {
    path: '/variant-a',
    name: 'variant-a',
    component: () => import('../views/home-variants/HomeViewAppleGlass.vue'),
    meta: { title: '方案 A：苹果液体玻璃', transition: 'platform' },
  },
  {
    path: '/variant-b',
    name: 'variant-b',
    component: () => import('../views/home-variants/HomeViewStageHub.vue'),
    meta: { title: '方案 B：全屏展台舞台', transition: 'platform' },
  },
  {
    path: '/variant-c',
    name: 'variant-c',
    component: () => import('../views/home-variants/HomeViewSplitAccordion.vue'),
    meta: { title: '方案 C：全屏双分屏手风琴', transition: 'platform' },
  },
  {
    path: '/variant-d',
    name: 'variant-d',
    component: () => import('../views/home-variants/HomeViewAlabasterGallery.vue'),
    meta: { title: '方案 D：羊脂白艺术画廊', transition: 'platform' },
  },
  {
    path: '/variant-e',
    name: 'variant-e',
    component: () => import('../views/home-variants/HomeViewOrbitalCompass.vue'),
    meta: { title: '方案 E：3D 环形星轨罗盘', transition: 'platform' },
  },
  {
    path: '/variant-f',
    name: 'variant-f',
    component: () => import('../views/home-variants/HomeViewParallaxTheater.vue'),
    meta: { title: '方案 F：3D 视差胶囊巨幕', transition: 'platform' },
  },
  {
    path: '/variant-g',
    name: 'variant-g',
    component: () => import('../views/home-variants/HomeViewInterstellarWarp.vue'),
    meta: { title: '方案 G：星际穿越', transition: 'platform' },
  },
  {
    path: '/variant-h',
    name: 'variant-h',
    component: () => import('../views/home-variants/HomeViewBlackHoleGravity.vue'),
    meta: { title: '方案 H：黑洞引力场', transition: 'platform' },
  },
  {
    path: '/variant-i',
    name: 'variant-i',
    component: () => import('../views/home-variants/HomeViewQuantumCube.vue'),
    meta: { title: '方案 I：3D 量子赛博魔方', transition: 'platform' },
  },
  {
    path: '/variant-j',
    name: 'variant-j',
    component: () => import('../views/home-variants/HomeViewYinYangOrbit.vue'),
    meta: { title: '方案 J：太极双轨矩阵', transition: 'platform' },
  },
  {
    path: '/variant-k',
    name: 'variant-k',
    component: () => import('../views/home-variants/HomeViewCyberCockpit.vue'),
    meta: { title: '方案 K：3D 赛博驾驶舱', transition: 'platform' },
  },
  {
    path: '/home-legacy',
    name: 'home-legacy',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '旧版平台主页', transition: 'platform' },
  },

  // 研发与工具链管理页面
  {
    path: '/tools/projects',
    name: 'project-packages',
    component: () => import('../views/tools/ProjectPackagesView.vue'),
    meta: { title: '项目包状态', transition: 'platform' },
  },
  {
    path: '/tools/project-routes',
    name: 'project-routes',
    component: () => import('../views/tools/ProjectRoutesView.vue'),
    meta: { title: '路由与页面映射', transition: 'platform' },
  },
  {
    path: '/tools/page-transfer',
    name: 'page-transfer',
    component: () => import('../views/tools/PageTransferView.vue'),
    meta: { title: '页面导入与导出', transition: 'platform' },
  },
  {
    path: '/components',
    name: 'component-catalog',
    component: () => import('../views/DesignSystemView.vue'),
    meta: { title: '组件规范目录', transition: 'platform' },
  },
];

// 动态追加各包模块路由
installedProjects.forEach((project) => {
  if (Array.isArray(project.routes)) {
    project.routes.forEach((routeItem) => {
      routes.push({
        path: routeItem.path,
        name: routeItem.name || `project-${project.id}-${routeItem.path.replace(/\//g, '-')}`,
        component: routeItem.component,
        meta: {
          title: routeItem.meta?.title || project.name,
          projectId: project.id,
          transition: 'project',
          ...(routeItem.meta || {}),
        },
      });
    });
  }
});

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - ${projectConfig.name}` : projectConfig.name;
});

export default router;
