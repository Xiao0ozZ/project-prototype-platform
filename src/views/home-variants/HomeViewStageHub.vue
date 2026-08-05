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
const showDocsTray = ref(false);
const showToolsTray = ref(false);
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
    router.replace({ path: '/variant-c', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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
      bgGradient: [
        'from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/30 hover:border-indigo-400',
        'from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30 hover:border-emerald-400',
        'from-slate-900 via-blue-950 to-slate-900 border-blue-500/30 hover:border-blue-400',
      ][index % 3],
      badgeBg: [
        'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
        'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        'bg-blue-500/10 text-blue-300 border-blue-500/30',
      ][index % 3],
      btnBg: [
        'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-indigo-500/25',
        'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25',
        'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '高保真移动端业务交互流转与手机壳极速体验'
          : entry.clientId === 'enterprise'
            ? '企业公务用车管理、数据监控看板及全流程后台'
            : entry.clientId === 'operation'
              ? '租赁营运调度、车辆运力与核心业务协作工作台'
              : entry.description || '业务系统原型系统',
      features:
        entry.kind === 'mobile'
          ? ['响应式触屏交互', '移动端全组件库', '核心作业流演示']
          : entry.clientId === 'enterprise'
            ? ['决策大盘看板', '用车审批工作流', '多租户角色管控']
            : entry.clientId === 'operation'
              ? ['实时地图调度', '运力分配算法', '工单异常处理']
              : ['全链路原型', 'PRD 实时对照', '模块可插拔'],
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
    showDocsTray.value = false;
    showToolsTray.value = false;
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
  <div class="stage-hub-page min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden flex flex-col justify-between">
    <!-- 动态背景 Background Aura Glows -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/15 via-blue-600/10 to-transparent blur-[120px] rounded-full"></div>
      <div class="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-violet-600/10 blur-[140px] rounded-full"></div>
      <div class="absolute bottom-0 -right-40 w-[700px] h-[700px] bg-blue-600/10 blur-[160px] rounded-full"></div>
    </div>

    <!-- 悬浮胶囊控制导航 -->
    <header class="relative z-40 pt-4 px-6">
      <div class="mx-auto max-w-6xl h-14 rounded-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 px-5 flex items-center justify-between shadow-2xl shadow-black/50">
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-c" class="flex items-center gap-2.5 group">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
              <el-icon><Platform /></el-icon>
            </div>
            <span class="font-black text-white tracking-tight text-sm group-hover:text-indigo-300 transition-colors">
              {{ projectConfig.name }}
            </span>
          </RouterLink>

          <span class="text-white/20 text-xs font-light">|</span>

          <!-- Dropdown -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 border border-white/10 transition-all hover:border-white/25"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full" :class="hasSelectedProject ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse' : 'bg-slate-500'"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选择目标项目包' }}</span>
              <el-icon class="text-slate-400 text-xs transition-transform duration-200" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
            </button>

            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="transform scale-95 opacity-0 -translate-y-2"
              enter-to-class="transform scale-100 opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="transform scale-100 opacity-100 translate-y-0"
              leave-to-class="transform scale-95 opacity-0 -translate-y-2"
            >
              <div
                v-if="showProjectMenu"
                class="absolute left-0 mt-3 w-72 rounded-2xl bg-slate-900/95 backdrop-blur-2xl p-2 shadow-2xl shadow-black/80 border border-white/15 z-50"
              >
                <div class="px-3 py-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">PROJECT SELECTOR</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-white/10"
                  :class="!hasSelectedProject ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-300'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-indigo-400"><Check /></el-icon>
                </button>
                <div class="my-1.5 border-t border-white/10"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-white/10"
                    :class="project.id === selectedProjectId ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-200'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-white">{{ project.name }}</div>
                      <div class="text-[10px] text-slate-400 font-mono">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-indigo-400 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-3 text-xs">
          <button
            type="button"
            class="px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            @click="showDocsTray = !showDocsTray"
          >
            需求文档 ({{ documentEntries.length }})
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            @click="showToolsTray = !showToolsTray"
          >
            工程工具
          </button>
        </div>
      </div>
    </header>

    <!-- 展台 Canvas -->
    <main class="relative z-10 mx-auto max-w-6xl w-full px-6 py-10 flex-1 flex flex-col justify-center">
      <div class="text-center space-y-3 mb-10">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
          <span>STAGE SHOWCASE ARCHITECTURE</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight leading-tight">
          {{ projectTitle }}
        </h1>

        <p class="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-normal">
          {{ hasSelectedProject ? (selectedProject?.description || '体验高保真系统原型、交互演示与需求规划文档。') : '请在上方选取目标项目包，开启 3D 展台高保真交互体验。' }}
        </p>
      </div>

      <!-- Cards Grid -->
      <div v-if="clientEntries.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        <div
          v-for="entry in clientEntries"
          :key="entry.id"
          class="group relative rounded-3xl bg-gradient-to-b p-[1px] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/20 flex"
          :class="entry.bgGradient"
        >
          <div class="w-full rounded-[23px] bg-slate-950/90 backdrop-blur-xl p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div class="flex items-center justify-between mb-6">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border shadow-inner transition-transform group-hover:scale-110 duration-300" :class="entry.badgeBg">
                  <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
                  <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                  <el-icon v-else><Monitor /></el-icon>
                </div>
                <span class="px-3 py-1 rounded-full text-[11px] font-bold border tracking-wider" :class="entry.badgeBg">
                  {{ entry.kind === 'mobile' ? 'MOBILE' : 'WEB CLIENT' }}
                </span>
              </div>

              <h2 class="text-2xl font-black text-white group-hover:text-indigo-300 transition-colors mb-3">
                {{ entry.name }}
              </h2>
              <p class="text-slate-400 text-xs leading-relaxed mb-6">
                {{ entry.displayDescription }}
              </p>
            </div>

            <RouterLink
              :to="entry.to"
              class="w-full py-3.5 px-6 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 group-hover:shadow-xl"
              :class="entry.btnBg"
            >
              <span>开启原型系统</span>
              <el-icon class="text-sm group-hover:translate-x-1 transition-transform"><Right /></el-icon>
            </RouterLink>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-30 py-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div class="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-slate-400">
        <div>Stage Hub Edition · {{ projectConfig.name }}</div>
        <div class="flex items-center gap-3">
          <button type="button" class="hover:text-white transition-colors" @click="showDocsTray = true">查看需求文档</button>
          <span>|</span>
          <button type="button" class="hover:text-white transition-colors" @click="showToolsTray = true">平台工程工具</button>
        </div>
      </div>
    </footer>
  </div>
</template>
