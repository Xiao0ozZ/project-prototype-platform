<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getProject, getProjectEntryPath, installedProjects } from '../../config/project-packages';
import { projectConfig } from '../../config/project.config';
import { applyProjectTheme } from '../../config/theme';

const route = useRoute();
const router = useRouter();
const showProjectMenu = ref(false);
const projectMenuRef = ref(null);
const consoleVisibilityKey = 'project-platform:home-engineering-tools';
const selectedProjectStorageKey = 'project-platform:home-selected-project';

function readConsoleVisibility() {
  try {
    return window.sessionStorage.getItem(consoleVisibilityKey) === 'true';
  } catch {
    return false;
  }
}

const showConsole = ref(readConsoleVisibility());

const selectableProjects = computed(() =>
  installedProjects.filter((project) => project.homepage?.visible !== false),
);

const selectedProjectId = computed({
  get() {
    const queryProject = typeof route.query.project === 'string' ? route.query.project : '';
    if (selectableProjects.value.some((project) => project.id === queryProject)) return queryProject;

    try {
      const rememberedProject = window.localStorage.getItem(selectedProjectStorageKey) || '';
      return selectableProjects.value.some((project) => project.id === rememberedProject) ? rememberedProject : '';
    } catch {
      return '';
    }
  },
  set(projectId) {
    const normalizedProjectId = selectableProjects.value.some((project) => project.id === projectId) ? projectId : '';
    try {
      if (normalizedProjectId) {
        window.localStorage.setItem(selectedProjectStorageKey, normalizedProjectId);
      } else {
        window.localStorage.removeItem(selectedProjectStorageKey);
      }
    } catch {
      // Local storage is optional
    }
    router.replace({ path: '/variant-f', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
  },
});

const selectedProject = computed(() => getProject(selectedProjectId.value));

watch(
  selectedProject,
  (project) => {
    applyProjectTheme(project || null);
  },
  { immediate: true },
);

const clientEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind !== 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry, index) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
      iconGradient: [
        'from-blue-500 to-indigo-600 shadow-blue-500/20 text-white',
        'from-emerald-400 to-teal-600 shadow-emerald-500/20 text-white',
        'from-amber-400 to-orange-500 shadow-amber-500/20 text-white',
      ][index % 3],
      accentTag: [
        'bg-blue-50 text-blue-600 border-blue-100',
        'bg-emerald-50 text-emerald-600 border-emerald-100',
        'bg-amber-50 text-amber-600 border-amber-100',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '高保真移动端业务交互与页面流转视图，支持全设备触屏响应'
          : entry.clientId === 'enterprise'
            ? '企业综合运营看板、公务用车审批与全流程管理后台系统'
            : entry.clientId === 'operation'
              ? '实时监控大盘、运力调度分配与高并发业务协作工作台'
              : entry.description || '业务原型入口系统',
    })),
);

const documentEntries = computed(() =>
  [...(selectedProject.value?.entries || [])]
    .filter((entry) => entry.kind === 'docs')
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((entry) => ({
      ...entry,
      to: getProjectEntryPath(selectedProject.value, entry),
    })),
);

const projectTitle = computed(() => selectedProject.value?.name || projectConfig.name);
const projectVersion = computed(() => selectedProject.value?.version || '1.0.0');
const hasSelectedProject = computed(() => Boolean(selectedProject.value));

function chooseProject(projectId) {
  selectedProjectId.value = projectId;
  showProjectMenu.value = false;
}

function toggleConsole() {
  showConsole.value = !showConsole.value;
  try {
    window.sessionStorage.setItem(consoleVisibilityKey, String(showConsole.value));
  } catch {
    // Session storage is optional
  }
}

function handleConsoleShortcut(event) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
    event.preventDefault();
    toggleConsole();
  }
  if (event.key === 'Escape') {
    showProjectMenu.value = false;
  }
}

function handleOutsideProjectMenu(event) {
  if (showProjectMenu.value && !projectMenuRef.value?.contains(event.target)) {
    showProjectMenu.value = false;
  }
}

function openProjectSettings() {
  router.push({
    path: '/tools/projects',
    query: { project: selectedProjectId.value, edit: '1' },
  });
}

function openPageTransfer() {
  router.push({ path: '/tools/page-transfer', query: { project: selectedProjectId.value } });
}

onMounted(() => {
  window.addEventListener('keydown', handleConsoleShortcut);
  document.addEventListener('pointerdown', handleOutsideProjectMenu);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleConsoleShortcut);
  document.removeEventListener('pointerdown', handleOutsideProjectMenu);
});
</script>

<template>
  <div class="alabaster-gallery-page min-h-screen bg-[#fbfbfd] text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
    <!-- 极高颜值羊脂白 Header (Apple-style High Aesthetics Topbar) -->
    <header class="sticky top-0 z-40 bg-[#fbfbfd]/80 backdrop-blur-2xl border-b border-slate-200/60">
      <div class="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <!-- Logo & Dropdown -->
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-f" class="flex items-center gap-2.5 group">
            <div class="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform">
              <el-icon><Platform /></el-icon>
            </div>
            <span class="font-bold text-slate-900 tracking-tight text-base group-hover:text-blue-600 transition-colors">
              {{ projectConfig.name }}
            </span>
          </RouterLink>

          <span class="text-slate-300">/</span>

          <!-- 极清爽 Selector -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm transition-all hover:border-slate-300"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full" :class="hasSelectedProject ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-300'"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选取目标项目包' }}</span>
              <el-icon class="text-slate-400 text-xs transition-transform" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
            </button>

            <!-- Dropdown Popover -->
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform scale-95 opacity-0 -translate-y-1"
              enter-to-class="transform scale-100 opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform scale-100 opacity-100 translate-y-0"
              leave-to-class="transform scale-95 opacity-0 -translate-y-1"
            >
              <div
                v-if="showProjectMenu"
                class="absolute left-0 mt-2 w-72 rounded-2xl bg-white p-2 shadow-2xl shadow-slate-900/10 border border-slate-200/90 z-50"
              >
                <div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">可用项目列表</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors hover:bg-slate-50"
                  :class="!hasSelectedProject ? 'text-slate-900 font-bold bg-slate-100' : 'text-slate-600'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-slate-900"><Check /></el-icon>
                </button>
                <div class="my-1 border-t border-slate-100"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors hover:bg-slate-50"
                    :class="project.id === selectedProjectId ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-slate-900">{{ project.name }}</div>
                      <div class="text-[10px] text-slate-400 font-mono mt-0.5">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-blue-600 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <RouterLink to="/components" class="hover:text-slate-900 transition-colors">组件规范</RouterLink>
          <RouterLink to="/tools/project-routes" class="hover:text-slate-900 transition-colors">路由管理</RouterLink>
          <RouterLink to="/tools/projects" class="hover:text-slate-900 transition-colors">项目包</RouterLink>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700 transition-colors ml-2"
            title="快捷键 Ctrl+Shift+M"
            @click="toggleConsole"
          >
            {{ showConsole ? '开发者模式: 开' : '开发者模式' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 核心画廊 Canvas -->
    <main class="mx-auto max-w-6xl px-6 py-12 space-y-12">
      <!-- 极简高颜值 Hero 头部 -->
      <section class="space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80">
          <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          <span>{{ hasSelectedProject ? `已接入：${selectedProject?.name} (v${projectVersion})` : '请选取目标项目包' }}</span>
        </div>

        <h1 class="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-500 text-base max-w-2xl leading-relaxed">
          {{ hasSelectedProject ? (selectedProject?.description || '高保真原型展示与需求规划平台，提供真实业务场景与高质感交互视图。') : '请在上方下拉菜单中选择目标项目包，直接体验对应的客户端原型与需求规格书。' }}
        </p>

        <div v-if="showConsole" class="pt-2 flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            @click="openProjectSettings"
          >
            <el-icon><Setting /></el-icon>
            修改包配置
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-xs font-bold text-white shadow-md shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95"
            @click="openPageTransfer"
          >
            <el-icon><Switch /></el-icon>
            页面导入导出
          </button>
        </div>
      </section>

      <!-- 客户端高保真 3D 画廊大卡片 (High-Aesthetics Gallery Showcase Cards) -->
      <section class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-extrabold text-slate-400 tracking-wider uppercase">客户端原型画廊</h2>
          <span class="text-xs font-semibold text-slate-400">{{ clientEntries.length }} 个客户端入口</span>
        </div>

        <div v-if="clientEntries.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <RouterLink
            v-for="entry in clientEntries"
            :key="entry.id"
            :to="entry.to"
            class="group relative rounded-[32px] bg-white p-8 shadow-xl shadow-slate-900/5 border border-slate-200/70 hover:shadow-2xl hover:shadow-slate-900/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div>
              <!-- 苹果级彩虹 Icon 徽标 -->
              <div class="flex items-center justify-between mb-6">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-110 duration-300" :class="entry.iconGradient">
                  <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
                  <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                  <el-icon v-else><Monitor /></el-icon>
                </div>

                <span class="px-3 py-1 rounded-full text-[11px] font-bold border" :class="entry.accentTag">
                  {{ entry.kind === 'mobile' ? 'MOBILE' : 'WEB CLIENT' }}
                </span>
              </div>

              <!-- 标题与描述 -->
              <h3 class="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                {{ entry.name }}
              </h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                {{ entry.displayDescription }}
              </p>
            </div>

            <!-- 底部直达按钮 -->
            <div class="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-blue-600">
              <span>进入原型系统</span>
              <div class="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all">
                <el-icon class="group-hover:translate-x-0.5 transition-transform"><Right /></el-icon>
              </div>
            </div>
          </RouterLink>
        </div>

        <!-- 空状态 -->
        <div v-else class="rounded-[32px] bg-white p-12 text-center border border-slate-200/70 shadow-sm">
          <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <el-icon class="text-xl"><FolderOpened /></el-icon>
          </div>
          <div class="text-sm font-bold text-slate-700">暂无可用客户端</div>
          <div class="text-xs text-slate-400 mt-1">请在上方选择包含有效客户端的原型包。</div>
        </div>
      </section>

      <!-- 双栏文档与工具 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-200/80">
        <!-- 需求文档 -->
        <section class="md:col-span-2 space-y-4">
          <h2 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">需求规格书 (PRD)</h2>
          <div v-if="documentEntries.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RouterLink
              v-for="doc in documentEntries"
              :key="doc.id"
              :to="doc.to"
              class="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all text-xs font-bold text-slate-800 group shadow-sm"
            >
              <div class="flex items-center gap-3 truncate">
                <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
                  <el-icon><Document /></el-icon>
                </div>
                <span class="truncate">{{ doc.name }}</span>
              </div>
              <el-icon class="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-transform"><Right /></el-icon>
            </RouterLink>
          </div>
          <div v-else class="text-xs text-slate-400 bg-white p-6 rounded-2xl border border-slate-200/70">
            {{ hasSelectedProject ? '当前项目包未配置 Markdown 需求文档。' : '请选择项目包以查看对应文档。' }}
          </div>
        </section>

        <!-- 工具 -->
        <section class="space-y-4">
          <h2 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">工程工具</h2>
          <div class="space-y-3">
            <RouterLink
              to="/tools/project-routes"
              class="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all text-xs font-bold text-slate-800 group shadow-sm"
            >
              <span>路由菜单管理</span>
              <el-icon class="text-slate-400 group-hover:text-slate-900"><Right /></el-icon>
            </RouterLink>

            <RouterLink
              to="/tools/page-transfer"
              class="flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all text-xs font-bold text-slate-800 group shadow-sm"
            >
              <span>页面导入导出</span>
              <el-icon class="text-slate-400 group-hover:text-slate-900"><Right /></el-icon>
            </RouterLink>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.alabaster-gallery-page {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif;
}
</style>
