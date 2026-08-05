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
const activeIndex = ref(0);

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
    router.replace({ path: '/variant-i', query: normalizedProjectId ? { project: normalizedProjectId } : {} });
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
      badgeColor: [
        'bg-purple-500/20 text-purple-300 border-purple-500/40',
        'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        'bg-rose-500/20 text-rose-300 border-rose-500/40',
      ][index % 3],
      btnStyle: [
        'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-purple-500/30 hover:from-purple-400 hover:to-indigo-500',
        'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-500',
        'bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/30 hover:from-rose-400 hover:to-pink-500',
      ][index % 3],
      displayDescription:
        entry.kind === 'mobile'
          ? '高清全全触屏视差交互，内置极速手机壳预览与全组件流转'
          : entry.clientId === 'enterprise'
            ? '企业级综合管控看板、用车审批流与全量数据决策中心'
            : entry.clientId === 'operation'
              ? '调度监控、运力分配与高并发协同工作台系统'
              : entry.description || '业务系统原型系统',
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
  <div class="parallax-theater-page h-screen w-screen bg-[#060813] text-slate-100 font-sans antialiased relative overflow-hidden flex flex-col justify-between">
    <!-- 动态紫晕微光背景 Surface Backdrop -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute -top-40 right-1/4 w-[900px] h-[600px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-[140px] rounded-full animate-pulse"></div>
      <div class="absolute bottom-0 -left-20 w-[700px] h-[700px] bg-rose-600/10 blur-[160px] rounded-full"></div>
      
      <!-- 极致全景水平极光带 Sweep Line -->
      <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"></div>
    </div>

    <!-- 顶部 HUD Bar -->
    <header class="relative z-40 pt-6 px-8">
      <div class="mx-auto max-w-7xl h-16 rounded-3xl bg-slate-950/70 backdrop-blur-2xl border border-white/10 px-6 flex items-center justify-between shadow-2xl">
        <div class="flex items-center gap-6">
          <RouterLink to="/variant-i" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-500 p-[1px] shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <div class="w-full h-full rounded-[15px] bg-[#060813] flex items-center justify-center text-purple-400 font-black">
                <el-icon><Film /></el-icon>
              </div>
            </div>
            <div>
              <div class="text-[9px] font-mono text-purple-400 tracking-widest uppercase">3D PARALLAX THEATER</div>
              <div class="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                {{ projectConfig.name }}
              </div>
            </div>
          </RouterLink>

          <span class="text-white/15 text-xs font-light">|</span>

          <!-- Dropdown -->
          <div ref="projectMenuRef" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-all hover:border-purple-500/40"
              @click="showProjectMenu = !showProjectMenu"
            >
              <span class="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc] animate-ping"></span>
              <span>{{ hasSelectedProject ? selectedProject?.name : '选择目标项目包' }}</span>
              <el-icon class="text-slate-400 text-xs transition-transform" :class="{ 'rotate-180': showProjectMenu }"><ArrowDown /></el-icon>
            </button>

            <!-- Dropdown -->
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
                class="absolute left-0 mt-3 w-72 rounded-3xl bg-[#0C0F22]/95 backdrop-blur-2xl p-2.5 shadow-2xl border border-purple-500/30 z-50 text-xs"
              >
                <div class="px-3 py-1.5 text-[10px] font-mono text-purple-400 uppercase tracking-widest">PARALLAX PROJECTS</div>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-white/10"
                  :class="!hasSelectedProject ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-300'"
                  @click="chooseProject('')"
                >
                  <span>未选择项目</span>
                  <el-icon v-if="!hasSelectedProject" class="text-purple-400"><Check /></el-icon>
                </button>
                <div class="my-1.5 border-t border-white/10"></div>
                <div class="max-h-60 overflow-y-auto space-y-1">
                  <button
                    v-for="project in selectableProjects"
                    :key="project.id"
                    type="button"
                    class="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-white/10"
                    :class="project.id === selectedProjectId ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-slate-200'"
                    @click="chooseProject(project.id)"
                  >
                    <div>
                      <div class="font-bold text-white">{{ project.name }}</div>
                      <div class="text-[10px] text-slate-400 font-mono">{{ project.id }} · v{{ project.version || '1.0' }}</div>
                    </div>
                    <el-icon v-if="project.id === selectedProjectId" class="text-purple-400 text-sm"><Check /></el-icon>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <RouterLink to="/components" class="hover:text-purple-300 transition-colors">组件规范</RouterLink>
          <RouterLink to="/tools/project-routes" class="hover:text-purple-300 transition-colors">路由管理</RouterLink>
          <RouterLink to="/tools/projects" class="hover:text-purple-300 transition-colors">项目包</RouterLink>
          <button
            type="button"
            class="text-slate-400 hover:text-white transition-colors"
            title="快捷键 Ctrl+Shift+M"
            @click="toggleConsole"
          >
            {{ showConsole ? '开发者模式: 开' : '开发者模式' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 3D 视差大画卷舞台 Main Stage -->
    <main class="relative z-10 mx-auto max-w-7xl w-full px-6 flex-1 flex flex-col justify-center my-auto">
      <!-- 迎宾标题 -->
      <div class="text-center space-y-3 mb-12">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-mono border border-purple-500/20">
          <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
          <span>PARALLAX THEATER SHOWCASE · OPTION I</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-pink-300 tracking-tight leading-tight">
          {{ projectTitle }}
        </h1>
      </div>

      <!-- 3D 视差卡片平铺画卷 Carousel Glass Stage -->
      <div v-if="clientEntries.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="(entry, idx) in clientEntries"
          :key="entry.id"
          class="group relative rounded-[36px] bg-[#0E122B]/90 backdrop-blur-2xl p-8 border border-white/10 hover:border-purple-500/60 shadow-2xl hover:shadow-[0_0_50px_rgba(192,132,252,0.3)] transition-all duration-500 hover:-translate-y-3 flex flex-col justify-between overflow-hidden"
        >
          <!-- Parallax Light Stroke -->
          <div class="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/25 transition-all"></div>

          <div>
            <div class="flex items-center justify-between mb-6">
              <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl text-purple-300 shadow-inner group-hover:scale-110 transition-transform">
                <el-icon v-if="entry.kind === 'mobile'"><Iphone /></el-icon>
                <el-icon v-else-if="entry.clientId === 'enterprise'"><OfficeBuilding /></el-icon>
                <el-icon v-else><Monitor /></el-icon>
              </div>

              <span class="px-3 py-1 rounded-full text-[10px] font-mono font-bold border uppercase" :class="entry.badgeColor">
                0{{ idx + 1 }} · THEATER
              </span>
            </div>

            <h2 class="text-2xl font-black text-white group-hover:text-purple-300 transition-colors mb-3">
              {{ entry.name }}
            </h2>
            <p class="text-xs text-slate-300 leading-relaxed mb-6">
              {{ entry.displayDescription }}
            </p>
          </div>

          <RouterLink
            :to="entry.to"
            class="w-full py-3.5 px-6 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
            :class="entry.btnStyle"
          >
            <span>进入画卷系统</span>
            <el-icon class="text-sm group-hover:translate-x-1 transition-transform"><Right /></el-icon>
          </RouterLink>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="rounded-3xl border border-white/10 bg-[#0E122B]/80 backdrop-blur-2xl p-16 text-center max-w-lg mx-auto shadow-2xl">
        <el-icon class="text-4xl text-purple-400 mb-3"><Film /></el-icon>
        <div class="text-base font-black text-white">未找到可用画卷节点</div>
        <div class="text-xs text-slate-400 mt-1">请在顶部选择包含客户端的原型包。</div>
      </div>
    </main>

    <!-- 底部控制岛操控 Base Control Island -->
    <footer class="relative z-30 py-6 border-t border-white/10 bg-[#060813]/90 backdrop-blur-2xl">
      <div class="mx-auto max-w-7xl px-8 flex items-center justify-between text-xs text-slate-400">
        <div class="flex items-center gap-4">
          <RouterLink
            v-for="doc in documentEntries"
            :key="doc.id"
            :to="doc.to"
            class="hover:text-purple-300 transition-colors flex items-center gap-1.5"
          >
            <el-icon class="text-purple-400"><Document /></el-icon>
            <span>{{ doc.name }}</span>
          </RouterLink>
        </div>

        <div class="flex items-center gap-4">
          <RouterLink to="/tools/project-routes" class="hover:text-purple-300 transition-colors">路由结构</RouterLink>
          <span>|</span>
          <RouterLink to="/tools/page-transfer" class="hover:text-purple-300 transition-colors">导入导出</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.parallax-theater-page {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
